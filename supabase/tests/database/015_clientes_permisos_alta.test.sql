-- Regression: D8 shipping fields must be writable by every active admin,
-- but never by anonymous users, unauthorised users or suspended operators.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(20);

select ok(not has_column_privilege('authenticated','public.customers','name','INSERT'),'name: alta exclusivamente por RPC');
select ok(not has_column_privilege('authenticated','public.customers','whatsapp','INSERT'),'whatsapp: alta exclusivamente por RPC');
select ok(not has_column_privilege('authenticated','public.customers','delivery_preference','INSERT'),'delivery_preference: alta exclusivamente por RPC');
select ok(not has_column_privilege('authenticated','public.customers','shipping_destination','INSERT'),'shipping_destination: alta exclusivamente por RPC');
select ok(not has_column_privilege('authenticated','public.customers','id','INSERT'),'el cliente no puede definir id');
select ok(not has_column_privilege('authenticated','public.customers','created_at','INSERT'),'el cliente no puede definir created_at');
select ok(not has_column_privilege('authenticated','public.customers','updated_at','INSERT'),'el cliente no puede definir updated_at');
select ok(not has_column_privilege('anon','public.customers','name','INSERT'),'sin alta anonima por nombre');
select ok(not has_column_privilege('anon','public.customers','delivery_preference','INSERT'),'sin alta anonima por categoria');
select ok(not has_column_privilege('anon','public.customers','shipping_destination','INSERT'),'sin alta anonima por destino');
select ok((select relrowsecurity from pg_class where oid='public.customers'::regclass),'RLS sigue habilitado');
select ok(exists (
 select 1 from pg_policies
 where schemaname='public' and tablename='customers'
 and policyname='admin_insert' and cmd='INSERT'
 and 'authenticated'=any(roles)
 and with_check like '%is_evalia_admin%'
),'la politica de alta sigue restringida a admins');

insert into auth.users (id,email) values
 ('f1700000-0000-4000-8000-000000000001','qa-owner-customer@invalid.example'),
 ('f1700000-0000-4000-8000-000000000002','qa-operator-customer@invalid.example'),
 ('f1700000-0000-4000-8000-000000000003','qa-outsider-customer@invalid.example');
insert into public.admin_profiles(user_id,role,active) values
 ('f1700000-0000-4000-8000-000000000001','owner',true),
 ('f1700000-0000-4000-8000-000000000002','operator',true);
-- Sesión y factor sintéticos para probar permisos bajo MFA obligatorio.
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values('f1700000-0000-4000-8000-000000000012','f1700000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values('f1700000-0000-4000-8000-000000000011','f1700000-0000-4000-8000-000000000001',now(),now(),'aal2','f1700000-0000-4000-8000-000000000012'),('f1700000-0000-4000-8000-000000000013','f1700000-0000-4000-8000-000000000002',now(),now(),'aal1',null);

set local role authenticated;
select set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
set local request.jwt.claims='{"sub":"f1700000-0000-4000-8000-000000000001","session_id":"f1700000-0000-4000-8000-000000000011","aal":"aal2"}';
select lives_ok(
 $select public.create_evalia_customer('QA cliente permiso owner','70000111','pickup',null,'f1700000-0000-4000-8000-000000000021',false)$,
 'el propietario puede registrar un cliente de retiro');

select set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000002',true);
set local request.jwt.claims='{"sub":"f1700000-0000-4000-8000-000000000002","session_id":"f1700000-0000-4000-8000-000000000013","aal":"aal1"}';
select lives_ok(
 $select public.create_evalia_customer('QA cliente permiso operator','70000222','shipping','Santa Cruz, Bolivia','f1700000-0000-4000-8000-000000000022',false)$,
 'el operador activo puede registrar un cliente de envio');
select is((select count(*) from public.customers where name like 'QA cliente permiso %'),2::bigint,
 'ambos clientes quedaron disponibles para los admins');

select throws_ok($insert into public.customers(name,whatsapp) values('QA bypass','70000222')$,'42501','permission denied for table customers','admin no puede eludir RPC de alta');
select is((select shipping_destination from public.customers where name='QA cliente permiso operator'),'Santa Cruz, Bolivia','destino conservado mediante RPC');

reset role;
update public.admin_profiles set active=false where user_id='f1700000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000002',true);
set local request.jwt.claims='{"sub":"f1700000-0000-4000-8000-000000000002","session_id":"f1700000-0000-4000-8000-000000000013","aal":"aal1"}';
select throws_ok(
 $select public.create_evalia_customer('QA cliente permiso suspended','70000333','pickup',null,'f1700000-0000-4000-8000-000000000023',false)$,
 '42501',null,
 'operador suspendido no crea clientes');

select set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000003',true);
set local request.jwt.claims='{"sub":"f1700000-0000-4000-8000-000000000003","session_id":"f1700000-0000-4000-8000-000000000003","aal":"aal1"}';
select throws_ok(
 $select public.create_evalia_customer('QA cliente permiso outsider','70000444','pickup',null,'f1700000-0000-4000-8000-000000000024',false)$,
 '42501',null,
 'usuario sin perfil no crea clientes');

set local role anon;
select throws_ok(
 $$insert into public.customers(name,whatsapp,delivery_preference,shipping_destination)
   values('QA cliente permiso anon','70000555','pickup',null)$$,
 '42501','permission denied for table customers',
 'anon no crea clientes');

select * from finish();
rollback;
