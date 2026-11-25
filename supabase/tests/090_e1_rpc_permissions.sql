begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(160);
-- Inventario cerrado: toda ampliación exige revisión explícita.
create temporary table e1_expected(sig text primary key, authenticated boolean, service boolean);
insert into e1_expected values
 ('public.adjust_model_inventory(uuid,text,integer,bigint,uuid)',true,false),
 ('public.archive_evalia_model(uuid,timestamp with time zone)',true,false),
 ('public.archive_evalia_order(uuid,text)',true,false),
 ('public.can_manage_evalia_accounts()',true,false),
 ('public.client_evalia_order(text)',false,true),
 ('public.client_evalia_payment(text,numeric,text,uuid)',false,true),
 ('public.complete_evalia_order(uuid,uuid)',true,false),
 ('public.confirm_evalia_reservation(uuid,uuid)',true,false),
 ('public.create_evalia_customer(text,text,text,text,uuid,boolean)',true,false),
 ('public.create_evalia_model(text,text,numeric,uuid[],integer,uuid,text)',true,false),
 ('public.create_evalia_order_delivery(uuid,jsonb,uuid,text,text)',true,false),
 ('public.create_evalia_order(uuid,jsonb,uuid)',true,false),
 ('public.create_evalia_reservation(uuid,jsonb,uuid)',false,false),
 ('public.create_model_inventory()',false,false),
 ('public.evalia_validate_lines(jsonb)',false,false),
 ('public.evalia_validate_portions(jsonb)',false,false),
 ('public.finalize_evalia_archived_photo(text)',true,false),
 ('public.flag_stock_shortage(uuid,integer,uuid,text)',true,false),
 ('public.get_evalia_order_delivery(uuid)',true,false),
 ('public.get_evalia_order_finance(uuid)',true,false),
 ('public.get_model_stock(uuid)',true,false),
 ('public.is_evalia_admin()',true,false),
 ('public.is_evalia_owner()',true,false),
 ('public.issue_evalia_order_link(uuid,text)',true,false),
 ('public.list_evalia_admins()',true,false),
 ('public.log_evalia_recovery(uuid,uuid)',false,true),
 ('public.quick_evalia_checkout(uuid,text,uuid,text,boolean,boolean)',true,false),
 ('public.record_evalia_delivery(uuid,jsonb,uuid)',true,false),
 ('public.register_evalia_operator(uuid,uuid)',false,true),
 ('public.report_evalia_payment(uuid,uuid,numeric,uuid,text)',true,false),
 ('public.review_evalia_payment(uuid,text,uuid,text)',true,false),
 ('public.revise_evalia_order(uuid,jsonb,bigint,uuid)',true,false),
 ('public.revise_evalia_reservation(uuid,jsonb,uuid)',false,false),
 ('public.revoke_evalia_order_link(uuid)',true,false),
 ('public.set_evalia_operator_active(uuid,boolean)',true,false),
 ('public.set_evalia_order_prepared(uuid,boolean,bigint)',true,false),
 ('public.update_evalia_customer_delivery(uuid,text,text,text,text,timestamp with time zone,uuid)',true,false),
 ('public.update_evalia_customer(uuid,text,text,timestamp with time zone,uuid)',true,false),
 ('public.update_evalia_model(uuid,numeric,text,timestamp with time zone,uuid)',true,false),
 ('public.update_evalia_order_delivery(uuid,text,text,uuid)',true,false),
 ('public.update_evalia_qr(text,boolean,uuid)',true,false);
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef),41,'Inventario de SECURITY DEFINER');
select is((select count(*)::integer from e1_expected e where to_regprocedure(e.sig) is null),0,'Todas las firmas existen');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)),0,'Todas tienen search_path vacío');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.prosecdef and a.grantee=0 and a.privilege_type='EXECUTE'),0,'Ninguna concede EXECUTE a PUBLIC');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE')),0,'Ninguna accesible a anon');
select ok(coalesce((select p.prosecdef from pg_proc p where p.oid=to_regprocedure(e.sig)),false),e.sig||' sigue siendo SECURITY DEFINER') from e1_expected e order by sig;
select is(has_function_privilege('authenticated',to_regprocedure(e.sig),'EXECUTE'),e.authenticated,e.sig||' grant authenticated') from e1_expected e order by sig;
select is(has_function_privilege('service_role',to_regprocedure(e.sig),'EXECUTE'),e.service,e.sig||' grant service_role') from e1_expected e order by sig;
-- Identidad sin perfil de administrador; nunca crear datos reales.
set local role authenticated;
set local request.jwt.claims='{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
select is(public.is_evalia_admin(),false,'Sin perfil no es admin');
select is(public.is_evalia_owner(),false,'Sin perfil no es owner');
select is(public.can_manage_evalia_accounts(),false,'Sin perfil no gestiona cuentas');
select throws_ok('select public.adjust_model_inventory(null::uuid,null::text,null::integer,null::bigint,null::uuid)','42501',null,'Sin perfil: adjust_model_inventory denegada');
select throws_ok('select public.archive_evalia_model(null::uuid,null::timestamp with time zone)','42501',null,'Sin perfil: archive_evalia_model denegada');
select throws_ok('select public.archive_evalia_order(null::uuid,null::text)','42501',null,'Sin perfil: archive_evalia_order denegada');
select throws_ok('select public.complete_evalia_order(null::uuid,null::uuid)','42501',null,'Sin perfil: complete_evalia_order denegada');
select throws_ok('select public.confirm_evalia_reservation(null::uuid,null::uuid)','42501',null,'Sin perfil: confirm_evalia_reservation denegada');
select throws_ok('select public.create_evalia_customer(null::text,null::text,null::text,null::text,null::uuid,null::boolean)','42501',null,'Sin perfil: create_evalia_customer denegada');
select throws_ok('select public.create_evalia_model(null::text,null::text,null::numeric,null::uuid[],null::integer,null::uuid,null::text)','42501',null,'Sin perfil: create_evalia_model denegada');
select throws_ok('select public.create_evalia_order_delivery(null::uuid,null::jsonb,null::uuid,null::text,null::text)','42501',null,'Sin perfil: create_evalia_order_delivery denegada');
select throws_ok('select public.create_evalia_order(null::uuid,null::jsonb,null::uuid)','42501',null,'Sin perfil: create_evalia_order denegada');
select throws_ok('select public.finalize_evalia_archived_photo(null::text)','42501',null,'Sin perfil: finalize_evalia_archived_photo denegada');
select throws_ok('select public.flag_stock_shortage(null::uuid,null::integer,null::uuid,null::text)','42501',null,'Sin perfil: flag_stock_shortage denegada');
select throws_ok('select public.get_evalia_order_delivery(null::uuid)','42501',null,'Sin perfil: get_evalia_order_delivery denegada');
select throws_ok('select public.get_evalia_order_finance(null::uuid)','42501',null,'Sin perfil: get_evalia_order_finance denegada');
select throws_ok('select public.get_model_stock(null::uuid)','42501',null,'Sin perfil: get_model_stock denegada');
select throws_ok('select public.issue_evalia_order_link(null::uuid,null::text)','42501',null,'Sin perfil: issue_evalia_order_link denegada');
select throws_ok('select public.list_evalia_admins()','42501',null,'Sin perfil: list_evalia_admins denegada');
select throws_ok('select public.quick_evalia_checkout(null::uuid,null::text,null::uuid,null::text,null::boolean,null::boolean)','42501',null,'Sin perfil: quick_evalia_checkout denegada');
select throws_ok('select public.record_evalia_delivery(null::uuid,null::jsonb,null::uuid)','42501',null,'Sin perfil: record_evalia_delivery denegada');
select throws_ok('select public.report_evalia_payment(null::uuid,null::uuid,null::numeric,null::uuid,null::text)','42501',null,'Sin perfil: report_evalia_payment denegada');
select throws_ok('select public.review_evalia_payment(null::uuid,null::text,null::uuid,null::text)','42501',null,'Sin perfil: review_evalia_payment denegada');
select throws_ok('select public.revise_evalia_order(null::uuid,null::jsonb,null::bigint,null::uuid)','42501',null,'Sin perfil: revise_evalia_order denegada');
select throws_ok('select public.revoke_evalia_order_link(null::uuid)','42501',null,'Sin perfil: revoke_evalia_order_link denegada');
select throws_ok('select public.set_evalia_operator_active(null::uuid,null::boolean)','42501',null,'Sin perfil: set_evalia_operator_active denegada');
select throws_ok('select public.set_evalia_order_prepared(null::uuid,null::boolean,null::bigint)','42501',null,'Sin perfil: set_evalia_order_prepared denegada');
select throws_ok('select public.update_evalia_customer_delivery(null::uuid,null::text,null::text,null::text,null::text,null::timestamp with time zone,null::uuid)','42501',null,'Sin perfil: update_evalia_customer_delivery denegada');
select throws_ok('select public.update_evalia_customer(null::uuid,null::text,null::text,null::timestamp with time zone,null::uuid)','42501',null,'Sin perfil: update_evalia_customer denegada');
select throws_ok('select public.update_evalia_model(null::uuid,null::numeric,null::text,null::timestamp with time zone,null::uuid)','42501',null,'Sin perfil: update_evalia_model denegada');
select throws_ok('select public.update_evalia_order_delivery(null::uuid,null::text,null::text,null::uuid)','42501',null,'Sin perfil: update_evalia_order_delivery denegada');
select throws_ok('select public.update_evalia_qr(null::text,null::boolean,null::uuid)','42501',null,'Sin perfil: update_evalia_qr denegada');
-- list_evalia_admins: pruebas de rol operador existentes y refuerzo MFA pendiente.
-- set_evalia_operator_active: pruebas de rol operador existentes y refuerzo MFA pendiente.
-- update_evalia_qr: pruebas de rol operador existentes y refuerzo MFA pendiente.
reset role;
select * from finish();
rollback;
