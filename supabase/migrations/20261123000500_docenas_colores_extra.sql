-- EVALIA D2-B: docenas surtidas + 0..11 unidades individuales con colores distintos.
-- La disponibilidad sigue siendo global por modelo (D0-C2); estos colores
-- documentan la selección solicitada, sin afirmar existencia específica.
begin;

alter table public.reservation_lines
 add column dozen_count integer,
 add column extra_units integer,
 add constraint reservation_portions_consistent check (
  (dozen_count is null and extra_units is null)
  or (dozen_count between 0 and 178956969
      and extra_units between 0 and 11
      and quantity=dozen_count*12+extra_units
      and (dozen_count>0 or extra_units>=6))
 );
alter table public.order_lines
 add column dozen_count integer,
 add column extra_units integer,
 add constraint order_portions_consistent check (
  (dozen_count is null and extra_units is null)
  or (dozen_count between 0 and 178956969
      and extra_units between 0 and 11
      and quantity=dozen_count*12+extra_units
      and (dozen_count>0 or extra_units>=6))
 );
-- NULL/NULL preserva líneas legadas sin desglose declarado.
alter table public.reservation_lines add constraint reservation_line_model_identity unique(id,model_id);
alter table public.order_lines add constraint order_line_model_identity unique(id,model_id);

create table public.reservation_extra_colors (
 reservation_line_id uuid not null,
 model_id uuid not null,
 color_id uuid not null,
 position smallint not null check(position between 1 and 11),
 primary key(reservation_line_id,color_id),
 unique(reservation_line_id,position),
 foreign key(reservation_line_id,model_id)
   references public.reservation_lines(id,model_id) on delete restrict,
 foreign key(model_id,color_id)
   references public.model_colors(model_id,color_id) on delete restrict
);
create table public.order_extra_colors (
 order_line_id uuid not null,
 model_id uuid not null,
 color_id uuid not null,
 position smallint not null check(position between 1 and 11),
 primary key(order_line_id,color_id),
 unique(order_line_id,position),
 foreign key(order_line_id,model_id)
   references public.order_lines(id,model_id) on delete restrict,
 foreign key(model_id,color_id)
   references public.model_colors(model_id,color_id) on delete restrict
);
create index reservation_extra_colors_model_idx on public.reservation_extra_colors(model_id);
create index order_extra_colors_model_idx on public.order_extra_colors(model_id);
alter table public.reservation_extra_colors enable row level security;
alter table public.order_extra_colors enable row level security;
revoke all on public.reservation_extra_colors,public.order_extra_colors from public,anon,authenticated;
grant select on public.reservation_extra_colors,public.order_extra_colors to authenticated;
create policy admin_read on public.reservation_extra_colors for select
 to authenticated using((select public.is_evalia_admin()));
create policy admin_read on public.order_extra_colors for select
 to authenticated using((select public.is_evalia_admin()));

alter table public.reservations add column request_fingerprint text;
alter table public.orders add column request_fingerprint text;

create function public.evalia_validate_portions(p_lines jsonb)
returns table(model_id uuid,quantity integer,dozen_count integer,extra_units integer,color_ids uuid[])
language plpgsql stable security definer set search_path=''
as $$
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
     where mc.model_id=v_model and mc.color_id=v_color and c.is_active
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
end;$$;
revoke all on function public.evalia_validate_portions(jsonb) from public,anon,authenticated;
-- Validador interno: no exponer RPC de validación ni sus detalles a clientes.
revoke all on function public.evalia_validate_lines(jsonb) from public,anon,authenticated;

