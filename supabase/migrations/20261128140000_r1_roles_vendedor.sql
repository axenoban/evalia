-- R1: roles de administración. Valores en BD (sin renombrar para no alterar datos ni contratos):
--   owner    = Administrador global (único, MFA obligatorio; gestiona usuarios, roles, QR y estadísticas)
--   operator = Administrador (productos, pedidos, cobros, entregas; igual que antes, nadie pierde permisos)
--   seller   = Vendedor (registra clientes y pedidos, informa pagos sin aprobar, ve todos los pedidos)
-- is_evalia_admin() conserva su significado (owner u operator) y protege todas las escrituras sensibles.
-- is_evalia_staff() incluye al vendedor y se usa solo en lecturas y operaciones permitidas al vendedor.

alter table public.admin_profiles drop constraint admin_profiles_role_check;
alter table public.admin_profiles add constraint admin_profiles_role_check check (role in ('owner','operator','seller'));
alter table public.admin_account_events drop constraint admin_account_events_action_check;
alter table public.admin_account_events add constraint admin_account_events_action_check
 check (action in ('invite','recovery','suspend','reactivate','role_change'));
alter table public.admin_account_events add column detail text check (detail is null or length(detail)<=40);

-- Sesión: el vendedor sigue la política del operador (aal1 sin factor; aal2 si tiene MFA verificado).
create or replace function evalia_security.session_allowed(p_role text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(
  auth.uid() is not null and p_role in ('owner','operator','seller')
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
   (p_role in ('operator','seller') and auth.jwt()->>'aal'='aal1'
    and not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'))
   or (auth.jwt()->>'aal'='aal2' and exists(
    select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp'))
  ),false);
$$;
revoke all on function evalia_security.session_allowed(text) from public,anon,authenticated,service_role;

-- Administrador completo: excluye explícitamente al vendedor.
create or replace function public.is_evalia_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active
 and a.role in ('owner','operator') and evalia_security.session_allowed(a.role));
$$;
create function public.is_evalia_staff() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles a where a.user_id=auth.uid() and a.active
 and a.role in ('owner','operator','seller') and evalia_security.session_allowed(a.role));
$$;
revoke all on function public.is_evalia_staff() from public,anon,authenticated,service_role;
grant execute on function public.is_evalia_staff() to authenticated;

create function public.get_evalia_my_role() returns text
language sql stable security definer set search_path='' as $$
 select a.role from public.admin_profiles a where a.user_id=auth.uid() and a.active
 and evalia_security.session_allowed(a.role);
$$;
revoke all on function public.get_evalia_my_role() from public,anon,authenticated,service_role;
grant execute on function public.get_evalia_my_role() to authenticated;

-- Operaciones permitidas al vendedor: se reemplaza la condición exactamente una vez en cada función.
do $$
declare v_sig text; v_def text;
begin
 foreach v_sig in array array[
  'public.get_model_stock(uuid)','public.get_evalia_stock_batch(uuid[])',
  'public.get_evalia_order_finance(uuid)','public.get_evalia_order_delivery(uuid)',
  'public.evalia_validate_portions(jsonb)','public.create_evalia_order(uuid,jsonb,uuid)',
  'public.create_evalia_order_delivery(uuid,jsonb,uuid,text,text)',
  'public.create_evalia_customer(text,text,text,text,uuid,boolean)',
  'public.report_evalia_payment(uuid,uuid,numeric,uuid,text)'] loop
  v_def:=pg_catalog.pg_get_functiondef(v_sig::regprocedure);
  if (length(v_def)-length(replace(v_def,'public.is_evalia_admin()','')))/length('public.is_evalia_admin()')<>1 then
   raise exception 'Contrato inesperado en %',v_sig;
  end if;
  execute replace(v_def,'public.is_evalia_admin()','public.is_evalia_staff()');
 end loop;
end $$;

-- Lecturas del vendedor (políticas adicionales; las de administrador no cambian).
create policy staff_read on public.colors for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.customers for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.models for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.model_colors for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.orders for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.order_lines for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.order_extra_colors for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.payment_reports for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.deliveries for select to authenticated using ((select public.is_evalia_staff()));
create policy staff_read on public.delivery_lines for select to authenticated using ((select public.is_evalia_staff()));
create policy evalia_model_photos_staff_select on storage.objects for select to authenticated
 using (bucket_id='evalia-models' and (select public.is_evalia_staff()));

-- Invitación con rol (solo backend de confianza tras reautenticación del propietario). Nunca crea propietario.
create function public.register_evalia_member(p_actor uuid,p_target uuid,p_role text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_profiles where user_id=p_actor and active and role='owner') then
  raise exception 'Acceso de propietario requerido' using errcode='42501';
 end if;
 if p_role is null or p_role not in ('operator','seller') then raise exception 'Rol inválido' using errcode='22023'; end if;
 if p_actor=p_target or not exists(select 1 from auth.users where id=p_target) then
  raise exception 'Cuenta inválida' using errcode='22023';
 end if;
 insert into public.admin_profiles(user_id,role,active) values(p_target,p_role,true);
 insert into public.admin_account_events(actor_id,target_id,action,detail) values(p_actor,p_target,'invite',p_role);
 return true;
end $$;
revoke all on function public.register_evalia_member(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.register_evalia_member(uuid,uuid,text) to service_role;

-- Cambio de rol: solo el administrador global con contraseña reciente; nunca sobre sí mismo ni hacia propietario.
create function public.set_evalia_member_role(p_target uuid,p_role text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.can_manage_evalia_accounts() then raise exception 'Reautenticación de propietario requerida' using errcode='42501'; end if;
 if p_role is null or p_role not in ('operator','seller') then raise exception 'Rol inválido' using errcode='22023'; end if;
 update public.admin_profiles set role=p_role
  where user_id=p_target and role in ('operator','seller') and role<>p_role and user_id<>auth.uid();
 if not found then raise exception 'Cuenta no encontrada o sin cambios' using errcode='22023'; end if;
 insert into public.admin_account_events(actor_id,target_id,action,detail) values(auth.uid(),p_target,'role_change',p_role);
 return true;
end $$;
revoke all on function public.set_evalia_member_role(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_evalia_member_role(uuid,text) to authenticated;

-- Suspender/reactivar ahora también aplica a vendedores (nunca al propietario).
create or replace function public.set_evalia_operator_active(p_target uuid,p_active boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.can_manage_evalia_accounts() then raise exception 'Reautenticación de propietario requerida' using errcode='42501'; end if;
 if p_active is null then raise exception 'Estado inválido' using errcode='22023'; end if;
 update public.admin_profiles set active=p_active where user_id=p_target and role in ('operator','seller') and active is distinct from p_active;
 if not found then raise exception 'Operador no encontrado o sin cambios' using errcode='22023'; end if;
 insert into public.admin_account_events(actor_id,target_id,action)
 values(auth.uid(),p_target,case when p_active then 'reactivate' else 'suspend' end);
 return true;
end $$;
