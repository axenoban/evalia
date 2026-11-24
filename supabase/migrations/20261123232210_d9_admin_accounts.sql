-- D9-B1: roles y gestión privada de cuentas; sin modificar reglas comerciales.
-- En remoto existe exactamente un perfil anterior. En una base local vacía no hay propietario.
do $$ begin
 if (select count(*) from public.admin_profiles)>1 then
  raise exception 'Definir propietario explícitamente antes de migrar múltiples perfiles';
 end if;
end $$;
alter table public.admin_profiles add column role text not null default 'operator' check (role in ('owner','operator'));
alter table public.admin_profiles add column active boolean not null default true;
update public.admin_profiles set role='owner';
create unique index evalia_single_owner on public.admin_profiles(role) where role='owner';

create or replace function public.is_evalia_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active);
$$;
create function public.is_evalia_owner() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active and a.role='owner');
$$;
revoke all on function public.is_evalia_owner() from public,anon,authenticated,service_role;
grant execute on function public.is_evalia_owner() to authenticated;

-- La gestión requiere autenticación reciente por contraseña y sesión todavía existente.
create function public.can_manage_evalia_accounts() returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_evalia_owner()
  and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid())
  and exists(select 1 from pg_catalog.jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
   where a->>'method'='password' and (a->>'timestamp') ~ '^[0-9]{1,12}$'
    and (a->>'timestamp')::numeric between extract(epoch from now())-300 and extract(epoch from now())+10);
$$;
revoke all on function public.can_manage_evalia_accounts() from public,anon,authenticated,service_role;
grant execute on function public.can_manage_evalia_accounts() to authenticated;

create table public.admin_account_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 target_id uuid not null references auth.users(id),
 action text not null check(action in ('invite','recovery','suspend','reactivate')),
 created_at timestamptz not null default now()
);
alter table public.admin_account_events enable row level security;
revoke all on public.admin_account_events from public,anon,authenticated,service_role;
grant select on public.admin_account_events to authenticated;
create policy account_events_owner_read on public.admin_account_events for select to authenticated
 using ((select public.is_evalia_owner()));

create function public.list_evalia_admins() returns table(user_id uuid,email text,role text,active boolean,confirmed boolean,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_evalia_owner() then raise exception 'Acceso de propietario requerido' using errcode='42501'; end if;
 return query select p.user_id,u.email::text,p.role,p.active,u.email_confirmed_at is not null,p.created_at
 from public.admin_profiles p join auth.users u on u.id=p.user_id order by (p.role='owner') desc,p.created_at;
end $$;
revoke all on function public.list_evalia_admins() from public,anon,authenticated,service_role;
grant execute on function public.list_evalia_admins() to authenticated;

-- Sólo el backend de confianza, tras comprobar JWT y reautenticación del propietario.
-- El rol no se recibe como parámetro: una invitación nunca puede crear otro propietario.
create function public.register_evalia_operator(p_actor uuid,p_target uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_profiles where user_id=p_actor and active and role='owner') then
  raise exception 'Acceso de propietario requerido' using errcode='42501';
 end if;
 if p_actor=p_target or not exists(select 1 from auth.users where id=p_target) then
  raise exception 'Cuenta inválida' using errcode='22023';
 end if;
 insert into public.admin_profiles(user_id,role,active) values(p_target,'operator',true);
 insert into public.admin_account_events(actor_id,target_id,action) values(p_actor,p_target,'invite');
 return true;
end $$;
revoke all on function public.register_evalia_operator(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.register_evalia_operator(uuid,uuid) to service_role;

create function public.log_evalia_recovery(p_actor uuid,p_target uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_profiles where user_id=p_actor and active and role='owner')
 or not exists(select 1 from public.admin_profiles where user_id=p_target and active) then
  raise exception 'Cuenta no autorizada' using errcode='42501';
 end if;
 insert into public.admin_account_events(actor_id,target_id,action) values(p_actor,p_target,'recovery');
 return true;
end $$;
revoke all on function public.log_evalia_recovery(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.log_evalia_recovery(uuid,uuid) to service_role;

create function public.set_evalia_operator_active(p_target uuid,p_active boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.can_manage_evalia_accounts() then raise exception 'Reautenticación de propietario requerida' using errcode='42501'; end if;
 if p_active is null then raise exception 'Estado inválido' using errcode='22023'; end if;
 update public.admin_profiles set active=p_active where user_id=p_target and role='operator' and active is distinct from p_active;
 if not found then raise exception 'Operador no encontrado o sin cambios' using errcode='22023'; end if;
 insert into public.admin_account_events(actor_id,target_id,action)
 values(auth.uid(),p_target,case when p_active then 'reactivate' else 'suspend' end);
 return true;
end $$;
revoke all on function public.set_evalia_operator_active(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_evalia_operator_active(uuid,boolean) to authenticated;

-- Proteger QR tanto en RPC como en Storage. Lectura de QR vigente sigue disponible a operadores.
do $$ declare definition text;
begin
 select pg_catalog.pg_get_functiondef('public.update_evalia_qr(text,boolean,uuid)'::regprocedure) into definition;
 if position('public.is_evalia_admin()' in definition)=0 then raise exception 'Contrato QR inesperado'; end if;
 execute replace(definition,'public.is_evalia_admin()','public.is_evalia_owner()');
end $$;
alter policy evalia_qr_admin_delete on storage.objects
 using (bucket_id='evalia-qr' and (select public.is_evalia_owner()));
alter policy evalia_qr_admin_upload on storage.objects
 with check (bucket_id='evalia-qr' and name ~ '^qr/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)$' and (select public.is_evalia_owner()));
