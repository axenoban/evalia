-- E1-04/05: autorización server-side. Solo candidato aislado hasta publicación aprobada.
create schema if not exists evalia_security;
revoke all on schema evalia_security from public,anon,authenticated,service_role;
create or replace function evalia_security.session_allowed(p_role text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(
  auth.uid() is not null and p_role in ('owner','operator')
  and exists(
   select 1 from auth.sessions s
   where s.id=case when auth.jwt()->>'session_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     then (auth.jwt()->>'session_id')::uuid else null end
     and s.user_id=auth.uid()
     and s.created_at>now()-interval '720 hours'
     and s.created_at<=now()+interval '10 seconds'
     and (s.not_after is null or s.not_after>now())
   )
  and (
   (p_role='operator' and auth.jwt()->>'aal'='aal1'
    and not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'))
   or (auth.jwt()->>'aal'='aal2' and exists(
    select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp'))
  ),false);
$$;
revoke all on function evalia_security.session_allowed(text) from public,anon,authenticated,service_role;

create or replace function public.is_evalia_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active
 and evalia_security.session_allowed(a.role));
$$;
create or replace function public.is_evalia_owner() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active and a.role='owner'
 and evalia_security.session_allowed(a.role));
$$;
-- can_manage_evalia_accounts ya exige is_evalia_owner y AMR password reciente.
CREATE OR REPLACE FUNCTION public.update_evalia_qr(p_image_path text, p_verified_reusable boolean, p_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_old public.payment_qr%rowtype; v_prior public.qr_change_events%rowtype;
begin
 if not public.is_evalia_owner() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if not public.can_manage_evalia_accounts() then raise exception 'Reautenticación de propietario requerida' using errcode='42501'; end if;
 if p_request_id is null or p_image_path is null
  or p_image_path !~ '^qr/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)$'
  or p_verified_reusable is null then
  raise exception 'QR inválido' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.qr_change_events where request_id=p_request_id;
 if found then
  if v_prior.new_path<>p_image_path or
     v_prior.reusable_verified<>p_verified_reusable then
   raise exception 'Reintento QR distinto' using errcode='23505';
  end if;
  return true;
 end if;
 if not exists(select 1 from storage.objects where bucket_id='evalia-qr' and name=p_image_path) then
  raise exception 'La imagen QR no se cargó en el almacén privado' using errcode='23514';
 end if;
 select * into v_old from public.payment_qr where id=true for update;
 insert into public.payment_qr(id,image_path,reusable_verified,updated_by)
  values(true,p_image_path,p_verified_reusable,auth.uid())
 on conflict(id) do update set image_path=excluded.image_path,
  reusable_verified=excluded.reusable_verified,updated_by=excluded.updated_by,updated_at=now();
 insert into public.qr_change_events(request_id,old_path,new_path,reusable_verified,actor_id)
  values(p_request_id,v_old.image_path,p_image_path,p_verified_reusable,auth.uid());
 return true;
end;$function$;
alter policy evalia_qr_admin_upload on storage.objects with check (
 bucket_id='evalia-qr' and name ~ '^qr/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp)$'
 and (select public.can_manage_evalia_accounts()));
alter policy evalia_qr_admin_delete on storage.objects using (
 bucket_id='evalia-qr' and (select public.can_manage_evalia_accounts())
 and not exists(select 1 from public.payment_qr q where q.image_path=storage.objects.name));
