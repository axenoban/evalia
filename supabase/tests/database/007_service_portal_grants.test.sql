begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(9);

select ok(has_schema_privilege('service_role','public','USAGE'),'backend puede acceder al esquema');
select ok(has_table_privilege('service_role','public.payment_qr','SELECT'),'backend puede comprobar QR configurado');
select ok(has_table_privilege('service_role','public.payment_reports','SELECT'),'backend puede limitar avisos de pago por pedido');
select ok(not has_table_privilege('anon','public.payment_qr','SELECT'),'QR privado no expuesto a anónimos');
select ok(not has_table_privilege('anon','public.payment_reports','SELECT'),'pagos privados no expuestos a anónimos');
select ok(not has_table_privilege('authenticated','public.payment_qr','INSERT'),'cliente autenticado no modifica QR');
select ok(not has_table_privilege('authenticated','public.payment_reports','INSERT'),'cliente autenticado no aprueba ni inserta pagos directamente');
select ok(has_function_privilege('service_role','public.client_evalia_order(text)','EXECUTE'),'consulta de pedido protegida vía RPC');
select ok(has_function_privilege('service_role','public.client_evalia_payment(text,numeric,text,uuid)','EXECUTE'),'aviso de pago protegido vía RPC');

select * from finish();
rollback;
