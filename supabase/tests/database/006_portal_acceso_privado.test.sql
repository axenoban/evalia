-- D4: aislamiento de enlaces y permisos antes de publicar portal.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(24);

insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','evalia-portal-test@example.invalid');
insert into public.admin_profiles(user_id) values('10000000-0000-4000-8000-000000000001');
insert into public.models(id,name,size_label,price_dozen_bs)
 values('20000000-0000-4000-8000-000000000001','Modelo portal','M',360.00);
update public.model_inventory set on_hand=36 where model_id='20000000-0000-4000-8000-000000000001';
insert into public.customers(id,name,whatsapp)
 values('30000000-0000-4000-8000-000000000001','Ficticio portal','0000000');

select ok((select relrowsecurity from pg_class where oid='public.order_access_links'::regclass),'RLS de enlaces');
select ok((select relrowsecurity from pg_class where oid='public.payment_qr'::regclass),'RLS de QR');
select ok((select relrowsecurity from pg_class where oid='public.qr_change_events'::regclass),'RLS de historial QR');
select ok(not has_table_privilege('anon','public.order_access_links','SELECT'),'anónimo no consulta digests de enlaces');
select ok(not has_table_privilege('anon','public.payment_reports','SELECT'),'anónimo no lee pagos');
select ok(not has_function_privilege('authenticated','public.client_evalia_order(text)','EXECUTE'),'cliente sin rol service no invoca lectura');
select ok(not has_function_privilege('authenticated','public.client_evalia_payment(text,numeric,text,uuid)','EXECUTE'),'cliente sin rol service no sube pagos');
select ok(has_function_privilege('service_role','public.client_evalia_order(text)','EXECUTE'),'backend service puede leer solo por token');
select ok(has_function_privilege('service_role','public.client_evalia_payment(text,numeric,text,uuid)','EXECUTE'),'backend service puede registrar aviso');
select is((select public from storage.buckets where id='evalia-qr'),false,'QR en bucket privado');
select is((select public from storage.buckets where id='evalia-receipts'),false,'comprobantes privados');
select is((select file_size_limit from storage.buckets where id='evalia-receipts'),2097152::bigint,'limite físico de 2 MiB');

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select lives_ok($t$select public.create_evalia_order(
 '30000000-0000-4000-8000-000000000001'::uuid,
 '[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 '50000000-0000-4000-8000-000000000001'::uuid)$t$,'admin crea pedido real');
select lives_ok($t$select public.issue_evalia_order_link(
 (select id from public.orders where request_id='50000000-0000-4000-8000-000000000001'::uuid),
 repeat('a',64))$t$,'admin emite token hash');
select is((select version from public.order_access_links),1::bigint,'versión inicial');
select lives_ok($t$select public.issue_evalia_order_link(
 (select id from public.orders where request_id='50000000-0000-4000-8000-000000000001'::uuid),
 repeat('b',64))$t$,'admin reemplaza token');
select is((select version from public.order_access_links),2::bigint,'reemplazo incrementa versión');
select is((select count(*) from public.order_access_links),1::bigint,'solo un enlace vigente por pedido');
reset role;
set local role service_role;
select throws_ok($t$select public.client_evalia_order(repeat('a',64))$t$,
 '42501','Enlace no válido o cerrado','token anterior no funciona');
select is((public.client_evalia_order(repeat('b',64))->>'total')::numeric,360.00::numeric,'token vigente ve total correcto');
select is(jsonb_array_length(public.client_evalia_order(repeat('b',64))->'lines'),1,'solo líneas de su pedido');
select throws_ok($t$select public.client_evalia_payment(repeat('b',64),40.00,
 'receipts/00000000-0000-4000-8000-000000000099/11111111-1111-4111-8111-111111111111.jpg',
 '50000000-0000-4000-8000-000000000099'::uuid)$t$,
 '42501','Comprobante ajeno a este pedido','ruta de otro pedido prohibida');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select lives_ok($t$select public.revoke_evalia_order_link(
 (select id from public.orders where request_id='50000000-0000-4000-8000-000000000001'::uuid))$t$,
 'revocar enlace');
reset role;
set local role service_role;
select throws_ok($t$select public.client_evalia_order(repeat('b',64))$t$,
 '42501','Enlace no válido o cerrado','revocado no consulta ni QR');
select * from finish();
rollback;
