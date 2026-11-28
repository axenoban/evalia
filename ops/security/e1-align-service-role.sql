-- E1-03: converger las ACL reproducibles con la política observada en producción.
-- No altera cuerpos, datos, RLS ni grants authenticated. Las cuatro RPC de servicio se conservan.
revoke execute on function public.adjust_model_inventory(uuid,text,integer,bigint,uuid) from service_role;
revoke execute on function public.complete_evalia_order(uuid,uuid) from service_role;
revoke execute on function public.confirm_evalia_reservation(uuid,uuid) from service_role;
revoke execute on function public.create_evalia_model(text,text,numeric,uuid[],integer,uuid,text) from service_role;
revoke execute on function public.create_evalia_order(uuid,jsonb,uuid) from service_role;
revoke execute on function public.create_model_inventory() from service_role;
revoke execute on function public.evalia_validate_lines(jsonb) from service_role;
revoke execute on function public.evalia_validate_portions(jsonb) from service_role;
revoke execute on function public.flag_stock_shortage(uuid,integer,uuid,text) from service_role;
revoke execute on function public.get_evalia_order_delivery(uuid) from service_role;
revoke execute on function public.get_evalia_order_finance(uuid) from service_role;
revoke execute on function public.get_model_stock(uuid) from service_role;
revoke execute on function public.is_evalia_admin() from service_role;
revoke execute on function public.issue_evalia_order_link(uuid,text) from service_role;
revoke execute on function public.record_evalia_delivery(uuid,jsonb,uuid) from service_role;
revoke execute on function public.report_evalia_payment(uuid,uuid,numeric,uuid,text) from service_role;
revoke execute on function public.review_evalia_payment(uuid,text,uuid,text) from service_role;
revoke execute on function public.revoke_evalia_order_link(uuid) from service_role;
revoke execute on function public.update_evalia_customer(uuid,text,text,timestamp with time zone,uuid) from service_role;
revoke execute on function public.update_evalia_model(uuid,numeric,text,timestamp with time zone,uuid) from service_role;
revoke execute on function public.update_evalia_qr(text,boolean,uuid) from service_role;
