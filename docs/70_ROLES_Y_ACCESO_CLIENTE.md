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

## R2 — Acceso del cliente (acordado, pendiente de implementar)
- **Solo números registrados por un administrador pueden pedir.** No hay registro abierto ni pedidos de desconocidos.
- **Verificación:** enlace personal enviado por WhatsApp al número registrado (posesión del chat = prueba de identidad, costo cero). Revocable y reemplazable si se pierde. Sin contraseña ni PIN.
- **Catálogo público sin precios:** fotos, nombre, talla, colores y solo «Disponible/Agotado» (disponible = se puede comprar el mínimo). Precios y pedidos solo dentro del enlace verificado. Nunca se muestra el stock numérico.
- **Pedido del cliente:** se confirma al instante con las mismas reglas del servidor (mínimo 6 por modelo, colores únicos, docenas cerradas, precio esperado, stock transaccional); se propone un tope diario por cliente contra abusos.
- **Seguimiento:** el cliente ve sus pedidos, saldo y pagos, e informa pagos (pendientes hasta aprobación), reutilizando el portal privado actual.
- No se identifica al cliente solo por escribir su número (riesgo de suplantación y de bloqueo de stock), ni se usa OTP pagado (D01 costo cero).
