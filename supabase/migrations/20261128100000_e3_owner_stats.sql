-- E3-01/02/03/04/08: estadísticas comerciales y exportación, solo propietario (D07), solo lectura.
-- Definiciones (docs/59): pedidos por fecha de confirmación; cobros por fecha de aprobación;
-- saldo por cobrar = foto actual de pedidos activos no archivados. Pedidos anulados excluidos.
-- No incluye ventas físicas externas (D05 pendiente de definición de feria) ni ganancias.
-- Rango semiabierto [p_from, p_to) en UTC; la interfaz lo calcula desde días de America/La_Paz.

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

-- Exportación de líneas de pedidos confirmados (CSV/Excel en el navegador). Datos históricos congelados.
create or replace function public.export_evalia_orders(p_from timestamptz, p_to timestamptz)
returns table(reference text, confirmed_at timestamptz, status text, customer text, whatsapp text,
 fulfillment text, destination text, model text, size text, dozens integer, extra_units integer,
 units integer, price_dozen_bs numeric, subtotal_bs numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_evalia_owner() then
  raise exception 'Exportación exclusiva del propietario' using errcode='42501';
 end if;
 if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '1830 days' then
  raise exception 'Periodo inválido' using errcode='22023';
 end if;
 if (select count(*) from public.order_lines l join public.orders o on o.id=l.order_id
     where o.status in ('active','completed') and o.confirmed_at>=p_from and o.confirmed_at<p_to)>20000 then
  raise exception 'Demasiadas filas; reduce el periodo' using errcode='54000';
 end if;
 return query
  select substring(o.id::text,1,8),o.confirmed_at,o.status,c.name,c.whatsapp,o.fulfillment_method,o.shipping_destination,
   l.model_name_snapshot,l.size_label_snapshot,l.dozen_count,l.extra_units,l.quantity,l.price_dozen_bs,l.subtotal_bs
  from public.orders o join public.customers c on c.id=o.customer_id join public.order_lines l on l.order_id=o.id
  where o.status in ('active','completed') and o.confirmed_at>=p_from and o.confirmed_at<p_to
  order by o.confirmed_at,o.id,l.model_name_snapshot,l.id;
end;$$;

revoke all on function public.get_evalia_owner_stats(timestamptz,timestamptz) from public,anon,service_role;
revoke all on function public.export_evalia_orders(timestamptz,timestamptz) from public,anon,service_role;
grant execute on function public.get_evalia_owner_stats(timestamptz,timestamptz) to authenticated;
grant execute on function public.export_evalia_orders(timestamptz,timestamptz) to authenticated;
