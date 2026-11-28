-- Ventas físicas por conteo (decisión del propietario, 28-11-2026):
-- - «Registrar disponibles» (set_available): la cantidad son las prendas libres que quedan. Si bajan, la
--   diferencia se registra como VENTA FÍSICA (no como prendas eliminadas); si suben, llegaron prendas nuevas.
-- - «Publicadas» = todo lo puesto a la venta = stock en mano + vendidas (físico + entregadas por pedido).
--   Solo sube con «Añadir» o con un registro de disponibles mayor. Disponibles = Publicadas - Vendidas - Comprometidas.
-- - «Corregir error de carga» (correct_published): fija las Publicadas correctas sin contar venta.
-- - Cada venta física guarda el precio por docena del momento; Estadísticas la muestra en prendas y en monto
--   estimado a precio lista (referencia, no cobro verificado).
-- El modelo interno no cambia: on_hand sigue siendo el stock en mano y todas las reglas de compromiso se mantienen.

alter table public.inventory_events add column price_dozen_bs numeric(12,2) check (price_dozen_bs is null or price_dozen_bs>0);
alter table public.inventory_events drop constraint inventory_events_operation_check;
alter table public.inventory_events add constraint inventory_events_operation_check
 check (operation in ('add','physical_sale','set_total','set_available','correct_published'));

