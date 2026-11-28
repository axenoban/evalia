-- Product improvements: preserve historical labels, retain color foreign keys, audit authorized edits.
alter table public.model_colors add column is_offered boolean not null default true;
alter table public.colors add column updated_at timestamptz not null default now();
alter table public.order_lines add column model_name_snapshot text, add column size_label_snapshot text;
alter table public.reservation_lines add column model_name_snapshot text, add column size_label_snapshot text;
alter table public.order_extra_colors add column color_name_snapshot text, add column color_hex_snapshot text;
alter table public.reservation_extra_colors add column color_name_snapshot text, add column color_hex_snapshot text;
update public.order_lines l set model_name_snapshot=m.name,size_label_snapshot=m.size_label from public.models m where m.id=l.model_id;
update public.reservation_lines l set model_name_snapshot=m.name,size_label_snapshot=m.size_label from public.models m where m.id=l.model_id;
update public.order_extra_colors e set color_name_snapshot=c.name,color_hex_snapshot=c.hex_code from public.colors c where c.id=e.color_id;
update public.reservation_extra_colors e set color_name_snapshot=c.name,color_hex_snapshot=c.hex_code from public.colors c where c.id=e.color_id;
alter table public.order_lines alter column model_name_snapshot set not null,alter column size_label_snapshot set not null;
alter table public.reservation_lines alter column model_name_snapshot set not null,alter column size_label_snapshot set not null;
alter table public.order_extra_colors alter column color_name_snapshot set not null;
alter table public.reservation_extra_colors alter column color_name_snapshot set not null;
create function public.capture_evalia_model_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 select m.name,m.size_label into new.model_name_snapshot,new.size_label_snapshot from public.models m where m.id=new.model_id;
 if tg_table_name='order_lines' then
  select rl.model_name_snapshot,rl.size_label_snapshot into new.model_name_snapshot,new.size_label_snapshot
  from public.orders o join public.reservation_lines rl on rl.reservation_id=o.origin_reservation_id and rl.model_id=new.model_id where o.id=new.order_id;
  if not found then select m.name,m.size_label into new.model_name_snapshot,new.size_label_snapshot from public.models m where m.id=new.model_id; end if;
 end if;
 return new;
end;$$;
create trigger capture_model_snapshot before insert on public.order_lines for each row execute function public.capture_evalia_model_snapshot();
create trigger capture_model_snapshot before insert on public.reservation_lines for each row execute function public.capture_evalia_model_snapshot();
create function public.capture_evalia_color_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 select c.name,c.hex_code into new.color_name_snapshot,new.color_hex_snapshot from public.colors c where c.id=new.color_id;
 if tg_table_name='order_extra_colors' then
  select rc.color_name_snapshot,rc.color_hex_snapshot into new.color_name_snapshot,new.color_hex_snapshot
   from public.order_lines ol join public.orders o on o.id=ol.order_id
   join public.reservation_lines rl on rl.reservation_id=o.origin_reservation_id and rl.model_id=ol.model_id
   join public.reservation_extra_colors rc on rc.reservation_line_id=rl.id and rc.color_id=new.color_id
   where ol.id=new.order_line_id;
  if not found then select c.name,c.hex_code into new.color_name_snapshot,new.color_hex_snapshot from public.colors c where c.id=new.color_id; end if;
 end if;
 return new;
