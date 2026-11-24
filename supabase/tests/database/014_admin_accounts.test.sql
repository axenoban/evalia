begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(20);
insert into auth.users(id,email) values
 ('d9000000-0000-4000-8000-000000000001','owner@example.invalid'),
 ('d9000000-0000-4000-8000-000000000002','operator@example.invalid'),
 ('d9000000-0000-4000-8000-000000000003','other@example.invalid');
insert into public.admin_profiles(user_id,role) values('d9000000-0000-4000-8000-000000000001','owner');
insert into auth.sessions(id,user_id) values('d9000000-0000-4000-8000-000000000011','d9000000-0000-4000-8000-000000000001');
select ok(not has_function_privilege('anon','public.list_evalia_admins()','EXECUTE'),'anon no lista cuentas');
select ok(not has_function_privilege('authenticated','public.register_evalia_operator(uuid,uuid)','EXECUTE'),'cliente no puede crear perfiles');
select ok(has_function_privilege('service_role','public.register_evalia_operator(uuid,uuid)','EXECUTE'),'solo servidor aprovisiona');
select ok(not has_table_privilege('authenticated','public.admin_profiles','INSERT'),'no alta propia directa');
select ok(not has_table_privilege('authenticated','public.admin_profiles','UPDATE'),'no escalada de rol directa');
select ok(not has_table_privilege('authenticated','public.admin_account_events','INSERT'),'auditoria no falsificable desde cliente');
select ok(public.register_evalia_operator('d9000000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000002'),'propietario aprovisiona operador');
select is((select role from public.admin_profiles where user_id='d9000000-0000-4000-8000-000000000002'),'operator','alta siempre operador');
select is((select count(*) from public.admin_account_events where action='invite'),1::bigint,'invitación auditada');
select throws_ok($$select public.register_evalia_operator('d9000000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000003')$$,'42501','Acceso de propietario requerido','operador no puede aprovisionar');
set local role authenticated;
select set_config('request.jwt.claim.sub','d9000000-0000-4000-8000-000000000002',true);
select ok(public.is_evalia_admin(),'operador administra negocio');
select ok(not public.is_evalia_owner(),'operador no es propietario');
select throws_ok('select * from public.list_evalia_admins()','42501','Acceso de propietario requerido','operador no lista usuarios');
select throws_ok($$select public.update_evalia_qr('qr/test.png',true,'d9000000-0000-4000-8000-000000000021')$$,'42501','Acceso administrativo requerido','operador no cambia QR');
select set_config('request.jwt.claim.sub','d9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',jsonb_build_object('sub','d9000000-0000-4000-8000-000000000001','session_id','d9000000-0000-4000-8000-000000000011','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,true);
select ok(public.is_evalia_owner(),'propietario reconocido');
select is((select count(*) from public.list_evalia_admins()),2::bigint,'propietario lista perfiles');
select ok(public.can_manage_evalia_accounts(),'reautenticación reciente y sesión activa');
select ok(public.set_evalia_operator_active('d9000000-0000-4000-8000-000000000002',false),'propietario suspende operador');
select throws_ok($$select public.set_evalia_operator_active('d9000000-0000-4000-8000-000000000001',false)$$,'22023','Operador no encontrado o sin cambios','último propietario protegido');
select set_config('request.jwt.claim.sub','d9000000-0000-4000-8000-000000000002',true);
select ok(not public.is_evalia_admin(),'operador suspendido pierde autorización inmediatamente');
select * from finish();
rollback;
