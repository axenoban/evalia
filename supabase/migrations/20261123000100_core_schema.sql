-- EVALIA D1-A | migration 1: 14 foundational tables, no color-level stock.
begin;
create table public.admin_profiles (
 user_id uuid primary key references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name))>0),
 whatsapp text not null check(length(btrim(whatsapp))>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Never merge customers automatically by WhatsApp.
create table public.colors (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name))>0),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index colors_name_casefold_key on public.colors(lower(btrim(name)));
create table public.models (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name))>0),
 size_label text not null check(length(btrim(size_label))>0),
 image_path text,
 price_dozen_bs numeric(12,2) not null check(price_dozen_bs>0),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.model_colors (
 model_id uuid not null references public.models(id) on delete restrict,
 color_id uuid not null references public.colors(id) on delete restrict,
 primary key(model_id,color_id)
);
create table public.model_inventory (
 model_id uuid primary key references public.models(id) on delete restrict,
 on_hand integer not null default 0 check(on_hand>=0),
 version bigint not null default 0 check(version>=0),
 blocked boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.inventory_events (
 request_id uuid primary key,
 model_id uuid not null references public.models(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 operation text not null check(operation in ('add','physical_sale','set_total')),
 input_units integer not null check(input_units>=0),
 before_units integer not null check(before_units>=0),
 after_units integer not null check(after_units>=0),
 delta_units integer not null,
 available_after integer not null,
 resulting_version bigint not null check(resulting_version>0),
 created_at timestamptz not null default now(),
 check(after_units=before_units+delta_units),
 unique(model_id,resulting_version)
);
create index inventory_events_model_time_idx on public.inventory_events(model_id,created_at desc);
-- Booking/order/delivery tables are structural only; no direct writes are granted.
create table public.reservations (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete restrict,
 status text not null default 'draft' check(status in ('draft','saved','converted','expired','in_review')),
 expires_at timestamptz,
 review_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index reservations_customer_idx on public.reservations(customer_id,created_at desc);
create table public.reservation_lines (
 id uuid primary key default gen_random_uuid(),
 reservation_id uuid not null references public.reservations(id) on delete restrict,
 model_id uuid not null references public.models(id) on delete restrict,
 quantity integer check(quantity>=6),
 unique(reservation_id,model_id)
);
create index reservation_lines_model_idx on public.reservation_lines(model_id);
-- Nullable quantity permits draft only: later booking RPC must reject any NULL on save.
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete restrict,
 origin_reservation_id uuid unique references public.reservations(id) on delete restrict,
 status text not null default 'active' check(status in ('active','completed')),
 confirmed_at timestamptz not null default now(),
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders(customer_id,created_at desc);
create table public.order_lines (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete restrict,
 model_id uuid not null references public.models(id) on delete restrict,
 quantity integer not null check(quantity>=6),
 price_dozen_bs numeric(12,2) not null check(price_dozen_bs>0),
 subtotal_bs numeric(14,2) not null check(subtotal_bs>=0),
 unique(order_id,model_id),
 unique(id,order_id)
);
create index order_lines_model_idx on public.order_lines(model_id);
create table public.deliveries (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete restrict,
 delivered_at timestamptz not null default now(),
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 unique(id,order_id)
);
create index deliveries_order_idx on public.deliveries(order_id);
create table public.delivery_lines (
 delivery_id uuid not null,
 order_line_id uuid not null,
 order_id uuid not null,
 quantity integer not null check(quantity>0),
 primary key(delivery_id,order_line_id),
 foreign key(delivery_id,order_id) references public.deliveries(id,order_id) on delete restrict,
 foreign key(order_line_id,order_id) references public.order_lines(id,order_id) on delete restrict
);
create index delivery_lines_order_line_idx on public.delivery_lines(order_line_id);
create table public.stock_incidents (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 model_id uuid not null references public.models(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 observed_usable_units integer not null check(observed_usable_units>=0),
 recorded_units integer not null check(recorded_units>=0),
 notes text,
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create index stock_incidents_model_idx on public.stock_incidents(model_id,created_at desc);
-- Auth users are not automatically admins.
create function public.is_evalia_admin()
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid());$$;
revoke all on function public.is_evalia_admin() from public,anon,authenticated;
grant execute on function public.is_evalia_admin() to authenticated;
create function public.create_model_inventory()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.model_inventory(model_id) values(new.id);
 return new;
end;$$;
revoke all on function public.create_model_inventory() from public,anon,authenticated;
create trigger model_inventory_on_create after insert on public.models
for each row execute function public.create_model_inventory();
-- Deny anonymous reads and direct stock/order writes. Admin policies require membership.
do $$
declare t text;
begin
 foreach t in array array[
 'admin_profiles','customers','colors','models','model_colors','model_inventory',
 'inventory_events','reservations','reservation_lines','orders','order_lines',
 'deliveries','delivery_lines','stock_incidents'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public,anon,authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
  if t <> 'admin_profiles' then
   execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_evalia_admin()))',t);
  end if;
 end loop;
end;$$;
create policy profile_self_read on public.admin_profiles for select to authenticated
 using(user_id=(select auth.uid()));
create policy admin_insert on public.colors for insert to authenticated with check((select public.is_evalia_admin()));
create policy admin_update on public.colors for update to authenticated
 using((select public.is_evalia_admin())) with check((select public.is_evalia_admin()));
grant insert(name,is_active),update(name,is_active) on public.colors to authenticated;
create policy admin_insert on public.models for insert to authenticated with check((select public.is_evalia_admin()));
create policy admin_update on public.models for update to authenticated
 using((select public.is_evalia_admin())) with check((select public.is_evalia_admin()));
grant insert(name,size_label,image_path,price_dozen_bs,is_active),
 update(name,image_path,price_dozen_bs,is_active) on public.models to authenticated;
create policy admin_insert on public.model_colors for insert to authenticated with check((select public.is_evalia_admin()));
create policy admin_delete on public.model_colors for delete to authenticated using((select public.is_evalia_admin()));
grant insert(model_id,color_id),delete on public.model_colors to authenticated;
create policy admin_insert on public.customers for insert to authenticated with check((select public.is_evalia_admin()));
create policy admin_update on public.customers for update to authenticated
 using((select public.is_evalia_admin())) with check((select public.is_evalia_admin()));
grant insert(name,whatsapp),update(name,whatsapp) on public.customers to authenticated;
commit;