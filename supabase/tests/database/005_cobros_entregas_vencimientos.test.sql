-- D3: pruebas de cobros, depósito, vencimiento F/L, entrega y cierre.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(39);

insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','evalia-cashier@example.invalid');
insert into public.admin_profiles(user_id) values('10000000-0000-4000-8000-000000000001');
-- Sesiones sintéticas válidas, no hay cambios en aserciones comerciales.
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.colors(id,name) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Prueba '||n from generate_series(1,6) n;
insert into public.models(id,name,size_label,price_dozen_bs) values('20000000-0000-4000-8000-000000000001','Modelo contable','M',360.00);
insert into public.model_colors(model_id,color_id)
 select '20000000-0000-4000-8000-000000000001'::uuid,id from public.colors;
update public.model_inventory set on_hand=72 where model_id='20000000-0000-4000-8000-000000000001';
insert into public.customers(id,name,whatsapp)
 values('30000000-0000-4000-8000-000000000001','Cliente de prueba','0000000');
-- Fixture histórica en transacción de prueba. En producción ambas RPC permanecen revocadas.
grant execute on function public.create_evalia_reservation(uuid,jsonb,uuid) to authenticated;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001","aal":"aal1"}';

select ok(public.is_evalia_admin(),'admin autorizado');
select lives_ok($t$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,'50000000-0000-4000-8000-000000000001'::uuid)$t$,'crear reserva A de una docena');
select lives_ok($t$select public.report_evalia_payment((select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid),null,100.00,'50000000-0000-4000-8000-000000000007'::uuid,'Depósito avisado')$t$,'declarar depósito sin aprobar');
select is((select status from public.payment_reports where request_id='50000000-0000-4000-8000-000000000007'::uuid),'pending'::text,'declaración permanece pendiente');
select lives_ok($t$select public.review_evalia_payment((select id from public.payment_reports where request_id='50000000-0000-4000-8000-000000000007'::uuid),'approve','50000000-0000-4000-8000-000000000008'::uuid,'Acreditado')$t$,'aprobar depósito oportuno');
select is((select status from public.payment_reports where request_id='50000000-0000-4000-8000-000000000007'::uuid),'approved'::text,'depósito aprobado y recibido');
select lives_ok($t$select public.review_evalia_payment((select id from public.payment_reports where request_id='50000000-0000-4000-8000-000000000007'::uuid),'approve','50000000-0000-4000-8000-000000000008'::uuid,'Acreditado')$t$,'reintento de aprobación único');
select is((select count(*)::integer from public.payment_reviews),1::integer,'sin evento de revisión duplicado');
select lives_ok($t$select public.confirm_evalia_reservation((select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid),'50000000-0000-4000-8000-000000000009'::uuid)$t$,'convertir reserva A a pedido');
select is((select (public.get_evalia_order_finance((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))->>'approved')::numeric),100.00::numeric,'depósito imputado solo una vez');
select is((select (public.get_evalia_order_finance((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))->>'pending')::numeric),260.00::numeric,'saldo exacto tras depósito');
select lives_ok($t$select public.report_evalia_payment(null,(select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),260.00,'50000000-0000-4000-8000-000000000011'::uuid,'Saldo avisado')$t$,'declarar segundo pago');
select is((select (public.get_evalia_order_finance((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))->>'pending')::numeric),260.00::numeric,'declaración pendiente no reduce saldo');
select throws_ok($t$select public.complete_evalia_order((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),'50000000-0000-4000-8000-000000000016'::uuid)$t$,'23514','No completar: pagos aprobados no liquidan exactamente el saldo','cierre bloqueado con saldo');
select lives_ok($t$select public.review_evalia_payment((select id from public.payment_reports where request_id='50000000-0000-4000-8000-000000000011'::uuid),'approve','50000000-0000-4000-8000-000000000012'::uuid,'Recibido')$t$,'aprobar saldo constatado');
select is((select (public.get_evalia_order_finance((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))->>'pending')::numeric),0::numeric,'saldo cero con pagos aprobados');
select throws_ok($t$select public.complete_evalia_order((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),'50000000-0000-4000-8000-000000000016'::uuid)$t$,'23514','No completar: faltan unidades por entregar','cierre bloqueado sin entrega');
select throws_ok($t$select public.record_evalia_delivery((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),'[{"orderLineId":"00000000-0000-4000-8000-000000000001","quantity":12}]'::jsonb,'50000000-0000-4000-8000-000000000017'::uuid)$t$,'23514','Línea no pertenece al pedido','rechaza línea ajena');
select lives_ok($t$select public.record_evalia_delivery((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),('[{"orderLineId":"' || (select id::text from public.order_lines where order_id=(select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid))) || '","quantity":12}]')::jsonb,'50000000-0000-4000-8000-000000000017'::uuid)$t$,'registrar entrega real total');
select lives_ok($t$select public.record_evalia_delivery((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),('[{"orderLineId":"' || (select id::text from public.order_lines where order_id=(select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid))) || '","quantity":12}]')::jsonb,'50000000-0000-4000-8000-000000000017'::uuid)$t$,'reintento no duplica entrega');
select is((select (public.get_evalia_order_delivery((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))->>'remaining')::integer),0::integer,'entrega total registrada');
select is((select on_hand from public.model_inventory where model_id='20000000-0000-4000-8000-000000000001'::uuid),60::integer,'stock físico se reduce 12');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'pending_delivery')::integer),0::integer,'pedido A deja de estar pendiente de entrega');
select lives_ok($t$select public.complete_evalia_order((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),'50000000-0000-4000-8000-000000000018'::uuid)$t$,'completar con pago y entrega exactos');
select lives_ok($t$select public.complete_evalia_order((select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)),'50000000-0000-4000-8000-000000000018'::uuid)$t$,'reintento de cierre idempotente');
select is((select status from public.orders where id=(select id from public.orders where origin_reservation_id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid))),'completed'::text,'pedido completado');
select is((select count(*)::integer from public.deliveries),1::integer,'entrega no duplicada');
select lives_ok($t$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'50000000-0000-4000-8000-000000000004'::uuid)$t$,'crear reserva B sin depósito');
select lives_ok($t$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'50000000-0000-4000-8000-000000000005'::uuid)$t$,'crear reserva C sin depósito');
select lives_ok($t$select public.report_evalia_payment((select id from public.reservations where request_id='50000000-0000-4000-8000-000000000005'::uuid),null,50.00,'50000000-0000-4000-8000-000000000020'::uuid,'Reserva C')$t$,'notificar depósito C');
select lives_ok($t$select public.review_evalia_payment((select id from public.payment_reports where request_id='50000000-0000-4000-8000-000000000020'::uuid),'approve','50000000-0000-4000-8000-000000000021'::uuid,'Comprobado')$t$,'aprobar depósito C oportunamente');
reset role;
select lives_ok($t$select evalia_internal.process_reservations((select expires_at+interval '1 minute' from public.reservations where id=(select id from public.reservations where request_id='50000000-0000-4000-8000-000000000001'::uuid)))$t$,'procesar vencimiento F ficticio');
select is((select status from public.reservations where request_id='50000000-0000-4000-8000-000000000004'::uuid),'expired'::text,'sin depósito expira y libera cupo');
select is((select status from public.reservations where request_id='50000000-0000-4000-8000-000000000005'::uuid),'saved'::text,'con depósito permanece reservada antes de L');
select lives_ok($t$select evalia_internal.process_reservations((select review_at+interval '1 minute' from public.reservations where id in (select id from public.reservations where request_id='50000000-0000-4000-8000-000000000005'::uuid)))$t$,'procesar vencimiento L ficticio');
select is((select status from public.reservations where request_id='50000000-0000-4000-8000-000000000005'::uuid),'in_review'::text,'con depósito pasa a revisión sin liberar');
select is((select count(*)::integer from public.reservation_expiration_events),2::integer,'solo dos eventos definitivos de vencimiento');
select lives_ok($t$select evalia_internal.process_reservations((select review_at+interval '1 minute' from public.reservations where id in (select id from public.reservations where request_id='50000000-0000-4000-8000-000000000005'::uuid)))$t$,'vencimiento idempotente');
select is((select count(*)::integer from public.reservation_expiration_events),2::integer,'reintentar cron no duplica liberación');
select * from finish();
rollback;
