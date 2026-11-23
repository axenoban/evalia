-- EVALIA D4: acceso de cliente a UN pedido, comprobantes privados y QR real proporcionado.
-- Nada de credenciales cliente ni datos bancarios inventados. Server usa service_role
-- solo en backend, el navegador nunca obtiene keys secretas.
begin;
create table public.order_access_links(
 order_id uuid primary key references public.orders(id) on delete restrict,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 version bigint not null default 1 check(version>0),
 issued_by uuid not null references public.admin_profiles(user_id) on delete restrict,
 issued_at timestamptz not null default now(),
 revoked_at timestamptz
);
create table public.payment_qr(
 id boolean primary key default true check(id=true),
 image_path text not null check(image_path ~ '^qr/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)$'),
 reusable_verified boolean not null default false,
 updated_by uuid not null references public.admin_profiles(user_id) on delete restrict,
 updated_at timestamptz not null default now()
);
create table public.qr_change_events(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 old_path text,
 new_path text not null,
 reusable_verified boolean not null,
 actor_id uuid not null references public.admin_profiles(user_id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.payment_reports add constraint payment_receipt_path_unique unique(receipt_path);
do $$
declare t text;
begin
 foreach t in array array['order_access_links','payment_qr','qr_change_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy admin_read on public.%I for select to authenticated using((select public.is_evalia_admin()))',t);
 end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('evalia-receipts','evalia-receipts',false,2097152,
 array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('evalia-qr','evalia-qr',false,5242880,
 array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy evalia_receipt_admin_read on storage.objects for select to authenticated
 using(bucket_id='evalia-receipts' and (select public.is_evalia_admin()));
create policy evalia_qr_admin_read on storage.objects for select to authenticated
 using(bucket_id='evalia-qr' and (select public.is_evalia_admin()));
create policy evalia_qr_admin_upload on storage.objects for insert to authenticated
 with check(bucket_id='evalia-qr' and name ~ '^qr/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)$'
            and (select public.is_evalia_admin()));
create policy evalia_qr_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='evalia-qr' and (select public.is_evalia_admin()));

create function public.issue_evalia_order_link(p_order_id uuid,p_token_hash text)
returns bigint language plpgsql volatile security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_version bigint;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_order_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'Identificador/digest inválido' using errcode='22023';
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'active' then
  raise exception 'Solo pedidos activos reciben enlaces' using errcode='23514';
 end if;
 insert into public.order_access_links(order_id,token_hash,issued_by,revoked_at)
  values(p_order_id,p_token_hash,auth.uid(),null)
 on conflict(order_id) do update
  set token_hash=excluded.token_hash,issued_by=excluded.issued_by,
   issued_at=now(),revoked_at=null,version=public.order_access_links.version+1
 returning version into v_version;
 return v_version;
end;$$;
revoke all on function public.issue_evalia_order_link(uuid,text) from public,anon,authenticated;
grant execute on function public.issue_evalia_order_link(uuid,text) to authenticated;

create function public.revoke_evalia_order_link(p_order_id uuid)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_order public.orders%rowtype;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002'; end if;
 update public.order_access_links set revoked_at=coalesce(revoked_at,now())
 where order_id=p_order_id;
 return found;
end;$$;
revoke all on function public.revoke_evalia_order_link(uuid) from public,anon,authenticated;
grant execute on function public.revoke_evalia_order_link(uuid) to authenticated;

create function public.update_evalia_qr(
 p_image_path text,p_verified_reusable boolean,p_request_id uuid
) returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_old public.payment_qr%rowtype; v_prior public.qr_change_events%rowtype;
begin
 if not public.is_evalia_admin() then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
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
end;$$;
revoke all on function public.update_evalia_qr(text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.update_evalia_qr(text,boolean,uuid) to authenticated;

-- Únicas RPC accesibles al backend privado. El cliente jamás invoca RPC directas.
create function public.client_evalia_order(p_token_hash text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
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
  'model',m.name,'size',m.size_label,'quantity',ol.quantity,
  'dozens',ol.dozen_count,'extras',ol.extra_units,'subtotal',ol.subtotal_bs,
  'colors',(select coalesce(jsonb_agg(c.name order by ec.position),'[]'::jsonb)
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
  'reference',substring(v_order.id::text,1,8),'status',v_order.status,
  'total',v_total,'approved',v_paid,'pending',greatest(v_total-v_paid,0),
  'excess',greatest(v_paid-v_total,0),'lines',v_lines,'payments',v_payments,
  'qr_path',v_qr);
end;$$;
revoke all on function public.client_evalia_order(text) from public,anon,authenticated;
grant execute on function public.client_evalia_order(text) to service_role;

create function public.client_evalia_payment(
 p_token_hash text,p_amount numeric,p_receipt_path text,p_request_id uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_link public.order_access_links%rowtype;
 v_prior public.payment_reports%rowtype; v_id uuid; v_count int;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
  or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
  or p_amount>999999999999.99 or p_request_id is null then
   raise exception 'Declaración inválida' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_prior from public.payment_reports where request_id=p_request_id;
 if found then
  if v_prior.origin<>'client' or v_prior.amount_bs<>p_amount or
   v_prior.receipt_path is distinct from p_receipt_path then
    raise exception 'Solicitud reutilizada con contenido distinto' using errcode='23505';
  end if;
  select * into v_link from public.order_access_links
   where order_id=v_prior.order_id and token_hash=p_token_hash and revoked_at is null;
  if not found then raise exception 'Enlace revocado' using errcode='42501'; end if;
  return v_prior.id;
 end if;
 select * into v_link from public.order_access_links
  where token_hash=p_token_hash and revoked_at is null for update;
 if not found then raise exception 'Acceso inválido' using errcode='42501'; end if;
 select * into v_order from public.orders where id=v_link.order_id for update;
 if not found or v_order.status<>'active' then raise exception 'Pedido cerrado' using errcode='42501'; end if;
 if p_receipt_path is null or p_receipt_path !~ '^receipts/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$'
   or split_part(p_receipt_path,'/',2)<>v_order.id::text then
  raise exception 'Comprobante ajeno a este pedido' using errcode='42501';
 end if;
 if not exists(select 1 from storage.objects
  where bucket_id='evalia-receipts' and name=p_receipt_path) then
  raise exception 'Comprobante no cargado' using errcode='22023';
 end if;
 select count(*) into v_count from public.payment_reports
  where order_id=v_order.id and origin='client'
   and created_at>now()-interval '1 hour';
 if v_count>=5 then raise exception 'Límite temporal de avisos alcanzado' using errcode='22023'; end if;
 insert into public.payment_reports(request_id,order_id,amount_bs,origin,receipt_path)
  values(p_request_id,v_order.id,p_amount,'client',p_receipt_path) returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.client_evalia_payment(text,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.client_evalia_payment(text,numeric,text,uuid) to service_role;
commit;