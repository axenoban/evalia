CREATE OR REPLACE FUNCTION public.create_evalia_order(p_customer_id uuid, p_lines jsonb, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_entry record; v_stock jsonb; v_order uuid; v_line uuid;
 v_payload text; v_prior text; v_price numeric; v_i integer; v_expected jsonb;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_customer_id is null then
  raise exception 'Solicitud y cliente obligatorios' using errcode='22004';
 end if;
 v_payload:=pg_catalog.md5(p_customer_id::text||':'||coalesce(p_lines::text,'null'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id,request_fingerprint into v_order,v_prior
 from public.orders where request_id=p_request_id;
 if found then
  if v_prior is distinct from v_payload then
   raise exception 'Reintento con contenido distinto' using errcode='23505';
  end if;
  return v_order;
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then
  raise exception 'Cliente inexistente' using errcode='22023';
 end if;
 perform 1 from public.evalia_validate_portions(p_lines);
 for v_entry in select model_id,quantity from public.evalia_validate_portions(p_lines)
   order by model_id loop
  perform 1 from public.model_inventory where model_id=v_entry.model_id for update;
  if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
  v_stock:=public.get_model_stock(v_entry.model_id);
  if (v_stock->>'blocked')::boolean or (v_stock->>'available')::integer<v_entry.quantity then
   raise exception 'No hay prendas globales disponibles del modelo %',v_entry.model_id using errcode='23514';
  end if;
 end loop;
 insert into public.orders(customer_id,request_id,request_fingerprint)
 values(p_customer_id,p_request_id,v_payload) returning id into v_order;
 for v_entry in select * from public.evalia_validate_portions(p_lines) order by model_id loop
  select price_dozen_bs into v_price from public.models where id=v_entry.model_id for share;
  -- Optional quote guard for the new UI; preserve historical callers and exact idempotent retry.
  select item->'expectedPrice' into v_expected from jsonb_array_elements(p_lines) as q(item) where item->>'modelId'=v_entry.model_id::text;
  if v_expected is not null then
   if jsonb_typeof(v_expected)<>'string' or (v_expected#>>'{}') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'Precio esperado inválido' using errcode='22023';
   end if;
   if (v_expected#>>'{}')::numeric is distinct from v_price then
    raise exception 'El precio cambió; actualiza y revisa el pedido' using errcode='40001';
   end if;
  end if;
  insert into public.order_lines(order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs)
  values(v_order,v_entry.model_id,v_entry.quantity,v_entry.dozen_count,v_entry.extra_units,
         v_price,public.evalia_model_subtotal(v_price,v_entry.quantity))
  returning id into v_line;
  for v_i in 1..v_entry.extra_units loop
   insert into public.order_extra_colors(order_line_id,model_id,color_id,position)
   values(v_line,v_entry.model_id,v_entry.color_ids[v_i],v_i);
  end loop;
 end loop;
 return v_order;
end;$function$;
