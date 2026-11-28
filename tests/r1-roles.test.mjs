import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountAction,INVITE_ROLES} from '../web/lib/admin-account-contract.js';
import {mfaNextStep} from '../web/lib/mfa-flow.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('web/app/page.jsx');
const section=name=>page.slice(page.indexOf('function '+name+'('),page.indexOf('\nfunction ',page.indexOf('function '+name+'(')+10));

test('invitaciones solo crean Administrador o Vendedor, nunca propietario',()=>{
 assert.deepEqual(INVITE_ROLES,['operator','seller']);
 assert.deepEqual(accountAction({action:'invite',email:'v@example.com',role:'seller'}),{action:'invite',email:'v@example.com',role:'seller'});
 assert.deepEqual(accountAction({action:'invite',email:'a@example.com'}),{action:'invite',email:'a@example.com'});
 for(const role of ['owner','client','admin','',null])assert.equal(accountAction({action:'invite',email:'a@example.com',role}),null);
 const route=read('web/app/api/admin-cuentas/route.js');
 assert.match(route,/rpc\('register_evalia_member',\{p_actor:actor,p_target:invited\.data\.user\.id,p_role:action\.role\?\?'operator'\}\)/);
 assert.ok(route.indexOf('can_manage_evalia_accounts')<route.indexOf('register_evalia_member'));
});
test('el vendedor sigue la política de sesión del operador; el propietario exige MFA',()=>{
 const aal1={currentLevel:'aal1',nextLevel:'aal1'};
 assert.equal(mfaNextStep({active:true,role:'seller'},aal1,[]),'check-server');
 assert.equal(mfaNextStep({active:true,role:'owner'},aal1,[]),'enroll');
 assert.equal(mfaNextStep({active:true,role:'client'},aal1,[]),'denied');
 assert.equal(mfaNextStep({active:false,role:'seller'},aal1,[]),'denied');
 assert.match(read('web/lib/api.js'),/rpc\('is_evalia_staff'\)/);
});
test('servidor: is_evalia_admin excluye al vendedor y solo 9 operaciones aceptan personal',()=>{
 const sql=read('supabase/migrations/20261128140000_r1_roles_vendedor.sql');
 assert.match(sql,/a\.role in \('owner','operator'\) and evalia_security\.session_allowed\(a\.role\)/);
 const list=sql.slice(sql.indexOf('foreach v_sig in array array['),sql.indexOf('] loop'));
 assert.equal((list.match(/'public\./g)||[]).length,9);
 for(const forbidden of ['adjust_model_inventory','review_evalia_payment','archive_evalia_order','quick_evalia_checkout','edit_evalia_product','update_evalia_customer','revise_evalia_order','record_evalia_delivery','complete_evalia_order'])
  assert.ok(!list.includes(forbidden),forbidden+' no debe abrirse al vendedor');
 assert.match(sql,/<>1 then\s+raise exception 'Contrato inesperado/);
 assert.doesNotMatch(sql,/create policy staff_\w+ on public\.\w+ for (insert|update|delete)/);
 assert.match(sql,/p_role not in \('operator','seller'\)/);
 assert.match(read('supabase/tests/097_r1_roles_vendedor.sql'),/seller cannot approve payments/);
});
test('interfaz por rol: menú del vendedor y acciones administrativas ocultas',()=>{
 assert.match(page,/seller&&!SELLER_TABS\.includes\(tab\)\?<Notice type="error">/);
 const orders=section('Orders');
 for(const guard of ["canManage&&o.status==='active'&&!o.archived_at?<button","{canManage&&<div className=\"ev-order-next\"","{canManage&&<details className=\"ev-order-print-details\"","{canManage&&!o.archived_at&&<div className=\"ev-order-archive-action\"","canManage&&o.status==='active'&&<div className=\"ev-order-edit-access\""])
  assert.ok(orders.includes(guard),'falta guarda: '+guard);
 assert.ok(orders.includes('<PaymentForm targetId={o.id}'),'el vendedor puede informar pagos');
 assert.match(section('ClientPanel'),/\{canEdit&&<button/);
 const accounts=read('web/app/admin-accounts.jsx');
 assert.match(accounts,/rpc\('set_evalia_member_role'/);
 assert.match(accounts,/Cambiar a Vendedor/);
});
