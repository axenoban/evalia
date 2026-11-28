begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(26);
insert into auth.users(id,email) values
 ('b7000000-0000-4000-8000-000000000001','r1-owner@example.invalid'),
 ('b7000000-0000-4000-8000-000000000002','r1-admin@example.invalid'),
 ('b7000000-0000-4000-8000-000000000003','r1-seller@example.invalid'),
 ('b7000000-0000-4000-8000-000000000004','r1-other@example.invalid');
insert into public.admin_profiles(user_id,role) values
 ('b7000000-0000-4000-8000-000000000001','owner'),('b7000000-0000-4000-8000-000000000002','operator'),
 ('b7000000-0000-4000-8000-000000000003','seller');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('b7000000-0000-4000-8000-000000000011','b7000000-0000-4000-8000-000000000001',now(),now(),'aal2'),
 ('b7000000-0000-4000-8000-000000000012','b7000000-0000-4000-8000-000000000002',now(),now(),'aal1'),
 ('b7000000-0000-4000-8000-000000000013','b7000000-0000-4000-8000-000000000003',now(),now(),'aal1');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('b7000000-0000-4000-8000-000000000021','b7000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into public.models(id,name,size_label,price_dozen_bs) values('b7000000-0000-4000-8000-000000000041','Blusa R1','M',380);
update public.model_inventory set on_hand=72 where model_id='b7000000-0000-4000-8000-000000000041';
select throws_ok($q$insert into public.admin_profiles(user_id,role) values('b7000000-0000-4000-8000-000000000004','client')$q$,'23514',null,'role values remain closed');

set local role authenticated;
-- Vendedor: registra clientes y pedidos, informa pagos y ve pedidos; nada más.
set local request.jwt.claims='{"sub":"b7000000-0000-4000-8000-000000000003","session_id":"b7000000-0000-4000-8000-000000000013","aal":"aal1"}';
select is(public.get_evalia_my_role(),'seller','seller role resolved with valid session');
select is(public.is_evalia_staff(),true,'seller is staff');
select is(public.is_evalia_admin(),false,'seller is not a full administrator');
select lives_ok($q$select public.create_evalia_customer('Cliente R1','70001001','pickup',null,'b7000000-0000-4000-8000-000000000051',false)$q$,'seller registers customers');
select lives_ok($q$select public.create_evalia_order_delivery((select id from public.customers where whatsapp='70001001'),'[{"modelId":"b7000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[],"expectedPrice":"380.00"}]','b7000000-0000-4000-8000-000000000061','pickup',null)$q$,'seller registers confirmed orders with the same validation');
select is((select count(*)::int from public.orders where request_id='b7000000-0000-4000-8000-000000000061'),1,'seller reads all orders');
select is((public.get_model_stock('b7000000-0000-4000-8000-000000000041')->>'available')::int,60,'seller reads stock; order committed inventory once');
select lives_ok($q$select public.report_evalia_payment(null,(select id from public.orders where request_id='b7000000-0000-4000-8000-000000000061'),100,'b7000000-0000-4000-8000-000000000071','Transferencia')$q$,'seller informs payments');
select is((select status from public.payment_reports where request_id='b7000000-0000-4000-8000-000000000071'),'pending','informed payment stays pending');
select throws_ok($q$select public.review_evalia_payment((select id from public.payment_reports where request_id='b7000000-0000-4000-8000-000000000071'),'approve','b7000000-0000-4000-8000-000000000072',null)$q$,'42501',null,'seller cannot approve payments');
select throws_ok($q$select public.adjust_model_inventory('b7000000-0000-4000-8000-000000000041','add',12,(public.get_model_stock('b7000000-0000-4000-8000-000000000041')->>'version')::bigint,'b7000000-0000-4000-8000-000000000073')$q$,'42501',null,'seller cannot adjust stock');
select throws_ok($q$select public.archive_evalia_order((select id from public.orders where request_id='b7000000-0000-4000-8000-000000000061'),'Prueba')$q$,'42501',null,'seller cannot void orders');
select throws_ok($q$select public.quick_evalia_checkout((select id from public.orders where request_id='b7000000-0000-4000-8000-000000000061'),'pay','b7000000-0000-4000-8000-000000000074',null,true,false)$q$,'42501',null,'seller cannot register checkout');
select throws_ok($q$select public.update_evalia_customer((select id from public.customers where whatsapp='70001001'),'Otro','70001001',now(),'b7000000-0000-4000-8000-000000000075')$q$,'42501',null,'seller cannot edit customers');
select throws_ok($q$select public.get_evalia_owner_stats(now()-interval '1 day',now())$q$,'42501',null,'seller cannot read statistics');
select throws_ok($q$select public.set_evalia_member_role('b7000000-0000-4000-8000-000000000002','seller')$q$,'42501',null,'seller cannot change roles');
select is((select count(*)::int from public.inventory_events),0,'seller cannot read inventory audit');
-- Administrador: conserva todos los permisos operativos, pero no gestiona roles.
set local request.jwt.claims='{"sub":"b7000000-0000-4000-8000-000000000002","session_id":"b7000000-0000-4000-8000-000000000012","aal":"aal1"}';
select is(public.is_evalia_admin(),true,'administrator keeps full business access');
select throws_ok($q$select public.set_evalia_member_role('b7000000-0000-4000-8000-000000000003','operator')$q$,'42501',null,'administrator cannot change roles');
-- Administrador global con contraseña reciente.
select set_config('request.jwt.claims',jsonb_build_object('sub','b7000000-0000-4000-8000-000000000001','session_id','b7000000-0000-4000-8000-000000000011','aal','aal2','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,true);
select throws_ok($q$select public.set_evalia_member_role('b7000000-0000-4000-8000-000000000001','seller')$q$,'22023',null,'global administrator cannot demote itself');
select throws_ok($q$select public.set_evalia_member_role('b7000000-0000-4000-8000-000000000003','owner')$q$,'22023',null,'nobody can be promoted to global administrator');
select ok(public.set_evalia_member_role('b7000000-0000-4000-8000-000000000002','seller'),'global administrator changes administrator to seller');
select ok(public.set_evalia_operator_active('b7000000-0000-4000-8000-000000000003',false),'global administrator suspends a seller');
reset role;
select is((select count(*)::int from public.admin_account_events where action='role_change' and detail='seller'),1,'role change audited');
set local role authenticated;
set local request.jwt.claims='{"sub":"b7000000-0000-4000-8000-000000000003","session_id":"b7000000-0000-4000-8000-000000000013","aal":"aal1"}';
select is(public.is_evalia_staff(),false,'suspended seller loses access immediately');
reset role;
select * from finish();
rollback;
