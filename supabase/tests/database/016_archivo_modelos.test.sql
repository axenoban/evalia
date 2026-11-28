begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(14);
insert into auth.users(id,email) values('18110000-0000-4000-8000-000000000001','archive@example.invalid');
insert into public.admin_profiles(user_id) values('18110000-0000-4000-8000-000000000001');
-- Sesiones sintéticas válidas, no hay cambios en aserciones comerciales.
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values ('18110000-0000-4000-8000-000000000001','18110000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.customers(id,name,whatsapp) values('38110000-0000-4000-8000-000000000001','Archivo prueba','70012345');
insert into public.models(id,name,size_label,price_dozen_bs,image_path) values
 ('28110000-0000-4000-8000-000000000001','Modelo histórico','M',380,'models/archive-test.jpg'),
 ('28110000-0000-4000-8000-000000000002','Modelo compartido','XL',420,'models/archive-test.jpg');
update public.model_inventory set on_hand=24 where model_id::text like '28110000-%';
set local role authenticated;
set local request.jwt.claim.sub='18110000-0000-4000-8000-000000000001';
set local request.jwt.claims='{"sub":"18110000-0000-4000-8000-000000000001","session_id":"18110000-0000-4000-8000-000000000001","aal":"aal1"}';
select lives_ok($q$select public.create_evalia_order_delivery('38110000-0000-4000-8000-000000000001',
 '[{"modelId":"28110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]',
 '58110000-0000-4000-8000-000000000001','pickup',null)$q$,'pedido activo creado');
select is((select public.archive_evalia_model(id,updated_at)->>'photo_path' from public.models where id='28110000-0000-4000-8000-000000000001'),null::text,'inhabilitar con pedido abierto, proteger foto compartida');
select is((public.get_model_stock('28110000-0000-4000-8000-000000000001')->>'pending_delivery')::integer,12,'compromiso del pedido intacto');
select lives_ok($q$select public.quick_evalia_checkout((select id from public.orders where request_id='58110000-0000-4000-8000-000000000001'),'pay_deliver','68110000-0000-4000-8000-000000000001',null,true,true)$q$,'completar pedido de modelo inhabilitado');
select ok((select not is_active from public.models where id='28110000-0000-4000-8000-000000000001'),'baja lógica');
select is((select name from public.models where id='28110000-0000-4000-8000-000000000001'),'Modelo histórico','nombre preservado');
select is((select price_dozen_bs from public.order_lines where model_id='28110000-0000-4000-8000-000000000001'),380::numeric,'precio del pedido intacto');
select is((select quantity from public.order_lines where model_id='28110000-0000-4000-8000-000000000001'),12,'cantidad histórica intacta');
select ok(not public.finalize_evalia_archived_photo('models/archive-test.jpg'),'no limpiar ruta compartida activa');
select throws_ok($q$select public.create_evalia_order_delivery('38110000-0000-4000-8000-000000000001',
 '[{"modelId":"28110000-0000-4000-8000-000000000001","dozens":1,"extraColorIds":[]}]',
 '58110000-0000-4000-8000-000000000002','pickup',null)$q$,'23514','El modelo está inactivo o no existe','no vender archivados');
select is((select public.archive_evalia_model(id,updated_at)->>'photo_path' from public.models where id='28110000-0000-4000-8000-000000000002'),'models/archive-test.jpg','última referencia activa permite limpieza');
select ok(public.finalize_evalia_archived_photo('models/archive-test.jpg'),'confirmar ausencia de objeto sin borrar metadata Storage por SQL');
select is((select count(*)::integer from public.models where id::text like '28110000-%' and image_path is null and not is_active),2,'ambos históricos conservados sin ruta');
select ok(not has_function_privilege('anon','public.archive_evalia_model(uuid,timestamptz)','execute') and not has_column_privilege('authenticated','public.models','is_active','update'),'permisos cerrados');
select * from finish();
rollback;
