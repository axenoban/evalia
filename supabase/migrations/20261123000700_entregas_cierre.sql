-- EVALIA D3-B: entrega física real + cierre administrativo C1+C2+C3.
-- No crea pagos ficticios, no entrega más de lo vendido, no descuenta dos veces.
begin;
alter table public.deliveries add column request_id uuid unique;
alter table public.deliveries add column request_fingerprint text;
alter table public.orders add column completed_by uuid references public.admin_profiles(user_id) on delete restrict;
alter table public.orders add column completion_request_id uuid unique;
alter table public.orders add constraint completed_consistency check (
 (status='active' and completed_at is null and completed_by is null and completion_request_id is null)
 or (status='completed' and completed_at is not null and completed_by is not null and completion_request_id is not null)
);
create index if not exists deliveries_actor_idx on public.deliveries(actor_id);

create function public.get_evalia_order_delivery(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_sold bigint; v_given bigint;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 select coalesce(sum(quantity),0) into v_sold from public.order_lines where order_id=p_order_id;
 select coalesce(sum(dl.quantity),0) into v_given from public.delivery_lines dl
  join public.deliveries d on d.id=dl.delivery_id where d.order_id=p_order_id;
 if v_given>v_sold then raise exception 'Entrega excede pedido' using errcode='23514'; end if;
 return jsonb_build_object('ordered',v_sold,'delivered',v_given,'remaining',v_sold-v_given);
end;$$;
revoke all on function public.get_evalia_order_delivery(uuid) from public,anon,authenticated;
grant execute on function public.get_evalia_order_delivery(uuid) to authenticated;

create function public.record_evalia_delivery(
 p_order_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_order public.orders%rowtype; v_prior public.deliveries%rowtype; v_id uuid;
 v_total numeric; v_paid numeric; v_payload text; v_entry record; v_stock record;
 v_prev bigint; v_i integer; v_line jsonb; v_ids uuid[]:=array[]::uuid[];
 v_line_id uuid; v_q integer; v_model uuid;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_order_id is null or p_request_id is null or p_lines is null or
    jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then
  raise exception 'Entrega sin líneas válidas' using errcode='22023';
 end if;
 v_payload:=md5(p_order_id::text||':'||p_lines::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.deliveries where request_id=p_request_id;
 if found then
  if v_prior.order_id<>p_order_id or v_prior.request_fingerprint is distinct from v_payload then
   raise exception 'Solicitud de entrega reutilizada con otro contenido' using errcode='23505';
  end if;
  return v_prior.id;
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' then
  raise exception 'Pedido inexistente o ya completado' using errcode='23514';
 end if;
 -- Validación del dinero, sin inferir depósitos por aviso ni cerrar con exceso.
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=p_order_id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
 where status='approved' and
   (order_id=p_order_id or (v_order.origin_reservation_id is not null
    and reservation_id=v_order.origin_reservation_id));
 if v_paid<>v_total then
  raise exception 'No se puede registrar retiro sin saldo aprobado exactamente liquidado' using errcode='23514';
 end if;
 -- Validar líneas y bloquear modelos en orden estable antes de consumir físico.
 for v_line in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(v_line)<>'object'
     or jsonb_typeof(v_line->'quantity')<>'number'
     or coalesce(v_line->>'quantity','') !~ '^[1-9][0-9]*$'
     or length(coalesce(v_line->>'quantity',''))>10
     or v_line->>'orderLineId' is null then
   raise exception 'Cantidad/identificador de entrega inválido' using errcode='22023';
  end if;
  v_line_id:=(v_line->>'orderLineId')::uuid;
  v_q:=(v_line->>'quantity')::bigint;
  if v_q>2147483647 then
   raise exception 'Cantidad de entrega fuera de rango' using errcode='22003';
  end if;
  if v_line_id=any(v_ids) then
   raise exception 'Línea de entrega duplicada' using errcode='23505';
  end if;
  v_ids:=array_append(v_ids,v_line_id);
  if not exists(select 1 from public.order_lines where id=v_line_id and order_id=p_order_id) then
   raise exception 'Línea no pertenece al pedido' using errcode='23514';
  end if;
 end loop;
 for v_entry in select distinct ol.model_id from public.order_lines ol
  where ol.id=any(v_ids) order by ol.model_id loop
   perform 1 from public.model_inventory where model_id=v_entry.model_id for update;
   if not found then raise exception 'No existe inventario del modelo' using errcode='P0002'; end if;
 end loop;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_line_id:=(v_line->>'orderLineId')::uuid;
  v_q:=(v_line->>'quantity')::integer;
  select ol.quantity,ol.model_id into v_prev,v_model from public.order_lines ol where ol.id=v_line_id;
  select coalesce(sum(dl.quantity),0) into v_i from public.delivery_lines dl
   where dl.order_line_id=v_line_id;
  if v_q>v_prev-v_i then
    raise exception 'Entrega supera unidades pendientes de esta línea' using errcode='23514';
  end if;
 end loop;
 insert into public.deliveries(order_id,actor_id,request_id,request_fingerprint)
 values(p_order_id,auth.uid(),p_request_id,v_payload) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_line_id:=(v_line->>'orderLineId')::uuid;v_q:=(v_line->>'quantity')::integer;
  select ol.model_id into v_model from public.order_lines ol where ol.id=v_line_id;
  insert into public.delivery_lines(delivery_id,order_line_id,order_id,quantity)
   values(v_id,v_line_id,p_order_id,v_q);
  update public.model_inventory
   set on_hand=on_hand-v_q,version=version+1,updated_at=now()
   where model_id=v_model and on_hand>=v_q;
  if not found then raise exception 'El stock físico es insuficiente' using errcode='23514'; end if;
 end loop;
 return v_id;
end;$$;
revoke all on function public.record_evalia_delivery(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.record_evalia_delivery(uuid,jsonb,uuid) to authenticated;

create function public.complete_evalia_order(
 p_order_id uuid,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_total numeric; v_paid numeric;
 v_sold bigint; v_delivered bigint;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_order_id is null or p_request_id is null then
  raise exception 'Identificadores obligatorios' using errcode='22004';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 if v_order.status='completed' then
  if v_order.completion_request_id=p_request_id then return p_order_id; end if;
  raise exception 'Pedido ya cerrado con otro registro' using errcode='23505';
 end if;
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=p_order_id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
  where status='approved' and (order_id=p_order_id or
   (v_order.origin_reservation_id is not null and reservation_id=v_order.origin_reservation_id));
 if v_total<=0 or v_total<>v_paid then
  raise exception 'No completar: pagos aprobados no liquidan exactamente el saldo' using errcode='23514';
 end if;
 select coalesce(sum(quantity),0) into v_sold from public.order_lines where order_id=p_order_id;
 select coalesce(sum(dl.quantity),0) into v_delivered from public.delivery_lines dl
  join public.deliveries d on d.id=dl.delivery_id where d.order_id=p_order_id;
 if v_sold<=0 or v_sold<>v_delivered then
  raise exception 'No completar: faltan unidades por entregar' using errcode='23514';
 end if;
 update public.orders set status='completed',completed_at=now(),
  completed_by=auth.uid(),completion_request_id=p_request_id where id=p_order_id;
 return p_order_id;
end;$$;
revoke all on function public.complete_evalia_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_evalia_order(uuid,uuid) to authenticated;
commit;