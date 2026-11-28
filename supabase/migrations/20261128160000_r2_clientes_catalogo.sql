-- R2: acceso del cliente sin cuenta y catálogo público (docs/70).
-- - Solo números registrados por un administrador: el administrador emite un enlace personal revocable
--   que se envía por WhatsApp; el servidor guarda solo el hash SHA-256 del token.
-- - Catálogo público con precios y solo «Disponible/Agotado» (nunca la cantidad de stock).
-- - El pedido del cliente se confirma al instante con las mismas funciones canónicas (mínimos, colores,
--   precio esperado, stock transaccional e idempotencia) y un tope de 5 pedidos por 24 h.
-- Todas las funciones de cliente/catálogo son exclusivas de service_role (servidor Next); nada se abre a anon.

create table public.customer_access_links(
 customer_id uuid primary key references public.customers(id) on delete restrict,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 version integer not null default 1 check(version>0),
 issued_at timestamptz not null default now(),
 issued_by uuid not null references public.admin_profiles(user_id) on delete restrict,
 revoked_at timestamptz
);
alter table public.customer_access_links enable row level security;
revoke all on public.customer_access_links from public,anon,authenticated;
grant select(customer_id,version,issued_at,revoked_at) on public.customer_access_links to authenticated;
create policy admin_read on public.customer_access_links for select to authenticated using ((select public.is_evalia_admin()));

create table public.client_order_requests(
 request_id uuid primary key,
 order_id uuid not null unique references public.orders(id) on delete restrict,
 customer_id uuid not null references public.customers(id) on delete restrict,
 link_version integer not null,
 method text not null check(method in ('pickup','shipping')),
 destination text,
 created_at timestamptz not null default now()
);
create index client_order_requests_customer on public.client_order_requests(customer_id,created_at desc);
alter table public.client_order_requests enable row level security;
revoke all on public.client_order_requests from public,anon,authenticated;
grant select on public.client_order_requests to authenticated;
create policy staff_read on public.client_order_requests for select to authenticated using ((select public.is_evalia_staff()));

-- Autorización efímera: solo existe dentro de la transacción de una función de cliente o catálogo.
-- customer_id nulo = solo lectura (catálogo/stock); para crear un pedido se exige el cliente exacto.
create table evalia_security.client_order_grants(
 txid bigint primary key,
 customer_id uuid
);
alter table evalia_security.client_order_grants enable row level security;
revoke all on evalia_security.client_order_grants from public,anon,authenticated,service_role;
create function evalia_security.client_order_allowed(p_customer uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from evalia_security.client_order_grants g
  where g.txid=pg_catalog.txid_current() and (p_customer is null or g.customer_id=p_customer));
$$;
revoke all on function evalia_security.client_order_allowed(uuid) from public,anon,authenticated,service_role;

do $$
declare v_sig text; v_arg text; v_def text;
begin
 foreach v_sig in array array['public.create_evalia_order(uuid,jsonb,uuid)','public.evalia_validate_portions(jsonb)','public.get_model_stock(uuid)'] loop
  v_arg:=case when v_sig like 'public.create_evalia_order(%' then 'p_customer_id' else 'null' end;
  v_def:=pg_catalog.pg_get_functiondef(v_sig::regprocedure);
  if (length(v_def)-length(replace(v_def,'public.is_evalia_staff()','')))/length('public.is_evalia_staff()')<>1 then
   raise exception 'Contrato inesperado en %',v_sig;
  end if;
  execute replace(v_def,'public.is_evalia_staff()','(public.is_evalia_staff() or evalia_security.client_order_allowed('||v_arg||'))');
 end loop;
end $$;

-- Catálogo (uso interno): disponible = se puede comprar el mínimo (una docena, o 6 prendas con 6 colores activos).
create function evalia_security.catalog_items() returns jsonb language plpgsql volatile set search_path='' as $$
declare v_result jsonb;
begin
 insert into evalia_security.client_order_grants(txid,customer_id) values(pg_catalog.txid_current(),null)
  on conflict(txid) do nothing;
 select coalesce(jsonb_agg(q.item order by q.created_at desc,q.id),'[]'::jsonb) into v_result from (
  select m.id,m.created_at,jsonb_build_object('id',m.id,'name',m.name,'size',m.size_label,'price',m.price_dozen_bs,
   'image_path',m.image_path,'colors',col.list,
   'available',(not coalesce((st.stock->>'blocked')::boolean,false)) and (
     (st.stock->>'available')::integer>=12 or ((st.stock->>'available')::integer>=6 and col.n>=6))) item
  from public.models m
  cross join lateral (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'hex',c.hex_code) order by c.name),'[]'::jsonb) list,count(*) n
    from public.model_colors mc join public.colors c on c.id=mc.color_id where mc.model_id=m.id and mc.is_offered and c.is_active) col
  cross join lateral (select public.get_model_stock(m.id) stock) st
  where m.is_active) q;
 delete from evalia_security.client_order_grants where txid=pg_catalog.txid_current() and customer_id is null;
 return v_result;
