-- EVALIA: permisos mínimos de backend privado en una base con grants explícitos.
-- service_role omite RLS pero aún necesita privilegio SQL SELECT para PostgREST.
-- Estas dos tablas se consultan SOLO desde el backend Next.js con clave secreta.
begin;
grant select on table public.payment_qr to service_role;
grant select on table public.payment_reports to service_role;
commit;
