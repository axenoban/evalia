-- EVALIA D3-A: declaraciones de pago, aprobación manual y caducidad F/L.
-- Contratos docs/20, 22, 23. La aprobación nunca inventa dinero recibido.
begin;
create schema if not exists evalia_internal;
revoke all on schema evalia_internal from public,anon,authenticated;

create table public.payment_reports(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 reservation_id uuid references public.reservations(id) on delete restrict,
 order_id uuid references public.orders(id) on delete restrict,
 amount_bs numeric(14,2) not null check(amount_bs>0),
 status text not null default 'pending' check(status in ('pending','observed','rejected','approved')),
 origin text not null check(origin in ('admin','client')),
 receipt_path text,
 note text,
 public_note text,
 created_at timestamptz not null default now(),
 approved_at timestamptz,
 approved_by uuid references public.admin_profiles(user_id) on delete restrict,
 constraint payment_target_xor check((reservation_id is null)<>(order_id is null)),
 constraint payment_approval_consistent check(
  (status='approved' and approved_at is not null and approved_by is not null)
  or (status<>'approved' and approved_at is null and approved_by is null)),
 constraint payment_receipt_path check(receipt_path is null or
  (length(receipt_path)<=300 and receipt_path ~ '^receipts/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$'))
);
create index payment_reports_reservation_idx on public.payment_reports(reservation_id,status);
create index payment_reports_order_idx on public.payment_reports(order_id,status);
create index payment_reports_created_idx on public.payment_reports(created_at desc);
create table public.payment_reviews(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 report_id uuid not null references public.payment_reports(id) on delete restrict,
 action text not null check(action in ('approve','observe','reject')),
 note text,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 created_at timestamptz not null default now()
);
create index payment_reviews_report_idx on public.payment_reviews(report_id,created_at);
create table public.reservation_expiration_events(
 reservation_id uuid primary key references public.reservations(id) on delete restrict,
 event text not null check(event in ('expired','in_review')),
 processed_at timestamptz not null default now()
);

do $$
declare t text;
begin
 foreach t in array array['payment_reports','payment_reviews','reservation_expiration_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy admin_read on public.%I for select to authenticated using((select public.is_evalia_admin()))',t);
 end loop;
end $$;

