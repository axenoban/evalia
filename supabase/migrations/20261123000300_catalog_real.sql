-- EVALIA: catálogo real, muestras de color y foto privada.
begin;
alter table public.colors add column hex_code text
 check(hex_code is null or hex_code ~ '^#[0-9A-Fa-f]{6}$');
grant insert(name,is_active,hex_code), update(name,is_active,hex_code) on public.colors to authenticated;
alter table public.models add column create_request_id uuid unique;

-- Idempotente, atómico: modelo + colores ofertados + existencia inicial.
create function public.create_evalia_model(
 p_name text,p_size text,p_price numeric,p_color_ids uuid[],p_initial_units integer,
 p_request_id uuid,p_image_path text default null
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid; v_color uuid; v_colors uuid[];
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null then raise exception 'Falta identificador de solicitud' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id into v_id from public.models where create_request_id=p_request_id;
 if found then return v_id; end if;
 if pg_catalog.length(pg_catalog.btrim(coalesce(p_name,'')))=0
    or pg_catalog.length(pg_catalog.btrim(coalesce(p_size,'')))=0
    or p_price is null or p_price<=0 or p_price>9999999999.99
    or p_price<>pg_catalog.round(p_price,2)
    or p_initial_units is null or p_initial_units<0
    or p_color_ids is null or pg_catalog.cardinality(p_color_ids)=0 then
  raise exception 'Datos de modelo inválidos' using errcode='22023';
 end if;
 select array_agg(distinct x) into v_colors
 from pg_catalog.unnest(p_color_ids) x;
 if pg_catalog.cardinality(v_colors)<>pg_catalog.cardinality(p_color_ids)
    or exists(select 1 from pg_catalog.unnest(p_color_ids) x
        where x is null or not exists(select 1 from public.colors c where c.id=x and c.is_active)) then
  raise exception 'Selecciona colores existentes sin repetir' using errcode='22023';
 end if;
 if p_image_path is not null and
    (pg_catalog.length(p_image_path)>500 or p_image_path !~ '^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$') then
  raise exception 'Ruta de fotografía inválida' using errcode='22023';
 end if;
 insert into public.models(name,size_label,price_dozen_bs,image_path,create_request_id)
 values(pg_catalog.btrim(p_name),pg_catalog.btrim(p_size),p_price,p_image_path,p_request_id)
 returning id into v_id;
 insert into public.model_colors(model_id,color_id)
 select v_id,x from pg_catalog.unnest(v_colors) x;
 if p_initial_units>0 then
  perform public.adjust_model_inventory(v_id,'set_total',p_initial_units,0,p_request_id);
 end if;
 return v_id;
end;$$;
revoke all on function public.create_evalia_model(text,text,numeric,uuid[],integer,uuid,text)
 from public,anon,authenticated;
grant execute on function public.create_evalia_model(text,text,numeric,uuid[],integer,uuid,text)
 to authenticated;

-- Solo administradores pueden cargar y ver fotografías. Las URLs firmadas vencen.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evalia-models','evalia-models',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy evalia_model_photos_admin_select on storage.objects
 for select to authenticated using(bucket_id='evalia-models' and (select public.is_evalia_admin()));
create policy evalia_model_photos_admin_insert on storage.objects
 for insert to authenticated with check(bucket_id='evalia-models' and (select public.is_evalia_admin()));
create policy evalia_model_photos_admin_delete on storage.objects
 for delete to authenticated using(bucket_id='evalia-models' and (select public.is_evalia_admin()));
commit;