end $$;
revoke all on function evalia_security.catalog_items() from public,anon,authenticated,service_role;

-- Cliente por enlace (uso interno): devuelve el cliente si el enlace está vigente.
create function evalia_security.customer_from_link(p_token_hash text) returns public.customers
language plpgsql stable set search_path='' as $$
declare v_customer public.customers%rowtype;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Enlace inválido' using errcode='42501'; end if;
 select c.* into v_customer from public.customer_access_links l join public.customers c on c.id=l.customer_id
  where l.token_hash=p_token_hash and l.revoked_at is null;
 if not found then raise exception 'Enlace no válido o revocado' using errcode='42501'; end if;
 return v_customer;
end $$;
revoke all on function evalia_security.customer_from_link(text) from public,anon,authenticated,service_role;

-- ===== Funciones públicas (solo administradores o solo servidor) =====
create function public.issue_evalia_customer_link(p_customer_id uuid,p_token_hash text) returns integer
language plpgsql security definer set search_path='' as $$
declare v_version integer;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_customer_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Enlace inválido' using errcode='22023'; end if;
 perform 1 from public.customers where id=p_customer_id for update;
 if not found then raise exception 'Cliente no existe' using errcode='P0002'; end if;
 insert into public.customer_access_links(customer_id,token_hash,issued_by) values(p_customer_id,p_token_hash,auth.uid())
 on conflict(customer_id) do update set token_hash=excluded.token_hash,version=public.customer_access_links.version+1,
  issued_at=now(),issued_by=excluded.issued_by,revoked_at=null
 returning version into v_version;
 return v_version;
end $$;
create function public.revoke_evalia_customer_link(p_customer_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 update public.customer_access_links set revoked_at=now() where customer_id=p_customer_id and revoked_at is null;
 return found;
end $$;
revoke all on function public.issue_evalia_customer_link(uuid,text),public.revoke_evalia_customer_link(uuid) from public,anon,authenticated,service_role;
grant execute on function public.issue_evalia_customer_link(uuid,text),public.revoke_evalia_customer_link(uuid) to authenticated;

create function public.get_evalia_public_catalog() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
 return evalia_security.catalog_items();
end $$;

create function public.client_evalia_customer_session(p_token_hash text) returns jsonb
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
  'orders',v_orders,'catalog',evalia_security.catalog_items());
end $$;

create function public.create_evalia_client_order(p_token_hash text,p_lines jsonb,p_request_id uuid,p_method text,p_destination text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_customer public.customers%rowtype; v_link public.customer_access_links%rowtype; v_prev public.client_order_requests%rowtype;
 v_order uuid; v_dest text:=nullif(btrim(coalesce(p_destination,'')),'');
begin
 v_customer:=evalia_security.customer_from_link(p_token_hash);
 select * into v_link from public.customer_access_links where customer_id=v_customer.id;
 if p_request_id is null or p_method is null or p_method not in ('pickup','shipping')
  or (p_method='shipping' and (v_dest is null or length(v_dest) not between 2 and 200))
  or (p_method='pickup' and v_dest is not null) then
  raise exception 'Tipo de entrega o destino no válidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prev from public.client_order_requests where request_id=p_request_id;
 if found and (v_prev.customer_id<>v_customer.id or v_prev.method<>p_method or v_prev.destination is distinct from v_dest) then
  raise exception 'Pedido repetido con datos diferentes' using errcode='23505';
 end if;
 if not found then
  perform pg_catalog.pg_advisory_xact_lock(740700,pg_catalog.hashtext(v_customer.id::text));
  if (select count(*) from public.client_order_requests where customer_id=v_customer.id and created_at>now()-interval '24 hours')>=5 then
   raise exception 'Alcanzaste el máximo de 5 pedidos en 24 horas; comunícate con EVALIA' using errcode='54000';
  end if;
 end if;
 insert into evalia_security.client_order_grants(txid,customer_id) values(pg_catalog.txid_current(),v_customer.id);
 v_order:=public.create_evalia_order(v_customer.id,p_lines,p_request_id);
 delete from evalia_security.client_order_grants where txid=pg_catalog.txid_current();
 if v_prev.request_id is null then
  update public.orders set fulfillment_method=p_method,shipping_destination=v_dest,
   recipient_name=v_customer.name,recipient_phone=v_customer.whatsapp,fulfillment_updated_at=clock_timestamp() where id=v_order;
  insert into public.client_order_requests(request_id,order_id,customer_id,link_version,method,destination)
   values(p_request_id,v_order,v_customer.id,v_link.version,p_method,v_dest);
 elsif v_prev.order_id<>v_order then
  raise exception 'Pedido repetido distinto' using errcode='23505';
 end if;
 return jsonb_build_object('reference',substring(v_order::text,1,8));
end $$;

revoke all on function public.get_evalia_public_catalog(),public.client_evalia_customer_session(text),
 public.create_evalia_client_order(text,jsonb,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.get_evalia_public_catalog(),public.client_evalia_customer_session(text),
 public.create_evalia_client_order(text,jsonb,uuid,text,text) to service_role;