create or replace function public.create_evalia_reservation(
 p_customer_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_entry record; v_stock jsonb; v_res uuid; v_line uuid;
 v_payload text; v_prior text;
 v_expiry timestamptz; v_day integer; v_days integer;
 v_i integer;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_customer_id is null then
  raise exception 'Solicitud y cliente obligatorios' using errcode='22004';
 end if;
 v_payload:=pg_catalog.md5(p_customer_id::text||':'||coalesce(p_lines::text,'null'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id,request_fingerprint into v_res,v_prior
 from public.reservations where request_id=p_request_id;
 if found then
  if v_prior is distinct from v_payload then
   raise exception 'Reintento con contenido distinto' using errcode='23505';
  end if;
  return v_res;
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then
  raise exception 'Cliente inexistente' using errcode='22023';
 end if;
 -- Parsear y validar primero; bloquear siempre modelos en orden UUID.
 -- Se vuelve a validar después de bloquear para no perder cambios en la paleta.
 perform 1 from public.evalia_validate_portions(p_lines);
 for v_entry in select model_id,quantity from public.evalia_validate_portions(p_lines)
   order by model_id loop
  perform 1 from public.model_inventory where model_id=v_entry.model_id for update;
  if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
  v_stock:=public.get_model_stock(v_entry.model_id);
  if (v_stock->>'blocked')::boolean or (v_stock->>'available')::integer<v_entry.quantity then
   raise exception 'No hay prendas globales disponibles del modelo %',v_entry.model_id using errcode='23514';
  end if;
 end loop;
 v_day:=extract(isodow from now() at time zone 'America/La_Paz')::integer;
 v_days:=case v_day when 1 then 2 when 2 then 4 when 3 then 3
  when 4 then 2 when 5 then 5 when 6 then 4 else 3 end;
 v_expiry:=(((now() at time zone 'America/La_Paz')::date + v_days)
             + time '12:00') at time zone 'America/La_Paz';
 insert into public.reservations(customer_id,status,expires_at,review_at,request_id,request_fingerprint)
 values(p_customer_id,'saved',v_expiry,v_expiry+interval '7 days',p_request_id,v_payload)
 returning id into v_res;
 for v_entry in select * from public.evalia_validate_portions(p_lines) order by model_id loop
  insert into public.reservation_lines(reservation_id,model_id,quantity,dozen_count,extra_units)
  values(v_res,v_entry.model_id,v_entry.quantity,v_entry.dozen_count,v_entry.extra_units)
  returning id into v_line;
  for v_i in 1..v_entry.extra_units loop
   insert into public.reservation_extra_colors(reservation_line_id,model_id,color_id,position)
   values(v_line,v_entry.model_id,v_entry.color_ids[v_i],v_i);
  end loop;
 end loop;
 return v_res;
end;$$;

create or replace function public.create_evalia_order(
 p_customer_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_entry record; v_stock jsonb; v_order uuid; v_line uuid;
 v_payload text; v_prior text; v_price numeric; v_i integer;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_customer_id is null then
  raise exception 'Solicitud y cliente obligatorios' using errcode='22004';
 end if;
 v_payload:=pg_catalog.md5(p_customer_id::text||':'||coalesce(p_lines::text,'null'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select id,request_fingerprint into v_order,v_prior
 from public.orders where request_id=p_request_id;
 if found then
  if v_prior is distinct from v_payload then
   raise exception 'Reintento con contenido distinto' using errcode='23505';
  end if;
  return v_order;
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then
  raise exception 'Cliente inexistente' using errcode='22023';
 end if;
 perform 1 from public.evalia_validate_portions(p_lines);
 for v_entry in select model_id,quantity from public.evalia_validate_portions(p_lines)
   order by model_id loop
  perform 1 from public.model_inventory where model_id=v_entry.model_id for update;
  if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
  v_stock:=public.get_model_stock(v_entry.model_id);
  if (v_stock->>'blocked')::boolean or (v_stock->>'available')::integer<v_entry.quantity then
   raise exception 'No hay prendas globales disponibles del modelo %',v_entry.model_id using errcode='23514';
  end if;
 end loop;
 insert into public.orders(customer_id,request_id,request_fingerprint)
 values(p_customer_id,p_request_id,v_payload) returning id into v_order;
 for v_entry in select * from public.evalia_validate_portions(p_lines) order by model_id loop
  select price_dozen_bs into v_price from public.models where id=v_entry.model_id;
  insert into public.order_lines(order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs)
  values(v_order,v_entry.model_id,v_entry.quantity,v_entry.dozen_count,v_entry.extra_units,
         v_price,public.evalia_model_subtotal(v_price,v_entry.quantity))
  returning id into v_line;
  for v_i in 1..v_entry.extra_units loop
   insert into public.order_extra_colors(order_line_id,model_id,color_id,position)
   values(v_line,v_entry.model_id,v_entry.color_ids[v_i],v_i);
  end loop;
 end loop;
 return v_order;
end;$$;

create or replace function public.confirm_evalia_reservation(
 p_reservation_id uuid,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_res public.reservations%rowtype; v_order uuid; v_entry record;
 v_price numeric; v_line uuid;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_reservation_id is null or p_request_id is null then
  raise exception 'Datos faltantes' using errcode='22004';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_res from public.reservations where id=p_reservation_id for update;
 if not found then raise exception 'Reserva inexistente' using errcode='P0002'; end if;
 select id into v_order from public.orders where origin_reservation_id=p_reservation_id;
 if found then return v_order; end if;
 if v_res.status<>'saved' or v_res.expires_at<=now() then
  raise exception 'Reserva vencida o sujeta a revisión' using errcode='23514';
 end if;
 -- Orden estable y operación única: reservado -> pendiente, sin sumar compromisos.
 for v_entry in select model_id from public.reservation_lines
    where reservation_id=p_reservation_id order by model_id loop
  perform 1 from public.model_inventory where model_id=v_entry.model_id for update;
  if not found then raise exception 'Inventario inexistente' using errcode='P0002'; end if;
 end loop;
 insert into public.orders(customer_id,origin_reservation_id,request_id,request_fingerprint)
 values(v_res.customer_id,p_reservation_id,p_request_id,
        pg_catalog.md5('convert:'||p_reservation_id::text))
 returning id into v_order;
 for v_entry in select * from public.reservation_lines where reservation_id=p_reservation_id loop
  select price_dozen_bs into v_price from public.models where id=v_entry.model_id;
  insert into public.order_lines(order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs)
  values(v_order,v_entry.model_id,v_entry.quantity,v_entry.dozen_count,v_entry.extra_units,
         v_price,public.evalia_model_subtotal(v_price,v_entry.quantity))
  returning id into v_line;
  insert into public.order_extra_colors(order_line_id,model_id,color_id,position)
   select v_line,model_id,color_id,position
   from public.reservation_extra_colors
   where reservation_line_id=v_entry.id;
 end loop;
 update public.reservations set status='converted',updated_at=now()
 where id=p_reservation_id;
 return v_order;
end;$$;

-- Las nuevas tablas no exponen mutaciones CRUD; solo RPCs admin.
commit;