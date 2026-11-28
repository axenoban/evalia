-- Ajuste de stock por disponibles (decisión del propietario, 28-11-2026):
-- «Corregir» define las prendas LIBRES para ofrecer. Las comprometidas (reservas y pedidos sin entregar)
-- se suman solas al stock total y siguen apartadas; al entregar se descuentan del total y al anular
-- vuelven a disponibles automáticamente (el compromiso se calcula siempre en vivo).
-- El total se calcula aquí, con la fila de inventario bloqueada: crear un pedido no cambia la versión
-- del inventario, así que el navegador no puede sumar el compromiso sin riesgo de datos desactualizados.
-- 'set_total' se conserva por compatibilidad y auditoría; la interfaz usa 'set_available'.

alter table public.inventory_events drop constraint inventory_events_operation_check;
alter table public.inventory_events add constraint inventory_events_operation_check
 check (operation in ('add','physical_sale','set_total','set_available'));

create or replace function public.adjust_model_inventory(p_model_id uuid, p_operation text, p_units integer, p_expected_version bigint, p_request_id uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
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
 if p_operation not in ('add','physical_sale','set_total','set_available') or p_operation is null then
  raise exception 'Operacion de inventario no permitida' using errcode='22023';
 end if;
 if p_units is null or p_units<0 or (p_operation not in ('set_total','set_available') and p_units=0) then
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
 elsif p_operation='set_available' then
  v_target:=p_units::bigint+v_reserved+v_pending;
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
end;$function$;
