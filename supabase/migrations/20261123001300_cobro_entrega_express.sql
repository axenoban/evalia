-- D7: cobro total, retiro total y cierre express. UNA transacción por RPC.
-- No se alteran cobros históricos ni se permiten entregas con deuda pendiente.
begin;

create table public.order_quick_actions(
 request_id uuid primary key,
 order_id uuid not null references public.orders(id) on delete restrict,
 action text not null check(action in ('pay','deliver','pay_deliver')),
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 note text,
 money_attested boolean not null,
 delivery_attested boolean not null,
 paid_amount numeric(14,2) not null check(paid_amount>=0),
 delivered_units integer not null check(delivered_units>=0),
 payment_report_id uuid references public.payment_reports(id) on delete restrict,
 delivery_id uuid references public.deliveries(id) on delete restrict,
 result jsonb not null,
 created_at timestamptz not null default now()
);
create index order_quick_actions_order_time_idx
 on public.order_quick_actions(order_id,created_at desc);
alter table public.order_quick_actions enable row level security;
revoke all on table public.order_quick_actions from public,anon,authenticated;
grant select on table public.order_quick_actions to authenticated;
create policy admin_read on public.order_quick_actions for select to authenticated
 using((select public.is_evalia_admin()));

create function public.quick_evalia_checkout(
 p_order_id uuid,p_action text,p_request_id uuid,p_note text default null,
 p_money_received boolean default false,p_goods_delivered boolean default false
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_order public.orders%rowtype;
 v_previous public.order_quick_actions%rowtype;
 v_total numeric(14,2);v_paid numeric(14,2);v_balance numeric(14,2);
 v_sold integer;v_delivered integer;v_remaining integer;
 v_lines jsonb;v_payment_id uuid;v_delivery_id uuid;
 v_quick_paid numeric(14,2):=0;v_quick_delivered integer:=0;
 v_result jsonb;v_unreviewed integer;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_order_id is null or p_request_id is null
   or p_action is null or p_action not in ('pay','deliver','pay_deliver')
   or pg_catalog.length(coalesce(p_note,''))>1000
   or (p_action in ('pay','pay_deliver') and p_money_received is distinct from true)
   or (p_action in ('deliver','pay_deliver') and p_goods_delivered is distinct from true)
   or (p_action='pay' and p_goods_delivered is true)
   or (p_action='deliver' and p_money_received is true) then
  raise exception 'Confirmaciones de cobro/entrega incompletas o inválidas' using errcode='22023';
 end if;

 -- La llave del intento impide duplicados ante timeouts o doble pulsación.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_previous from public.order_quick_actions where request_id=p_request_id;
 if found then
  if v_previous.order_id<>p_order_id or v_previous.action<>p_action
   or v_previous.note is distinct from p_note
   or v_previous.money_attested is distinct from p_money_received
   or v_previous.delivery_attested is distinct from p_goods_delivered then
   raise exception 'Reintento express con datos distintos' using errcode='23505';
  end if;
  return v_previous.result;
 end if;

 -- Serializa cobros y retiros sobre el pedido; los importes se recalculan en BD.
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' then
  raise exception 'Pedido inexistente o ya completado' using errcode='23514';
 end if;
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=p_order_id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
  where status='approved' and (order_id=p_order_id or
    (v_order.origin_reservation_id is not null and reservation_id=v_order.origin_reservation_id));
 v_balance:=v_total-v_paid;
 select coalesce(sum(quantity),0)::integer into v_sold from public.order_lines where order_id=p_order_id;
 select coalesce(sum(dl.quantity),0)::integer into v_delivered
  from public.delivery_lines dl join public.deliveries d on d.id=dl.delivery_id
  where d.order_id=p_order_id;
 v_remaining:=v_sold-v_delivered;
 if v_total<=0 or v_balance<0 or v_sold<=0 or v_remaining<0 then
  raise exception 'Inconsistencia de saldo o de cantidades: conciliación manual requerida' using errcode='23514';
 end if;

 if p_action in ('pay','pay_deliver') then
  if v_balance=0 then
   raise exception 'El pedido ya está pagado; usa Entregar todo' using errcode='23514';
  end if;
  -- Un comprobante del cliente pendiente puede corresponder al mismo dinero.
  select count(*)::integer into v_unreviewed from public.payment_reports
   where status in ('pending','observed') and
    (order_id=p_order_id or (v_order.origin_reservation_id is not null
      and reservation_id=v_order.origin_reservation_id));
  if v_unreviewed>0 then
   raise exception 'Hay pagos aún sin revisar: verifícalos antes del cobro rápido' using errcode='23514';
  end if;
  -- Dos funciones canónicas: declaración + aprobación, no una escritura manual.
  v_payment_id:=public.report_evalia_payment(null,p_order_id,v_balance,pg_catalog.gen_random_uuid(),p_note);
  perform public.review_evalia_payment(v_payment_id,'approve',pg_catalog.gen_random_uuid(),
     'Recepción del saldo verificada por administración');
  v_quick_paid:=v_balance;
 end if;

 if p_action in ('deliver','pay_deliver') then
  if v_balance>0 and p_action='deliver' then
   raise exception 'No entregar sin pago total aprobado' using errcode='23514';
  end if;
  if v_remaining=0 then
   raise exception 'Todas las prendas ya están entregadas' using errcode='23514';
  end if;
  select coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object('orderLineId',ol.id,'quantity',ol.quantity-coalesce(dd.sent,0))
    order by ol.model_id,ol.id),'[]'::jsonb)
   into v_lines
   from public.order_lines ol
   left join lateral (
    select coalesce(sum(dl.quantity),0) as sent
    from public.delivery_lines dl where dl.order_line_id=ol.id
   ) dd on true
   where ol.order_id=p_order_id and ol.quantity>coalesce(dd.sent,0);

  v_delivery_id:=public.record_evalia_delivery(p_order_id,v_lines,pg_catalog.gen_random_uuid());
  v_quick_delivered:=v_remaining;
  perform public.complete_evalia_order(p_order_id,pg_catalog.gen_random_uuid());
 end if;

 v_result:=pg_catalog.jsonb_build_object(
  'orderId',p_order_id,'action',p_action,
  'paid',v_quick_paid,'delivered',v_quick_delivered,
  'completed',p_action in ('deliver','pay_deliver')
 );
 insert into public.order_quick_actions(
  request_id,order_id,action,actor_id,note,money_attested,delivery_attested,
  paid_amount,delivered_units,payment_report_id,delivery_id,result
 ) values(
  p_request_id,p_order_id,p_action,auth.uid(),p_note,p_money_received,p_goods_delivered,
  v_quick_paid,v_quick_delivered,v_payment_id,v_delivery_id,v_result
 );
 return v_result;
end;$$;
revoke all on function public.quick_evalia_checkout(uuid,text,uuid,text,boolean,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.quick_evalia_checkout(uuid,text,uuid,text,boolean,boolean)
 to authenticated;
commit;
