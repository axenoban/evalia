-- EVALIA D2: operaciones mayoristas de reserva, pedido directo y conversión.
-- El color es informativo; ningún cupo se promete por color en V1.
begin;
alter table public.reservations add column request_id uuid unique;
alter table public.orders add column request_id uuid unique;

create function public.evalia_validate_lines(p_lines jsonb)
returns table(model_id uuid,quantity integer)
language plpgsql stable security definer set search_path=''
as $$
declare v_line jsonb; v_seen uuid[] := array[]::uuid[];
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0
    or jsonb_array_length(p_lines)>100 then
  raise exception 'Selecciona entre 1 y 100 modelos' using errcode='22023';
 end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(v_line)<>'object'
   or jsonb_typeof(v_line->'quantity')<>'number'
   or (v_line->>'quantity') !~ '^[0-9]+$'
   or (v_line->>'modelId') is null then
   raise exception 'Línea de modelo inválida' using errcode='22023';
  end if;
  model_id := (v_line->>'modelId')::uuid;
  quantity := (v_line->>'quantity')::integer;
  if quantity<6 or model_id=any(v_seen) then
   raise exception 'Cada modelo necesita al menos 6 unidades, sin duplicados' using errcode='22023';
  end if;
  v_seen:=array_append(v_seen,model_id);
  return next;
 end loop;
end;$$;
revoke all on function public.evalia_validate_lines(jsonb) from public,anon,authenticated;
grant execute on function public.evalia_validate_lines(jsonb) to authenticated;

create function public.evalia_model_subtotal(p_price numeric,p_quantity integer)
returns numeric language sql immutable set search_path=''
as $$
 select case when (p_price*p_quantity/12)-trunc(p_price*p_quantity/12)=0.50
 then trunc(p_price*p_quantity/12)+0.50
 else floor(p_price*p_quantity/12+0.50) end;
$$;

