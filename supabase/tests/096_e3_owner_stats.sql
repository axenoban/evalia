begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(16);
-- Propietario con MFA (aal2) y operador sin MFA.
insert into auth.users(id,email) values
 ('e3000000-0000-4000-8000-000000000001','e3-owner@example.invalid'),
 ('e3000000-0000-4000-8000-000000000002','e3-operator@example.invalid');
insert into public.admin_profiles(user_id,role) values
 ('e3000000-0000-4000-8000-000000000001','owner'),('e3000000-0000-4000-8000-000000000002','operator');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('e3000000-0000-4000-8000-000000000011','e3000000-0000-4000-8000-000000000001',now(),now(),'aal2'),
 ('e3000000-0000-4000-8000-000000000012','e3000000-0000-4000-8000-000000000002',now(),now(),'aal1');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('e3000000-0000-4000-8000-000000000021','e3000000-0000-4000-8000-000000000001','totp','verified',now(),now());
-- Datos sintéticos aislados: dos clientes, dos modelos y pedidos dentro y fuera del periodo.
insert into public.customers(id,name,whatsapp,created_at) values
 ('e3000000-0000-4000-8000-000000000031','Cliente E3 Uno','70000301','2026-11-05T12:00:00Z'),
 ('e3000000-0000-4000-8000-000000000032','Cliente E3 Dos','70000302','2026-10-01T12:00:00Z');
insert into public.models(id,name,size_label,price_dozen_bs) values
 ('e3000000-0000-4000-8000-000000000041','Blusa E3','M',380),
 ('e3000000-0000-4000-8000-000000000042','Vestido E3','XL',420);
insert into public.orders(id,customer_id,status,confirmed_at,completed_at,completed_by,completion_request_id,archived_at,archived_by,archive_reason) values
 ('e3000000-0000-4000-8000-000000000051','e3000000-0000-4000-8000-000000000031','active','2026-11-10T15:00:00Z',null,null,null,null,null,null),
 ('e3000000-0000-4000-8000-000000000052','e3000000-0000-4000-8000-000000000032','completed','2026-11-12T15:00:00Z','2026-11-13T15:00:00Z','e3000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000091',null,null,null),
 ('e3000000-0000-4000-8000-000000000053','e3000000-0000-4000-8000-000000000031','voided','2026-11-14T15:00:00Z',null,null,null,'2026-11-14T16:00:00Z','e3000000-0000-4000-8000-000000000001','Prueba'),
 ('e3000000-0000-4000-8000-000000000054','e3000000-0000-4000-8000-000000000032','active','2026-10-20T15:00:00Z',null,null,null,null,null,null);
insert into public.order_lines(order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs) values
 ('e3000000-0000-4000-8000-000000000051','e3000000-0000-4000-8000-000000000041',12,1,0,380,380),
 ('e3000000-0000-4000-8000-000000000051','e3000000-0000-4000-8000-000000000042',6,0,6,420,210),
 ('e3000000-0000-4000-8000-000000000052','e3000000-0000-4000-8000-000000000041',7,0,7,380,222),
 ('e3000000-0000-4000-8000-000000000053','e3000000-0000-4000-8000-000000000041',24,2,0,380,760),
 ('e3000000-0000-4000-8000-000000000054','e3000000-0000-4000-8000-000000000042',12,1,0,420,420);
-- Cobros: uno aprobado dentro del periodo para un pedido de octubre (cuenta por fecha de aprobación),
-- uno aprobado fuera del periodo y uno pendiente que nunca suma.
insert into public.payment_reports(request_id,order_id,amount_bs,status,origin,approved_at,approved_by) values
 ('e3000000-0000-4000-8000-000000000061','e3000000-0000-4000-8000-000000000054',100,'approved','admin','2026-11-11T15:00:00Z','e3000000-0000-4000-8000-000000000001'),
 ('e3000000-0000-4000-8000-000000000062','e3000000-0000-4000-8000-000000000052',222,'approved','admin','2026-12-02T15:00:00Z','e3000000-0000-4000-8000-000000000001'),
 ('e3000000-0000-4000-8000-000000000063','e3000000-0000-4000-8000-000000000051',50,'pending','client',null,null);

set local role authenticated;
-- Operador: sin acceso a estadísticas ni exportación (D07).
set local request.jwt.claims='{"sub":"e3000000-0000-4000-8000-000000000002","session_id":"e3000000-0000-4000-8000-000000000012","aal":"aal1"}';
select throws_ok($q$select public.get_evalia_owner_stats('2026-11-01T04:00:00Z','2026-12-01T04:00:00Z')$q$,'42501',null,'operator cannot read statistics');
select throws_ok($q$select * from public.export_evalia_orders('2026-11-01T04:00:00Z','2026-12-01T04:00:00Z')$q$,'42501',null,'operator cannot export');
-- Propietario con MFA.
set local request.jwt.claims='{"sub":"e3000000-0000-4000-8000-000000000001","session_id":"e3000000-0000-4000-8000-000000000011","aal":"aal2"}';
select throws_ok($q$select public.get_evalia_owner_stats('2026-12-01T04:00:00Z','2026-11-01T04:00:00Z')$q$,'22023',null,'inverted period rejected');
create temp table s on commit drop as select public.get_evalia_owner_stats('2026-11-01T04:00:00Z','2026-12-01T04:00:00Z') v;
select is((select (v->'orders'->>'count')::int from s),2,'orders by confirmation date exclude voided and other periods');
select is((select (v->'orders'->>'units')::int from s),25,'units of confirmed orders in period');
select is((select (v->'orders'->>'amount')::numeric from s),812::numeric,'sum of frozen subtotals without re-rounding');
select is((select (v->'orders'->>'buyers')::int from s),2,'distinct buyers');
select is((select (v->'payments'->>'amount')::numeric from s),100::numeric,'payments by approval date only; pending never counted');
-- Saldo actual: 51 debe 590 (pendiente no cuenta), 54 debe 320; 52 completado y 53 anulado excluidos.
select is((select (v->'pending'->>'amount')::numeric from s),910::numeric,'current receivable balance from approved payments only');
select is((select (v->'pending'->>'orders')::int from s),2,'orders with balance');
select is((select v->'models'->0->>'name' from s),'Blusa E3','top model by units');
select is((select (v->'models'->0->>'units')::int from s),19,'model units aggregated across orders');
select is((select jsonb_array_length(v->'series') from s),30,'daily series covers every Bolivian day of the period');
select is((select (v->>'new_customers')::int from s),1,'new customers in period');
select is((select count(*)::int from public.export_evalia_orders('2026-11-01T04:00:00Z','2026-12-01T04:00:00Z')),3,'export lists lines of confirmed orders in period');
reset role;
select ok(not has_function_privilege('anon','public.get_evalia_owner_stats(timestamptz,timestamptz)','EXECUTE')
 and not has_function_privilege('anon','public.export_evalia_orders(timestamptz,timestamptz)','EXECUTE'),'anon cannot execute E3 functions');
select * from finish();
rollback;
