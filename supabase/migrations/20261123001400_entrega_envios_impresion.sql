-- EVALIA D8: clientes para envío/retiro, destino y snapshot privado imprimible.
-- El histórico previo queda 'legacy', nunca presumimos que fue retiro local.
begin;
alter table public.customers
 add column delivery_preference text not null default 'unclassified'
  check(delivery_preference in ('unclassified','pickup','shipping')),
 add column shipping_destination text,
 add constraint customer_delivery_destination_check check (
  (delivery_preference='shipping' and shipping_destination is not null
   and length(btrim(shipping_destination)) between 2 and 200)
  or (delivery_preference<>'shipping' and shipping_destination is null)
 );

alter table public.orders
 add column fulfillment_method text not null default 'legacy'
  check(fulfillment_method in ('legacy','pickup','shipping')),
 add column shipping_destination text,
 add column recipient_name text,
 add column recipient_phone text,
 add column fulfillment_updated_at timestamptz not null default now(),
 add constraint order_fulfillment_check check (
  (fulfillment_method='legacy' and shipping_destination is null
   and recipient_name is null and recipient_phone is null)
  or
  (fulfillment_method='pickup' and shipping_destination is null
   and recipient_name is not null and length(btrim(recipient_name))>0
   and recipient_phone is not null and length(btrim(recipient_phone))>0)
  or
  (fulfillment_method='shipping' and shipping_destination is not null
   and length(btrim(shipping_destination)) between 2 and 200
   and recipient_name is not null and length(btrim(recipient_name))>0
   and recipient_phone is not null and length(btrim(recipient_phone))>0)
 );

-- No otorgar mutaciones de modalidad sin registrar auditoría.
revoke update(delivery_preference,shipping_destination) on public.customers from authenticated;
revoke update(fulfillment_method,shipping_destination,recipient_name,recipient_phone,fulfillment_updated_at)
 on public.orders from authenticated;

