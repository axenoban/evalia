begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(22);
insert into auth.users(id,email) values
 ('c2000000-0000-4000-8000-000000000001','r2-admin@example.invalid'),
 ('c2000000-0000-4000-8000-000000000002','r2-seller@example.invalid');
insert into public.admin_profiles(user_id,role) values
 ('c2000000-0000-4000-8000-000000000001','operator'),('c2000000-0000-4000-8000-000000000002','seller');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('c2000000-0000-4000-8000-000000000011','c2000000-0000-4000-8000-000000000001',now(),now(),'aal1'),
 ('c2000000-0000-4000-8000-000000000012','c2000000-0000-4000-8000-000000000002',now(),now(),'aal1');
insert into public.customers(id,name,whatsapp,delivery_preference,shipping_destination) values
 ('c2000000-0000-4000-8000-000000000021','Cliente R2','70002001','shipping','Santa Cruz, terminal');
insert into public.colors(id,name,hex_code) values('c2000000-0000-4000-8000-000000000031','Negro R2','#000000');
insert into public.models(id,name,size_label,price_dozen_bs) values
 ('c2000000-0000-4000-8000-000000000041','Blusa R2','M',380),
 ('c2000000-0000-4000-8000-000000000042','Escaso R2','L',400);
insert into public.model_colors(model_id,color_id) values
 ('c2000000-0000-4000-8000-000000000041','c2000000-0000-4000-8000-000000000031'),
 ('c2000000-0000-4000-8000-000000000042','c2000000-0000-4000-8000-000000000031');
update public.model_inventory set on_hand=96 where model_id='c2000000-0000-4000-8000-000000000041';
update public.model_inventory set on_hand=6 where model_id='c2000000-0000-4000-8000-000000000042';

set local role authenticated;
set local request.jwt.claims='{"sub":"c2000000-0000-4000-8000-000000000002","session_id":"c2000000-0000-4000-8000-000000000012","aal":"aal1"}';
select throws_ok($q$select public.issue_evalia_customer_link('c2000000-0000-4000-8000-000000000021',repeat('a1',32))$q$,'42501',null,'seller cannot issue customer links');
set local request.jwt.claims='{"sub":"c2000000-0000-4000-8000-000000000001","session_id":"c2000000-0000-4000-8000-000000000011","aal":"aal1"}';
select is(public.issue_evalia_customer_link('c2000000-0000-4000-8000-000000000021',repeat('a1',32)),1,'administrator issues the personal link');
select is(public.issue_evalia_customer_link('c2000000-0000-4000-8000-000000000021',repeat('b2',32)),2,'reissuing replaces the link and increments version');
select throws_ok($q$select public.client_evalia_customer_session(repeat('b2',32))$q$,'42501',null,'panel users cannot call the client session directly');
reset role;
select ok(not has_function_privilege('anon','public.create_evalia_client_order(text,jsonb,uuid,text,text)','EXECUTE')
 and not has_function_privilege('anon','public.get_evalia_public_catalog()','EXECUTE'),'nothing client-facing is executable by anon');

set local role service_role;
select throws_ok($q$select public.client_evalia_customer_session(repeat('a1',32))$q$,'42501',null,'replaced link no longer works');
create temp table s on commit drop as select public.client_evalia_customer_session(repeat('b2',32)) v;
select is((select v->'customer'->>'name' from s),'Cliente R2','valid link resolves only its customer');
select is((select (e->>'available')::boolean from s,jsonb_array_elements(v->'catalog') e where e->>'id'='c2000000-0000-4000-8000-000000000041'),true,'model with a dozen is available');
select is((select (e->>'available')::boolean from s,jsonb_array_elements(v->'catalog') e where e->>'id'='c2000000-0000-4000-8000-000000000042'),false,'6 units with fewer than 6 colors is not purchasable');
select is((select (e->>'orderCapacity')::integer from s,jsonb_array_elements(v->'catalog') e where e->>'id'='c2000000-0000-4000-8000-000000000041'),96,'private order choices match available pieces');
select ok(not exists(select 1 from jsonb_array_elements(public.get_evalia_public_catalog()) e where e ? 'orderCapacity'),'public catalog omits private ordering limits');
select ok(not exists(select 1 from s,jsonb_array_elements(v->'catalog') e where e ? 'stock' or e ? 'on_hand' or e ? 'available_units'),'catalog never exposes stock quantities');
select lives_ok($q$select public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[],"expectedPrice":"380.00"}]','c2000000-0000-4000-8000-000000000051','shipping','Santa Cruz, terminal')$q$,'client confirms an order instantly');
select is((select o.fulfillment_method||'|'||o.shipping_destination||'|'||o.recipient_name from public.orders o join public.client_order_requests r on r.order_id=o.id where r.request_id='c2000000-0000-4000-8000-000000000051'),'shipping|Santa Cruz, terminal|Cliente R2','delivery snapshot stored like the panel');
select is(public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[],"expectedPrice":"380.00"}]','c2000000-0000-4000-8000-000000000051','shipping','Santa Cruz, terminal')->>'reference',
 (select substring(order_id::text,1,8) from public.client_order_requests where request_id='c2000000-0000-4000-8000-000000000051'),'retry returns the same order');
select throws_ok($q$select public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":0,"extraColorIds":[]}]','c2000000-0000-4000-8000-000000000052','pickup',null)$q$,'22023',null,'minimum per model enforced by the canonical validator');
select throws_ok($q$select public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[],"expectedPrice":"300.00"}]','c2000000-0000-4000-8000-000000000053','pickup',null)$q$,'40001',null,'stale price rejected without partial insert');
select lives_ok($q$select public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[]}]',('c2000000-0000-4000-8000-00000000006'||g)::uuid,'pickup',null) from generate_series(1,4) g$q$,'four more orders inside the daily limit');
select throws_ok($q$select public.create_evalia_client_order(repeat('b2',32),'[{"modelId":"c2000000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[]}]','c2000000-0000-4000-8000-000000000070','pickup',null)$q$,'54000',null,'sixth order in 24 hours is refused');
reset role;
select is((select count(*)::int from evalia_security.client_order_grants),0,'no ephemeral grant survives');
select is((select on_hand-0 from public.model_inventory where model_id='c2000000-0000-4000-8000-000000000041'),96,'physical stock untouched until delivery');
set local role authenticated;
set local request.jwt.claims='{"sub":"c2000000-0000-4000-8000-000000000001","session_id":"c2000000-0000-4000-8000-000000000011","aal":"aal1"}';
select ok(public.revoke_evalia_customer_link('c2000000-0000-4000-8000-000000000021'),'administrator revokes the link');
reset role;
select * from finish();
rollback;
