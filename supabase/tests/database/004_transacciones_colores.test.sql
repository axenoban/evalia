-- Pruebas de integración contra Supabase local; cada test se revierte.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(26);

insert into auth.users(id,email)
 values('10000000-0000-4000-8000-000000000001','evalia-admin-test@example.invalid');
insert into public.admin_profiles(user_id)
 values('10000000-0000-4000-8000-000000000001');
insert into public.colors(id,name,hex_code)
 select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'C'||n,'#555555'
 from generate_series(1,13) n;
insert into public.models(id,name,size_label,price_dozen_bs)
 values
 ('20000000-0000-4000-8000-000000000001','Modelo A de prueba','M',381.00),
 ('20000000-0000-4000-8000-000000000002','Modelo B de prueba','XL',420.00);
insert into public.model_colors(model_id,color_id)
 select '20000000-0000-4000-8000-000000000001'::uuid,id from public.colors;
insert into public.model_colors(model_id,color_id)
 select '20000000-0000-4000-8000-000000000002'::uuid,id
 from public.colors where substring(name from 2)::integer<=6;
update public.model_inventory set on_hand=72 where model_id='20000000-0000-4000-8000-000000000001';
update public.model_inventory set on_hand=24 where model_id='20000000-0000-4000-8000-000000000002';
insert into public.customers(id,name,whatsapp)
 values('30000000-0000-4000-8000-000000000001','Comprador ficticio SQL','000000000');

-- Permisos restaurados temporalmente SOLO en esta transacción de pgTAP
-- para validar legados y vencimientos; rollback evita modificar la configuración real.
grant execute on function public.create_evalia_reservation(uuid,jsonb,uuid) to authenticated;
grant execute on function public.revise_evalia_reservation(uuid,jsonb,uuid) to authenticated;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select ok(public.is_evalia_admin(),'admin de prueba reconocido');
select lives_ok($sql$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'40000000-0000-4000-8000-000000000001'::uuid)$sql$,'reserva seis prendas con seis colores distintos');
select is((select sum(quantity)::integer from public.reservation_lines),6::integer,'reserva R=6');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'available')::integer),66::integer,'disponible 72-6=66');
select lives_ok($sql$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'40000000-0000-4000-8000-000000000001'::uuid)$sql$,'reintento de reserva no duplica');
select is((select count(*)::integer from public.reservations),1::integer,'reserva idempotente');
select lives_ok($sql$select public.revise_evalia_reservation((select id from public.reservations where request_id='40000000-0000-4000-8000-000000000001'::uuid),'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":["00000000-0000-4000-8000-000000000007"]}]'::jsonb,'40000000-0000-4000-8000-000000000002'::uuid)$sql$,'edición reutiliza cupo propio y permite docena+uno');
select is((select sum(quantity)::integer from public.reservation_lines),13::integer,'cupo editado R=13');
select is((select count(*)::integer from public.reservation_extra_colors),1::integer,'edición sustituye colores sin duplicar');
select is((select count(*)::integer from public.reservation_revisions),1::integer,'edición registra evento de auditoría');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'available')::integer),59::integer,'stock tras edición es 72-13');
select lives_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000002","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'40000000-0000-4000-8000-000000000003'::uuid)$sql$,'pedido directo de media docena por color');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000002'::uuid)->>'pending_delivery')::integer),6::integer,'pendiente del modelo B es 6');
select lives_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000002","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006"]}]'::jsonb,'40000000-0000-4000-8000-000000000003'::uuid)$sql$,'pedido directo idempotente');
select is((select count(*)::integer from public.orders),1::integer,'sin pedido duplicado');
select lives_ok($sql$select public.confirm_evalia_reservation((select id from public.reservations where request_id='40000000-0000-4000-8000-000000000001'::uuid),'40000000-0000-4000-8000-000000000004'::uuid)$sql$,'convertir reserva a pedido');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'reserved')::integer),0::integer,'reserva A transferida');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'pending_delivery')::integer),13::integer,'pedido A pendiente por 13');
select is((select count(*)::integer from public.order_extra_colors where model_id='20000000-0000-4000-8000-000000000001'::uuid),1::integer,'color extra sobrevive conversión');
select is((select (public.get_model_stock('20000000-0000-4000-8000-000000000001'::uuid)->>'available')::integer),59::integer,'conversión no consume dos veces');
select throws_ok($sql$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":0,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005"]}]'::jsonb,'40000000-0000-4000-8000-000000000010'::uuid)$sql$,'22023','Selecciona de 6 a 11 colores sin docena, o de 0 a 11 con docenas','cinco extras sin docena rechazadas');
select throws_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000001"]}]'::jsonb,'40000000-0000-4000-8000-000000000011'::uuid)$sql$,'23505','Solo una prenda por color en las unidades adicionales','no repetir color extra');
select throws_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004","00000000-0000-4000-8000-000000000005","00000000-0000-4000-8000-000000000006","00000000-0000-4000-8000-000000000007","00000000-0000-4000-8000-000000000008","00000000-0000-4000-8000-000000000009","00000000-0000-4000-8000-000000000010","00000000-0000-4000-8000-000000000011","00000000-0000-4000-8000-000000000012"]}]'::jsonb,'40000000-0000-4000-8000-000000000012'::uuid)$sql$,'22023','Selecciona de 6 a 11 colores sin docena, o de 0 a 11 con docenas','doce extras rechazadas');
select throws_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000002","dozens":1,"extraColorIds":["00000000-0000-4000-8000-000000000007"]}]'::jsonb,'40000000-0000-4000-8000-000000000013'::uuid)$sql$,'23514','El color 00000000-0000-4000-8000-000000000007 no está ofrecido en este modelo','color ajeno a modelo rechazado');
select throws_ok($sql$select public.create_evalia_order('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000002","dozens":3,"extraColorIds":[]}]'::jsonb,'40000000-0000-4000-8000-000000000014'::uuid)$sql$,'23514','No hay prendas globales disponibles del modelo 20000000-0000-4000-8000-000000000002','sobreventa de tres docenas rechazada');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000099';
select throws_ok($sql$select public.create_evalia_reservation('30000000-0000-4000-8000-000000000001'::uuid,'[{"modelId":"20000000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]'::jsonb,'40000000-0000-4000-8000-000000000015'::uuid)$sql$,'42501','Acceso administrativo requerido','usuario no admin rechazado');
select * from finish();
rollback;
