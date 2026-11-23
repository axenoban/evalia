-- EVALIA M03/M05: mantenimiento básico auditable sin reescribir pedidos históricos.
begin;

create table public.model_catalog_revisions(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 model_id uuid not null references public.models(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 expected_updated_at timestamptz not null,
 old_price numeric(12,2) not null,
 new_price numeric(12,2) not null,
 old_image_path text,
 new_image_path text,
 requested_image_path text,
 created_at timestamptz not null default now()
);
create index model_catalog_revisions_model_idx on public.model_catalog_revisions(model_id,created_at desc);

create table public.customer_contact_revisions(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 customer_id uuid not null references public.customers(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 expected_updated_at timestamptz not null,
 old_name text not null,
 new_name text not null,
 old_whatsapp text not null,
 new_whatsapp text not null,
 created_at timestamptz not null default now()
);
create index customer_contact_revisions_customer_idx on public.customer_contact_revisions(customer_id,created_at desc);

do $$
declare tab text;
begin
 foreach tab in array array['model_catalog_revisions','customer_contact_revisions'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy admin_read on public.%I for select to authenticated using((select public.is_evalia_admin()))',tab);
 end loop;
end $$;

create function public.update_evalia_model(
 p_model_id uuid,p_price numeric,p_new_image_path text,
 p_expected_updated_at timestamptz,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_model public.models%rowtype; v_existing public.model_catalog_revisions%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_model_id is null or p_request_id is null or p_expected_updated_at is null
  or p_price is null or p_price<=0 or p_price>9999999999.99
  or p_price<>pg_catalog.round(p_price,2)
  or (p_new_image_path is not null and
      (p_new_image_path !~ '^models/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$'
       or pg_catalog.length(p_new_image_path)>500)) then
  raise exception 'Datos de actualización inválidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_existing from public.model_catalog_revisions where request_id=p_request_id;
 if found then
  if v_existing.model_id<>p_model_id or v_existing.new_price<>p_price
   or v_existing.requested_image_path is distinct from p_new_image_path
   or v_existing.expected_updated_at is distinct from p_expected_updated_at then
   raise exception 'Reintento de modelo con contenido diferente' using errcode='23505';
  end if;
  return v_existing.model_id;
 end if;
 select * into v_model from public.models where id=p_model_id for update;
 if not found then raise exception 'Modelo no existe' using errcode='P0002'; end if;
 if v_model.updated_at is distinct from p_expected_updated_at then
  raise exception 'El modelo cambió. Actualiza los datos antes de guardar' using errcode='40001';
 end if;
 if p_new_image_path is not null and
  not exists(select 1 from storage.objects where bucket_id='evalia-models' and name=p_new_image_path) then
  raise exception 'La nueva fotografía no fue cargada' using errcode='23514';
 end if;
 if v_model.price_dozen_bs=p_price and
  (p_new_image_path is null or v_model.image_path=p_new_image_path) then
  return v_model.id;
 end if;
 update public.models
  set price_dozen_bs=p_price,
      image_path=coalesce(p_new_image_path,v_model.image_path),
      updated_at=clock_timestamp()
  where id=p_model_id;
 insert into public.model_catalog_revisions(
  request_id,model_id,actor_id,expected_updated_at,old_price,new_price,
  old_image_path,new_image_path,requested_image_path)
 values(
  p_request_id,p_model_id,auth.uid(),p_expected_updated_at,
  v_model.price_dozen_bs,p_price,v_model.image_path,
  coalesce(p_new_image_path,v_model.image_path),p_new_image_path);
 return p_model_id;
end;$$;
revoke all on function public.update_evalia_model(uuid,numeric,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.update_evalia_model(uuid,numeric,text,timestamptz,uuid) to authenticated;

create function public.update_evalia_customer(
 p_customer_id uuid,p_name text,p_whatsapp text,
 p_expected_updated_at timestamptz,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_customer public.customers%rowtype; v_existing public.customer_contact_revisions%rowtype;
 v_name text:=pg_catalog.btrim(coalesce(p_name,''));v_phone text:=pg_catalog.btrim(coalesce(p_whatsapp,''));
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_customer_id is null or p_request_id is null or p_expected_updated_at is null
  or pg_catalog.length(v_name) not between 1 and 130
  or pg_catalog.length(v_phone) not between 1 and 30 then
  raise exception 'Datos del cliente inválidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_existing from public.customer_contact_revisions where request_id=p_request_id;
 if found then
  if v_existing.customer_id<>p_customer_id or v_existing.new_name<>v_name
   or v_existing.new_whatsapp<>v_phone
   or v_existing.expected_updated_at is distinct from p_expected_updated_at then
   raise exception 'Reintento de cliente con contenido diferente' using errcode='23505';
  end if;
  return v_existing.customer_id;
 end if;
 select * into v_customer from public.customers where id=p_customer_id for update;
 if not found then raise exception 'Cliente no existe' using errcode='P0002'; end if;
 if v_customer.updated_at is distinct from p_expected_updated_at then
  raise exception 'La ficha del cliente cambió. Recarga antes de editar' using errcode='40001';
 end if;
 if v_customer.name=v_name and v_customer.whatsapp=v_phone then return v_customer.id; end if;
 update public.customers
  set name=v_name,whatsapp=v_phone,updated_at=clock_timestamp()
  where id=p_customer_id;
 insert into public.customer_contact_revisions(
  request_id,customer_id,actor_id,expected_updated_at,
  old_name,new_name,old_whatsapp,new_whatsapp)
 values(p_request_id,p_customer_id,auth.uid(),p_expected_updated_at,
  v_customer.name,v_name,v_customer.whatsapp,v_phone);
 return p_customer_id;
end;$$;
revoke all on function public.update_evalia_customer(uuid,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.update_evalia_customer(uuid,text,text,timestamptz,uuid) to authenticated;

-- Obligar a que cambios de precio, fotografía y contacto usen la RPC auditada.
revoke update(name,image_path,price_dozen_bs) on table public.models from authenticated;
revoke update(name,whatsapp) on table public.customers from authenticated;
commit;
