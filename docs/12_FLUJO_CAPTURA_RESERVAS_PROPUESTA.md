# EVALIA — Propuesta de registro y captura de reservas v0.1

**Estado: PROPUESTA DEL ARQUITECTO, NO APROBADA.** 2026-11-22. Nace del requerimiento del propietario de definir cómo se registran clientes, stock y reservas, y qué flujo operativo simplifica la feria/WhatsApp. **No crea políticas comerciales ni software**.

## Contexto confirmado
- Primera perspectiva: administrador. Clientes registrados internamente sin cuenta (D01/D13).
- Reserva de existencias: **solo mayorista, mínimo seis unidades por modelo**, contando variantes de ese modelo conforme a restricciones todavía abiertas sobre presentaciones y tallas.
- Existencias limitadas: una reserva activa bloquea disponible; un pedido confirmado mantiene compromiso; entregas parciales ajustan cantidades físicamente presentes y saldo pendiente (docs/11_CONTRATO_INVENTARIO.md).
- Venta en feria, coordinación por WhatsApp y canal web futuro (D05). Pagos externos registrados manualmente y WhatsApp con mensaje preparado, no envío automático.
- Precios por cliente/presentación y excepciones, pero G04-01 y cálculo de combinaciones todavía abiertos.

## Flujo sugerido para E1 (a validar)
1. **Nueva reserva / Nuevo pedido** desde el mismo panel, seleccionando operación (no implicar que toda venta requiera reserva).
2. **Cliente:** buscar contacto existente por teléfono o registrar nombre + WhatsApp, con información de entrega cuando sea requerida; no fusionar automáticamente registros coincidentes.
3. **Selección visual:** catálogo con buscador por modelo/código, selector por talla y color, cantidad por variante y carrito multilínea. Agrupar cantidades por modelo para validar mínimo mayorista sin impedir desglose y precio por variante.
4. **Borrador local o persistente a elección:** preparación sin descontar disponibilidad hasta que usuario autorizado confirme **Guardar reserva**. Al guardar validar condiciones y stock en transacción atómica; devolver fallo claro si una variante se agotó mientras se preparaba el carrito.
5. **Reserva creada:** generar identificador único, fecha, cliente, líneas, canal de origen, actor, cantidad y eventual vencimiento configurable. Mostrar unidades reservadas y saldo libre instantáneamente. **No asumir valor temporal de vencimiento**; consultar G01.
6. **Seguimiento:** detalle y listado filtrable de reservas, sus artículos y vencimiento; acción de copiar/enviar manualmente un mensaje predefinido de WhatsApp con datos autorizados, sin credenciales ni automatización de API.
7. **Confirmación comercial:** operación explícita **Confirmar pedido**, con snapshot de precios y transferencia de asignación de reserva a pedido, **sin descontar disponibilidad dos veces**. Pedido directo asigna al confirmar. La confirmación y autorización exactas son materia del cuestionario R10.
8. **Entrega parcial / cierre:** por cada variante, registrar lo efectivamente entregado y mantener pendiente lo restante. Reglas sobre cancelaciones tras entregas parciales siguen abiertas (G03-B).

## Registros conceptuales necesarios (NO estructura SQL definitiva)
- **Clientes/Contactos:** ID estable y datos mínimos a decidir, segmento, historial de pedidos/reservas. Cliente no equivale a usuario Auth.
- **Catálogo:** modelos, imágenes y variantes por color+talla, SKU si se decide. Inventario inicial por variante; separar físico, R y P.
- **Reservas:** ID, cliente, líneas con variante+cantidad, origen, fecha, vencimiento, responsable, referencia a pedido si se convierte, historial.
- **Pedidos:** ID, líneas, fuente directa o reserva, cantidades asignadas y pendientes, snapshot de precios y movimientos/eventos.
- **Movimientos de stock:** entradas/salidas/correcciones físicas auditadas, no sumar ventas dos veces.
- **Actividad/Comunicaciones:** eventos de cambio, envío manual de WhatsApp si se registra, sin automatizar mensajería.

## Por qué esta forma es preferible
- El usuario opera con un **carrito** (más rápido que escribir y sumar cada reserva).
- No se bloquea stock mientras simplemente consulta o compone el borrador.
- La asignación real es **atómica y persistente**, para evitar sobreventa con dos operadores.
- El administrador ve por modelo/talla y desglose color: físico, reservado, pendiente de entrega y disponible.
- Sirve con Next.js + Supabase y deja abierta la futura solicitud pública sin otorgar al cliente acceso directo al inventario.

## Opciones abiertas
R01–R12 en [cuestionario de captura](13_CUESTIONARIO_CAPTURA.md), además de G01, G03-B, G04-01/A/B/C, G05 y G07/G08. Nada de esto aprueba cuentas de clientes o pagos online.

## Seguridad
Las operaciones mutables se validan en servidor y PostgreSQL, con RLS/privilegios mínimos. La función transaccional evita R+P > F e impide crear dos reservas sobre la última unidad. No guardar datos sensibles en repositorio público.

## Pruebas candidatas
- Borrador NO bloquea; guardar reserva bloquea si hay stock.
- Dos operadores con carrito equivalente: solo uno puede guardar si no hay unidades para ambos.
- Una reserva multilínea con varios colores cuenta una sola reserva, pero suma unidades correctamente por variante.
- Agrupar ≥6 por modelo para mayorista, sin declarar que distintas tallas formen una sola presentación.
- Convertir reserva → pedido no cambia disponible, pero traslada R→P.
- Pedido confirmado se conserva físicamente hasta entrega, con saldo parcial.
- Dato del cliente no aparece para un usuario sin permiso.

**Todo este documento es propuesta, no regla aprobada ni especificación SQL.**
