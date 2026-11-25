-- E1-06: alta idempotente de clientes y aviso de coincidencias en BD.
-- Requiere esquema privado evalia_security de E1-04/05.
create or replace function evalia_security.whatsapp_key(p_phone text)
returns text language sql immutable set search_path='' as $$
 select case
 when length(d)=13 and left(d,5)='00591' then substr(d,6)
 when length(d)=11 and left(d,3)='591' then substr(d,4)
 else d end
 from (select pg_catalog.regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') d) n;
$$;
revoke all on function evalia_security.whatsapp_key(text) from public,anon,authenticated,service_role;
create table evalia_security.customer_create_requests(
 request_id uuid primary key,
 actor_id uuid not null,
 customer_id uuid not null references public.customers(id) on delete restrict,
 fingerprint bytea not null,
 created_at timestamptz not null default now()
);
alter table evalia_security.customer_create_requests enable row level security;
revoke all on table evalia_security.customer_create_requests from public,anon,authenticated,service_role;

create or replace function public.create_evalia_customer(p_name text,p_whatsapp text,p_method text,p_destination text,p_request_id uuid,p_confirm_duplicate boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_name text:=pg_catalog.btrim(coalesce(p_name,''));
 v_phone text:=pg_catalog.btrim(coalesce(p_whatsapp,''));
 v_dest text:=case when p_method='shipping' then pg_catalog.btrim(coalesce(p_destination,'')) else null end;
 v_key text;
 v_fingerprint bytea;
 v_prior evalia_security.customer_create_requests%rowtype;
 v_matches integer;
 v_id uuid;
begin
 if not public.is_evalia_admin() then
  raise exception 'Acceso administrativo requerido' using errcode='42501';
 end if;
 if p_request_id is null or p_confirm_duplicate is null or p_method is null
  or p_method not in ('pickup','shipping') or length(v_name) not between 1 and 130
  or length(v_phone) not between 1 and 30
  or (p_method='shipping' and length(v_dest) not between 2 and 200) then
  raise exception 'Datos de cliente inválidos' using errcode='22023';
 end if;
 v_key:=evalia_security.whatsapp_key(v_phone);
 v_fingerprint:=pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array(v_name,v_phone,p_method,v_dest)::text,'UTF8'));
 -- Bloqueo por solicitud, luego teléfono. Un reintento no crea otra ficha.
 perform pg_catalog.pg_advisory_xact_lock(740601,pg_catalog.hashtext(p_request_id::text));
 select * into v_prior from evalia_security.customer_create_requests where request_id=p_request_id;
 if found then
  if v_prior.actor_id is distinct from auth.uid() or v_prior.fingerprint is distinct from v_fingerprint then
   raise exception 'Solicitud de cliente reutilizada con datos distintos' using errcode='23505';
  end if;
  return pg_catalog.jsonb_build_object('state','created','id',v_prior.customer_id);
 end if;
 if v_key<>'' then
  perform pg_catalog.pg_advisory_xact_lock(740602,pg_catalog.hashtext(v_key));
  select count(*)::integer into v_matches from public.customers c
   where evalia_security.whatsapp_key(c.whatsapp)=v_key;
  if v_matches>0 and not p_confirm_duplicate then
   return pg_catalog.jsonb_build_object('state','duplicate','count',v_matches);
  end if;
 end if;
 insert into public.customers(name,whatsapp,delivery_preference,shipping_destination)
 values(v_name,v_phone,p_method,v_dest) returning id into v_id;
 insert into evalia_security.customer_create_requests(request_id,actor_id,customer_id,fingerprint)
 values(p_request_id,auth.uid(),v_id,v_fingerprint);
 return pg_catalog.jsonb_build_object('state','created','id',v_id);
end;
$$;
revoke all on function public.create_evalia_customer(text,text,text,text,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.create_evalia_customer(text,text,text,text,uuid,boolean) to authenticated;
