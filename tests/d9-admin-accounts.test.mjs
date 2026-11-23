import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountAction,accountOrigin,accountFragment,passwordValid,validEmail} from '../web/lib/admin-account-contract.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('invitar solo por email, sin aceptar rol ni contraseña',()=>{
 assert.deepEqual(accountAction({action:'invite',email:' A@EXAMPLE.COM '}),{action:'invite',email:'a@example.com'});
 assert.equal(accountAction({action:'invite',email:'a@example.com',role:'owner'}),null);
 assert.equal(accountAction({action:'invite',email:'a@example.com',password:'secret'}),null);
 assert.equal(validEmail('bad'),null);
});
test('recuperación vinculada al identificador de la cuenta, no a correo arbitrario',()=>{
 const id='d9000000-0000-4000-8000-000000000001';
 assert.deepEqual(accountAction({action:'recovery',userId:id}),{action:'recovery',userId:id});
 assert.equal(accountAction({action:'recovery',userId:id,email:'other@example.com'}),null);
});
test('dominio de confianza fijo, sin URL suministrada por usuario',()=>{
 assert.equal(accountOrigin({NODE_ENV:'production',VERCEL_BRANCH_URL:'evalia.vercel.app'}),'https://evalia.vercel.app');
 assert.equal(accountOrigin({NODE_ENV:'production',EVALIA_ADMIN_ORIGIN:'https://evalia.vercel.app/evil'}),null);
 assert.equal(accountOrigin({NODE_ENV:'production'}),null);
});
test('canje solo invite/recovery y contraseña mínima',()=>{
 assert.equal(accountFragment('#type=magiclink&access_token=x&refresh_token=y'),null);
 assert.deepEqual(accountFragment('#type=recovery&access_token=x&refresh_token=y'),{access_token:'x',refresh_token:'y'});
 assert.equal(passwordValid('Abcd!12'),false);
 assert.equal(passwordValid('Abcd!123'),true);
});
test('la API verifica identidad y autorización reciente antes de enviar, nunca genera un enlace para el solicitante',()=>{
 const route=read('web/app/api/admin-cuentas/route.js');
 assert.ok(route.indexOf('scoped.auth.getUser')<route.indexOf('scoped.rpc(\'can_manage_evalia_accounts\')'));
 assert.ok(route.indexOf('can_manage_evalia_accounts')<route.indexOf('inviteUserByEmail'));
 assert.match(route,/resetPasswordForEmail\(target\.email/);
 assert.doesNotMatch(route,/generateLink|action_link|hashed_token/);
 const page=read('web/app/cuenta/page.jsx');
 assert.match(page,/persistSession:false/);
 assert.match(page,/window\.history\.replaceState/);
 assert.match(page,/auth\.updateUser\(\{password\}\)/);
 assert.match(page,/signOut\(\{scope:'global'\}\)/);
});