create function public.create_evalia_reservation(
 p_customer_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_ids uuid[]; v_qs integer[]; v_id uuid; v_qty integer; v_i integer; v_stock jsonb;
 v_reservation uuid; v_expiry timestamptz; v_day integer; v_days integer;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Solicitud sin identificador' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id into v_reservation from public.reservations where request_id=p_request_id;
 if found then return v_reservation; end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then
  raise exception 'Cliente inexistente' using errcode='22023';
 end if;
 select array_agg(model_id order by model_id),array_agg(quantity order by model_id)
 into v_ids,v_qs from public.evalia_validate_lines(p_lines);
 for v_i in 1..cardinality(v_ids) loop
  v_id:=v_ids[v_i]; v_qty:=v_qs[v_i];
  perform 1 from public.model_inventory where model_id=v_id for update;
  if not found or not exists(select 1 from public.models where id=v_id and is_active) then
   raise exception 'Modelo inexistente o inactivo' using errcode='22023';
  end if;
  v_stock:=public.get_model_stock(v_id);
  if (v_stock->>'blocked')::boolean or (v_stock->>'available')::integer<v_qty then
   raise exception 'Disponibilidad insuficiente para el modelo %',v_id using errcode='23514';
  end if;
 end loop;
 v_day:=extract(isodow from now() at time zone 'America/La_Paz')::integer;
 v_days:=case v_day when 1 then 2 when 2 then 4 when 3 then 3
  when 4 then 2 when 5 then 5 when 6 then 4 else 3 end;
 v_expiry:=(((now() at time zone 'America/La_Paz')::date + v_days)
             + time '12:00') at time zone 'America/La_Paz';
 insert into public.reservations(customer_id,status,expires_at,review_at,request_id)
 values(p_customer_id,'saved',v_expiry,v_expiry+interval '7 days',p_request_id)
 returning id into v_reservation;
 for v_i in 1..cardinality(v_ids) loop
  insert into public.reservation_lines(reservation_id,model_id,quantity)
  values(v_reservation,v_ids[v_i],v_qs[v_i]);
 end loop;
 return v_reservation;
end;$$;

create function public.create_evalia_order(
 p_customer_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_ids uuid[]; v_qs integer[]; v_id uuid; v_qty integer; v_i integer;
 v_stock jsonb; v_price numeric; v_order uuid;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Solicitud sin identificador' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id into v_order from public.orders where request_id=p_request_id;
 if found then return v_order; end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then
  raise exception 'Cliente inexistente' using errcode='22023';
 end if;
 select array_agg(model_id order by model_id),array_agg(quantity order by model_id)
 into v_ids,v_qs from public.evalia_validate_lines(p_lines);
 for v_i in 1..cardinality(v_ids) loop
  v_id:=v_ids[v_i];v_qty:=v_qs[v_i];
  perform 1 from public.model_inventory where model_id=v_id for update;
  if not found or not exists(select 1 from public.models where id=v_id and is_active) then
   raise exception 'Modelo inexistente o inactivo' using errcode='22023';
  end if;
  v_stock:=public.get_model_stock(v_id);
  if (v_stock->>'blocked')::boolean or (v_stock->>'available')::integer<v_qty then
   raise exception 'Disponibilidad insuficiente para el modelo %',v_id using errcode='23514';
  end if;
 end loop;
 insert into public.orders(customer_id,request_id) values(p_customer_id,p_request_id)
 returning id into v_order;
 for v_i in 1..cardinality(v_ids) loop
  select price_dozen_bs into v_price from public.models where id=v_ids[v_i];
  insert into public.order_lines(order_id,model_id,quantity,price_dozen_bs,subtotal_bs)
  values(v_order,v_ids[v_i],v_qs[v_i],v_price,public.evalia_model_subtotal(v_price,v_qs[v_i]));
 end loop;
 return v_order;
end;$$;

create function public.confirm_evalia_reservation(
 p_reservation_id uuid,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_res public.reservations%rowtype; v_order uuid; v_item record; v_price numeric;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_reservation_id is null or p_request_id is null then raise exception 'Datos faltantes' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_res from public.reservations where id=p_reservation_id for update;
 if not found then raise exception 'Reserva inexistente' using errcode='P0002'; end if;
 select id into v_order from public.orders where origin_reservation_id=p_reservation_id;
 if found then return v_order; end if;
 if v_res.status<>'saved' or v_res.expires_at<=now() then
  raise exception 'Reserva vencida o sujeta a revisión' using errcode='23514';
 end if;
 -- Locks en orden compartido con stock y pedidos.
 for v_item in select model_id from public.reservation_lines
    where reservation_id=p_reservation_id order by model_id loop
  perform 1 from public.model_inventory where model_id=v_item.model_id for update;
  if not found then raise exception 'Inventario no encontrado' using errcode='P0002'; end if;
 end loop;
 insert into public.orders(customer_id,origin_reservation_id,request_id)
 values(v_res.customer_id,p_reservation_id,p_request_id)
 returning id into v_order;
 for v_item in select model_id,quantity from public.reservation_lines where reservation_id=p_reservation_id loop
  select price_dozen_bs into v_price from public.models where id=v_item.model_id;
  insert into public.order_lines(order_id,model_id,quantity,price_dozen_bs,subtotal_bs)
  values(v_order,v_item.model_id,v_item.quantity,v_price,
   public.evalia_model_subtotal(v_price,v_item.quantity));
 end loop;
 update public.reservations set status='converted',updated_at=now() where id=p_reservation_id;
 return v_order;
end;$$;

revoke all on function public.evalia_model_subtotal(numeric,integer) from public,anon,authenticated;
grant execute on function public.evalia_model_subtotal(numeric,integer) to authenticated;
revoke all on function public.create_evalia_reservation(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_evalia_reservation(uuid,jsonb,uuid) to authenticated;
revoke all on function public.create_evalia_order(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_evalia_order(uuid,jsonb,uuid) to authenticated;
revoke all on function public.confirm_evalia_reservation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_evalia_reservation(uuid,uuid) to authenticated;
commit;