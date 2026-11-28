// Real SDK integration, exclusively against the disposable CI Supabase stack.
// Never accept an arbitrary URL, DB connection, or remote project.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {inspectAdminMfa,enrollAdminTotp,verifyAdminTotp,withOwnerReauthentication} from '../lib/mfa-client.js';

const config=readFileSync('supabase/config.toml','utf8');
const project=config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
assert.equal(process.env.GITHUB_ACTIONS,'true','CI only');
assert.equal(project,'evalia-ci-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
const raw=execFileSync('supabase',['status','-o','env'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const env=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{
 const m=line.match(/^([A-Z_]+)="?([^"\r\n]*)"?$/);
 return m?[[m[1],m[2]]]:[];
}));
const url=env.API_URL||env.SUPABASE_URL;
const anon=env.ANON_KEY||env.PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY;
const secret=env.SERVICE_ROLE_KEY||env.SECRET_KEY||env.SUPABASE_SECRET_KEY;
assert.ok(url&&anon&&secret,'local SDK configuration missing');
const u=new URL(url);
assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:'&&u.port&&!u.username&&!u.password,'non-local API forbidden');
const apiPort=config.match(/\[api\]\s*\nport\s*=\s*(\d+)/)?.[1];
assert.equal(u.port,apiPort,'API port must match disposable config');
process.env.NEXT_PUBLIC_SUPABASE_URL=url;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon;
const client=key=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'evalia-qa-'+randomUUID()}});
const service=client(secret);
const sql=statement=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:statement,stdio:['pipe','pipe','pipe']});
const uuidPattern=/^[a-f0-9-]{36}$/;
function checked(result,label){
 if(result.error)throw new Error(label+' failed ('+(result.error.code||result.error.status||'unknown')+')');
 return result.data;
}
async function fixture(role){
 const email='qa-'+role+'-'+randomUUID()+'@example.invalid';
 const password=randomBytes(24).toString('hex')+'Aa!1';
 const created=checked(await service.auth.admin.createUser({email,password,email_confirm:true}),'create QA user');
 const id=created.user.id;
 assert.match(id,uuidPattern);
 assert.ok(['owner','operator'].includes(role));
 sql("insert into public.admin_profiles(user_id,role) values('"+id+"','"+role+"');");
 const db=client(anon);
 checked(await db.auth.signInWithPassword({email,password}),'sign in '+role);
 return {db,id,email,password};
}
function totp(secret,now=Date.now()){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
 let bits=0,acc=0;const bytes=[];
 for(const c of secret.toUpperCase().replace(/=+$/,'')){
  const n=alphabet.indexOf(c);assert.ok(n>=0);
  acc=(acc<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((acc>>>bits)&255);}
 }
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(now/30000)));
 const h=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();
 return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');
}
async function currentCode(secret){
 const left=30000-Date.now()%30000;
 if(left<2500)await new Promise(r=>setTimeout(r,left+200));
 return totp(secret);
}
async function allowed(db){return checked(await db.rpc('is_evalia_admin'),'server permission');}
async function createCustomer(db,id,phone,confirm=false){
 return checked(await db.rpc('create_evalia_customer',{
  p_name:'QA E1 '+id.slice(0,8),p_whatsapp:phone,p_method:'pickup',p_destination:null,
  p_request_id:id,p_confirm_duplicate:confirm
 }),'create customer');
}
const owner=await fixture('owner'),operator=await fixture('operator');
try{
 assert.equal((await inspectAdminMfa(owner.db,owner.id)).step,'enroll');
 assert.equal(await allowed(owner.db),false);
 assert.equal((await inspectAdminMfa(operator.db,operator.id)).step,'check-server');
 assert.equal(await allowed(operator.db),true);
 const factor=await enrollAdminTotp(owner.db,owner.id);
 await verifyAdminTotp(owner.db,owner.id,factor.id,await currentCode(factor.secret));
 assert.equal(await allowed(owner.db),true);
 assert.equal((await inspectAdminMfa(owner.db,owner.id)).step,'check-server');
 const another=client(anon);
 checked(await another.auth.signInWithPassword({email:owner.email,password:owner.password}),'owner second sign in');
 assert.equal((await inspectAdminMfa(another,owner.id)).step,'challenge');
 assert.equal(await allowed(another),false);
 await another.auth.signOut({scope:'local'});
 // Ensure the sensitive operation uses a separate actual session and that
 // signing out that session does not invalidate the original owner session.
 // A sensitive reauthentication must use a fresh time window, not replay
 // the code used to enroll the original session.
 await new Promise(r=>setTimeout(r,30000-Date.now()%30000+300));
 await withOwnerReauthentication(owner.db,owner.password,await currentCode(factor.secret),async scoped=>{
  assert.equal(checked(await scoped.rpc('can_manage_evalia_accounts'),'sensitive permission'),true);
 });
 assert.equal(await allowed(owner.db),true);
 // Concurrent retries must not duplicate the row. A different request for
 // the normalized same phone must warn and require explicit confirmation.
 const id=randomUUID(),phone='7000'+String(randomBytes(2).readUInt16BE()%10000).padStart(4,'0');
 const [a,b]=await Promise.all([createCustomer(operator.db,id,phone),createCustomer(operator.db,id,phone)]);
 assert.equal(a.state,'created');assert.equal(a.id,b.id);
 const id2=randomUUID();
 assert.equal((await createCustomer(operator.db,id2,'+591 '+phone)).state,'duplicate');
 const c=await createCustomer(operator.db,id2,'+591 '+phone,true);
 assert.equal(c.state,'created');assert.notEqual(c.id,a.id);
 // A real signed JWT must lose access after its underlying session expires.
 const session=checked(await operator.db.auth.getSession(),'operator session').session;
 const claims=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString('utf8'));
 assert.match(claims.session_id,uuidPattern);
 sql("update auth.sessions set created_at=now()-interval '720 hours' where id='"+claims.session_id+"';");
 assert.equal(await allowed(operator.db),false);
 console.log('E1 live Auth: MFA, role gating, sensitive reauthentication, concurrent retries and session expiry PASS');
}finally{
 await Promise.allSettled([owner.db.auth.signOut({scope:'local'}),operator.db.auth.signOut({scope:'local'})]);
}
