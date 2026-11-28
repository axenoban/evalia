// E1-02: disposable synthetic recovery drill, never accepts a remote URL or credential.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {hashFile,objectFile} from '../../ops/backup/backup.mjs';
import {verifyExtracted} from '../../ops/backup/verify.mjs';

assert.equal(process.env.GITHUB_ACTIONS,'true','CI only');
const config=await readFile('supabase/config.toml','utf8');
const source='evalia-ci-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT;
assert.equal(config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1],source);
assert.match(source,/^evalia-ci-\d+-\d+$/);
const target=source+'-restore';
const work=await mkdtemp(join(tmpdir(),'evalia-recovery-'));
const payload=join(work,'payload'),restored=join(work,'restored'),targetDir=join(work,'target');
await mkdir(join(payload,'objects'),{recursive:true});
await mkdir(restored);await mkdir(join(targetDir,'supabase'),{recursive:true});
await writeFile(join(targetDir,'supabase','config.toml'),config.replace('project_id = "'+source+'"','project_id = "'+target+'"'));
const root=process.cwd();
function run(label,program,args,opts={}){
 try{return execFileSync(program,args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024,...opts});}
 catch(e){const diagnostic=String(e.stderr||'').split('\n').filter(x=>/ERROR:|FATAL:|failed|Error:/.test(x)).slice(-3).map(x=>x.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection omitted]')).join(' | ');throw Error(label+' failed'+(diagnostic?': '+diagnostic:''));}
}
function status(cwd){
 const raw=run('local status','supabase',['status','-o','env'],{cwd});
 const env=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{const m=line.match(/^([A-Z_]+)="?([^"\r\n]*)"?$/);return m?[[m[1],m[2]]]:[];}));
 const url=env.API_URL||env.SUPABASE_URL,anon=env.ANON_KEY||env.PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY,secret=env.SERVICE_ROLE_KEY||env.SECRET_KEY||env.SUPABASE_SECRET_KEY;
 const u=new URL(url),db=new URL(env.DB_URL);
 assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:'&&u.port===config.match(/\[api\]\s*\nport\s*=\s*(\d+)/)?.[1]);
 assert.ok(['localhost','127.0.0.1'].includes(db.hostname)&&db.port===config.match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1]&&db.pathname==='/postgres');
 assert.ok(anon&&secret);return {url,anon,secret,dbUrl:env.DB_URL};
}
const client=(s,k)=>createClient(s.url,k,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'restore-qa-'+randomUUID()}});
function check(r,label){if(r.error)throw Error(label+' failed ('+(r.error.code||r.error.status||'unknown')+')');return r.data;}
function psql(project,statement,transaction=false){
 assert.ok([source,target].includes(project));
 return run('SQL '+(project===source?'source':'restore'),'docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres',...(transaction?['--single-transaction']:[]),'-f','-'],{input:statement});
}
const countsSql=`select jsonb_build_object('customers',(select count(*) from public.customers),'models',(select count(*) from public.models),'orders',(select count(*) from public.orders),'lines',(select count(*) from public.order_lines),'payments',(select count(*) from public.payment_reports),'deliveries',(select count(*) from public.deliveries),'inventory',(select coalesce(sum(on_hand),0) from public.model_inventory),'admins',(select count(*) from public.admin_profiles),'users',(select count(*) from auth.users),'customer_ledger',(select count(*) from evalia_security.customer_create_requests),'model_ledger',(select count(*) from evalia_security.model_create_requests),'storage',(select count(*) from storage.objects),'migration_history',(select count(*) from supabase_migrations.schema_migrations));`;
const snapshot=project=>JSON.parse(psql(project,countsSql).trim());
let targetStarted=false;
try{
 const s=status(root),svc=client(s,s.secret),db=client(s,s.anon);
 const email='recovery-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('hex')+'Aa!1';
 const uid=check(await svc.auth.admin.createUser({email,password,email_confirm:true}),'create synthetic user').user.id;
 assert.match(uid,/^[0-9a-f-]{36}$/);
 psql(source,"insert into public.admin_profiles(user_id,role) values('"+uid+"','operator');");
 check(await db.auth.signInWithPassword({email,password}),'source sign in');
 const color=randomUUID();
 psql(source,"insert into public.colors(id,name) values('"+color+"','Recovery QA "+color+"');");
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2zQAAAAASUVORK5CYII=','base64');
 const key='models/'+randomUUID()+'.png';
 check(await svc.storage.from('evalia-models').upload(key,image,{contentType:'image/png'}),'upload synthetic photo');
 const model=check(await db.rpc('create_evalia_model',{p_name:'Recovery QA',p_size:'M',p_price:360,p_color_ids:[color],p_initial_units:72,p_request_id:randomUUID(),p_image_path:key}),'create model');
 const customer=check(await db.rpc('create_evalia_customer',{p_name:'Recovery QA',p_whatsapp:'70001234',p_method:'pickup',p_destination:null,p_request_id:randomUUID(),p_confirm_duplicate:true}),'create customer').id;
 const orderReq=randomUUID();
 check(await db.rpc('create_evalia_order_delivery',{p_customer_id:customer,p_lines:[{modelId:model,dozens:1,extraColorIds:[]}],p_request_id:orderReq,p_method:'pickup',p_destination:null}),'create order');
 const order=psql(source,"select id from public.orders where request_id='"+orderReq+"';").trim();
 assert.match(order,/^[0-9a-f-]{36}$/);
 check(await db.rpc('quick_evalia_checkout',{p_order_id:order,p_action:'pay_deliver',p_request_id:randomUUID(),p_note:'Synthetic recovery fixture',p_money_received:true,p_goods_delivered:true}),'pay and deliver');
 await db.auth.signOut({scope:'local'});
 const expected=snapshot(source);assert.ok(expected.orders>=1&&expected.payments>=1&&expected.deliveries>=1&&expected.storage>=1&&expected.model_ledger>=1);
 const policies=psql(source,`select coalesce(string_agg(format('create policy %I on %I.%I as %s for %s to %s%s%s;',policyname,schemaname,tablename,permissive,cmd,array_to_string(array(select quote_ident(r) from unnest(roles) r),','),case when qual is null then '' else ' using ('||qual||')' end,case when with_check is null then '' else ' with check ('||with_check||')' end),E'\\n' order by policyname),'') from pg_policies where schemaname in ('auth','storage') and policyname like 'evalia_%';`);
 const specs=[['roles.sql',['--role-only']],['schema.sql',[]],['data.sql',['--data-only','--use-copy','-x','storage.buckets_vectors','-x','storage.vector_indexes']],['history_schema.sql',['--schema','supabase_migrations']],['history_data.sql',['--schema','supabase_migrations','--data-only','--use-copy']]];
 const sql=[];
 for(const [path,flags] of specs){const file=join(payload,path);run('dump '+path,'supabase',['db','dump','--local','-f',file,...flags]);sql.push({path,size:(await stat(file)).size,sha256:await hashFile(file)});assert.ok(sql.at(-1).size>0);}
 const bucket='evalia-models',path=objectFile(bucket,key);
 const blob=check(await svc.storage.from(bucket).download(key),'download source photo');
 await writeFile(join(payload,path),Buffer.from(await blob.arrayBuffer()));
 const objects=[{bucket,key,path,size:(await stat(join(payload,path))).size,sha256:await hashFile(join(payload,path)),contentType:'image/png',metadata:{}}];
 await writeFile(join(payload,'manifest.json'),JSON.stringify({format:1,project:'synthetic-ci',createdAt:new Date().toISOString(),buckets:['evalia-models','evalia-qr','evalia-receipts'],sql,objects}));
 const identity=join(work,'identity.txt'),archive=join(work,'payload.tar.gz'),encrypted=archive+'.age',decrypted=join(work,'decoded.tar.gz');
 run('age key generation','age-keygen',['-o',identity]);
 const recipient=run('age public recipient','age-keygen',['-y',identity]).trim();
 run('package','tar',['-czf',archive,'-C',payload,'.']);run('encrypt','age',['-r',recipient,'-o',encrypted,archive]);
 run('decrypt','age',['-d','-i',identity,'-o',decrypted,encrypted]);run('extract own archive','tar',['-xzf',decrypted,'-C',restored]);
 assert.deepEqual(await verifyExtracted(restored),{project:'synthetic-ci',sql:5,objects:1});
 console.log('Recovery drill: actual database dumps and photo encrypted, decrypted and hashes verified');
 // Source is disposable; stop before starting a fresh target on the same isolated ports.
 run('stop source','supabase',['stop','--no-backup'],{cwd:root});
 targetStarted=true;
 run('start fresh restore target','supabase',['start'],{cwd:targetDir});
 const t=status(targetDir);
 assert.equal(psql(target,"select to_regclass('public.customers') is null;").trim(),'t');
 const parts=await Promise.all(specs.map(([path])=>readFile(join(restored,path),'utf8')));
 psql(target,parts[0]+'\n'+parts[1]+'\nSET session_replication_role=replica;\n'+parts[2]+'\nRESET session_replication_role;\n',true);
 // History and customized managed-schema RLS policies are separate per Supabase restore guide.
 psql(target,parts[3]+'\n'+parts[4]+'\n'+policies,true);
 assert.deepEqual(snapshot(target),expected,'restored row counts and inventory');
 const tsvc=client(t,t.secret),tdb=client(t,t.anon);
 for(const o of objects){
  const bytes=await readFile(join(restored,o.path));
  check(await tsvc.storage.from(o.bucket).upload(o.key,bytes,{contentType:o.contentType,upsert:true}),'restore physical photo');
  const retrieved=check(await tsvc.storage.from(o.bucket).download(o.key),'read restored photo');
  assert.deepEqual(Buffer.from(await retrieved.arrayBuffer()),bytes);
 }
 check(await tdb.auth.signInWithPassword({email,password}),'restored user login');
 assert.equal(check(await tdb.rpc('is_evalia_admin'),'restored access'),true);
 assert.equal(check(await tdb.from('orders').select('status').eq('id',order).single(),'restored order').status,'completed');
 assert.equal(check(await tdb.from('model_inventory').select('on_hand').eq('model_id',model).single(),'restored stock').on_hand,60);
 const anon=client(t,t.anon);const denied=await anon.from('customers').select('id');
 assert.ok(denied.error||denied.data?.length===0,'anonymous must not read customers');
 const sourcePolicies=policies.trim();assert.ok(sourcePolicies.includes('evalia_model_photos_admin_select'));
 assert.equal(psql(target,"select count(*) from pg_policies where schemaname='storage' and policyname='evalia_model_photos_admin_select';").trim(),'1');
 await tdb.auth.signOut({scope:'local'});
 console.log('E1 synthetic recovery PASS: data, inventory, payment, delivery, history, Auth, RLS and physical photo');
}finally{
 if(targetStarted){try{run('stop restore target','supabase',['stop','--no-backup'],{cwd:targetDir});}catch{console.error('Restore target cleanup failed');process.exitCode=1;}}
 await rm(work,{recursive:true,force:true});
}
