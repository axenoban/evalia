# EVALIA · Pedidos compactos en acordeones (UI)

**Estado:** revisión visual v2, candidata pendiente de prueba física y aprobación.  
**Rama:** `feature/evalia-pedidos-acordeon`.  
**Baseline aprobado:** `dev/evalia-core @ 868144f0`.

## Alcance de diseño
- La lista de pedidos se convierte en acordeones nativos `<details>/<summary>` cerrados al cargar; un pedido abierto por vez con `name="evalia-orders"` en navegadores compatibles.
- Cabecera compacta: cliente, fecha de confirmación, número de modelos y prendas, modalidad de entrega, importe histórico y estado. Sin datos inventados.
- Al expandir: un resumen financiero **condicional** (solo saldo por cobrar, o pago verificado; abonos mostrados si existen), modelos compactos y bloques opcionales de impresión/destino. El total permanece en la cabecera y no se repite al pie.
- Las operaciones más extensas se agrupan en un desplegable `Cobro y cierre`. La impresión/destino y el enlace privado tienen sus propios desplegables cerrados al inicio. Se preservan cierre express, historial y avisos de pago, estado COMPLETADO y enlaces privados.
- Estilos aislados en `web/app/orders.css`, adaptable a PC, tableta y 360/390 px.
- **Sin entregas parciales en la interfaz de Pedidos:** se retira la invocación de `DeliveryForm`, no las transacciones ni los registros históricos. El cierre express sigue registrando la entrega de todas las prendas restantes, con confirmación y comprobación del pago.

## Lo que no cambia
- Importe histórico `l.subtotal_bs`, precio congelado `l.price_dozen_bs`, modelo, colores individuales, talla y unidades.
- `data.finances` / `data.deliveryStats`, controles de pago verificado y condiciones de cierre.
- Las funciones `onReport`, `onDeliver`, `onComplete`, `onQuick`, `onIssueLink`, `onRevokeLink`, `onConvertLegacy`, `onUpdateFulfillment` y `onPrint`. La prop `onDeliver` queda disponible por compatibilidad, sin llamarse desde la vista actual.
- SQL, RPC, reservas históricas, permisos, enlaces privados y etiquetas/imprimibles.
- **Impresión NO se rediseña** en este bloque.

## Pruebas
1. `npm run check` y `cd web && npm install && npm run build`.
2. Móvil 360/390 px: comprobar varias tarjetas cerradas y que abrir una no extienda indefinidamente toda la lista.
3. Abrir pedido y verificar nombre/talla/composición/color, saldo, estado y total único en cabecera. Verificar que ya no exista formulario de entregas parciales y que el detalle no repita el importe de una docena dos veces.
4. Entrar en `Cobro y cierre` y comprobar pago, entrega **total**, cierre express, abonos y enlace privado sin registrar operaciones ficticias en Supabase remoto.
5. Verificar datos de pedido completado, histórico legado, envío/local, modalidad sin clasificar y ausencia de pedidos.
6. La próxima fase de impresión necesita aprobación separada.

## Decisión V2: devoluciones o correcciones fuera del detalle del pedido

La solicitud actual es **no registrar entregas parciales desde Pedidos**. No significa borrar históricos ni ofrecer reversión/ajustes automáticos. La intención comercial de compensar posibles devoluciones con ajustes de stock al cierre del día **no se implementa todavía**: requerirá validación de reglas cuando se aborde esa fase. La impresión queda expresamente diferida al bloque siguiente.
