-- EVALIA: no aceptar reservas nuevas ni revisiones desde el API.
-- Conservamos tablas, cron, pagos y conversión solo para compromisos anteriores
-- y para mantener auditoría y disponibilidad histórica sin doble descuento.
begin;
revoke execute on function public.create_evalia_reservation(uuid,jsonb,uuid)
 from public,anon,authenticated,service_role;
revoke execute on function public.revise_evalia_reservation(uuid,jsonb,uuid)
 from public,anon,authenticated,service_role;
-- Sigue permitido crear pedidos directos y convertir una reserva histórica
-- cuando el cliente ya confirmó expresamente la compra.
commit;
