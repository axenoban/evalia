# EVALIA — Integración real con Supabase (23 noviembre 2026)

**Estado:** estructura SQL inicial instalada y auditada en el proyecto remoto **evalia**. La aplicación Next.js continúa en rama feature, sin merge ni publicación web.

> **Actualización de fase:** se agregaron y aplicaron las migraciones **006–009** en el mismo proyecto, con historial remoto alineado: **9 migraciones, 23 tablas con RLS y cron F/L activo**. La fuente vigente del ciclo completo (cobros, entregas, portal privado y QR) es [docs/41](41_CICLO_OPERATIVO_PAGOS_PORTAL.md); este documento mantiene la trazabilidad de la instalación inicial 001–005.

## 1. Identidad y baseline verificable

- Repositorio: \`axenoban/evalia\`
- Rama operativa: \`feature/evalia-captura-docenas-colores\` (PR #4 draft, basado en \`feature/evalia-panel-operativo\`, PR #3 draft).
- Proyecto Supabase: \`evalia\`, ref \`vbedfbijoqcqpzjzawrh\`, organización \`AxeJR Studio\`, región \`us-east-1\`; PostgreSQL **17.12**; estado \`ACTIVE_HEALTHY\` durante verificación.
- URL API pública: \`https://vbedfbijoqcqpzjzawrh.supabase.co\`.
- No se usaron contraseñas ni credenciales privadas; no se creó otro proyecto.

## 2. Migraciones **ya aplicadas**

Se tomó literalmente el SQL de la rama operativa de GitHub y se aplicó en orden, sobre una base inicial vacía sin historial previo:

| Versión canónica | Archivo fuente | Resultado |
|---|---|---|
| 20261123000100 | \`core_schema.sql\` | 14 tablas iniciales y autorización/RLS |
| 20261123000200 | \`inventory_api.sql\` | RPC de stock, ajustes e incidencias |
| 20261123000300 | \`catalog_real.sql\` | muestras hex, alta atómica de modelo y bucket privado |
| 20261123000400 | \`reservas_pedidos_rpc.sql\` | reserva/pedido/conversión transaccionales |
| 20261123000500 | \`docenas_colores_extra.sql\` | desglose de docenas, colores individuales y revisión auditada |

**Advertencia sobre versionado:** la función \`apply_migration\` del conector asignó inicialmente marcas temporales nuevas a la historia remota, aunque se enviaron los nombres de archivo originales. Después de verificar que había exactamente cinco migraciones correctas sobre una base nueva, se **normalizó transaccionalmente solo el historial \`supabase_migrations.schema_migrations\`** para hacer coincidir sus cinco números de versión y nombres con los archivos de GitHub, sin volver a ejecutar su SQL ni modificar el esquema. La consulta de comprobación devolvió:

\`\`\`text
20261123000100 | core_schema
20261123000200 | inventory_api
20261123000300 | catalog_real
20261123000400 | reservas_pedidos_rpc
20261123000500 | docenas_colores_extra
\`\`\`

Por ello, **NO volver a ejecutar estas migraciones en la misma base**. Un futuro \`supabase db push\` debe confirmar primero \`supabase migration list\`, verificar que las versiones remotas coincidan y aplicar únicamente migraciones nuevas.

## 3. Comprobaciones ejecutadas contra la base remota

- **17 de 17 tablas** en \`public\` con Row Level Security activada.
- Tabla \`admin_profiles\` protegida por usuario; tablas restantes con políticas de lectura de administrador.
- **0 tablas legibles por rol anónimo** según \`has_table_privilege\`.
- \`anon\` no puede ejecutar RPC sensibles; \`authenticated\` puede invocar RPC autorizadas pero cada una comprueba además \`is_evalia_admin()\`, que consulta \`admin_profiles\`.
- Simulación transaccional de sesión \`authenticated\` sin perfil: \`is_evalia_admin() = false\`; invocación de \`create_evalia_reservation\` denegada; ningún dato de clientes/reservas visible.
- Bucket \`evalia-models\`: **privado**, máximo **5 MiB**, MIME \`image/jpeg\`, \`image/png\`, \`image/webp\`.
- Conteos al terminar: **0 usuarios de Auth, 0 administradores, 0 clientes, 0 modelos**. No se introdujeron datos personales ni de negocio.
- CI contra PostgreSQL local: **83/83 pruebas pgTAP** con datos transaccionales revertidos, **70/70 pruebas Node**, Next.js 16 compilación exitosa. Estas pruebas de CI no equivalen a prueba manual de navegador ni a prueba de concurrencia real de alto volumen.

### Auditoría Supabase

El pipeline GitHub Actions presenta un fallo de infraestructura identificado (no de SQL): dos ejecuciones simultáneas de `supabase start` compitieron por el puerto Docker `54324`. En la rama feature se añadió un grupo de **concurrencia sin cancelación**, para serializar el workflow. Verificar en el siguiente run que los tres jobs terminen correctamente antes de fusionar.


El asesor de seguridad comunica **9 advertencias \`authenticated_security_definer_function_executable\`**. Son RPC de inventario/reservas/modelos diseñadas para atender usuarios autenticados, **con verificación adicional de \`admin_profiles\` dentro de cada función**, y el linter es conservador. No desactivar advertencias, no abrir acceso a \`anon\`, ni convertir ciegamente a \`SECURITY INVOKER\` porque rompería las escrituras controladas por RPC. Reauditar tras cada cambio; considerar a futuro una API interna no expuesta si el diseño de permisos lo requiere.

El asesor de rendimiento informó **11 índices de claves externas sin cobertura** y **11 índices sin uso** en una base sin datos. Los índices sin uso no deben eliminarse automáticamente; los de claves externas son deuda de optimización para un bloque futuro y no impiden la prueba funcional inicial.

Documentación del linter: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## 4. Habilitar el administrador sin compartir contraseñas

**Actualmente no hay usuarios en Auth**, por lo que el formulario web no permitirá acceder hasta que exista uno autorizado. No basta ser dueño de la organización Supabase: Auth del proyecto es independiente del Dashboard.

1. En Supabase Dashboard, proyecto \`evalia\`, ir a **Authentication → Users** y crear o invitar el usuario de acceso que controlará EVALIA. Definir y administrar su contraseña o invitación **exclusivamente en Supabase**, sin enviarla al asistente, sin ponerla en GitHub.
2. Copiar el **UUID real** del usuario creado en Auth. Comprobar que es la cuenta correcta.
3. Ejecutar una sola vez en **Supabase → SQL Editor**, reemplazando el marcador por el UUID real:

\`\`\`sql
insert into public.admin_profiles(user_id)
values ('UUID-REAL-DE-AUTH-USERS'::uuid)
on conflict (user_id) do nothing;
\`\`\`

4. Verificar que la cuenta está en \`admin_profiles\`, sin incorporar el UUID al repositorio. La app usa login normal \`signInWithPassword\`.

**No implementar auto-registro de administradores ni convertir a cualquier usuario autenticado en admin.**

## 5. Ejecutar la web contra el proyecto real

La base está instalada, pero **Supabase no hospeda la aplicación Next.js automáticamente**. Debe ejecutarse localmente o desplegarse más adelante en un hosting Next.js (sin cambiar \`main\` hasta aprobación).

1. Obtener del repositorio la rama \`feature/evalia-captura-docenas-colores\`.
2. Dentro de \`web/\`, copiar \`.env.example\` a \`.env.local\`.
3. El \`NEXT_PUBLIC_SUPABASE_URL\` del proyecto ya está escrito en el ejemplo. En **Project Settings → API Keys** copiar una clave **publishable** (o anon legacy) a \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`. Nunca usar \`service_role\`, \`sb_secret_\` o claves privadas en \`NEXT_PUBLIC_\`.
4. Con Node.js 22 instalado:

\`\`\`bash
cd web
npm install
npm run dev
\`\`\`

5. Abrir \`http://localhost:3000\` e iniciar sesión con el usuario de Auth autorizado.

### Prueba física recomendada

- Registrar 11–13 colores con muestras cromáticas.
- Crear un modelo con foto, talla fija, precio docena y stock conservador de 6 docenas.
- Registrar un cliente de prueba y buscarlo por WhatsApp.
- Reservar **0 docenas + 6 colores únicos**; verificar que A disminuye 6.
- Editar la reserva a **1 docena + 1 prenda extra con color**; confirmar audit trail y que A pase de 66 a 59 cuando S=72.
- Convertir reserva a pedido; verificar que R baja y P sube 13, mientras A sigue 59.
- Registrar un segundo modelo y comprobar carritos multímodelo y precio por modelo.
- Rechazar 5 prendas sin docenas, 12 extras, color duplicado y stock insuficiente.
- Ajustar ventas físicas sin disminuir los cupos ya reservados o pedidos.

## 6. Límites pendientes y condición para fusionar

**No se ha publicado hosting ni validado interfaz en navegador.** El panel actual no habilita todavía depósitos y aprobaciones, expiración programada, entregas, estado COMPLETADO, enlace del cliente ni QR; ver matriz M01–M14 en [docs/39](39_CAPTURA_DOCENAS_COLORES_INDIVIDUALES.md). Los colores extra registrados representan **solicitudes cromáticas**, sin conteos reales por color ni garantía automática de existencia individual.

No fusionar PR #4/#3 con otras ramas, ni publicar EVALIA a clientes, hasta que el propietario apruebe la prueba visual y funcional y se completen controles comerciales pendientes. Ninguna cuenta administrativa se crea automáticamente.

## 7. SQL de verificación de solo lectura

\`\`\`sql
select version,name
from supabase_migrations.schema_migrations
order by version;

select count(*) as public_tables,
       count(*) filter(where c.relrowsecurity) as tables_with_rls
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';

select id,public,file_size_limit,allowed_mime_types
from storage.buckets
where id='evalia-models';
\`\`\`
