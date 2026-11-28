# Roles de usuario (R1) y acceso del cliente (R2) — decisiones del propietario
**Fecha:** 28-11-2026. **Base:** `dev/evalia-core` = `45a39bb` (E3 incremento 1 integrado). Trabajo en entorno de prueba.

## R1 — Roles de administración (implementado en `feature/evalia-r1-roles`)
| Rol (valor en BD) | Nombre visible | Permisos |
|---|---|---|
| `owner` | Administrador global (único) | Todo; usuarios y roles, QR, estadísticas y exportación. MFA obligatorio |
| `operator` | Administrador | Productos, stock, colores, pedidos (registrar, editar, anular), clientes, aprobar pagos, preparar, entregar, cerrar |
| `seller` | Vendedor | Registrar clientes y pedidos, informar pagos (sin aprobar), ver todos los pedidos y el stock |

- Los operadores existentes conservan exactamente sus permisos (pasan a llamarse «Administrador»); no se renombran valores en la base.
- `is_evalia_admin()` = owner u operator (protege toda escritura sensible). Nuevo `is_evalia_staff()` incluye al vendedor y solo se usa en: stock, finanzas/entrega de lectura, validación y creación de pedidos, alta de clientes y aviso de pago (pendiente).
- Políticas RLS adicionales solo de lectura para el vendedor; ninguna de escritura. Fotos de productos legibles por el personal.
- Gestión (solo administrador global con contraseña reciente y MFA): invitar con rol, cambiar Administrador↔Vendedor, suspender/reactivar; auditado en `admin_account_events` (`role_change`). Nadie puede ser promovido a administrador global ni degradarse a sí mismo.
- Vendedor en la interfaz: Resumen, Nuevo pedido, Pedidos (ver, informar pagos, repetir) y Clientes (alta). Sin Productos, Pagos, Estadísticas ni Usuarios; sin editar, anular, cobrar, entregar, preparar, imprimir ni enlaces.
- Migración `20261128140000_r1_roles_vendedor.sql`; pgTAP `097_r1_roles_vendedor.sql` (26 aserciones) e inventario de auditoría 090 actualizado (51 funciones privilegiadas).

## R2 — Acceso del cliente (incremento 1 implementado en `feature/evalia-r2-clientes`)
**Decisiones del propietario:**
- **Solo números registrados por un administrador pueden pedir.** No hay registro abierto ni pedidos de desconocidos.
- **Verificación:** enlace personal enviado por WhatsApp al número registrado (posesión del chat = prueba de identidad, costo cero). Revocable y reemplazable si se pierde. Sin contraseña ni PIN.
- **Catálogo público CON precios** (decisión del 28-11-2026, reemplaza «sin precios»): fotos, nombre, talla, colores, precio por docena y solo «Disponible/Agotado» (disponible = se puede comprar el mínimo: una docena, o 6 prendas con 6 colores activos). Nunca se muestra el stock numérico. Riesgo aceptado: la competencia ve los precios mayoristas.
- **Pedido del cliente:** se confirma al instante con las mismas funciones canónicas (mínimo 6 por modelo, colores únicos, docenas surtidas, precio esperado, stock transaccional, idempotencia); tope de 5 pedidos por cliente cada 24 h.
- No se identifica al cliente solo por escribir su número (riesgo de suplantación y de bloqueo de stock), ni se usa OTP pagado (D01 costo cero).

**Implementación:**
- Migración `20261128160000_r2_clientes_catalogo.sql`: `customer_access_links` (solo hash SHA-256, versión, revocación), `client_order_requests` (auditoría e idempotencia del canal cliente), autorización efímera por transacción (`evalia_security.client_order_grants`) para reutilizar `create_evalia_order`, `evalia_validate_portions` y `get_model_stock` sin duplicar reglas. Emitir/revocar enlace: solo administradores. Catálogo, sesión y pedido del cliente: **solo `service_role`** (servidor Next); nada se abre a `anon` (inventario 090: 56 funciones, 216 aserciones).
- Rutas: `/catalogo` (público), `/c/<token>` (valida y guarda cookie httpOnly 180 días, redirige sin dejar el token en la URL), `/cliente` (catálogo con pedido y «Mis pedidos» con saldo), `/api/cliente-pedido` (origen verificado, ≤32 KB, validación estricta), `/api/cliente-salir`.
- Panel → Clientes → «Enlace del cliente» (administradores): crear, reemplazar (confirmación) o revocar (confirmación crítica), y copiar el mensaje para WhatsApp. El enlace solo se muestra al crearlo.
- Opcional: `NEXT_PUBLIC_EVALIA_WHATSAPP` (número con código de país) activa en el catálogo el botón «Pedir mi enlace por WhatsApp».
- **Requisito para probar en QA:** la clave de servidor de evalia-qa (`SUPABASE_SECRET_KEY`) en las variables de Preview, cargada por el propietario en el panel de Vercel. Sin ella, catálogo y portal del cliente muestran «no disponible» (fallo seguro).
- **Ajustes tras la prueba del propietario (28-11-2026):**
  - Corregido: en el pedido del cliente, «Sin docena» con menos de 6 colores rompía la página (el subtotal se calculaba antes de validar). Ahora muestra la guía «elige al menos 6». `/cliente` y `/catalogo` tienen pantalla de recuperación con «Reintentar».
  - «Catálogo para clientes» en Resumen (todo el personal) y Productos: enviar por WhatsApp, copiar enlace, compartir o ver `/catalogo`.
  - Enlace personal más visible: etiqueta por ficha (activo / revocado / sin enlace), botón «🔗 Enviar enlace» destacado si falta, resumen «N de M clientes con enlace» y acceso directo «🔗 Enlaces personales» desde Resumen (administradores).
- **Etiqueta «📱 Pedido del cliente»** en Pedidos: se lee `client_order_requests` solo para la página visible (RLS: personal).
- **Auditoría visual de simetría (28-11-2026)** con capturas reales del panel en QA a 360, 768 y 1280 px (cuenta temporal de QA creada y eliminada al terminar). Correcciones en `web/app/visual-symmetry.css` (solo presentación): barra superior móvil sin cortes, tarjetas de Resumen/Productos/Nuevo pedido alineadas, columnas fijas en el resumen de cada pedido, acciones del pedido en cuadrícula (4 en PC, 2×2 en tablet, 1 en móvil), secciones plegables con un mismo estilo, acciones de cliente de igual ancho y resumen del pedido sin hueco vacío. No auditadas con sesión: Estadísticas y Usuarios (requieren MFA del administrador global).
- Pendiente R2b: informar pagos y ver comprobantes desde el enlace del cliente (hoy: por WhatsApp; el portal por pedido existente sigue disponible).
