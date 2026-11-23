import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const raw=JSON.parse(execFileSync('supabase',['status','-o','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}));
const env=raw.env??raw;
const api=env.API_URL,publicKey=env.ANON_KEY??env.PUBLISHABLE_KEY,secret=env.SERVICE_ROLE_KEY??env.SECRET_KEY;
const mail=env.MAILPIT_URL??env.INBUCKET_URL??'http://127.0.0.1:54324',origin='http://localhost:3000';
const local=url=>{const u=new URL(url);assert.ok(['127.0.0.1','localhost'].includes(u.hostname),'SOLO stack local');return u;};
local(api);local(mail);local(env.DB_URL);assert.ok(publicKey&&secret,'Faltan claves locales');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}};
const service=createClient(api,secret,options);
const client=()=>createClient(api,publicKey,options);
const ownerEmail='owner-'+randomUUID()+'@example.invalid',operatorEmail='operator-'+randomUUID()+'@example.invalid';
const ownerPassword='Owner!'+randomUUID(),operatorPassword='Operator!'+randomUUID(),newPassword='Changed!'+randomUUID();
let child;
function requireOk(result,label){assert.ok(!result.error,label);return result.data;}
async function call(token,body){
 const r=await fetch(origin+'/api/admin-cuentas',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,data:await r.json()};
}
async function messageLink(email,oldIds=new Set()){
 for(let i=0;i<40;i++){
  const list=await (await fetch(mail+'/api/v1/messages')).json();
  const found=(list.messages??[]).find(m=>!oldIds.has(m.ID)&&m.To?.some(t=>t.Address===email));
  if(found){
   const html=await (await fetch(mail+'/view/'+encodeURIComponent(found.ID)+'.html')).text();
   const hrefs=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(x=>x[1].replaceAll('&amp;','&'));
   const link=hrefs.find(x=>x.includes('/auth/v1/verify'));
   assert.ok(link,'El correo no contiene enlace Auth');
   local(link);
   return {id:found.ID,link};
  }
  await wait(500);
 }
 throw Error('No llegó el correo de prueba a Mailpit');
}
async function redeem(link,type){
 const res=await fetch(link,{redirect:'manual'});
 assert.ok([302,303,307,308].includes(res.status),'Auth no redirigió');
 const location=new URL(res.headers.get('location'));
 assert.equal(location.origin,origin,'Redirección inesperada');
 assert.equal(location.pathname,'/cuenta','Ruta de cuenta inesperada');
 const params=new URLSearchParams(location.hash.slice(1));
 assert.equal(params.get('type'),type,'Tipo de enlace incorrecto');
 assert.ok(params.get('access_token')&&params.get('refresh_token'),'Falta sesión del enlace');
 const db=client();
 requireOk(await db.auth.setSession({access_token:params.get('access_token'),refresh_token:params.get('refresh_token')}),'No se pudo canjear el enlace');
 return db;
}
async function run(){
 const ownerUser=requireOk(await service.auth.admin.createUser({email:ownerEmail,password:ownerPassword,email_confirm:true}),'Crear propietario local').user;
 assert.match(ownerUser.id,/^[0-9a-f-]{36}$/);
 execFileSync('psql',[env.DB_URL,'-v','ON_ERROR_STOP=1','-c',"insert into public.admin_profiles(user_id,role) values ('"+ownerUser.id+"','owner')"],{stdio:'ignore'});
 const owner=client();
 let session=requireOk(await owner.auth.signInWithPassword({email:ownerEmail,password:ownerPassword}),'Login propietario').session;
 assert.equal(requireOk(await owner.rpc('can_manage_evalia_accounts'),'Comprobar AMR real'),true);
 child=spawn('npm',['run','dev'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publicKey,SUPABASE_SECRET_KEY:secret,EVALIA_ADMIN_ORIGIN:origin},stdio:'ignore'});
 let ready=false;
 for(let i=0;i<90;i++){
  try{const r=await fetch(origin+'/cuenta');if(r.ok){ready=true;break;}}catch{}
  await wait(1000);
 }
 assert.ok(ready,'Next local no inició');
 let result=await call(session.access_token,{action:'invite',email:operatorEmail});
 assert.equal(result.status,200,'API de invitación rechazada');
 assert.deepEqual(Object.keys(result.data),['message'],'API revela datos adicionales');
 const invite=await messageLink(operatorEmail);
 const invited=await redeem(invite.link,'invite');
 requireOk(await invited.auth.updateUser({password:operatorPassword}),'Definir contraseña privada');
 requireOk(await invited.auth.signOut({scope:'global'}),'Cerrar sesión de invitación');
 const operator=client();
 let op=requireOk(await operator.auth.signInWithPassword({email:operatorEmail,password:operatorPassword}),'Login operador').session;
 assert.equal(requireOk(await operator.rpc('is_evalia_admin'),'Operador autorizado'),true);
 assert.equal(requireOk(await operator.rpc('is_evalia_owner'),'Rol operador'),false);
 assert.equal((await call(op.access_token,{action:'invite',email:'forbidden@example.invalid'})).status,403,'Operador no invita');
 const profiles=requireOk(await owner.rpc('list_evalia_admins'),'Listar usuarios');
 const target=profiles.find(a=>a.email===operatorEmail);
 assert.ok(target?.confirmed&&target.role==='operator','Perfil del invitado incorrecto');
 // La frecuencia mínima de correo local se configura a 1 segundo exclusivamente en QA.
 await wait(1500);
 session=requireOk(await owner.auth.signInWithPassword({email:ownerEmail,password:ownerPassword}),'Reautenticación').session;
 result=await call(session.access_token,{action:'recovery',userId:target.user_id});
 assert.equal(result.status,200,'API de recuperación rechazada');
 assert.deepEqual(Object.keys(result.data),['message'],'API revela datos adicionales');
 const reset=await messageLink(operatorEmail,new Set([invite.id]));
 const recovering=await redeem(reset.link,'recovery');
 requireOk(await recovering.auth.updateUser({password:newPassword}),'Restablecer contraseña');
 requireOk(await recovering.auth.signOut({scope:'global'}),'Cerrar sesiones');
 assert.ok((await client().auth.signInWithPassword({email:operatorEmail,password:operatorPassword})).error,'Contraseña antigua sigue activa');
 op=requireOk(await operator.auth.signInWithPassword({email:operatorEmail,password:newPassword}),'Login con contraseña nueva').session;
 assert.equal(requireOk(await owner.rpc('set_evalia_operator_active',{p_target:target.user_id,p_active:false}),'Suspender'),true);
 assert.equal(requireOk(await operator.rpc('is_evalia_admin'),'Suspensión en sesión existente'),false);
 assert.equal(requireOk(await owner.rpc('set_evalia_operator_active',{p_target:target.user_id,p_active:true}),'Reactivar'),true);
 assert.equal(requireOk(await operator.rpc('is_evalia_admin'),'Reactivación'),true);
 console.log('E2E Auth local: invitación, correo, contraseña privada, recuperación, roles y suspensión correctos.');
}
try{await run();}finally{child?.kill('SIGTERM');}
