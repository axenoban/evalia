begin;
alter table public.orders add column prepared_at timestamptz,
 add column prepared_by uuid references public.admin_profiles(user_id) on delete restrict,
 add column preparation_version bigint not null default 0 check(preparation_version>=0),
 add constraint orders_preparation_consistency check((prepared_at is null)=(prepared_by is null));
create table public.order_preparation_events(
 order_id uuid not null references public.orders(id) on delete restrict,
 version bigint not null check(version>0),
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 prepared boolean not null,
 reason text not null check(reason in ('manual','order_edited')),
 created_at timestamptz not null default clock_timestamp(),
 primary key(order_id,version)
);
alter table public.order_preparation_events enable row level security;
revoke all on public.order_preparation_events from public,anon,authenticated,service_role;
grant select on public.order_preparation_events to authenticated;
create policy admin_read on public.order_preparation_events for select to authenticated using ((select public.is_evalia_admin()));
create function public.reset_evalia_preparation_after_edit()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.revision is distinct from old.revision then
  new.preparation_version:=old.preparation_version+1;
  if old.prepared_at is not null then
   new.prepared_at:=null; new.prepared_by:=null;
   insert into public.order_preparation_events(order_id,version,actor_id,prepared,reason)
    values(old.id,new.preparation_version,auth.uid(),false,'order_edited');
  end if;
 end if;
 return new;
end;$$;
revoke all on function public.reset_evalia_preparation_after_edit() from public,anon,authenticated,service_role;
create trigger evalia_reset_preparation_after_edit before update of revision on public.orders
 for each row execute function public.reset_evalia_preparation_after_edit();
create function public.set_evalia_order_prepared(p_order_id uuid,p_prepared boolean,p_expected_version bigint)
returns bigint language plpgsql volatile security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_version bigint;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_order_id is null or p_prepared is null or p_expected_version is null or p_expected_version<0 then
  raise exception 'Datos de preparación inválidos' using errcode='22023'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' or v_order.archived_at is not null then
  raise exception 'Solo pedidos activos sin archivar' using errcode='23514'; end if;
 if v_order.preparation_version<>p_expected_version then
  raise exception 'El pedido cambió. Actualiza antes de modificar la preparación' using errcode='40001'; end if;
 if (v_order.prepared_at is not null)=p_prepared then return v_order.preparation_version; end if;
 v_version:=v_order.preparation_version+1;
 update public.orders set prepared_at=case when p_prepared then clock_timestamp() else null end,
  prepared_by=case when p_prepared then auth.uid() else null end,preparation_version=v_version where id=p_order_id;
 insert into public.order_preparation_events(order_id,version,actor_id,prepared,reason)
  values(p_order_id,v_version,auth.uid(),p_prepared,'manual');
 return v_version;
end;$$;
revoke all on function public.set_evalia_order_prepared(uuid,boolean,bigint) from public,anon,authenticated,service_role;
grant execute on function public.set_evalia_order_prepared(uuid,boolean,bigint) to authenticated;
commit;
