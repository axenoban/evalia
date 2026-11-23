# EVALIA · D8 — Modalidad de entrega, clientes de envío e impresión

**Decisión aprobada:** todo pedido debe indicar Retiro local o Envío nacional/interdepartamental. Los clientes con envíos necesitan un destino habitual para agilizar registros. **No se crean reservas ni se modifican las reglas de venta aprobadas.**

## Modelo de datos

- `customers.delivery_preference` = `unclassified` (solo fichas anteriores), `pickup` o `shipping`. Nuevo cliente desde interfaz: elegir obligatoriamente `pickup` o `shipping`.
- `customers.shipping_destination`: texto entre 2 y 200 caracteres obligatorio para categoría `shipping`; nulo para `pickup`. Indicar ciudad, departamento y/o agencia según corresponda. No se ha inventado una lista de destinos o tarifas.
- `orders.fulfillment_method` = `legacy` para pedidos previos a la migración; `pickup` o `shipping` en nuevos pedidos.
- `orders.shipping_destination`, `recipient_name`, `recipient_phone` se fijan **al registrar el pedido**, para evitar que cambios posteriores en la ficha del cliente reescriban una etiqueta histórica. Son los datos utilizados para imprimir.
- La categoría del cliente es una **preferencia**, no una restricción: cada pedido puede ser Retiro local o Envío, independientemente de los anteriores. En el formulario se autocompleta con su ficha, pero se puede cambiar.
- `customer_delivery_revisions` y `order_fulfillment_revisions` registran cambios administrativos en los datos de entrega con identidad del actor; RLS solo lectura de administradores, escrituras mediante RPC con comprobación de permisos.
- El RPC `create_evalia_order_delivery` reutiliza `create_evalia_order` dentro de **la misma transacción**, conservando inventario, docenas, precios históricos e idempotencia. El RPC `update_evalia_order_delivery` permite clasificar un pedido anterior o corregir el destino de un pedido **activo** con auditoría.
- Migration: `supabase/migrations/20261123001400_entrega_envios_impresion.sql`. No se alteran los 5 pedidos ni los 4 clientes existentes. Sus modalidades permanecen `legacy/unclassified` hasta clasificación manual.

## Impresión contextual (nunca mezclar formatos)

### Retiro local
Imprime **cliente, detalle de cada modelo, talla, cantidad, composición de docenas/colores adicionales y total histórico**. Es un comprobante de armado/recogida para uso administrativo.

### Envío nacional/interdepartamental
Imprime una **etiqueta A6 separada** con únicamente:
- Destino.
- Nombre del destinatario.
- Número de contacto.

La etiqueta de envío **no contiene** nombre de modelo, artículo, prendas, cantidad, subtotal, total, precios, QR ni token del portal. El generador `web/lib/order-print.js` construye un HTML separado para envío: no se limita a ocultar detalles con CSS. Codifica contenido para evitar inyecciones HTML. Prueba unitaria comprueba ausencia de información comercial.

La impresión se ejecuta desde el panel administrativo en una ventana del navegador. Requiere permitir ventanas emergentes/impresión. No genera documentos públicos alojados en el servidor, no envía WhatsApp ni agrega un número de guía o costo de transporte que no están definidos.

**Pedidos anteriores:** no se infiere si fueron envíos o retiros. Para imprimir uno activo anterior debe clasificarse manualmente desde Pedidos → Corregir modalidad/destino. Se preservan los datos comerciales.

## QA y aceptación

1. Crear cliente con categoría Retiro; comprobar que no pide destino.
2. Crear cliente con categoría Envío; comprobar que destino es obligatorio y está visible en su ficha.
3. Elegir el cliente con envíos y crear pedido multímodelo; verificar autocompletado del destino, cambiarlo solo para ese pedido y registrar compra confirmada.
4. Abrir Pedidos: mostrar etiqueta de envío e imprimirla en A6. Verificar físicamente que **no aparecen productos, cantidades, precios ni valor declarado**.
5. Crear pedido de retiro e imprimir comprobante A4 con modelos, cantidades y total.
6. Corregir destino habitual del cliente y verificar que la etiqueta de un pedido previamente registrado **no cambia**.
7. Probar clasificación manual de pedido anterior activo, sin eliminar historial ni alterar pagos.
8. Regresión de selección de producto, cobro y entrega express, enlaces WhatsApp, portal de cliente, pagos, comprobantes y stock.
9. Probar desde móvil y escritorio. La función de impresión del sistema o navegador puede abrir un diálogo de destino/impresora.
10. Sin escrituras sintéticas sobre el Supabase comercial; usar fixtures pgTAP transaccionales con rollback.

La prueba funcional y de impresión real del propietario es obligatoria antes de integrar esta rama a `dev/evalia-core`. `main` sigue sin cambios. **Después de validar D8**, puede iniciarse la fase exclusivamente visual.