-- Un depósito se mantiene asociado a su reserva: el pedido hereda por referencia,
-- sin copiarlo ni sumarlo dos veces.
create function public.get_evalia_order_finance(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_total numeric; v_paid numeric;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 select coalesce(sum(subtotal_bs),0) into v_total from public.order_lines where order_id=p_order_id;
 select coalesce(sum(amount_bs),0) into v_paid from public.payment_reports
 where status='approved' and
 (order_id=p_order_id or (v_order.origin_reservation_id is not null
                          and reservation_id=v_order.origin_reservation_id));
 return jsonb_build_object('total',v_total,'approved',v_paid,
   'pending',greatest(v_total-v_paid,0),'excess',greatest(v_paid-v_total,0));
end;$$;
revoke all on function public.get_evalia_order_finance(uuid) from public,anon,authenticated;
grant execute on function public.get_evalia_order_finance(uuid) to authenticated;

-- Admin puede registrar un aviso de depósito sin inventar cobro.
create function public.report_evalia_payment(
 p_reservation_id uuid,p_order_id uuid,p_amount numeric,p_request_id uuid,
 p_note text default null
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid; v_prior public.payment_reports%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or (p_reservation_id is null)=(p_order_id is null)
    or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_amount>999999999999.99 or length(coalesce(p_note,''))>1000 then
  raise exception 'Datos de declaración de pago inválidos' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.payment_reports where request_id=p_request_id;
 if found then
  if v_prior.reservation_id is distinct from p_reservation_id
    or v_prior.order_id is distinct from p_order_id
    or v_prior.amount_bs<>p_amount or v_prior.note is distinct from p_note
    or v_prior.origin<>'admin' then
   raise exception 'Reintento de pago con datos distintos' using errcode='23505';
  end if;
  return v_prior.id;
 end if;
 if p_reservation_id is not null then
  if not exists(select 1 from public.reservations where id=p_reservation_id
                and status in ('saved','in_review')) then
   raise exception 'Reserva no apta para registrar depósito' using errcode='23514';
  end if;
 else
  if not exists(select 1 from public.orders where id=p_order_id and status='active') then
   raise exception 'Pedido inexistente o cerrado' using errcode='23514';
  end if;
 end if;
 insert into public.payment_reports(request_id,reservation_id,order_id,amount_bs,origin,note)
 values(p_request_id,p_reservation_id,p_order_id,p_amount,'admin',p_note)
 returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.report_evalia_payment(uuid,uuid,numeric,uuid,text) from public,anon,authenticated;
grant execute on function public.report_evalia_payment(uuid,uuid,numeric,uuid,text) to authenticated;

create function public.review_evalia_payment(
 p_report_id uuid,p_action text,p_request_id uuid,p_note text default null
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_report public.payment_reports%rowtype; v_prior public.payment_reviews%rowtype;
 v_res public.reservations%rowtype; v_order public.orders%rowtype;
 v_id uuid;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_report_id is null or p_request_id is null
    or p_action not in ('approve','observe','reject') or p_action is null
    or length(coalesce(p_note,''))>1000 then
  raise exception 'Revisión inválida' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.payment_reviews where request_id=p_request_id;
 if found then
  if v_prior.report_id<>p_report_id or v_prior.action<>p_action
     or v_prior.note is distinct from p_note then
   raise exception 'Reintento de revisión incompatible' using errcode='23505';
  end if;
  return v_prior.id;
 end if;
 -- Bloquear primero el documento comercial; el orden de locks es estable
 -- respecto a confirmación y al proceso de vencimiento.
 select * into v_report from public.payment_reports where id=p_report_id;
 if not found then raise exception 'Declaración inexistente' using errcode='P0002'; end if;
 if v_report.reservation_id is not null then
  select * into v_res from public.reservations where id=v_report.reservation_id for update;
 elsif v_report.order_id is not null then
  select * into v_order from public.orders where id=v_report.order_id for update;
 end if;
 select * into v_report from public.payment_reports where id=p_report_id for update;
 if v_report.status in ('approved','rejected') then
  raise exception 'Declaración ya cerrada; conservar historia' using errcode='23514';
 end if;
 if p_action='approve' then
  if v_report.reservation_id is not null then
   -- Reservas expiradas no se reactivan; aprobación tardía sin depósito previo
   -- exige conciliación comercial fuera de esta RPC.
   if v_res.status in ('expired','draft') then
    raise exception 'Reserva vencida o no guardada' using errcode='23514';
   end if;
   if v_res.status='saved' and now()>=v_res.expires_at
     and not exists (
      select 1 from public.payment_reports prev where prev.reservation_id=v_res.id
       and prev.status='approved' and prev.approved_at<v_res.expires_at
     ) then
    raise exception 'El depósito se aprueba después de F: requiere revisión' using errcode='23514';
   end if;
  elsif v_order.status<>'active' then
   raise exception 'Pedido ya cerrado' using errcode='23514';
  end if;
  update public.payment_reports set status='approved',approved_at=now(),
   approved_by=auth.uid(),public_note=p_note where id=p_report_id;
 elsif p_action='observe' then
  update public.payment_reports set status='observed',public_note=p_note where id=p_report_id;
 else
  update public.payment_reports set status='rejected',public_note=p_note where id=p_report_id;
 end if;
 insert into public.payment_reviews(request_id,report_id,action,note,actor_id)
 values(p_request_id,p_report_id,p_action,p_note,auth.uid()) returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.review_evalia_payment(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.review_evalia_payment(uuid,text,uuid,text) to authenticated;

-- F: expira sin depósito oportuno; L=F+7 días: en revisión y conserva stock.
-- Exclusivo del backend/cron, nunca del cliente; testable con p_at en PostgreSQL local.
create function evalia_internal.process_reservations(p_at timestamptz default now())
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_res public.reservations%rowtype; v_protected boolean;
 v_expired int:=0; v_review int:=0; v_model record;
begin
 if current_user not in ('postgres','service_role') then
  raise exception 'Solo trabajo programado de sistema' using errcode='42501';
 end if;
 for v_res in select * from public.reservations
  where status='saved' and expires_at<=p_at order by id for update skip locked loop
  select exists(select 1 from public.payment_reports p
   where p.reservation_id=v_res.id and p.status='approved'
     and p.approved_at<v_res.expires_at) into v_protected;
  if v_protected and p_at<v_res.review_at then continue; end if;
  for v_model in select distinct model_id from public.reservation_lines
   where reservation_id=v_res.id order by model_id loop
   perform 1 from public.model_inventory
    where model_id=v_model.model_id for update;
  end loop;
  if v_protected then
   update public.reservations set status='in_review',updated_at=now() where id=v_res.id;
   insert into public.reservation_expiration_events(reservation_id,event)
    values(v_res.id,'in_review') on conflict do nothing;
   v_review:=v_review+1;
  else
   update public.reservations set status='expired',updated_at=now() where id=v_res.id;
   insert into public.reservation_expiration_events(reservation_id,event)
    values(v_res.id,'expired') on conflict do nothing;
   v_expired:=v_expired+1;
  end if;
 end loop;
 return jsonb_build_object('expired',v_expired,'in_review',v_review);
end;$$;
revoke all on function evalia_internal.process_reservations(timestamptz) from public,anon,authenticated;
grant usage on schema evalia_internal to service_role;
grant execute on function evalia_internal.process_reservations(timestamptz) to service_role;

-- Respetar protección del depósito tanto al confirmar como al editar.
-- Los casos en revisión por L no se convierten ni editan silenciosamente.

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
 if v_res.status<>'saved' or (
    v_res.expires_at<=now() and (
      v_res.review_at<=now() or not exists(
        select 1 from public.payment_reports p
        where p.reservation_id=v_res.id and p.status='approved'
          and p.approved_at<v_res.expires_at
      )
    )
  ) then
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
create or replace function public.revise_evalia_reservation(
 p_reservation_id uuid,p_lines jsonb,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
 v_res public.reservations%rowtype; v_previous jsonb;
 v_payload text; v_prior public.reservation_revisions%rowtype;
 v_entry record; v_stock jsonb; v_old integer; v_line uuid; v_i integer;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_reservation_id is null or p_request_id is null then
  raise exception 'Reserva y solicitud son obligatorias' using errcode='22004';
 end if;
 v_payload:=pg_catalog.md5(p_reservation_id::text||':'||coalesce(p_lines::text,'null'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.reservation_revisions where request_id=p_request_id;
 if found then
  if v_prior.reservation_id<>p_reservation_id or
     v_prior.payload_fingerprint is distinct from v_payload then
   raise exception 'Solicitud de edición reutilizada con cambios diferentes' using errcode='23505';
  end if;
  return p_reservation_id;
 end if;
 select * into v_res from public.reservations where id=p_reservation_id for update;
 if not found then raise exception 'Reserva inexistente' using errcode='P0002'; end if;
 if v_res.status<>'saved' or (
    v_res.expires_at<=now() and (
      v_res.review_at<=now() or not exists(
        select 1 from public.payment_reports p
        where p.reservation_id=v_res.id and p.status='approved'
          and p.approved_at<v_res.expires_at
      )
    )
  ) then
  raise exception 'Solo puede editarse una reserva guardada y vigente' using errcode='23514';
 end if;
 -- Obtener composición anterior antes de modificarla, para auditoría verificable.
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'modelId',rl.model_id,'quantity',rl.quantity,'dozens',rl.dozen_count,
   'extraColorIds',(select coalesce(pg_catalog.jsonb_agg(ec.color_id order by ec.position),
                                  '[]'::jsonb)
                    from public.reservation_extra_colors ec where ec.reservation_line_id=rl.id)
  ) order by rl.model_id),'[]'::jsonb) into v_previous
 from public.reservation_lines rl where rl.reservation_id=p_reservation_id;
 -- Verificar primero el nuevo carrito, luego bloquear la unión de modelos en orden.
 perform 1 from public.evalia_validate_portions(p_lines);
 for v_entry in
  select distinct id from (
   select model_id as id from public.reservation_lines where reservation_id=p_reservation_id
   union all
   select model_id as id from public.evalia_validate_portions(p_lines)
  ) union_models order by id
 loop
  perform 1 from public.model_inventory where model_id=v_entry.id for update;
  if not found then raise exception 'Modelo sin inventario' using errcode='P0002'; end if;
 end loop;
 for v_entry in select model_id,quantity from public.evalia_validate_portions(p_lines) loop
  select coalesce(sum(quantity),0) into v_old from public.reservation_lines
  where reservation_id=p_reservation_id and model_id=v_entry.model_id;
  v_stock:=public.get_model_stock(v_entry.model_id);
  -- Cupo de la reserva original se recupera dentro de esta misma transacción.
  if v_entry.quantity>(v_stock->>'available')::integer+v_old or
      ((v_stock->>'blocked')::boolean and v_entry.quantity>v_old) then
    raise exception 'Edición excede stock libre del modelo %',v_entry.model_id using errcode='23514';
  end if;
 end loop;
 delete from public.reservation_extra_colors
 where reservation_line_id in(select id from public.reservation_lines where reservation_id=p_reservation_id);
 delete from public.reservation_lines where reservation_id=p_reservation_id;
 for v_entry in select * from public.evalia_validate_portions(p_lines) order by model_id loop
  insert into public.reservation_lines(reservation_id,model_id,quantity,dozen_count,extra_units)
  values(p_reservation_id,v_entry.model_id,v_entry.quantity,v_entry.dozen_count,v_entry.extra_units)
  returning id into v_line;
  for v_i in 1..v_entry.extra_units loop
   insert into public.reservation_extra_colors(reservation_line_id,model_id,color_id,position)
   values(v_line,v_entry.model_id,v_entry.color_ids[v_i],v_i);
  end loop;
 end loop;
 insert into public.reservation_revisions(
   request_id,reservation_id,actor_id,payload_fingerprint,previous_lines,updated_lines
 ) values(p_request_id,p_reservation_id,auth.uid(),v_payload,v_previous,p_lines);
 update public.reservations set updated_at=now() where id=p_reservation_id;
 return p_reservation_id;
end;$$;
commit;
