-- EVALIA: corregir alta de clientes desde cualquier administrador ACTIVO.
-- D8 agregó delivery_preference y shipping_destination, pero el GRANT
-- INSERT de D1 sólo incluía name y whatsapp. PostgREST inserta las 4 columnas.
-- Mantener grants por columna; RLS admin_insert sigue haciendo la autorización.
begin;

do $verify$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'customers'
      and c.relrowsecurity
  ) then
    raise exception 'No aplicar alta de clientes sin RLS habilitado';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'admin_insert' and cmd = 'INSERT'
      and 'authenticated' = any(roles)
      and with_check like '%is_evalia_admin%'
  ) then
    raise exception 'La politica admin_insert debe seguir restringida a administradores';
  end if;
end
$verify$;

grant insert (delivery_preference, shipping_destination)
  on table public.customers to authenticated;

-- No GRANT INSERT de tabla completa; sin INSERT para anon.
-- id, created_at y updated_at siguen gestionados por sus valores default.
commit;
