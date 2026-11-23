# EVALIA — Decisión comercial D6: únicamente pedidos confirmados

**Fecha:** 23 de noviembre de 2026. **Estado:** decisión aprobada por el propietario; implementación candidata sin merge. **Prevalece sobre cualquier diseño o cuestionario anterior que ofrezca crear reservas.**

## Regla comercial vigente

- **EVALIA registra solamente pedidos aceptados por el cliente.** No existe la opción de apartar mercadería sin compromiso de compra. La existencia publicada sigue disponible para ventas físicas hasta registrar una compra confirmada.
- Cada pedido puede incluir uno o varios modelos, docenas completas surtidas y unidades extra por colores sin repetición. Sin docenas, mínimo seis y máximo once unidades por modelo. Con docenas, entre cero y once extras; las prendas se registran al confirmar el pedido.
- Al confirmar se congela el precio histórico de cada línea, se compromete inventario global una sola vez y se activa el seguimiento administrativo de abonos aprobados, entregas físicas y COMPLETADO. El cliente conserva enlace privado revocable, QR bancario real y carga de comprobante que inicialmente queda PENDIENTE.
- La venta física no exige registrar cliente/pedido ni cada prenda vendida: se refleja mediante ajuste rápido manual de stock conservador, sin modificar prendas comprometidas.
- **No existen nuevas reservas, fecha límite de feria para nuevos compromisos, depósitos de reserva nuevos ni conversión habitual reserva→pedido.** No introducir esos controles en futuras pantallas.

## Transición de datos anteriores (sin pérdida ni liberación arbitraria)

En la base remota, antes de este cambio existían una reserva anterior `saved` (12 prendas, sin pago aprobado) y una `converted` de 15 prendas. **Ninguna se modifica automáticamente**.

- Se retiran del API para usuarios autenticados las RPC `create_evalia_reservation` y `revise_evalia_reservation`. Ni `anon` ni `service_role` reciben permisos para iniciarlas.
- Se conserva **solo para registros anteriores** `confirm_evalia_reservation`, con comprobación de vigencia, depósito y disponibilidad. La acción manual debe ejecutarse únicamente si el comprador confirma su compra; no se descuenta dos veces.
- Las reservas previas `saved`/`in_review` permanecen visibles en **Pedidos → Registros anteriores pendientes**, desplegable de transición, sin posibilidad de crear otros apartados o registrar depósitos desde la interfaz.
- El proceso programado de vencimientos anterior **sigue activo temporalmente** para resolver registros `saved`. Cuando alcanzan F sin depósito aprobado, dejan de bloquear stock; con depósito aprobado, pasan a revisión sin liberarlo. No desactivar Cron mientras existan pendientes.
- Los registros `converted`, `expired`, las pruebas históricas, historial de pagos, eventos, datos de clientes y líneas no se eliminan ni se reescriben. Precios históricos y saldo del pedido convertido siguen calculándose con su referencia de origen.
- No borrar tablas de reserva ni sus columnas históricas: eso rompería pedidos existentes, auditoría y conciliación financiera. La retirada de interfaz/ejecución nueva es **desactivación de funciones**, no eliminación de historia.
- No liberar automáticamente las doce prendas de la reserva real antigua por el cambio comercial. Resolverla según vigencia anterior o mediante una decisión explícita posterior del administrador/propietario.

## Implementación prevista y regresiones

- `web/app/page.jsx`: menú de pedidos; `BookingPanel` solo permite confirmar pedidos, sin selector de reserva. Dashboard y stock muestran pedidos activos y los compromisos anteriores separados.
- `web/lib/api.js`: elimina clientes RPC de creación/revisión de reservas. Conserva conversión del registro previo y pagos históricos.
- `supabase/migrations/20261123001200_solo_pedidos.sql`: retira ejecución de RPC nuevas, no elimina tablas.
- `supabase/tests/database/010_solo_pedidos.test.sql`: valida que crear/revisar reservas sea imposible desde API y que pedidos, cobros, stock, conversión histórica y cron sigan disponibles.
- Los tests SQL legados 004/005 conceden `EXECUTE` **solo dentro de la transacción de pgTAP con rollback** para cubrir el circuito anterior. En producción esos permisos siguen revocados.
- `tests/solo-pedidos-contract.test.mjs`: contrato UI/API y ausencia de acceso de nuevas reservas.
- Aceptación manual: registrar pedido de 1 modelo y multímodelo, stock antes/después, enlaces de cliente, avisos de pago, entrega y cierre; verificar que no hay acciones de reserva en la navegación. Confirmar que el apartado antiguo sigue contabilizado hasta que se resuelva.

## Restricciones

Este cambio **no autoriza** devoluciones, cancelaciones, liberación de pedidos ya confirmados, descuentos, cambios de precios históricos o modificaciones del flujo bancario. La arquitectura de inventario física `on_hand - pending_delivery - reserved_legacy` se mantiene hasta que no existan compromisos legados activos.

**Entrega:** rama `feature/evalia-solo-pedidos`; no actualizar `main` ni `dev/evalia-core` antes de prueba local y aprobación explícita.
