begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(16);
insert into auth.users(id,email) values
 ('a1000000-0000-4000-8000-000000000001','vf-owner@example.invalid'),
 ('a1000000-0000-4000-8000-000000000002','vf-admin@example.invalid');
insert into public.admin_profiles(user_id,role) values
 ('a1000000-0000-4000-8000-000000000001','owner'),('a1000000-0000-4000-8000-000000000002','operator');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('a1000000-0000-4000-8000-000000000011','a1000000-0000-4000-8000-000000000001',now(),now(),'aal2'),
 ('a1000000-0000-4000-8000-000000000012','a1000000-0000-4000-8000-000000000002',now(),now(),'aal1');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('a1000000-0000-4000-8000-000000000021','a1000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into public.customers(id,name,whatsapp,delivery_preference) values
 ('a1000000-0000-4000-8000-000000000031','Cliente VF','70010001','pickup');
insert into public.colors(id,name,hex_code) values('a1000000-0000-4000-8000-000000000041','Negro VF','#000000');
insert into public.models(id,name,size_label,price_dozen_bs) values ('a1000000-0000-4000-8000-000000000051','Princesa VF','M',384);
insert into public.model_colors(model_id,color_id) values ('a1000000-0000-4000-8000-000000000051','a1000000-0000-4000-8000-000000000041');
update public.model_inventory set on_hand=32 where model_id='a1000000-0000-4000-8000-000000000051';
create function pg_temp.stk() returns jsonb language sql as $$ select public.get_model_stock('a1000000-0000-4000-8000-000000000051') $$;
create function pg_temp.ver() returns bigint language sql as $$ select version from public.model_inventory where model_id='a1000000-0000-4000-8000-000000000051' $$;
create function pg_temp.adj(op text,n integer,req text) returns jsonb language sql as $$
 select public.adjust_model_inventory('a1000000-0000-4000-8000-000000000051',op,n,pg_temp.ver(),req::uuid) $$;

set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000002","session_id":"a1000000-0000-4000-8000-000000000012","aal":"aal1"}';
-- Un pedido activo de una docena: 12 comprometidas; 20 libres.
select lives_ok($q$select public.create_evalia_order('a1000000-0000-4000-8000-000000000031',
 '[{"modelId":"a1000000-0000-4000-8000-000000000051","dozens":1,"extraColorIds":[],"expectedPrice":"384.00"}]','a1000000-0000-4000-8000-000000000061')$q$,'pedido de una docena compromete 12 prendas');
select is(pg_temp.stk()->>'published'||'|'||(pg_temp.stk()->>'sold')||'|'||(pg_temp.stk()->>'available'),'32|0|20','al inicio: 32 publicadas, 0 vendidas, 20 libres');

-- Registrar 12 disponibles: las 8 que faltan se vendieron en físico; Publicadas no baja.
select is(pg_temp.adj('set_available',12,'a1000000-0000-4000-8000-000000000071')->>'available','12','registrar disponibles deja exactamente las libres indicadas');
select is(pg_temp.stk()->>'published','32','publicadas se mantiene: las prendas no desaparecen');
select is(pg_temp.stk()->>'physical_sold','8','la diferencia queda como venta física');
select is((select price_dozen_bs from public.inventory_events where request_id='a1000000-0000-4000-8000-000000000071'),384.00::numeric,'la venta guarda el precio por docena del momento');

-- Registrar más de las que había: llegaron prendas nuevas.
select is(pg_temp.adj('set_available',30,'a1000000-0000-4000-8000-000000000072')->>'available','30','subir disponibles las suma como prendas nuevas');
select is(pg_temp.stk()->>'published'||'|'||(pg_temp.stk()->>'sold'),'50|8','publicadas sube 18 y las vendidas no cambian');
select is((select price_dozen_bs from public.inventory_events where request_id='a1000000-0000-4000-8000-000000000072'),null::numeric,'una subida no se valora como venta');

-- Venta física explícita también suma a vendidas.
select is(pg_temp.adj('physical_sale',2,'a1000000-0000-4000-8000-000000000073')->>'available','28','venta física descuenta de libres');
select is(pg_temp.stk()->>'published'||'|'||(pg_temp.stk()->>'sold'),'50|10','venta física suma a vendidas sin bajar publicadas');

-- Error de carga: publicadas correctas = 45, sin contar venta.
select is(pg_temp.adj('correct_published',45,'a1000000-0000-4000-8000-000000000074')->>'available','23','corregir error fija publicadas y recalcula libres');
select is(pg_temp.stk()->>'published'||'|'||(pg_temp.stk()->>'sold'),'45|10','la corrección no cuenta como venta');
select throws_ok($q$select pg_temp.adj('correct_published',21,'a1000000-0000-4000-8000-000000000075')$q$,'23514',null,'no puede dejar menos que vendidas + comprometidas');

-- Estadísticas del propietario: 10 prendas vendidas en físico a 384 Bs/doc = 320 Bs estimados.
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000001","session_id":"a1000000-0000-4000-8000-000000000011","aal":"aal2"}';
create temp table s on commit drop as select public.get_evalia_owner_stats(now()-interval '1 day',now()+interval '1 day') v;
select is((select (v->'physical'->>'units')::int||'|'||(v->'physical'->>'amount') from s),'10|320.00','estadísticas muestran prendas y monto estimado a precio lista');
select is((select v->'physical'->'models'->0->>'name' from s),'Princesa VF','ranking de ventas físicas por modelo');
reset role;
select * from finish();
rollback;
