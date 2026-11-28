begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(12);
insert into auth.users(id,email) values ('d9900000-0000-4000-8000-000000000001','stock-admin@example.invalid');
insert into public.admin_profiles(user_id,role) values ('d9900000-0000-4000-8000-000000000001','operator');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('d9900000-0000-4000-8000-000000000011','d9900000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.customers(id,name,whatsapp,delivery_preference) values
 ('d9900000-0000-4000-8000-000000000021','Cliente stock','70009901','pickup');
insert into public.colors(id,name,hex_code) values('d9900000-0000-4000-8000-000000000031','Negro stock','#000000');
insert into public.models(id,name,size_label,price_dozen_bs) values ('d9900000-0000-4000-8000-000000000041','Clasico stock','M',380);
insert into public.model_colors(model_id,color_id) values ('d9900000-0000-4000-8000-000000000041','d9900000-0000-4000-8000-000000000031');
update public.model_inventory set on_hand=32 where model_id='d9900000-0000-4000-8000-000000000041';

set local role authenticated;
set local request.jwt.claims='{"sub":"d9900000-0000-4000-8000-000000000001","session_id":"d9900000-0000-4000-8000-000000000011","aal":"aal1"}';
-- Pedido activo de una docena: 12 prendas comprometidas.
create temp table o on commit drop as select public.create_evalia_order('d9900000-0000-4000-8000-000000000021',
 '[{"modelId":"d9900000-0000-4000-8000-000000000041","dozens":1,"extraColorIds":[],"expectedPrice":"380.00"}]','d9900000-0000-4000-8000-000000000051') id;
select is((public.get_model_stock('d9900000-0000-4000-8000-000000000041')->>'available')::int,20,'32 publicadas con 12 comprometidas dejan 20 libres');

-- Caso de la captura: corregir a 12 libres conserva las 12 comprometidas (total 24), no deja 0 libres.
create temp table a on commit drop as select public.adjust_model_inventory('d9900000-0000-4000-8000-000000000041','set_available',12,
 (select version from public.model_inventory where model_id='d9900000-0000-4000-8000-000000000041'),'d9900000-0000-4000-8000-000000000061') r;
select is((select (r->>'available')::int from a),12,'corregir disponibles fija exactamente las prendas libres');
select is((select (r->>'on_hand')::int from a),24,'el total suma solo las comprometidas');
select is((public.get_model_stock('d9900000-0000-4000-8000-000000000041')->>'available')::int,12,'la lectura de stock coincide con el ajuste');
select is((select operation||'|'||input_units||'|'||before_units||'|'||after_units||'|'||available_after from public.inventory_events
 where request_id='d9900000-0000-4000-8000-000000000061'),'set_available|12|32|24|12','el ajuste queda auditado con antes y después');
select is((public.adjust_model_inventory('d9900000-0000-4000-8000-000000000041','set_available',12,0,'d9900000-0000-4000-8000-000000000061')->>'replayed')::boolean,
 true,'reintentar la misma solicitud no aplica el ajuste dos veces');

-- Cero libres: el total queda en las comprometidas y nunca por debajo.
select is((public.adjust_model_inventory('d9900000-0000-4000-8000-000000000041','set_available',0,
 (select version from public.model_inventory where model_id='d9900000-0000-4000-8000-000000000041'),'d9900000-0000-4000-8000-000000000062')->>'on_hand')::int,12,'0 libres deja el total igual a lo comprometido');
select throws_ok($q$select public.adjust_model_inventory('d9900000-0000-4000-8000-000000000041','set_available',-1,
 (select version from public.model_inventory where model_id='d9900000-0000-4000-8000-000000000041'),'d9900000-0000-4000-8000-000000000063')$q$,'22023',null,'no admite cantidades negativas');
select throws_ok($q$select public.adjust_model_inventory('d9900000-0000-4000-8000-000000000041','set_available',5,0,'d9900000-0000-4000-8000-000000000064')$q$,
 '40001',null,'con una versión desactualizada pide recargar');

-- Anular el pedido devuelve sus 12 prendas a disponibles sin intervención.
select lives_ok($q$select public.archive_evalia_order((select id from o),'Prueba de anulación')$q$,'el pedido sin cobros se puede anular');
select is((public.get_model_stock('d9900000-0000-4000-8000-000000000041')->>'available')::int,12,'al anular, las comprometidas vuelven a disponibles');
select is((public.get_model_stock('d9900000-0000-4000-8000-000000000041')->>'on_hand')::int,12,'el total no cambia al anular');
select * from finish();
rollback;
