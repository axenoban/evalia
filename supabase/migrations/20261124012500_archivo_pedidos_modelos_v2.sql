-- Corrección del contrato de baja: modelos con pedidos vinculados, archivo y anulación auditada.
begin;
create or replace function public.archive_evalia_model(p_model_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_model public.models%rowtype; v_path text;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_model_id is null or p_expected_updated_at is null then raise exception 'Modelo o versión inválidos' using errcode='22023'; end if;
 -- Mismo bloqueo de inventario que pedidos, entregas y reservas.
 perform 1 from public.model_inventory where model_id=p_model_id for update;
 if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
 select * into v_model from public.models where id=p_model_id for update;
 if not found then raise exception 'Modelo no existe' using errcode='P0002'; end if;
 if v_model.is_active then
  if v_model.updated_at is distinct from p_expected_updated_at then
   raise exception 'El modelo cambió. Actualiza antes de inhabilitar' using errcode='40001';
  end if;
  -- Los pedidos vinculados conservan sus líneas, compromisos y operaciones.
  update public.models set is_active=false,archived_at=clock_timestamp(),archived_by=auth.uid(),updated_at=clock_timestamp()
   where id=p_model_id;
 end if;
 v_path:=v_model.image_path;
 if v_path is not null and exists(select 1 from public.models where is_active and image_path=v_path) then v_path:=null; end if;
 return pg_catalog.jsonb_build_object('model_id',p_model_id,'photo_path',v_path);
end;$$;

alter table public.orders add column archived_at timestamptz,
 add column archived_by uuid references public.admin_profiles(user_id) on delete restrict,
 add column archive_reason text;
alter table public.orders drop constraint orders_status_check,
 drop constraint completed_consistency,
 add constraint orders_status_check check(status in ('active','completed','voided')),
 add constraint completed_consistency check(
   (status in ('active','voided') and completed_at is null and completed_by is null and completion_request_id is null)
   or (status='completed' and completed_at is not null and completed_by is not null and completion_request_id is not null)),
 add constraint order_archive_consistency check(
   (archived_at is null and archived_by is null and archive_reason is null and status<>'voided')
   or (archived_at is not null and archived_by is not null and archive_reason is not null
       and length(btrim(archive_reason)) between 1 and 300 and status in ('completed','voided')));
create index orders_archive_idx on public.orders(archived_at,confirmed_at desc);

create or replace function public.get_model_stock(p_model_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_stock public.model_inventory%rowtype;
 v_reserved bigint; v_ordered bigint; v_delivered bigint; v_pending bigint;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 select * into v_stock from public.model_inventory where model_id=p_model_id;
 if not found then raise exception 'Modelo inexistente' using errcode='P0002'; end if;
 select coalesce(sum(rl.quantity),0) into v_reserved
 from public.reservation_lines rl join public.reservations r on r.id=rl.reservation_id
 where rl.model_id=p_model_id and r.status in ('saved','in_review');
 select coalesce(sum(ol.quantity),0) into v_ordered
 from public.order_lines ol join public.orders o on o.id=ol.order_id where ol.model_id=p_model_id and o.status<>'voided';
 select coalesce(sum(dl.quantity),0) into v_delivered
 from public.delivery_lines dl join public.order_lines ol on ol.id=dl.order_line_id
 where ol.model_id=p_model_id;
 v_pending:=v_ordered-v_delivered;
 if v_pending<0 then raise exception 'Integridad de entregas comprometida' using errcode='23514'; end if;
 return pg_catalog.jsonb_build_object(
 'model_id',p_model_id,'on_hand',v_stock.on_hand,'reserved',v_reserved,
 'pending_delivery',v_pending,'available',v_stock.on_hand-v_reserved-v_pending,
 'blocked',v_stock.blocked,'version',v_stock.version);
end;$$;

create or replace function public.adjust_model_inventory(
 p_model_id uuid,p_operation text,p_units integer,p_expected_version bigint,p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_stock public.model_inventory%rowtype;
 v_prior public.inventory_events%rowtype;
 v_reserved bigint; v_ordered bigint; v_delivered bigint;
 v_pending bigint; v_target bigint; v_delta bigint; v_available bigint;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_model_id is null or p_expected_version is null then
  raise exception 'Modelo, version y solicitud son obligatorios' using errcode='22004';
 end if;
 if p_operation not in ('add','physical_sale','set_total') or p_operation is null then
  raise exception 'Operacion de inventario no permitida' using errcode='22023';
 end if;
 if p_units is null or p_units<0 or (p_operation<>'set_total' and p_units=0) then
  raise exception 'Cantidad invalida' using errcode='22023';
 end if;
 -- Lock shared with every future booking and delivery mutation.
 select * into v_stock from public.model_inventory
 where model_id=p_model_id for update;
 if not found then raise exception 'Modelo inexistente' using errcode='P0002'; end if;
 select * into v_prior from public.inventory_events where request_id=p_request_id;
 if found then
  if v_prior.model_id<>p_model_id or v_prior.operation<>p_operation
   or v_prior.input_units<>p_units or v_prior.actor_id<>auth.uid() then
   raise exception 'Solicitud reutilizada para operacion diferente' using errcode='23505';
  end if;
  return pg_catalog.jsonb_build_object(
   'on_hand',v_prior.after_units,'available',v_prior.available_after,
   'version',v_prior.resulting_version,'replayed',true);
 end if;
 if v_stock.version<>p_expected_version then
  raise exception 'Inventario desactualizado; recargar' using errcode='40001';
 end if;
 if v_stock.blocked and p_operation='physical_sale' then
  raise exception 'Inventario bloqueado por incidencia' using errcode='23514';
 end if;
 select coalesce(sum(rl.quantity),0) into v_reserved
 from public.reservation_lines rl join public.reservations r on r.id=rl.reservation_id
 where rl.model_id=p_model_id and r.status in ('saved','in_review');
 select coalesce(sum(ol.quantity),0) into v_ordered
 from public.order_lines ol join public.orders o on o.id=ol.order_id where ol.model_id=p_model_id and o.status<>'voided';
 select coalesce(sum(dl.quantity),0) into v_delivered
 from public.delivery_lines dl join public.order_lines ol on ol.id=dl.order_line_id
 where ol.model_id=p_model_id;
 v_pending:=v_ordered-v_delivered;
 if v_pending<0 then raise exception 'Entregas exceden pedido' using errcode='23514'; end if;
 if p_operation='add' then
  v_target:=v_stock.on_hand::bigint+p_units;
 elsif p_operation='physical_sale' then
  v_target:=v_stock.on_hand::bigint-p_units;
 else
  v_target:=p_units;
 end if;
 if v_target<0 or v_target>2147483647 then
  raise exception 'Existencia fuera de rango' using errcode='22003';
 end if;
 if v_target<v_reserved+v_pending then
  raise exception 'No se pueden consumir prendas comprometidas' using errcode='23514';
 end if;
 v_delta:=v_target-v_stock.on_hand;
 v_available:=v_target-v_reserved-v_pending;
 update public.model_inventory
 set on_hand=v_target::integer,version=version+1,updated_at=now()
 where model_id=p_model_id;
 insert into public.inventory_events(
 request_id,model_id,actor_id,operation,input_units,before_units,
 after_units,delta_units,available_after,resulting_version
 ) values (
 p_request_id,p_model_id,auth.uid(),p_operation,p_units,v_stock.on_hand,
 v_target::integer,v_delta::integer,v_available::integer,v_stock.version+1
 );
 return pg_catalog.jsonb_build_object(
 'on_hand',v_target,'available',v_available,'version',v_stock.version+1,'replayed',false);
end;$$;

create or replace function public.get_evalia_order_finance(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_total numeric; v_paid numeric;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=p_order_id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
 where status='approved' and
 (order_id=p_order_id or (v_order.origin_reservation_id is not null
                          and reservation_id=v_order.origin_reservation_id));
 return jsonb_build_object('total',v_total,'approved',v_paid,
   'pending',case when v_order.status='voided' then 0 else greatest(v_total-v_paid,0) end,'excess',greatest(v_paid-v_total,0));
end;$$;

create or replace function public.get_evalia_order_delivery(p_order_id uuid)
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
 return jsonb_build_object('ordered',v_sold,'delivered',v_given,'remaining',case when v_order.status='voided' then 0 else v_sold-v_given end);
end;$$;

create or replace function public.complete_evalia_order(
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
 if v_order.status='voided' then raise exception 'Pedido anulado' using errcode='23514'; end if;
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

create or replace function public.report_evalia_payment(
 p_reservation_id uuid,p_order_id uuid,p_amount numeric,p_request_id uuid,
 p_note text default null
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid; v_prior public.payment_reports%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or (p_reservation_id is null)=(p_order_id is null)
    or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_amount>999999999999.99 or length(coalesce(p_note,''))>1000 then
  raise exception 'Datos de declaración de pago inválidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.payment_reports where request_id=p_request_id;
 if found then
  if v_prior.reservation_id is distinct from p_reservation_id
    or v_prior.order_id is distinct from p_order_id
    or v_prior.amount_bs<>p_amount or v_prior.note is distinct from p_note
    or v_prior.origin<>'admin' then
   raise exception 'Reintento de pago con datos distintos' using errcode='23505';
  end if;
  return v_prior.id;
 end if;
 if p_reservation_id is not null then
  perform 1 from public.reservations where id=p_reservation_id and status in ('saved','in_review') for update;
  if not found then
   raise exception 'Reserva no apta para registrar depósito' using errcode='23514';
  end if;
 else
  perform 1 from public.orders where id=p_order_id and status='active' for update;
  if not found then
   raise exception 'Pedido inexistente o cerrado' using errcode='23514';
  end if;
 end if;
 insert into public.payment_reports(request_id,reservation_id,order_id,amount_bs,origin,note)
 values(p_request_id,p_reservation_id,p_order_id,p_amount,'admin',p_note)
 returning id into v_id;
 return v_id;
end;$$;

create function public.archive_evalia_order(p_order_id uuid,p_reason text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_model_id uuid;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_order_id is null or length(v_reason) not between 1 and 300 then
  raise exception 'Identificador y motivo de archivo obligatorios' using errcode='22023';
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 if v_order.archived_at is not null then return p_order_id; end if;
 if v_order.status='completed' and exists(select 1 from public.payment_reports p where (p.order_id=p_order_id
    or (v_order.origin_reservation_id is not null and p.reservation_id=v_order.origin_reservation_id))
    and p.status in ('pending','observed')) then
  raise exception 'Revisa los avisos de pago pendientes antes de archivar' using errcode='23514';
 end if;
 if v_order.status='active' then
  -- No alterar conciliación, entregas ni dinero. Los registros erróneos sin movimientos
  -- se anulan conservando líneas y precios; los pedidos cerrados solo se archivan.
  if v_order.origin_reservation_id is not null then
   perform 1 from public.reservations where id=v_order.origin_reservation_id and status='converted' for update;
   if not found then raise exception 'Compromiso anterior requiere revisión' using errcode='23514'; end if;
  end if;
  if exists(select 1 from public.payment_reports p where p.order_id=p_order_id
        or (v_order.origin_reservation_id is not null and p.reservation_id=v_order.origin_reservation_id))
     or exists(select 1 from public.deliveries d where d.order_id=p_order_id) then
   raise exception 'No se puede anular un pedido con pagos, avisos o entregas registrados' using errcode='23514';
  end if;
  for v_model_id in select model_id from public.order_lines where order_id=p_order_id order by model_id loop
   perform 1 from public.model_inventory where model_id=v_model_id for update;
   if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
  end loop;
 end if;
 update public.order_access_links set revoked_at=coalesce(revoked_at,clock_timestamp()) where order_id=p_order_id;
 update public.orders set status=case when status='active' then 'voided' else status end,
  archived_at=clock_timestamp(),archived_by=auth.uid(),archive_reason=v_reason
  where id=p_order_id;
 return p_order_id;
end;$$;
revoke all on function public.archive_evalia_order(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.archive_evalia_order(uuid,text) to authenticated;
commit;
