# Arquitectura propuesta · ADR-001

**ESTADO: PROPUESTA — NO IMPLEMENTADA / PENDIENTE DE APROBACIÓN**

## Diseño recomendado
- Repositorio GitHub: código, migraciones, QA, diseño y documentación; no datos personales.
- Frontend responsive/PWA potencial: TypeScript + React + Vite (elección por evaluar frente a alternativas).
- Hosting: **Cloudflare Pages o Workers** conectado a GitHub; no usar GitHub Pages como sitio comercial de pedidos.
- Backend administrado: **Supabase PostgreSQL + Auth + Storage**, con funciones/servicios server-side para operaciones privilegiadas.
- Primer despliegue: entorno de desarrollo con datos de muestra; separar entorno productivo y backups antes de usuarios reales.

## Razón
PostgreSQL ofrece integridad relacional y transacciones necesarias para pedidos y reservas concurrentes. Supabase aporta Auth y RLS; Cloudflare ofrece despliegue del frontend desde GitHub. Plan gratuito solo para prototipo/validación, sujeto a cuotas, pausas y cambios tarifarios.

## Modelo preliminar (entidades candidatas, no esquema final)
`profiles`, `role_assignments`, `customers`, `products`, `product_variants` (modelo, color, talla), `product_media`, `price_lists`, `inventory_movements`, `stock_reservations`, `reservation_items`, `orders`, `order_items`, `order_events`, `fulfillments`, `payment_records`, `audit_events`.

El catálogo y los pedidos deben referenciar IDs estables. Guardar **precio acordado en cada línea del pedido** (snapshot), aun si cambia la lista de precios.

## Invariantes técnicos propuestos
- El inventario disponible resulta del stock físico confirmado menos reservas vigentes, sin doble asignación.
- Crear, confirmar, expirar o liberar reserva **en una transacción atómica** con bloqueos o función SQL apropiada; nunca mediante lectura y escritura separadas desde el navegador.
- Validación server-side de transiciones y permisos. RLS por perfil/rol en cada tabla expuesta.
- Registro de auditoría de actor, fecha, acción y valores críticos.
- Idempotencia para confirmar pedidos o registrar pagos múltiples.
- Fechas almacenadas en UTC, interfaz Bolivia (America/La_Paz); moneda de referencia BOB.
- Políticas de retención y protección de datos personales antes del despliegue real.

## Alternativas
- Firebase: desarrollo ágil, pero políticas/consultas y transacciones pueden diferir de una BD relacional.
- Backend propio Node/PHP + PostgreSQL/MySQL: mayor control y mantenimiento; requiere infraestructura y operación.
- GitHub Pages: aceptable para **demo estática**, no para comercio electrónico con pedidos reales según términos de GitHub.

## Decisiones bloqueantes
No elegir definitivamente stack, roles, requisitos de reservas, identidad de usuarios, precios, logística ni políticas de pago hasta resolver `04_REGISTRO_DE_DECISIONES.md`. No crear claves, proyectos externos ni tablas productivas todavía.

## Referencias oficiales
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth
- https://supabase.com/pricing
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