create table public.customer_delivery_revisions(
 request_id uuid primary key,
 customer_id uuid not null references public.customers(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 expected_updated_at timestamptz not null,
 old_profile jsonb not null,
 new_profile jsonb not null,
 created_at timestamptz not null default now()
);
create index customer_delivery_revisions_customer_idx on public.customer_delivery_revisions(customer_id,created_at desc);

create table public.order_fulfillment_revisions(
 request_id uuid primary key,
 order_id uuid not null references public.orders(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 old_profile jsonb not null,
 new_profile jsonb not null,
 created_at timestamptz not null default now()
);
create index order_fulfillment_revisions_order_idx on public.order_fulfillment_revisions(order_id,created_at desc);

do $$
declare t text;
begin
 foreach t in array array['customer_delivery_revisions','order_fulfillment_revisions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_evalia_admin()))',t);
 end loop;
end $$;

create function public.update_evalia_customer_delivery(
 p_customer_id uuid,p_name text,p_whatsapp text,p_preference text,p_destination text,
 p_expected_updated_at timestamptz,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_customer public.customers%rowtype; v_prev public.customer_delivery_revisions%rowtype;
 v_name text:=btrim(coalesce(p_name,''));v_phone text:=btrim(coalesce(p_whatsapp,''));
 v_dest text:=nullif(btrim(coalesce(p_destination,'')),''); v_new jsonb;v_old jsonb;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_customer_id is null or p_request_id is null or p_expected_updated_at is null
  or length(v_name) not between 1 and 130 or length(v_phone) not between 1 and 30
  or p_preference is null or p_preference not in ('pickup','shipping')
  or (p_preference='shipping' and (v_dest is null or length(v_dest) not between 2 and 200))
  or (p_preference='pickup' and v_dest is not null) then
  raise exception 'Categoría y destino del cliente no válidos' using errcode='22023';
 end if;
 v_new:=jsonb_build_object('name',v_name,'whatsapp',v_phone,
  'preference',p_preference,'destination',v_dest);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prev from public.customer_delivery_revisions where request_id=p_request_id;
 if found then
  if v_prev.customer_id<>p_customer_id or v_prev.new_profile<>v_new
   or v_prev.expected_updated_at<>p_expected_updated_at then
   raise exception 'Solicitud de cliente reutilizada con datos distintos' using errcode='23505';
  end if;
  return p_customer_id;
 end if;
 select * into v_customer from public.customers where id=p_customer_id for update;
 if not found then raise exception 'Cliente inexistente' using errcode='P0002'; end if;
 if v_customer.updated_at is distinct from p_expected_updated_at then
  raise exception 'Ficha modificada por otra sesión: actualiza la pantalla' using errcode='40001';
 end if;
 v_old:=jsonb_build_object('name',v_customer.name,'whatsapp',v_customer.whatsapp,
  'preference',v_customer.delivery_preference,'destination',v_customer.shipping_destination);
 if v_old=v_new then return p_customer_id; end if;
 update public.customers set name=v_name,whatsapp=v_phone,
  delivery_preference=p_preference,shipping_destination=v_dest,updated_at=clock_timestamp()
  where id=p_customer_id;
 insert into public.customer_delivery_revisions
 (request_id,customer_id,actor_id,expected_updated_at,old_profile,new_profile)
 values(p_request_id,p_customer_id,auth.uid(),p_expected_updated_at,v_old,v_new);
 return p_customer_id;
end;$$;
revoke all on function public.update_evalia_customer_delivery(uuid,text,text,text,text,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.update_evalia_customer_delivery(uuid,text,text,text,text,timestamptz,uuid) to authenticated;

-- El RPC canónico conserva el control de cupos y el precio congelado.
-- Esta función agrega modalidad y snapshot en la misma transacción.
create function public.create_evalia_order_delivery(
 p_customer_id uuid,p_lines jsonb,p_request_id uuid,p_method text,p_destination text
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_customer public.customers%rowtype;v_order uuid;v_preexisting public.orders%rowtype;
 v_dest text:=nullif(btrim(coalesce(p_destination,'')),'');
 v_new jsonb;v_prev public.order_fulfillment_revisions%rowtype;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_request_id is null or p_customer_id is null
   or p_method is null or p_method not in ('pickup','shipping')
   or (p_method='shipping' and (v_dest is null or length(v_dest) not between 2 and 200))
   or (p_method='pickup' and v_dest is not null) then
  raise exception 'Tipo de entrega o destino no válidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_customer from public.customers where id=p_customer_id for share;
 if not found then raise exception 'Cliente no existe' using errcode='P0002'; end if;
 v_new:=jsonb_build_object('method',p_method,'destination',v_dest,
  'name',v_customer.name,'phone',v_customer.whatsapp);
 select * into v_prev from public.order_fulfillment_revisions where request_id=p_request_id;
 -- Incluso en el reintento se usa la RPC canónica que comprueba huella del carrito.
 if found then
  if v_prev.new_profile->>'method'<>p_method
   or v_prev.new_profile->>'destination' is distinct from v_dest
   or v_prev.order_id is null then
   raise exception 'Pedido repetido con entrega diferente' using errcode='23505';
  end if;
  v_order:=public.create_evalia_order(p_customer_id,p_lines,p_request_id);
  if v_prev.order_id<>v_order then raise exception 'Pedido repetido distinto' using errcode='23505'; end if;
  return v_order;
 end if;
 select * into v_preexisting from public.orders where request_id=p_request_id;
 if found then raise exception 'Solicitud original sin ficha de entrega; no modificar pedido anterior' using errcode='23505'; end if;
 v_order:=public.create_evalia_order(p_customer_id,p_lines,p_request_id);
 update public.orders set fulfillment_method=p_method,shipping_destination=v_dest,
  recipient_name=v_customer.name,recipient_phone=v_customer.whatsapp,
  fulfillment_updated_at=clock_timestamp() where id=v_order;
 insert into public.order_fulfillment_revisions(request_id,order_id,actor_id,old_profile,new_profile)
 values(p_request_id,v_order,auth.uid(),'{"method":"legacy"}'::jsonb,v_new);
 return v_order;
end;$$;
revoke all on function public.create_evalia_order_delivery(uuid,jsonb,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_evalia_order_delivery(uuid,jsonb,uuid,text,text) to authenticated;

-- Permite clasificar pedidos previos o corregir destino de un pedido activo.
create function public.update_evalia_order_delivery(
 p_order_id uuid,p_method text,p_destination text,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_order public.orders%rowtype;v_customer public.customers%rowtype;
 v_old jsonb;v_new jsonb;v_prev public.order_fulfillment_revisions%rowtype;
 v_dest text:=nullif(btrim(coalesce(p_destination,'')),'');
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_order_id is null or p_request_id is null or p_method not in ('pickup','shipping')
   or (p_method='shipping' and (v_dest is null or length(v_dest) not between 2 and 200))
   or (p_method='pickup' and v_dest is not null) then
  raise exception 'Modalidad/destino inválidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prev from public.order_fulfillment_revisions where request_id=p_request_id;
 if found then
  if v_prev.order_id<>p_order_id or v_prev.new_profile->>'method'<>p_method
     or v_prev.new_profile->>'destination' is distinct from v_dest then
   raise exception 'Reintento con entrega diferente' using errcode='23505';
  end if;
  return p_order_id;
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' then
  raise exception 'Solo se puede corregir entrega de pedidos activos' using errcode='23514';
 end if;
 select * into v_customer from public.customers where id=v_order.customer_id for share;
 v_old:=jsonb_build_object('method',v_order.fulfillment_method,
  'destination',v_order.shipping_destination,'name',v_order.recipient_name,'phone',v_order.recipient_phone);
 v_new:=jsonb_build_object('method',p_method,'destination',v_dest,
  'name',coalesce(v_order.recipient_name,v_customer.name),
  'phone',coalesce(v_order.recipient_phone,v_customer.whatsapp));
 if v_new=v_old then return p_order_id; end if;
 update public.orders set fulfillment_method=p_method,shipping_destination=v_dest,
  recipient_name=coalesce(v_order.recipient_name,v_customer.name),
  recipient_phone=coalesce(v_order.recipient_phone,v_customer.whatsapp),
  fulfillment_updated_at=clock_timestamp() where id=p_order_id;
 insert into public.order_fulfillment_revisions(request_id,order_id,actor_id,old_profile,new_profile)
 values(p_request_id,p_order_id,auth.uid(),v_old,v_new);
 return p_order_id;
end;$$;
revoke all on function public.update_evalia_order_delivery(uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.update_evalia_order_delivery(uuid,text,text,uuid) to authenticated;
commit;
