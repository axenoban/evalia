# EVALIA — Corrección de permisos de alta de clientes (D8 + D9)

## Incidente y primer error
En el panel administrativo `createCustomer` ejecuta `customers.insert({name, whatsapp, delivery_preference, shipping_destination}).select('id')`.
La tabla `public.customers` sólo concedía a `authenticated` `INSERT(name,whatsapp)` desde migración 001.
La migración 014 agregó `delivery_preference` y `shipping_destination` sin ampliar los permisos por columna.
PostgREST devolvía `Crear cliente: permission denied for table customers` antes de evaluar correctamente `admin_insert` (RLS).

## Corrección
La migración 017 (`20261124004200_clientes_permisos_alta.sql`) habilita únicamente
`INSERT(delivery_preference,shipping_destination)` para el rol `authenticated` después de comprobar
que `customers` conserva RLS y la política `admin_insert` dependiente de `is_evalia_admin()`.
No otorga `INSERT` global, no modifica permisos de `anon`, no concede escritura directa a ID/fechas
y no modifica datos ni reglas comerciales.

D9 define `is_evalia_admin()` mediante `admin_profiles.user_id=auth.uid()` y `active=true`.
Así, propietario y operadores activos pueden registrar clientes; cuentas suspendidas y usuarios sin
perfil no pueden. La posterior edición de clientes sigue por RPC auditada, sin abrir nuevos UPDATE.

## Regresiones
`supabase/tests/database/015_clientes_permisos_alta.test.sql` verifica:
- Permisos específicos de las cuatro columnas del formulario y denegación de ID/fechas y anonimato.
- RLS y política `admin_insert`.
- Alta de cliente de retiro por propietario y de envío por operador activo.
- Rechazo de operador suspendido, autenticado sin perfil y anónimo.

Todos los clientes de QA usan identidades `.invalid` en una transacción reversible de **Supabase local**.
No ejecutar el test directamente en el proyecto remoto comercial ni introducir datos de prueba en producción.

## Despliegue y comprobación
1. Revisar CI de la rama `feature/evalia-clientes-permisos` (Node y pgTAP).
2. Confirmar que `20261124004200` no está aún en el historial de migraciones remoto.
3. Aplicar la migración única y comprobar por SQL que las columnas D8 admiten INSERT sólo mediante
   `authenticated` y que `anon` sigue sin acceso, con RLS habilitado.
4. Prueba humana en la aplicación: cada administrador activo crea un cliente de retiro y otro de envío
   con destino; confirmar que quedan en el listado y pueden seleccionarse en Nuevo pedido.
5. No integrar la rama sin revisión. Esta corrección se basa en el candidato D9-B1, cuyo despliegue
   completo sigue sujeto a validación independiente.
