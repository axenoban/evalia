-- D3-A G01: calendario automático, procesado cada minuto en UTC.
-- Las comparaciones ocurren sobre timestamptz calculados en America/La_Paz,
-- por tanto NO dependen de la zona horaria del worker de pg_cron.
begin;
create extension if not exists pg_cron with schema pg_catalog;
-- En migraciones y resets el mismo nombre debe conservar una sola tarea.
select cron.schedule(
 'evalia-vencimientos-f-l',
 '* * * * *',
 'select evalia_internal.process_reservations();'
);
commit;