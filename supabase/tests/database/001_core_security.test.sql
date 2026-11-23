begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(20);
select has_table('public','admin_profiles','admin identity exists');
select has_table('public','customers','customer identity exists');
select has_table('public','colors','global colors exist');
select has_table('public','models','models exist');
select has_table('public','model_colors','model colors exist');
select has_table('public','model_inventory','inventory by model exists');
select has_table('public','inventory_events','inventory log exists');
select has_table('public','reservations','reservation schema exists');
select has_table('public','orders','order schema exists');
select has_table('public','deliveries','delivery schema exists');
select has_table('public','stock_incidents','shortage incidents exist');
select ok(
 (select count(*)=14 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname in
 ('admin_profiles','customers','colors','models','model_colors','model_inventory',
  'inventory_events','reservations','reservation_lines','orders','order_lines',
  'deliveries','delivery_lines','stock_incidents') and c.relrowsecurity),
 'all 14 tables have RLS enabled'
);
select ok(not has_table_privilege('anon','public.customers','SELECT'),'anon cannot view customers');
select ok(not has_table_privilege('anon','public.orders','SELECT'),'anon cannot view orders');
select ok(not has_table_privilege('authenticated','public.model_inventory','UPDATE'),'cannot directly update stock');
select ok(not has_table_privilege('authenticated','public.orders','INSERT'),'cannot directly insert orders');
select ok(not has_table_privilege('authenticated','public.admin_profiles','INSERT'),'cannot self-enroll as admin');
select ok(not has_column_privilege('authenticated','public.models','size_label','UPDATE'),'cannot change model size');
select ok(has_function_privilege('authenticated','public.adjust_model_inventory(uuid,text,integer,bigint,uuid)','EXECUTE'),'authenticated can invoke guarded RPC');
select ok(not has_function_privilege('anon','public.adjust_model_inventory(uuid,text,integer,bigint,uuid)','EXECUTE'),'anon cannot invoke guarded RPC');
select * from finish();
rollback;