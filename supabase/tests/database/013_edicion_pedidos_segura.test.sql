begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(29);
-- Fixture independiente: nunca llega al proyecto comercial (rollback pgTAP).
insert into auth.users(id,email)
values('11110000-0000-4000-8000-000000000001','evalia-d9@example.invalid');
insert into public.admin_profiles(user_id)
values('11110000-0000-4000-8000-000000000001');
-- Sesiones sintéticas válidas, no hay cambios en aserciones comerciales.
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values ('11110000-0000-4000-8000-000000000001','11110000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.customers(id,name,whatsapp)
values('31110000-0000-4000-8000-000000000001','Cliente D9','70012345');
insert into public.models(id,name,size_label,price_dozen_bs)
values('21110000-0000-4000-8000-000000000001','D9 M','M',380),
      ('21110000-0000-4000-8000-000000000002','D9 XL','XL',420);
update public.model_inventory set on_hand=72
where model_id in('21110000-0000-4000-8000-000000000001','21110000-0000-4000-8000-000000000002');
insert into public.colors(id,name) values
 ('41110000-0000-4000-8000-000000000001','D9 uno'),
 ('41110000-0000-4000-8000-000000000002','D9 dos'),
 ('41110000-0000-4000-8000-000000000003','D9 tres'),
 ('41110000-0000-4000-8000-000000000004','D9 cuatro'),
 ('41110000-0000-4000-8000-000000000005','D9 cinco'),
 ('41110000-0000-4000-8000-000000000006','D9 seis');
insert into public.model_colors(model_id,color_id)
select '21110000-0000-4000-8000-000000000002'::uuid,id from public.colors
 where id::text like '41110000-%';
set local role authenticated;
set local request.jwt.claim.sub='11110000-0000-4000-8000-000000000001';
set local request.jwt.claims='{"sub":"11110000-0000-4000-8000-000000000001","session_id":"11110000-0000-4000-8000-000000000001","aal":"aal1"}';

select lives_ok($q$
 select public.create_evalia_order_delivery(
 '31110000-0000-4000-8000-000000000001'::uuid,
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 '51110000-0000-4000-8000-000000000001'::uuid,'pickup',null)
$q$,'creación de pedido de prueba sin pago ni entrega');

select is((select revision::integer from public.orders
 where request_id='51110000-0000-4000-8000-000000000001'),0,'versión inicial cero');

select lives_ok($q$
 select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":2,"extraColorIds":[]}]'::jsonb,
 0,'61110000-0000-4000-8000-000000000001'::uuid)
$q$,'aumentar 1 a 2 docenas conserva transacción');

select is((select revision::integer from public.orders
 where request_id='51110000-0000-4000-8000-000000000001'),1,'versión incrementada');
select is((select quantity from public.order_lines where model_id='21110000-0000-4000-8000-000000000001'
 and order_id=(select id from public.orders where request_id='51110000-0000-4000-8000-000000000001')),24,'24 prendas actuales');
select is((select subtotal_bs from public.order_lines
 where order_id=(select id from public.orders where request_id='51110000-0000-4000-8000-000000000001')),760::numeric,'subtotal recalculado');
select is((public.get_model_stock('21110000-0000-4000-8000-000000000001'::uuid)->>'available')::integer,48,'stock libre se ajusta sin doble descuento');
select is((select count(*)::integer from public.order_revisions),1,'una auditoría por edición');

select lives_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":2,"extraColorIds":[]}]'::jsonb,
 0,'61110000-0000-4000-8000-000000000001'::uuid)$q$,'reintento idempotente');

select is((select count(*)::integer from public.order_revisions),1,'reintento no duplica auditoría');
select throws_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 0,'61110000-0000-4000-8000-000000000001'::uuid)$q$,
 '23505','Reintento de edición con contenido distinto','reintento de distinto payload rechazado');
select throws_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 0,'61110000-0000-4000-8000-000000000002'::uuid)$q$,
 '40001','El pedido cambió. Actualiza antes de editar de nuevo','versión obsoleta impide sobrescribir');
select lives_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":2,"extraColorIds":[]},
   {"modelId":"21110000-0000-4000-8000-000000000002","dozens":0,"extraColorIds":[
   "41110000-0000-4000-8000-000000000001","41110000-0000-4000-8000-000000000002",
   "41110000-0000-4000-8000-000000000003","41110000-0000-4000-8000-000000000004",
   "41110000-0000-4000-8000-000000000005","41110000-0000-4000-8000-000000000006"]}]'::jsonb,
 1,'61110000-0000-4000-8000-000000000003'::uuid)$q$,'agrega XL media docena con seis colores');
select is((select count(*)::integer from public.order_lines
 where order_id=(select id from public.orders where request_id='51110000-0000-4000-8000-000000000001')),2,'dos modelos conservados');
select is((select price_dozen_bs from public.order_lines
 where model_id='21110000-0000-4000-8000-000000000001'),380::numeric,'precio histórico M preservado');
select is((select price_dozen_bs from public.order_lines
 where model_id='21110000-0000-4000-8000-000000000002'),420::numeric,'modelo agregado usa precio actual XL');
select is((select sum(subtotal_bs) from public.order_lines
 where order_id=(select id from public.orders where request_id='51110000-0000-4000-8000-000000000001')),970::numeric,'total nuevo 760+210');
select is((select count(*)::integer from public.order_extra_colors),6,'colores extra registrados sin duplicación');
select lives_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 2,'61110000-0000-4000-8000-000000000006'::uuid)$q$,
 'reducir a una docena y retirar modelo XL en una transacción');
select is((select count(*)::integer from public.order_lines
 where order_id=(select id from public.orders where request_id='51110000-0000-4000-8000-000000000001')),1,
 'se elimina la línea XL sin afectar a otros pedidos');
select is((public.get_model_stock('21110000-0000-4000-8000-000000000001'::uuid)->>'available')::integer,60,
 'reducir 2 a 1 docenas libera 12 prendas de M');
select is((public.get_model_stock('21110000-0000-4000-8000-000000000002'::uuid)->>'available')::integer,72,
 'quitar XL libera las seis prendas para otros pedidos');
select is((select count(*)::integer from public.order_extra_colors),0,
 'se limpian colores de una línea eliminada');
select is((select count(*)::integer from public.order_revisions),3,
 'una auditoría por cada edición verdadera');

select throws_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":7,"extraColorIds":[]}]'::jsonb,
 3,'61110000-0000-4000-8000-000000000004'::uuid)$q$,
 '23514','La modificación excede el stock libre del modelo 21110000-0000-4000-8000-000000000001','no sobreventa');

select lives_ok($q$select public.report_evalia_payment(null,
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 10,'71110000-0000-4000-8000-000000000001'::uuid,'pago informado')$q$,
 'informe de pago no acreditado registrado');

select throws_ok($q$select public.revise_evalia_order(
 (select id from public.orders where request_id='51110000-0000-4000-8000-000000000001'),
 '[{"modelId":"21110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,
 3,'61110000-0000-4000-8000-000000000005'::uuid)$q$,
 '23514','No se puede editar un pedido con pagos, entregas, enlace activo o histórico previo',
 'ningún pedido con actividad de pago admite edición');

select ok(not has_function_privilege('anon','public.revise_evalia_order(uuid,jsonb,bigint,uuid)','EXECUTE'),
 'anónimo sin permiso de RPC de edición');
select ok(not has_table_privilege('authenticated','public.order_revisions','INSERT'),
 'auditoría inmutable desde el frontend');
select * from finish();
rollback;
