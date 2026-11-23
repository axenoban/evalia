# EVALIA — Flujo de registro y captura de reservas v0.2

**Estado:** respuestas R01–R12 registradas por el propietario; el flujo siguiente separa **requisitos expresos**, **recomendaciones** y **reglas todavía abiertas**. Ninguna implementación ni esquema SQL fue autorizado. Fecha 2026-11-22.

## 1. Flujo operativo confirmado hoy

**EVALIA publica modelos con precios y colores en grupo de WhatsApp → cliente envía mensaje privado con captura del modelo y cantidades → EVALIA selecciona modelo, cantidades y colores o «surtido» → administrador registra la reserva.**

No confundir esta secuencia manual con autorización para automatizar WhatsApp, importar capturas, copiar precios a mano de una imagen mediante OCR o hacer pública la reserva.

## 2. Preparación del catálogo — requisitos expresos

1. Registrar **primero los colores en catálogo común** (no preregistro en cada modelo). La lista es reutilizable entre modelos.
2. Registrar el **modelo** con fotografía/datos y asignarle **solo los colores que tendrá ese modelo**. Un modelo puede ofrecer combinaciones de colores distintas de otro, incluso por un único color.
3. Gestionar tallas conforme a D07 y asociar existencias a variantes **modelo + talla + color**.
4. Cargar el inventario inicial **solo mediante ingreso manual por variante** (R04). La elección excluye una función de importación Excel/CSV de la primera fase.
5. Mostrar en catálogo solo colores asociados a cada modelo, distinguiendo color ofrecido de unidades realmente disponibles. Si cambia la paleta, no borrar datos que tengan historia comercial.

**Propuesta de implementación, no regla comercial:** catálogo `Color` reutilizable, relación `Modelo–Color`, variantes comercializables `Modelo–Color–Talla`, y movimientos de inventario asociados a cada variante. Ver [detalle](14_CATALOGO_COLORES_Y_VARIANTES.md).

## 3. Alta de reserva — requisitos seleccionados

1. **Solo administrador** abre «Nueva reserva» (R01) desde el catálogo visual con buscador y carrito (R05).
2. Buscar cliente por **WhatsApp** (R03), ofrecer coincidencias sin unir registros silenciosamente, o registrar **nombre + número WhatsApp** (R02).
3. Seleccionar modelo enviado por captura en WhatsApp y sus variantes/quantidades disponibles; el sistema muestra totales **por modelo** y desglose de talla/color.
4. Para pedido **menor de una docena**, el cliente puede seleccionar colores o pedir **surtido**, según la práctica comercial expresamente descrita. La reserva mayorista sigue requiriendo **mínimo 6 unidades por modelo**; política exacta de composición sin cerrar G04.
5. Preparar un **borrador sin bloquear unidades** (R06). Un surtido sin colores determinados **no puede convertirse sin más en reserva sobre una variante**: ver [decisiones pendientes](13_CUESTIONARIO_CAPTURA.md).
6. Pulsar **Guardar reserva**: validar stock de cada variante y condición mayorista; si hay exceso, **rechazarlo y permitir corregir cantidades** (R07). La asignación debe ser única, atómica y con registro; no vender dos veces.
7. Al guardarse, generar **código** y permitir crear mensaje de WhatsApp para envío **manual** (R11), con datos autorizados. Evitar implementar envío automático.
8. La reserva tiene vencimiento **configurable**, pero **sin duración inicial decidida** (R09/G01); no fijar 24/48 horas por defecto.
9. Se puede **editar reserva** con revalidación de stock y conservación de historial (R08).
10. Solo administrador acciona **Confirmar pedido** (R10). Convertir reserva transfiere unidades reservadas a pedido pendiente sin descontar otra vez. Un pedido directo asigna una vez al confirmar (G03).
11. Solo interfaz de **administración** en la primera fase; un catálogo/solicitudes de cliente sin cuenta queda para fase posterior (R12).

## 4. Decisión de surtido abierta — recomendación profesional

**Opción preferida a validar:** marcar intención «Surtido · selección EVALIA» en carrito, mostrar solo colores de ese modelo con stock disponible y permitir que administrador reparta las unidades entre variantes **antes del guardado que bloquea stock**. Mostrar esa composición en el detalle de reserva y al preparar pedido, sin fingir que el cliente eligió cada color.

**Alternativa sin bloqueo:** guardar solo una **solicitud/borrador** de surtido sin colores precisos, y cuando administrador los decida convertirla en reserva transaccional. La solicitud no promete disponibilidad.

**No decidir arbitrariamente:** si la asignación se completa inmediatamente, si puede modificarse posteriormente por sustitución de color, ni el caso de docenas enteras o más. No reservar «surtido genérico» como reducción de un saldo agregado del modelo sin validar colores+tallas.

## 5. Registros resultantes (candidatos, NO SQL definitivo)

- Cliente/contacto sin Auth: nombre y WhatsApp, ID estable, posible segmento e historial.
- Catálogo de colores global; modelos; asignación de colores permitidos por modelo; tallas y variantes.
- Entradas manuales de stock por variante, con actor y motivo a decidir en G05/G07.
- Reserva con código único, cliente, origen, líneas de variante+cantidad, vencimiento configurable, estado/historial.
- Pedido enlazado a reserva o creado directamente, con compromisos por variante, precios históricos y entregas parciales.
- Mensajes WhatsApp preparados para envío manual. No copiar capturas ni datos reales al repositorio.

## 6. Seguridad y tests (propuesta)

RLS/validación servidor sobre datos de cliente y movimiento; operaciones de bloqueo bajo transacción PostgreSQL. Rechazo sin prometer «surtido» en variantes agotadas; edición sin stock negativo; dos administradores concurrentes no reservan la misma última unidad.

## 7. Pendiente antes de construir las reglas

[Cuestionario y tensiones R01–R12](13_CUESTIONARIO_CAPTURA.md), G01, G03-B, G04-01/04-04 y precio por variante/presentación, G05/G07/G08. La composición por talla y precio sigue sin cerrarse.

**No ejecutar código, migraciones o merge en esta fase.**
