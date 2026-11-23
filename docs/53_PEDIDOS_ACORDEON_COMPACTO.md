# EVALIA · Pedidos compactos en acordeones (UI)

**Estado:** candidato pendiente de prueba física y aprobación.  
**Rama:** `feature/evalia-pedidos-acordeon`.  
**Baseline aprobado:** `dev/evalia-core @ 868144f0`.

## Alcance de diseño
- La lista de pedidos se convierte en acordeones nativos `<details>/<summary>` cerrados al cargar; un pedido abierto por vez con `name="evalia-orders"` en navegadores compatibles.
- Cabecera compacta: cliente, fecha de confirmación, número de modelos y prendas, modalidad de entrega, importe histórico y estado. Sin datos inventados.
- Al expandir: resumen real de pagos/retiradas, líneas de modelos compactadas, total y bloque de entrega. La impresión conserva **exactamente** el controlador y condiciones del sistema vigente.
- Las operaciones más extensas se agrupan en un segundo desplegable `Gestionar cobros y entregas`, preservando el cierre express, historial, reportar pagos, entregas parciales, estado COMPLETADO y enlaces privados.
- Estilos aislados en `web/app/orders.css`, adaptable a PC, tableta y 360/390 px.

## Lo que no cambia
- Importe histórico `l.subtotal_bs`, precio congelado `l.price_dozen_bs`, modelo, colores individuales, talla y unidades.
- `data.finances` / `data.deliveryStats`, controles de pago verificado y condiciones de cierre.
- Las funciones `onReport`, `onDeliver`, `onComplete`, `onQuick`, `onIssueLink`, `onRevokeLink`, `onConvertLegacy`, `onUpdateFulfillment` y `onPrint`.
- SQL, RPC, reservas históricas, permisos, enlaces privados y etiquetas/imprimibles.
- **Impresión NO se rediseña** en este bloque.

## Pruebas
1. `npm run check` y `cd web && npm install && npm run build`.
2. Móvil 360/390 px: comprobar varias tarjetas cerradas y que abrir una no extienda indefinidamente toda la lista.
3. Abrir pedido y verificar modelo, color adicional, saldo, estado, entrega y total; comprobar operaciones secundarias plegadas.
4. Entrar en `Gestionar cobros y entregas` y comprobar pago, entrega, cierre express y enlace privado sin registrar operaciones ficticias en el Supabase remoto.
5. Verificar datos de pedido completado, histórico legado, envío/local, modalidad sin clasificar y ausencia de pedidos.
6. La próxima fase de impresión necesita aprobación separada.
