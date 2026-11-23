# EVALIA · D10 — Identificación, toasts y edición acotada de pedidos

**Rama candidata:** `feature/evalia-pedidos-ux-edicion`, basada en `feature/evalia-pedidos-acordeon` (PR #16 en validación).
**Estado:** CI local aprobada; migración aplicada a Supabase remoto sin cambios comerciales (tabla de auditoría inicialmente vacía). Pendiente de aprobación visual y prueba física. No integrar a dev/main automáticamente.

## Ajustes visuales
- Completados con tono verde/gris-menta sutil; activos conservan la base rosada.
- Cabecera de acordeón muestra tallas únicas, o varias tallas deduplicadas (`Talla M`, `Tallas M · XL`).
- Nombre de cliente +1 px (incluye móvil).
- Avisos de éxito/error pasan a toasts flotantes; nunca mueven el contenido, se cierran por botón o automáticamente a 6/9 segundos. Se conserva el error de autenticación en el formulario de acceso.

## D10 — Propuesta técnica restringida para editar pedidos
Solo se permite edición de **modelos y cantidades** de pedidos directos `active`, sin pagos registrados (incluso observados/rechazados), sin entregas, sin enlace privado activo, y con composiciones canónicas editables. Este límite protege historial y saldos, porque todavía no hay una política comercial ratificada para ajustar pedidos con movimientos de dinero o entregas.

- Backend: migración 15 (`20261123204135_pedidos_edicion_segura.sql`), RPC `revise_evalia_order`, RLS/ACL y tabla `order_revisions` inmutable desde el navegador. Idempotencia por `request_id`, versión optimista `revision`, bloqueo transaccional del pedido e inventarios en orden.
- El inventario se recalcula como libre global más unidades originales del pedido, sin liberar y re-comprometer dos veces.
- Las líneas existentes conservan `price_dozen_bs` histórico aunque el catálogo haya cambiado. Modelos nuevos toman precio vigente; se recalcula subtotal por modelo con redondeo canónico.
- El usuario puede agregar, quitar o modificar modelos en el formulario reusando `PortionEditor`/ `checkedPortions` y elige colores de unidades adicionales según reglas existentes. Confirmación humana antes de guardar.
- La RPC rechaza pedidos completados, con depósitos, envíos con enlace activo o entregas; el cliente **no** recibe mensaje automático. No se inventan descuentos ni devoluciones.
- La edición NO modifica cliente, modalidad/destino (ya tienen controles auditados), impresión, pagos, entregas ni documentos históricos.
- La interfaz consulta `revision` de forma compatible con una base que aún no tenga esta migración: en ese caso la edición permanece deshabilitada, sin romper el resto de la vista.

## Pruebas y despliegue
1. `npm run check`, compilación Next.js y `supabase start && supabase test db` sobre BD local aislada.
2. Verificar en móvil y PC la distinción completado/activo, tallas mixtas, toasts de error/éxito y cierre manual.
3. Probar edición con pedido **de laboratorio aislado** de 1 a 2 docenas, de 2 a 1, agregar/quitar modelo, media docena de 6 colores, agotamiento de stock, cambios concurrentes y reintentos.
4. Verificar rechazo de pedidos completados, con pagos, entregas, enlaces activos o versiones obsoletas; cada edición debe generar exactamente una auditoría.
5. No enviar pruebas ficticias a Supabase real. La migración se aplicó tras superar verificaciones SQL aisladas, incluyendo aumento, reducción y eliminación de modelos y respetando las 14 migraciones anteriores. Se comprobó rol administrativo, rechazo de `anon`/`service_role` y auditoría vacía antes de ofrecer la Preview; no se modificaron pedidos.
6. La impresión y política de edición de pedidos ya cobrados se posponen a decisiones posteriores.

**Nota:** no se desactiva la RPC histórica de entregas parciales ni se borra información previamente registrada. Solo se oculta su formulario en Pedidos, conforme al bloque anterior.

## Verificación de consistencia de migraciones

El repositorio debe conservar exactamente `supabase/migrations/20261123204135_pedidos_edicion_segura.sql`: Supabase registró la migración bajo esa versión. No mantener el nombre provisional `20261123001500` para evitar discrepancia de historial en futuros despliegues.
