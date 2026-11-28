import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import config from '../web/next.config.mjs';

const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../web/lib/api.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/lib/supabase.js',import.meta.url),'utf8');
const login=page.slice(page.indexOf('function Login('),page.indexOf('export default function HomePage('));
const refresh=page.slice(page.indexOf(' const refresh=useCallback(async('),page.indexOf(' useEffect(()=>',page.indexOf(' const refresh=useCallback(async(')));
const clear=page.slice(page.indexOf(' const clearAccess=useCallback('),page.indexOf(' const refresh=useCallback('));
test('login usa formulario POST, credenciales del DOM y atributos estándar del gestor',()=>{
 assert.match(login,/method="post" autoComplete="on"/);
 assert.match(login,/new FormData\(e\.currentTarget\)/);
 assert.match(login,/name="email" required autoComplete="username"/);
 assert.match(login,/name="password" required autoComplete="current-password"/);
 assert.doesNotMatch(login,/setPassword|localStorage|sessionStorage/);
 assert.match(login,/type="button" aria-controls="evalia-login-password"/);
});
test('persistencia nativa de Supabase y ausencia de sesión no se presentan como error',()=>{
 assert.match(client,/persistSession:true,autoRefreshToken:true/);
 assert.match(api,/result\.error\?\.name==='AuthSessionMissingError'\)return null/);
});
test('refrescar exige misma identidad y autorización antes de consultar el espacio',()=>{
 assert.ok(refresh.indexOf('await authUser()')>=0);
 assert.ok(refresh.indexOf('await adminAllowed()')>refresh.indexOf('await authUser()'));
 assert.ok(refresh.indexOf('await loadWorkspace()')>refresh.indexOf('if(!permitted)'));
 // Modo bloqueante: cancela confirmaciones y numera la verificación; segundo plano conserva la ventana abierta.
 assert.match(refresh,/if\(generation===refreshGeneration\.current\)\{\s*if\(!background\)cancelConfirmation\(\);/);
 assert.match(refresh,/setData\(\{\.\.\.snapshot,refreshKind:background\?'background':'blocking',blockingSeq:seq\}\)/);
 // Con una confirmación abierta se verifica igualmente identidad y autorización, y se cierra el acceso si cambió.
 const verify=page.slice(page.indexOf('const verifyAccessOnly='),page.indexOf('},[clearAccess]);',page.indexOf('const verifyAccessOnly=')));
 assert.ok(verify.indexOf('await adminAllowed()')>verify.indexOf('await authUser()'));
 assert.match(verify,/if\(!permitted\)\{clearAccess\(\);/);
 assert.match(page,/if\(confirmationOpen\(\)\)\{verifyAccessOnly\(\)\.catch\(fail\);return;\}/);
 assert.match(clear,/refreshGeneration\.current\+\+/);
 assert.match(clear,/authGeneration\.current\+\+/);
 assert.match(clear,/authorizedUser\.current=null/);
 assert.match(clear,/setAuthenticated\(false\);setData\(null\)/);
 assert.match(page,/event==='SIGNED_OUT'\)\{clearAccess\(\)/);
 assert.match(page,/document\.addEventListener\('visibilitychange',revalidate\)/);
 assert.match(page,/document\.removeEventListener\('visibilitychange',revalidate\)/);
});
test('el cierre fallido bloquea el inicio y ofrece reintento; errores de credencial genéricos',()=>{
 assert.match(login,/disabled=\{busy\|\|logoutPending\}/);
 assert.match(login,/Reintentar cierre de sesión/);
 assert.match(page,/try\{await signOut\(\);setLogoutPending\(false\);\}/);
 assert.match(page,/catch\{setLogoutPending\(true\);setError\('No se pudo cerrar la sesión en el servidor/);
 const handler=page.slice(page.indexOf(' async function login('),page.indexOf(' async function logout('));
 assert.doesNotMatch(handler,/setError\(e\.message\)/);
});
test('cabeceras globales y las excepciones estrictas del portal siguen presentes',async()=>{
 const rules=await config.headers();
 const global=rules.find(r=>r.source==='/:path*');
 assert.ok(global);
 const values=Object.fromEntries(global.headers.map(h=>[h.key,h.value]));
 assert.equal(values['X-Frame-Options'],'DENY');
 assert.equal(values['X-Content-Type-Options'],'nosniff');
 assert.match(values['Content-Security-Policy'],/frame-ancestors 'none'/);
 assert.match(values['Content-Security-Policy'],/object-src 'none'/);
 for(const route of ['/pedido','/p/:token','/api/cliente-pago']){
  const h=rules.find(r=>r.source===route);
  assert.ok(h);
  assert.ok(rules.indexOf(h)>rules.indexOf(global));
  assert.equal(h.headers.find(x=>x.key==='Referrer-Policy').value,'no-referrer');
  assert.match(h.headers.find(x=>x.key==='Cache-Control').value,/no-store/);
 }
});
