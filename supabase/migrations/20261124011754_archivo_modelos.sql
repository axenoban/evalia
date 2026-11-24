-- Baja lógica de modelos y limpieza de fotos mediante Storage API.
begin;
alter table public.models add column archived_at timestamptz,
 add column archived_by uuid references public.admin_profiles(user_id) on delete restrict;
-- No permitir que el cliente omita el bloqueo y las comprobaciones de la RPC.
revoke update(is_active) on public.models from authenticated;
create function public.archive_evalia_model(p_model_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_model public.models%rowtype; v_path text;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_model_id is null or p_expected_updated_at is null then raise exception 'Modelo o versión inválidos' using errcode='22023'; end if;
 -- Mismo bloqueo de inventario que pedidos, entregas y reservas.
 perform 1 from public.model_inventory where model_id=p_model_id for update;
 if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
 select * into v_model from public.models where id=p_model_id for update;
 if not found then raise exception 'Modelo no existe' using errcode='P0002'; end if;
 if v_model.is_active then
  if v_model.updated_at is distinct from p_expected_updated_at then
   raise exception 'El modelo cambió. Actualiza antes de inhabilitar' using errcode='40001';
  end if;
  if exists(select 1 from public.order_lines l join public.orders o on o.id=l.order_id
            where l.model_id=p_model_id and o.status='active')
     or exists(select 1 from public.reservation_lines l join public.reservations r on r.id=l.reservation_id
            where l.model_id=p_model_id and r.status in ('saved','in_review')) then
   raise exception 'El modelo tiene pedidos o compromisos pendientes. Complétalos antes de inhabilitar' using errcode='23514';
  end if;
  update public.models set is_active=false,archived_at=clock_timestamp(),archived_by=auth.uid(),updated_at=clock_timestamp()
   where id=p_model_id;
 end if;
 v_path:=v_model.image_path;
 if v_path is not null and exists(select 1 from public.models where is_active and image_path=v_path) then v_path:=null; end if;
 return pg_catalog.jsonb_build_object('model_id',p_model_id,'photo_path',v_path);
end;$$;
revoke all on function public.archive_evalia_model(uuid,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.archive_evalia_model(uuid,timestamptz) to authenticated;

-- Impedir reutilizar una ruta en proceso de archivo, y editar fichas históricas.
create function public.guard_evalia_archived_model() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if not old.is_active and (new.is_active or new.name is distinct from old.name
     or new.size_label is distinct from old.size_label or new.price_dozen_bs is distinct from old.price_dozen_bs
     or (new.image_path is not null and new.image_path is distinct from old.image_path)) then
   raise exception 'El modelo archivado conserva su ficha histórica' using errcode='23514';
  end if;
  if new.image_path is not distinct from old.image_path then return new; end if;
 end if;
 if new.is_active and new.image_path is not null and exists(
   select 1 from public.models m where not m.is_active and m.image_path=new.image_path and m.id<>new.id) then
  raise exception 'La fotografía está en proceso de archivo' using errcode='23514';
 end if;
 return new;
end;$$;
revoke all on function public.guard_evalia_archived_model() from public,anon,authenticated,service_role;
create trigger guard_evalia_archived_model before insert or update on public.models
 for each row execute function public.guard_evalia_archived_model();

-- Storage borra el objeto físico, nunca DELETE SQL en storage.objects.
-- Conservar permiso de eliminar una carga temporal sin referencias activas.
alter policy evalia_model_photos_admin_delete on storage.objects
 using(bucket_id='evalia-models' and (select public.is_evalia_admin())
   and not exists(select 1 from public.models m where m.is_active and m.image_path=storage.objects.name));

create function public.finalize_evalia_archived_photo(p_image_path text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_image_path is null or p_image_path !~ '^models/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$' then
  raise exception 'Ruta de fotografía inválida' using errcode='22023';
 end if;
 if exists(select 1 from public.models where is_active and image_path=p_image_path)
  or exists(select 1 from storage.objects where bucket_id='evalia-models' and name=p_image_path) then return false; end if;
 update public.models set image_path=null,updated_at=clock_timestamp()
  where not is_active and image_path=p_image_path;
 return true;
end;$$;
revoke all on function public.finalize_evalia_archived_photo(text) from public,anon,authenticated,service_role;
grant execute on function public.finalize_evalia_archived_photo(text) to authenticated;
commit;