create or replace function public.adjust_model_inventory(p_model_id uuid, p_operation text, p_units integer, p_expected_version bigint, p_request_id uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
 v_stock public.model_inventory%rowtype;
 v_prior public.inventory_events%rowtype;
 v_reserved bigint; v_ordered bigint; v_delivered bigint;
 v_pending bigint; v_target bigint; v_delta bigint; v_available bigint;
 v_physical bigint; v_price numeric(12,2);
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_model_id is null or p_expected_version is null then
  raise exception 'Modelo, version y solicitud son obligatorios' using errcode='22004';
 end if;
 if p_operation not in ('add','physical_sale','set_total','set_available','correct_published') or p_operation is null then
  raise exception 'Operacion de inventario no permitida' using errcode='22023';
 end if;
 if p_units is null or p_units<0 or (p_operation not in ('set_total','set_available','correct_published') and p_units=0) then
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
 -- Vendidas en físico: bajas por «Venta física» y por «Registrar disponibles».
 select coalesce(sum(-e.delta_units),0) into v_physical from public.inventory_events e
 where e.model_id=p_model_id and e.operation in ('physical_sale','set_available') and e.delta_units<0;
 if p_operation='add' then
  v_target:=v_stock.on_hand::bigint+p_units;
 elsif p_operation='physical_sale' then
  v_target:=v_stock.on_hand::bigint-p_units;
 elsif p_operation='set_available' then
  v_target:=p_units::bigint+v_reserved+v_pending;
 elsif p_operation='correct_published' then
  -- Error de carga: p_units = Publicadas correctas (no es venta). Stock en mano = publicadas - vendidas.
  v_target:=p_units::bigint-v_delivered-v_physical;
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
 if p_operation in ('physical_sale','set_available') and v_delta<0 then
  select m.price_dozen_bs into v_price from public.models m where m.id=p_model_id;
 end if;
 update public.model_inventory
 set on_hand=v_target::integer,version=version+1,updated_at=now()
 where model_id=p_model_id;
 insert into public.inventory_events(
 request_id,model_id,actor_id,operation,input_units,before_units,
 after_units,delta_units,available_after,resulting_version,price_dozen_bs
 ) values (
 p_request_id,p_model_id,auth.uid(),p_operation,p_units,v_stock.on_hand,
 v_target::integer,v_delta::integer,v_available::integer,v_stock.version+1,v_price
 );
 return pg_catalog.jsonb_build_object(
 'on_hand',v_target,'available',v_available,'version',v_stock.version+1,'replayed',false);
end;$function$;

-- Lectura de stock: agrega vendidas y publicadas (los campos existentes no cambian).
create or replace function public.get_model_stock(p_model_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
 v_stock public.model_inventory%rowtype;
 v_reserved bigint; v_ordered bigint; v_delivered bigint; v_pending bigint; v_physical bigint;
begin
 if not (public.is_evalia_staff() or evalia_security.client_order_allowed(null)) then
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
 select coalesce(sum(-e.delta_units),0) into v_physical from public.inventory_events e
 where e.model_id=p_model_id and e.operation in ('physical_sale','set_available') and e.delta_units<0;
 return pg_catalog.jsonb_build_object(
  'model_id',p_model_id,'on_hand',v_stock.on_hand,'reserved',v_reserved,
  'pending_delivery',v_pending,'available',v_stock.on_hand-v_reserved-v_pending,
  'blocked',v_stock.blocked,'version',v_stock.version,
  'physical_sold',v_physical,'delivered',v_delivered,'sold',v_physical+v_delivered,
  'published',v_stock.on_hand+v_physical+v_delivered);
end;$function$;

-- Estadísticas: agrega ventas físicas (prendas y monto estimado a precio lista) por fecha del registro.
create or replace function public.get_evalia_owner_stats(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_days integer; v_bucket text; v_result jsonb;
begin
 if not public.is_evalia_owner() then
  raise exception 'Estadísticas exclusivas del propietario' using errcode='42501';
 end if;
 if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '1830 days' then
  raise exception 'Periodo inválido' using errcode='22023';
 end if;
 v_days:=ceil(extract(epoch from (p_to-p_from))/86400)::integer;
 v_bucket:=case when v_days<=62 then 'day' else 'month' end;
 with ord as (
  select o.id,o.customer_id,o.confirmed_at from public.orders o
  where o.status in ('active','completed') and o.confirmed_at>=p_from and o.confirmed_at<p_to
 ), lines as (
  select l.order_id,l.model_name_snapshot,l.size_label_snapshot,l.quantity,l.subtotal_bs
  from public.order_lines l join ord on ord.id=l.order_id
 ), pay as (
  select p.amount_bs,p.approved_at from public.payment_reports p
  where p.status='approved' and p.approved_at>=p_from and p.approved_at<p_to
 ), open_orders as (
  select o.id,
   (select coalesce(sum(l.subtotal_bs),0) from public.order_lines l where l.order_id=o.id) total,
   (select coalesce(sum(p.amount_bs),0) from public.payment_reports p where p.status='approved'
     and (p.order_id=o.id or (o.origin_reservation_id is not null and p.reservation_id=o.origin_reservation_id))) paid
  from public.orders o where o.status='active' and o.archived_at is null
 ), phys as (
  select e.model_id,m.name,m.size_label,-e.delta_units units,
   round(-e.delta_units*coalesce(e.price_dozen_bs,m.price_dozen_bs)/12.0,2) amount
  from public.inventory_events e join public.models m on m.id=e.model_id
  where e.operation in ('physical_sale','set_available') and e.delta_units<0 and e.created_at>=p_from and e.created_at<p_to
 ), series as (
  select date_trunc(v_bucket,(g at time zone 'America/La_Paz')) bucket
  from generate_series(p_from,p_to-interval '1 second',('1 '||v_bucket)::interval) g
  group by 1
 )
 select jsonb_build_object(
  'period',jsonb_build_object('from',p_from,'to',p_to,'bucket',v_bucket),
  'orders',jsonb_build_object('count',(select count(*) from ord),
    'units',(select coalesce(sum(quantity),0) from lines),
    'amount',(select coalesce(sum(subtotal_bs),0) from lines),
    'buyers',(select count(distinct customer_id) from ord)),
  'payments',jsonb_build_object('count',(select count(*) from pay),'amount',(select coalesce(sum(amount_bs),0) from pay)),
  'pending',jsonb_build_object('orders',(select count(*) from open_orders where total>paid),
    'amount',(select coalesce(sum(greatest(total-paid,0)),0) from open_orders)),
  'physical',jsonb_build_object('units',(select coalesce(sum(units),0) from phys),'amount',(select coalesce(sum(amount),0) from phys),
    'models',(select coalesce(jsonb_agg(x order by x.units desc,x.name,x.size),'[]'::jsonb) from (
     select name,size_label size,sum(units) units,sum(amount) amount from phys group by model_id,name,size_label order by units desc,name,size limit 10) x)),
  'new_customers',(select count(*) from public.customers c where c.created_at>=p_from and c.created_at<p_to),
  'models',(select coalesce(jsonb_agg(m order by m.units desc,m.name,m.size),'[]'::jsonb) from (
    select model_name_snapshot name,size_label_snapshot size,sum(quantity) units,sum(subtotal_bs) amount,count(distinct order_id) orders
    from lines group by 1,2 order by units desc,name,size limit 10) m),
  'sizes',(select coalesce(jsonb_agg(s order by s.units desc,s.size),'[]'::jsonb) from (
    select size_label_snapshot size,sum(quantity) units,sum(subtotal_bs) amount from lines group by 1) s),
  'customers',(select coalesce(jsonb_agg(c order by c.amount desc,c.name),'[]'::jsonb) from (
    select cu.name,count(distinct ord.id) orders,sum(l.quantity) units,sum(l.subtotal_bs) amount
    from ord join public.customers cu on cu.id=ord.customer_id join lines l on l.order_id=ord.id
    group by cu.id,cu.name order by amount desc,cu.name limit 5) c),
  'series',(select coalesce(jsonb_agg(jsonb_build_object('bucket',to_char(s.bucket,'YYYY-MM-DD'),
     'orders_amount',coalesce(oa.amount,0),'orders',coalesce(oa.n,0),'payments_amount',coalesce(pa.amount,0)) order by s.bucket),'[]'::jsonb)
    from series s
    left join (select date_trunc(v_bucket,(ord.confirmed_at at time zone 'America/La_Paz')) b,count(distinct ord.id) n,sum(l.subtotal_bs) amount
      from ord join lines l on l.order_id=ord.id group by 1) oa on oa.b=s.bucket
    left join (select date_trunc(v_bucket,(approved_at at time zone 'America/La_Paz')) b,sum(amount_bs) amount from pay group by 1) pa on pa.b=s.bucket)
 ) into v_result;
 return v_result;
end;$$;
