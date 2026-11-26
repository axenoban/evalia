-- E1-06: enforce customer RPC path and bind model creation retries to original payload and actor.
-- Existing model requests cannot be safely reconstructed from mutable catalog/stock.
revoke insert on public.customers from authenticated;
revoke insert(name,whatsapp,delivery_preference,shipping_destination) on public.customers from authenticated;
create table evalia_security.model_create_requests(
 request_id uuid primary key,
 actor_id uuid not null,
 model_id uuid not null references public.models(id) on delete restrict,
 fingerprint bytea not null,
 created_at timestamptz not null default now()
);
alter table evalia_security.model_create_requests enable row level security;
revoke all on evalia_security.model_create_requests from public,anon,authenticated,service_role;
create or replace function public.create_evalia_model(
 p_name text,p_size text,p_price numeric,p_color_ids uuid[],p_initial_units integer,
 p_request_id uuid,p_image_path text default null
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid; v_colors uuid[]; v_fingerprint bytea; v_prior evalia_security.model_create_requests%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null then raise exception 'Falta identificador de solicitud' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 if pg_catalog.length(pg_catalog.btrim(coalesce(p_name,'')))=0
    or pg_catalog.length(pg_catalog.btrim(coalesce(p_size,'')))=0
    or p_price is null or p_price<=0 or p_price>9999999999.99
    or p_price<>pg_catalog.round(p_price,2)
    or p_initial_units is null or p_initial_units<0
    or p_color_ids is null or pg_catalog.cardinality(p_color_ids)=0 then
  raise exception 'Datos de modelo inválidos' using errcode='22023';
 end if;
 select array_agg(distinct x order by x) into v_colors
 from pg_catalog.unnest(p_color_ids) x;
 if pg_catalog.cardinality(v_colors)<>pg_catalog.cardinality(p_color_ids)
    or exists(select 1 from pg_catalog.unnest(p_color_ids) x
        where x is null) then
  raise exception 'Selecciona colores existentes sin repetir' using errcode='22023';
 end if;
 v_fingerprint:=pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array(
  pg_catalog.btrim(p_name),pg_catalog.btrim(p_size),pg_catalog.round(p_price,2),v_colors,p_initial_units,p_image_path)::text,'UTF8'));
 select * into v_prior from evalia_security.model_create_requests where request_id=p_request_id;
 if found then
  if v_prior.actor_id is distinct from auth.uid() or v_prior.fingerprint is distinct from v_fingerprint then
   raise exception 'Reintento de alta de modelo con contenido o actor diferente' using errcode='23505';
  end if;
  return v_prior.model_id;
 end if;
 -- Histórico previo a E1: no es posible reconstruir la carga original de forma fiable.
 if exists(select 1 from public.models where create_request_id=p_request_id) then
  raise exception 'Solicitud histórica de modelo: actualiza y comprueba el catálogo' using errcode='23505';
 end if;
 if exists(select 1 from pg_catalog.unnest(v_colors) x where not exists(select 1 from public.colors c where c.id=x and c.is_active)) then
  raise exception 'Selecciona colores existentes sin repetir' using errcode='22023';
 end if;
 if p_image_path is not null and
    (pg_catalog.length(p_image_path)>500 or p_image_path !~ '^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$') then
  raise exception 'Ruta de fotografía inválida' using errcode='22023';
 end if;
 if p_image_path is not null and not exists(select 1 from storage.objects where bucket_id='evalia-models' and name=p_image_path) then
  raise exception 'La fotografía inicial no fue cargada' using errcode='23514';
 end if;
 insert into public.models(name,size_label,price_dozen_bs,image_path,create_request_id)
 values(pg_catalog.btrim(p_name),pg_catalog.btrim(p_size),p_price,p_image_path,p_request_id)
 returning id into v_id;
 insert into public.model_colors(model_id,color_id)
 select v_id,x from pg_catalog.unnest(v_colors) x;
 if p_initial_units>0 then
  perform public.adjust_model_inventory(v_id,'set_total',p_initial_units,0,p_request_id);
 end if;
 insert into evalia_security.model_create_requests(request_id,actor_id,model_id,fingerprint)
 values(p_request_id,auth.uid(),v_id,v_fingerprint);
 return v_id;
end;$;
