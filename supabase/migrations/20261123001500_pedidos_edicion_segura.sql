-- EVALIA D9 · Edición segura de pedidos no cobrados ni entregados.
-- Conserva snapshots de precio, cupos por modelo, bloqueo y auditoría.
begin;

alter table public.orders
 add column revision bigint not null default 0 check (revision>=0);

create table public.order_revisions(
 request_id uuid primary key,
 order_id uuid not null references public.orders(id) on delete restrict,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 expected_revision bigint not null check(expected_revision>=0),
 new_revision bigint not null check(new_revision>0),
 payload_fingerprint text not null,
 previous_lines jsonb not null,
 updated_lines jsonb not null,
 total_before_bs numeric(14,2) not null,
 total_after_bs numeric(14,2) not null,
 created_at timestamptz not null default now(),
 unique(order_id,new_revision)
);
create index order_revisions_order_time_idx on public.order_revisions(order_id,created_at desc);
alter table public.order_revisions enable row level security;
revoke all on table public.order_revisions from public,anon,authenticated,service_role;
grant select on table public.order_revisions to authenticated;
create policy admin_read on public.order_revisions
 for select to authenticated using ((select public.is_evalia_admin()));

create function public.revise_evalia_order(
 p_order_id uuid,p_lines jsonb,p_expected_revision bigint,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_order public.orders%rowtype;
 v_prior public.order_revisions%rowtype;
 v_payload text;v_previous jsonb;v_after jsonb;
 v_old integer;v_stock jsonb;
 v_row record;v_line_id uuid;v_i integer;v_price numeric(12,2);
 v_total_before numeric(14,2);v_total_after numeric(14,2);
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_order_id is null or p_request_id is null
    or p_expected_revision is null or p_expected_revision<0 then
  raise exception 'Identificadores o versión inválidos' using errcode='22023';
 end if;
 v_payload:=pg_catalog.md5(p_order_id::text||':'||p_expected_revision::text||':'||coalesce(p_lines::text,'null'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.order_revisions where request_id=p_request_id;
 if found then
  if v_prior.order_id<>p_order_id or v_prior.payload_fingerprint<>v_payload then
   raise exception 'Reintento de edición con contenido distinto' using errcode='23505';
  end if;
  return p_order_id;
 end if;

 -- La fila del pedido serializa modificaciones concurrentes y pagos vinculados por FK.
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' then
  raise exception 'Solo pueden editarse pedidos activos' using errcode='23514';
 end if;
 if v_order.revision<>p_expected_revision then
  raise exception 'El pedido cambió. Actualiza antes de editar de nuevo' using errcode='40001';
 end if;
 -- Sin política canónica para recalcular pagos, entregas o histórico de reservas.
 if v_order.origin_reservation_id is not null
  or exists(select 1 from public.payment_reports where order_id=p_order_id)
  or exists(select 1 from public.deliveries where order_id=p_order_id)
  or exists(select 1 from public.order_access_links
            where order_id=p_order_id and revoked_at is null) then
  raise exception 'No se puede editar un pedido con pagos, entregas, enlace activo o histórico previo'
   using errcode='23514';
 end if;
 -- Mantener integridad de la composición y precios existentes por modelo.
 perform 1 from public.evalia_validate_portions(p_lines);
 select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('modelId',l.model_id,
      'dozens',l.dozen_count,'quantity',l.quantity,
      'extraColorIds',(select coalesce(pg_catalog.jsonb_agg(ec.color_id order by ec.position),'[]'::jsonb)
        from public.order_extra_colors ec where ec.order_line_id=l.id),
      'priceDozenBs',l.price_dozen_bs,'subtotalBs',l.subtotal_bs)
    order by l.model_id),'[]'::jsonb),
  coalesce(sum(l.subtotal_bs),0)
  into v_previous,v_total_before
 from public.order_lines l where l.order_id=p_order_id;

 -- Lock de inventarios, incluyendo modelos retirados, en orden determinista.
 for v_row in
   select model_id from (
      select model_id from public.order_lines where order_id=p_order_id
      union
      select model_id from public.evalia_validate_portions(p_lines)
   ) models order by model_id
 loop
  perform 1 from public.model_inventory where model_id=v_row.model_id for update;
  if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
 end loop;
 for v_row in select model_id,quantity from public.evalia_validate_portions(p_lines) loop
  select coalesce(sum(quantity),0)::integer into v_old from public.order_lines
   where order_id=p_order_id and model_id=v_row.model_id;
  v_stock:=public.get_model_stock(v_row.model_id);
  if v_row.quantity>(v_stock->>'available')::integer+v_old
   or ((v_stock->>'blocked')::boolean and v_row.quantity>v_old) then
   raise exception 'La modificación excede el stock libre del modelo %',v_row.model_id using errcode='23514';
  end if;
 end loop;

 delete from public.order_extra_colors where order_line_id in
  (select id from public.order_lines where order_id=p_order_id);
 delete from public.order_lines where order_id=p_order_id;
 for v_row in select * from public.evalia_validate_portions(p_lines) order by model_id loop
  -- La línea anterior se conserva únicamente como fuente inmutable del precio histórico.
  select (entry->>'priceDozenBs')::numeric into v_price
    from pg_catalog.jsonb_array_elements(v_previous) entry
    where entry->>'modelId'=v_row.model_id::text limit 1;
  if v_price is null then
   select price_dozen_bs into v_price from public.models where id=v_row.model_id;
  end if;
  insert into public.order_lines(order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs)
   values(p_order_id,v_row.model_id,v_row.quantity,v_row.dozen_count,v_row.extra_units,
          v_price,public.evalia_model_subtotal(v_price,v_row.quantity))
   returning id into v_line_id;
  for v_i in 1..v_row.extra_units loop
   insert into public.order_extra_colors(order_line_id,model_id,color_id,position)
   values(v_line_id,v_row.model_id,v_row.color_ids[v_i],v_i);
  end loop;
 end loop;
 select coalesce(sum(l.subtotal_bs),0) into v_total_after
  from public.order_lines l where l.order_id=p_order_id;
 select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('modelId',l.model_id,
      'dozens',l.dozen_count,'quantity',l.quantity,
      'extraColorIds',(select coalesce(pg_catalog.jsonb_agg(ec.color_id order by ec.position),'[]'::jsonb)
        from public.order_extra_colors ec where ec.order_line_id=l.id),
      'priceDozenBs',l.price_dozen_bs,'subtotalBs',l.subtotal_bs)
    order by l.model_id),'[]'::jsonb)
 into v_after from public.order_lines l where l.order_id=p_order_id;
 update public.orders set revision=revision+1 where id=p_order_id;
 insert into public.order_revisions(
  request_id,order_id,actor_id,expected_revision,new_revision,payload_fingerprint,
  previous_lines,updated_lines,total_before_bs,total_after_bs)
 values(p_request_id,p_order_id,auth.uid(),p_expected_revision,v_order.revision+1,
  v_payload,v_previous,v_after,v_total_before,v_total_after);
 return p_order_id;
end;
$$;
revoke all on function public.revise_evalia_order(uuid,jsonb,bigint,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.revise_evalia_order(uuid,jsonb,bigint,uuid)
 to authenticated;
commit;