end;$$;
create trigger capture_color_snapshot before insert on public.order_extra_colors for each row execute function public.capture_evalia_color_snapshot();
create trigger capture_color_snapshot before insert on public.reservation_extra_colors for each row execute function public.capture_evalia_color_snapshot();
revoke execute on function public.capture_evalia_model_snapshot(),public.capture_evalia_color_snapshot() from public,anon,authenticated;
create table public.catalog_change_events (
 request_id uuid primary key, entity_type text not null check(entity_type in ('model','color')),entity_id uuid not null,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 operation text not null, fingerprint jsonb not null, previous_data jsonb not null,new_data jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.catalog_change_events enable row level security;
revoke all on public.catalog_change_events from public,anon,authenticated;
grant select on public.catalog_change_events to authenticated;
create policy catalog_event_admin_read on public.catalog_change_events for select to authenticated using ((select public.is_evalia_admin()));
create index catalog_change_events_entity on public.catalog_change_events(entity_type,entity_id,created_at desc);
create function public.save_evalia_color(p_id uuid,p_name text,p_hex text,p_active boolean,p_expected timestamptz,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_old public.colors%rowtype;v_id uuid;v_event public.catalog_change_events%rowtype;v_payload jsonb;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_request_id is null or length(btrim(coalesce(p_name,''))) not between 1 and 80 or p_hex is null or p_hex !~ '^#[0-9A-Fa-f]{6}$' or p_active is null then raise exception 'Color inválido' using errcode='22023'; end if;
 v_payload:=jsonb_build_array(p_id,btrim(p_name),lower(p_hex),p_active,p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into v_event from public.catalog_change_events where request_id=p_request_id;
 if found then
  if v_event.actor_id is distinct from auth.uid() or v_event.entity_type<>'color' or v_event.fingerprint<>v_payload then raise exception 'Solicitud reutilizada' using errcode='23505';end if;
  return v_event.entity_id;
 end if;
 if p_id is null then
  if not p_active then raise exception 'Alta de color inactivo no permitida' using errcode='22023';end if;
  insert into public.colors(name,hex_code,is_active) values(btrim(p_name),lower(p_hex),true) returning id into v_id;
 else
  -- Lock against concurrent product color changes; a global color still offered cannot be deactivated.
  select * into v_old from public.colors where id=p_id for update;
  if not found or v_old.updated_at is distinct from p_expected then raise exception 'Color cambió; actualiza' using errcode='40001';end if;
  if not p_active and (exists(select 1 from public.order_extra_colors e join public.order_lines l on l.id=e.order_line_id join public.orders o on o.id=l.order_id where e.color_id=p_id and o.status='active') or exists(select 1 from public.reservation_extra_colors e join public.reservation_lines l on l.id=e.reservation_line_id join public.reservations r on r.id=l.reservation_id where e.color_id=p_id and r.status in ('saved','in_review'))) then raise exception 'El color figura en compromisos pendientes' using errcode='23514';end if;
  if not p_active and exists(select 1 from public.model_colors mc join public.models m on m.id=mc.model_id where mc.color_id=p_id and mc.is_offered and m.is_active) then raise exception 'Retira el color de los modelos activos antes de inhabilitarlo' using errcode='23514';end if;
  update public.colors set name=btrim(p_name),hex_code=lower(p_hex),is_active=p_active,updated_at=clock_timestamp() where id=p_id;
  v_id:=p_id;
 end if;
 insert into public.catalog_change_events(request_id,entity_type,entity_id,actor_id,operation,fingerprint,previous_data,new_data)
 values(p_request_id,'color',v_id,auth.uid(),case when p_id is null then 'create' else 'edit' end,v_payload,coalesce(to_jsonb(v_old),'{}'::jsonb),(select to_jsonb(c) from public.colors c where c.id=v_id));
 return v_id;
end;$$;
create function public.edit_evalia_product(p_model_id uuid,p_name text,p_size text,p_price numeric,p_colors uuid[],p_image_path text,p_expected timestamptz,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_model public.models%rowtype;v_event public.catalog_change_events%rowtype;v_colors uuid[];v_old_colors uuid[];v_payload jsonb;v_old jsonb;v_pending boolean;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501';end if;
 if p_request_id is null or p_model_id is null or p_expected is null or length(btrim(coalesce(p_name,''))) not between 1 and 120 or length(btrim(coalesce(p_size,''))) not between 1 and 24 or p_price is null or p_price<=0 or p_price>9999999999.99 or p_price<>round(p_price,2) or coalesce(cardinality(p_colors),0)=0 then raise exception 'Datos de producto inválidos' using errcode='22023';end if;
 select array_agg(distinct x order by x) into v_colors from unnest(p_colors) x;
 if array_position(v_colors,null::uuid) is not null or cardinality(v_colors)<>cardinality(p_colors) then raise exception 'Colores inválidos o repetidos' using errcode='22023';end if;
 v_payload:=jsonb_build_array(p_model_id,btrim(p_name),btrim(p_size),p_price,v_colors,p_image_path,p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into v_event from public.catalog_change_events where request_id=p_request_id;
 if found then
  if v_event.actor_id is distinct from auth.uid() or v_event.entity_id<>p_model_id or v_event.fingerprint<>v_payload then raise exception 'Solicitud reutilizada' using errcode='23505';end if;
  return p_model_id;
 end if;
 if exists(select 1 from public.model_catalog_revisions where request_id=p_request_id) then raise exception 'Solicitud histórica reutilizada' using errcode='23505';end if;
 -- Same inventory lock used by order creation and revision; validator runs again after lock.
 perform 1 from public.model_inventory where model_id=p_model_id for update;
 if not found then raise exception 'Modelo sin inventario' using errcode='P0002';end if;
 select * into v_model from public.models where id=p_model_id for update;
 if not found or not v_model.is_active then raise exception 'Producto no activo' using errcode='23514';end if;
 if v_model.updated_at is distinct from p_expected then raise exception 'Producto cambió; actualiza' using errcode='40001';end if;
 perform 1 from public.colors where id=any(v_colors) order by id for share;
 if exists(select 1 from unnest(v_colors) x where not exists(select 1 from public.colors c where c.id=x and c.is_active)) then raise exception 'Selecciona colores activos' using errcode='22023';end if;
 select exists(select 1 from public.order_lines l join public.orders o on o.id=l.order_id where l.model_id=p_model_id and o.status='active') or exists(select 1 from public.reservation_lines l join public.reservations r on r.id=l.reservation_id where l.model_id=p_model_id and r.status in ('saved','in_review')) into v_pending;
 if v_pending and (v_model.size_label is distinct from btrim(p_size) or v_model.name is distinct from btrim(p_name)) then raise exception 'Resuelve los pedidos pendientes antes de corregir nombre o talla' using errcode='23514';end if;
 if exists(select 1 from public.order_extra_colors e join public.order_lines l on l.id=e.order_line_id join public.orders o on o.id=l.order_id where l.model_id=p_model_id and o.status='active' and not(e.color_id=any(v_colors))) or exists(select 1 from public.reservation_extra_colors e join public.reservation_lines l on l.id=e.reservation_line_id join public.reservations r on r.id=l.reservation_id where l.model_id=p_model_id and r.status in ('saved','in_review') and not(e.color_id=any(v_colors))) then raise exception 'No retires colores solicitados en pedidos pendientes' using errcode='23514';end if;
 select coalesce(array_agg(color_id order by color_id),'{}'::uuid[]) into v_old_colors from public.model_colors where model_id=p_model_id and is_offered;
 if v_model.name=btrim(p_name) and v_model.size_label=btrim(p_size) and v_model.price_dozen_bs=p_price and (p_image_path is null or p_image_path=v_model.image_path) and v_old_colors=v_colors then return p_model_id;end if;
 v_old:=to_jsonb(v_model)||jsonb_build_object('colors',v_old_colors);
 perform public.update_evalia_model(p_model_id,p_price,p_image_path,p_expected,p_request_id);
 update public.models set name=btrim(p_name),size_label=btrim(p_size),updated_at=clock_timestamp() where id=p_model_id;
 update public.model_colors set is_offered=false where model_id=p_model_id and not(color_id=any(v_colors));
 insert into public.model_colors(model_id,color_id,is_offered) select p_model_id,x,true from unnest(v_colors) x on conflict(model_id,color_id) do update set is_offered=true;
 insert into public.catalog_change_events(request_id,entity_type,entity_id,actor_id,operation,fingerprint,previous_data,new_data)
 values(p_request_id,'model',p_model_id,auth.uid(),'edit',v_payload,v_old,(select to_jsonb(m)||jsonb_build_object('colors',v_colors) from public.models m where id=p_model_id));
 return p_model_id;
end;$$;
create function public.get_evalia_stock_batch(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501';end if;
 if p_ids is null or cardinality(p_ids)>100 or array_position(p_ids,null::uuid) is not null then raise exception 'Lote inválido' using errcode='22023';end if;
 select coalesce(jsonb_object_agg(id::text,public.get_model_stock(id)),'{}'::jsonb) into result from (select distinct unnest(p_ids) id) q;
 return result;
end;$$;

CREATE OR REPLACE FUNCTION public.client_evalia_order(p_token_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.orders%rowtype; v_total numeric; v_paid numeric;
 v_lines jsonb; v_payments jsonb; v_qr text;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'Enlace inválido' using errcode='42501';
 end if;
 select o.* into v_order from public.order_access_links l
 join public.orders o on o.id=l.order_id
 where l.token_hash=p_token_hash and l.revoked_at is null and o.status='active';
 if not found then raise exception 'Enlace no válido o cerrado' using errcode='42501'; end if;
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=v_order.id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
 where status='approved' and (order_id=v_order.id or
  (v_order.origin_reservation_id is not null and reservation_id=v_order.origin_reservation_id));
 select coalesce(jsonb_agg(jsonb_build_object(
  'model',ol.model_name_snapshot,'size',ol.size_label_snapshot,'quantity',ol.quantity,
  'dozens',ol.dozen_count,'extras',ol.extra_units,'subtotal',ol.subtotal_bs,
  'colors',(select coalesce(jsonb_agg(ec.color_name_snapshot order by ec.position),'[]'::jsonb)
    from public.order_extra_colors ec join public.colors c on c.id=ec.color_id
    where ec.order_line_id=ol.id)
  ) order by ol.id),'[]'::jsonb) into v_lines
 from public.order_lines ol join public.models m on m.id=ol.model_id where ol.order_id=v_order.id;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'amount',p.amount_bs,'status',p.status,
  'note',p.public_note,'created',p.created_at,'approved',p.approved_at
 ) order by p.created_at desc),'[]'::jsonb) into v_payments
 from public.payment_reports p where p.order_id=v_order.id or
  (v_order.origin_reservation_id is not null and p.reservation_id=v_order.origin_reservation_id);
 select image_path into v_qr from public.payment_qr
  where id=true and reusable_verified=true;
 return jsonb_build_object(
  'order_id',v_order.id,'reference',substring(v_order.id::text,1,8),'status',v_order.status,
  'total',v_total,'approved',v_paid,'pending',greatest(v_total-v_paid,0),
  'excess',greatest(v_paid-v_total,0),'lines',v_lines,'payments',v_payments,
  'qr_path',v_qr);
end;$function$;

CREATE OR REPLACE FUNCTION public.evalia_validate_portions(p_lines jsonb)
 RETURNS TABLE(model_id uuid, quantity integer, dozen_count integer, extra_units integer, color_ids uuid[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_line jsonb; v_model_ids uuid[]:=array[]::uuid[];
 v_raw text; v_colors jsonb; v_color uuid; v_model uuid;
begin
 if not public.is_evalia_admin() then
   raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_lines is null or pg_catalog.jsonb_typeof(p_lines)<>'array'
    or pg_catalog.jsonb_array_length(p_lines) not between 1 and 100 then
   raise exception 'Agrega entre uno y cien modelos' using errcode='22023';
 end if;
 for v_line in select value from pg_catalog.jsonb_array_elements(p_lines) loop
  if pg_catalog.jsonb_typeof(v_line)<>'object'
     or pg_catalog.jsonb_typeof(v_line->'dozens')<>'number'
     or pg_catalog.jsonb_typeof(v_line->'extraColorIds')<>'array'
     or v_line->>'modelId' is null then
   raise exception 'El modelo requiere docenas y colores individuales' using errcode='22023';
  end if;
  v_raw:=v_line->>'dozens';
  if v_raw !~ '^(0|[1-9][0-9]*)$' or pg_catalog.length(v_raw)>9 then
   raise exception 'Docenas inválidas' using errcode='22023';
  end if;
  dozen_count:=v_raw::integer;
  if dozen_count>178956969 then
   raise exception 'Exceso de docenas' using errcode='22003';
  end if;
  v_model:=(v_line->>'modelId')::uuid;
  model_id:=v_model;
  if model_id=any(v_model_ids) then
   raise exception 'No se puede repetir un modelo en el pedido' using errcode='23505';
  end if;
  v_model_ids:=pg_catalog.array_append(v_model_ids,model_id);
  v_colors:=v_line->'extraColorIds';
  extra_units:=pg_catalog.jsonb_array_length(v_colors);
  if extra_units>11 or (dozen_count=0 and extra_units<6) then
   raise exception 'Selecciona de 6 a 11 colores sin docena, o de 0 a 11 con docenas'
   using errcode='22023';
  end if;
  color_ids:=array[]::uuid[];
  for v_raw in select value from pg_catalog.jsonb_array_elements_text(v_colors) loop
   v_color:=v_raw::uuid;
   if v_color=any(color_ids) then
    raise exception 'Solo una prenda por color en las unidades adicionales'
    using errcode='23505';
   end if;
   if not exists(
     select 1 from public.model_colors mc
     join public.colors c on c.id=mc.color_id
     where mc.model_id=v_model and mc.color_id=v_color and mc.is_offered and c.is_active
   ) then
    raise exception 'El color % no está ofrecido en este modelo',v_color
    using errcode='23514';
   end if;
   color_ids:=pg_catalog.array_append(color_ids,v_color);
  end loop;
  if not exists(select 1 from public.models m
                where m.id=v_model and m.is_active) then
   raise exception 'El modelo está inactivo o no existe' using errcode='23514';
  end if;
  quantity:=dozen_count*12+extra_units;
  return next;
 end loop;
end;$function$;

CREATE OR REPLACE FUNCTION public.guard_evalia_archived_model()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='UPDATE' then
  if not old.is_active and new.is_active
     and current_setting('evalia.reactivating_model',true)=old.id::text
     and new.name=old.name and new.size_label=old.size_label and new.price_dozen_bs=old.price_dozen_bs
     and old.image_path is null and new.image_path is null
     and new.archived_at is null and new.archived_by is null then return new; end if;
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
end;$function$;

create function public.reactivate_evalia_product(p_id uuid,p_units integer,p_expected timestamptz,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_model public.models%rowtype;v_stock jsonb;v_event public.catalog_change_events%rowtype;v_payload jsonb;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501';end if;
 if p_id is null or p_request_id is null or p_expected is null or p_units is null or p_units<0 then raise exception 'Datos inválidos' using errcode='22023';end if;
 v_payload:=jsonb_build_array(p_id,p_units,p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into v_event from public.catalog_change_events where request_id=p_request_id;
 if found then
  if v_event.actor_id is distinct from auth.uid() or v_event.operation<>'reactivate' or v_event.fingerprint<>v_payload then raise exception 'Solicitud reutilizada' using errcode='23505';end if;
  return p_id;
 end if;
 perform 1 from public.model_inventory where model_id=p_id for update;
 if not found then raise exception 'Modelo sin inventario' using errcode='P0002';end if;
 select * into v_model from public.models where id=p_id for update;
 if not found or v_model.is_active or v_model.updated_at is distinct from p_expected or v_model.image_path is not null then raise exception 'Actualiza y termina la limpieza de fotografía antes de reactivar' using errcode='40001';end if;
 v_stock:=public.get_model_stock(p_id);
 if (v_stock->>'blocked')::boolean or (v_stock->>'reserved')::integer+(v_stock->>'pending_delivery')::integer<>0 then raise exception 'Resuelve los compromisos e incidencias antes de reactivar' using errcode='23514';end if;
 perform 1 from public.colors c join public.model_colors mc on mc.color_id=c.id where mc.model_id=p_id and mc.is_offered order by c.id for share of c;
 if not exists(select 1 from public.model_colors mc join public.colors c on c.id=mc.color_id where mc.model_id=p_id and mc.is_offered and c.is_active) or exists(select 1 from public.model_colors mc join public.colors c on c.id=mc.color_id where mc.model_id=p_id and mc.is_offered and not c.is_active) then raise exception 'La paleta archivada contiene colores inactivos; reactívalos primero' using errcode='23514';end if;
 perform public.adjust_model_inventory(p_id,'set_total',p_units,(v_stock->>'version')::bigint,p_request_id);
 perform set_config('evalia.reactivating_model',p_id::text,true);
 update public.models set is_active=true,archived_at=null,archived_by=null,updated_at=clock_timestamp() where id=p_id;
 perform set_config('evalia.reactivating_model','',true);
 insert into public.catalog_change_events(request_id,entity_type,entity_id,actor_id,operation,fingerprint,previous_data,new_data)
 values(p_request_id,'model',p_id,auth.uid(),'reactivate',v_payload,to_jsonb(v_model),(select to_jsonb(m)||jsonb_build_object('on_hand',p_units) from public.models m where id=p_id));
 return p_id;
end;$$;
revoke execute on function public.save_evalia_color(uuid,text,text,boolean,timestamptz,uuid),public.edit_evalia_product(uuid,text,text,numeric,uuid[],text,timestamptz,uuid),public.get_evalia_stock_batch(uuid[]),public.reactivate_evalia_product(uuid,integer,timestamptz,uuid) from public,anon,service_role;
grant execute on function public.save_evalia_color(uuid,text,text,boolean,timestamptz,uuid),public.edit_evalia_product(uuid,text,text,numeric,uuid[],text,timestamptz,uuid),public.get_evalia_stock_batch(uuid[]),public.reactivate_evalia_product(uuid,integer,timestamptz,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.create_evalia_model(p_name text, p_size text, p_price numeric, p_color_ids uuid[], p_initial_units integer, p_request_id uuid, p_image_path text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_colors uuid[]; v_fingerprint bytea; v_prior evalia_security.model_create_requests%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null then raise exception 'Falta identificador de solicitud' using errcode='22004'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 if pg_catalog.length(pg_catalog.btrim(coalesce(p_name,''))) not between 1 and 120
    or pg_catalog.length(pg_catalog.btrim(coalesce(p_size,''))) not between 1 and 24
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
 perform 1 from public.colors where id=any(v_colors) order by id for share;
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
end;$function$;

CREATE OR REPLACE FUNCTION public.archive_evalia_model(p_model_id uuid, p_expected_updated_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- Los pedidos vinculados conservan sus líneas, compromisos y operaciones.
  update public.models set is_active=false,archived_at=clock_timestamp(),archived_by=auth.uid(),updated_at=clock_timestamp()
   where id=p_model_id;
  insert into public.catalog_change_events(request_id,entity_type,entity_id,actor_id,operation,fingerprint,previous_data,new_data)
   values(gen_random_uuid(),'model',p_model_id,auth.uid(),'archive',jsonb_build_array(p_model_id,p_expected_updated_at),to_jsonb(v_model),(select to_jsonb(m) from public.models m where id=p_model_id));
 end if;
 v_path:=v_model.image_path;
 if v_path is not null and exists(select 1 from public.models where is_active and image_path=v_path) then v_path:=null; end if;
 return pg_catalog.jsonb_build_object('model_id',p_model_id,'photo_path',v_path);
end;$function$;
