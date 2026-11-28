create function evalia_security.catalog_items(p_limits boolean) returns jsonb language plpgsql volatile set search_path='' as $$
declare v_result jsonb;
begin
 insert into evalia_security.client_order_grants(txid,customer_id) values(pg_catalog.txid_current(),null)
  on conflict(txid) do nothing;
 select coalesce(jsonb_agg(q.item order by q.created_at desc,q.id),'[]'::jsonb) into v_result from (
  select m.id,m.created_at,jsonb_build_object('id',m.id,'name',m.name,'size',m.size_label,'price',m.price_dozen_bs,
   'image_path',m.image_path,'colors',col.list,
   'available',(not coalesce((st.stock->>'blocked')::boolean,false)) and (
     (st.stock->>'available')::integer>=12 or ((st.stock->>'available')::integer>=6 and col.n>=6))) || case when p_limits then jsonb_build_object('orderCapacity',
    case when coalesce((st.stock->>'blocked')::boolean,false) then 0
         else greatest(0,(st.stock->>'available')::integer) end) else '{}'::jsonb end item
  from public.models m
  cross join lateral (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'hex',c.hex_code) order by c.name),'[]'::jsonb) list,count(*) n
    from public.model_colors mc join public.colors c on c.id=mc.color_id where mc.model_id=m.id and mc.is_offered and c.is_active) col
  cross join lateral (select public.get_model_stock(m.id) stock) st
  where m.is_active) q;
 delete from evalia_security.client_order_grants where txid=pg_catalog.txid_current() and customer_id is null;
 return v_result;
end $$;
revoke all on function evalia_security.catalog_items(boolean) from public,anon,authenticated,service_role;
create or replace function evalia_security.catalog_items() returns jsonb
language sql volatile set search_path='' as $$ select evalia_security.catalog_items(false) $$;
create or replace function public.client_evalia_customer_session(p_token_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_customer public.customers%rowtype; v_orders jsonb;
begin
 v_customer:=evalia_security.customer_from_link(p_token_hash);
 select coalesce(jsonb_agg(x.item order by x.confirmed_at desc),'[]'::jsonb) into v_orders from (
  select o.confirmed_at,jsonb_build_object('reference',substring(o.id::text,1,8),'confirmed_at',o.confirmed_at,'status',o.status,
   'prepared',o.prepared_at is not null,'method',o.fulfillment_method,'units',t.units,'total',t.total,'approved',p.paid,
   'pending',case when o.status='active' then greatest(t.total-p.paid,0) else 0 end) item
  from public.orders o
  cross join lateral (select coalesce(sum(l.quantity),0) units,coalesce(sum(l.subtotal_bs),0) total from public.order_lines l where l.order_id=o.id) t
  cross join lateral (select coalesce(sum(r.amount_bs),0) paid from public.payment_reports r where r.status='approved'
    and (r.order_id=o.id or (o.origin_reservation_id is not null and r.reservation_id=o.origin_reservation_id))) p
  where o.customer_id=v_customer.id and o.status in ('active','completed')
  order by o.confirmed_at desc limit 20) x;
 return jsonb_build_object(
  'customer',jsonb_build_object('name',v_customer.name,'delivery_preference',v_customer.delivery_preference,'shipping_destination',v_customer.shipping_destination),
  'orders',v_orders,'catalog',evalia_security.catalog_items(true));
end $$;

-- Una respuesta escalar conserva todas las líneas del mismo snapshot incluso con límite REST.
create function public.evalia_excel_report(p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
   'stats',public.get_evalia_owner_stats(p_from,p_to),
   'rows',coalesce(jsonb_agg(to_jsonb(r)-'ordinality' order by r.ordinality),'[]'::jsonb))
 from public.export_evalia_orders(p_from,p_to) with ordinality r
$$;
revoke all on function public.evalia_excel_report(timestamptz,timestamptz) from public,anon,service_role;
grant execute on function public.evalia_excel_report(timestamptz,timestamptz) to authenticated;
