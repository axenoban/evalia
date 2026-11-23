# EVALIA — G03-B: cancelación autorizada del saldo pendiente de entrega (v0.1)

**Fecha:** 2026-11-22. **Alcance:** selección expresa de negocio para cancelaciones **de unidades no entregadas** de un **pedido confirmado, incluso parcialmente entregado**. **Estado:** aprobado conceptualmente en la rama feature, sin SQL, sin aplicación, sin cambios a main ni merge del PR #1.

## Pregunta y decisión expresa

El responsable del sistema propuso: «En un cliente que pidió 12 prendas, recogió 5 y dejó 7 pendientes, permitir cancelar **únicamente el saldo pendiente de entrega**, preservando intacto el historial de las prendas retiradas, y liberar las restantes **previa autorización administrativa**. Cualquier ajuste de dinero queda por separado».

**Respuesta literal del propietario:** «ok aprovamos esa recomendacion, pasemos a lo que sigue».

**Regla aprobada G03-B-PARCIAL:** la operación administrativa **cancelar saldo pendiente** aplica **solo a unidades confirmadas pero todavía no entregadas**. No debe revertir una entrega histórica ni reingresar unidades que ya salieron físicamente, ni alterar el depósito/importe monetario por deducción.

## Invariantes de cantidades e inventario

Para cada línea de pedido por modelo (y, cuando esté asignado, por color) conservar cantidades **históricas y pendientes**:

`cantidad_confirmada = cantidad_entregada + cantidad_pendiente + cantidad_cancelada_no_entregada`

- `cantidad_entregada`: unidades **efectivamente retiradas/despachadas**. Historial inmutable como hecho; únicamente correcciones auditadas y autorizadas bajo futura política de devolución, **no por cancelar lo pendiente**.
- `cantidad_pendiente`: unidades **confirmadas, aún bajo custodia y comprometidas** para ese pedido. Pueden tener color asignado (compromiso exacto E) o estar en pool surtido sin colores (compromiso G) de **ese mismo modelo**.
- `cantidad_cancelada_no_entregada`: unidades antes pendientes, cuya asignación se liberó con **autorización del administrador**. Es registro histórico, **no salida física**.
- **Solo una operación válida:** `0 < cantidad_a_cancelar ≤ cantidad_pendiente`, con administrador autorizado, pedido/compromiso todavía vigente y registro de motivo/fecha/cantidades. La cancelación del saldo entero se ejemplifica con 7, pero la decisión no autoriza reglas automáticas de reembolso o recálculo financiero.
- **Efecto correcto:** `cantidad_pendiente -= q`, `cantidad_cancelada_no_entregada += q`; se libera exactamente `q` del compromiso correspondiente E/G y se incrementa la disponibilidad comercial `A=S−E−G` en `q`, **sin aumentar S**. Nunca redistribuir unidades de otros modelos ni crear stock ficticio.
- **Entrega física previa:** una entrega de `d` unidades descuenta tanto `S` (existencia apta en custodia) como el compromiso pendiente `E/G` por `d`, manteniendo la disponibilidad comercial neta. La cancelación posterior del resto **solo libera compromiso**, no aumenta S.
- **Por modelo y color:** no liberar color que no esté efectivamente asignado, ni liberar el mismo stock dos veces tras transferir un surtido G→E; conservar las comprobaciones de cupo G/E y la igualdad de cantidades.
- **Mínimo mayorista de seis:** se valida al crear la reserva/pedido **por modelo**. La entrega o cancelación parcial puede dejar **menos de seis unidades** en un saldo histórico; no convertir eso en incumplimiento o bloquear la cancelación por deducción.
- **Confirmación histórica G04-08:** no recalcular automáticamente precios de docena, totales ya confirmados o descuentos por recontar unidades restantes. El **tratamiento del precio de la parte cancelada y el saldo a favor o por pagar está pendiente de política G06**, sin factura/reembolso inventados.

### Ejemplo verificable de un pedido de 12 prendas

**Situación ficticia:** modelo M, pedido confirmado de 12 prendas; las 12 estaban físicamente en almacén, pero comprometidas (sin disponibilidad comercial para otros compradores). El cliente retira 5; más adelante solicita cancelar las 7 pendientes y el administrador autoriza.

| Evento | Entregadas históricas | Pendientes comprometidas | Canceladas pendientes | Variación S | Variación compromiso E/G | Variación disponibilidad A |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pedido confirmado de 12, antes de retiros | 0 | 12 | 0 | 0 (confirmar no retira físicamente) | +12 al confirmar una sola vez | −12 al confirmar |
| Entrega física de 5 | 5 | 7 | 0 | −5 | −5 | 0 |
| Cancelación administrativa de 7 restantes | 5 | 0 | 7 | **0** | **−7** | **+7** |

**Resultado invariante:** `12 = 5 entregadas + 0 pendientes + 7 canceladas`. Las cinco entregadas **nunca retornan** a stock por esta cancelación. Las siete que permanecían físicamente en custodia vuelven a ser comercialmente disponibles. Este flujo es distinto de **devoluciones de prendas entregadas**, que requieren otra política.

## Transiciones, autorización y seguridad

1. Validar identidad y permiso de **administrador** antes de confirmar cancelación; no habilitar cancelación autónoma del cliente en E1 (R01/R12).
2. Inspeccionar estado real del pedido y su desglose entregado/pendiente por modelo; rechazar `q > pendiente`, `q ≤ 0`, pedidos sin pendientes, y reintentos de cancelación ya aplicada.
3. Ejecutar **cambio de estado/cantidades + liberación exacta de E/G + evento de auditoría** como una única operación **atómica, consistente e idempotente**. En cancelación concurrente con entrega, solo una operación puede consumir las mismas unidades pendientes.
4. Preservar historial de entrega, modelo/talla/colores conocidos, instantánea de precio confirmado, depósito, pagos registrados y trazabilidad de la autorización; la operación no destruye el pedido.
5. Un pedido parcialmente cancelado conserva su historial y su saldo vigente si todavía quedan prendas pendientes; el **nombre final de estado del pedido** puede definirse al cerrar el modelo de estados. No asumir una devolución/reembolso ejecutado por cancelar prendas.
6. **G01:** el reloj de vencimiento de una reserva no se aplica a un pedido ya confirmado ni a su saldo pendiente; la cancelación de pedido requiere autorización admin, no timeout automático de feria. Una reserva con depósito en EN REVISIÓN sigue reteniendo sus cupos hasta resolución separada; esta decisión no la cancela por sí misma.
7. **G06:** una cancelación puede generar necesidad de conciliación económica. Registrar el evento de cancelación y dejar la conciliación **pendiente de definición**, sin tocar depósitos, montos abonados ni crear una deuda/reembolso automáticamente.

## QA de aceptación documental (no ejecutado contra código)

| Caso | Resultado esperado |
| --- | --- |
| Confirmado 12, entregado 5, pendiente 7; admin autoriza cancelar 7 | Entregadas 5, pendientes 0, canceladas 7; liberar 7 compromisos, `ΔS=0`, `ΔA=+7` |
| Confirmado 12, entregado 5, pendiente 7; intentar cancelar 8 | **Rechazo**, sin cambios de stock, pedido o pagos |
| Confirmado 12, entregado 5, pendiente 7; intentar cancelar 0 o negativo | **Rechazo** |
| Repetir 10 veces la misma cancelación autorizada de 7 | Un solo evento y liberación de **7**, jamás 70 |
| Intentar cancelar 5 ya entregadas | **No permitido** como cancelación de saldo; devoluciones requieren política aparte |
| Confirmado 12 de un modelo, pendiente 7 en surtido G | Liberar **7 del G del mismo modelo**, no de otro modelo ni de E ya asignada |
| Confirmado 12 de un modelo con 4 rojas + 3 negras pendientes | Liberar solo los compromisos E de colores realmente pendientes, sin añadir stock físico |
| Una entrega física y una cancelación intentan consumir simultáneamente las últimas 7 | Una transacción debe prevalecer y la otra revalidar/rechazar; sin sobreentrega ni doble liberación |
| Pedido de 12 con 5 ya entregadas | Las 5 entregadas históricas no se marcan inexistentes, ni se bloquea cancelar 7 por el mínimo comercial de seis |
| Pedido con depósito/pago registrado | Cancelar pendientes **no equivale** a devolver, retener, descontar o compensar dinero automáticamente |
| Pedido confirmado, pero llega el vencimiento G01 de su reserva antigua | No caducar ni liberar compromisos del pedido por la reserva vencida |
| Cancelación autorizada y confirmación previa guardaron precio | Guardar instantánea y evento; no recalcular automáticamente el precio histórico |
| Intento de cancelación por cliente externo o acción no autorizada | Rechazar; E1 solo administrador |

## Cierre parcial y siguiente bloque

**Aprobado:** cancelación de **unidades pendientes no entregadas** bajo autorización administrativa; entregas históricas intactas; liberar compromisos pendientes una sola vez; mantener inventario físico real y auditoría.

**No aprobado todavía:** devolución o recepción de prendas **ya entregadas**, compensación/refund de dinero o depósito, nueva tarifa recalculada para unidades efectivamente conservadas, cancelación automática de pedidos, plazos de reconsideración del cliente, y correcciones de pedidos con descuentos futuros.

**Siguiente bloque G06 — conciliación de pagos externos y depósitos:** definir cómo registrar pago total, pago parcial, saldo a pagar, depósito y conciliación ante cancelación parcial sin inventar tasas, devoluciones ni sanciones. **No crear SQL ni fusionar el PR #1**.

## Aclaración G06 posterior — abonos no se ajustan al cancelar saldo no entregado
Se aprobó que depósito y pagos parciales se acumulen como abonos al pedido y que su historial no se duplique al confirmar. En cancelación de `q` pendientes, la decisión G03-B **solo libera compromisos de inventario**. Los abonos recibidos **siguen registrados en su totalidad** y el precio histórico confirmado tampoco se recalcula por deducción. Se identifica **conciliación económica pendiente** (posible exceso, pago parcial, devolución o ajuste sujeto a aprobación ulterior). No compensar dinero ni cambiar tarifa de las cinco prendas ya entregadas por inferencia. [Contrato financiero G06](22_DEPOSITOS_ABONOS_Y_SALDOS.md).

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
Con cancelación G03-B, conservar declaraciones **PENDIENTES** y abonos **APROBADOS**. Solo aprobados cuentan para saldo del pedido; la liberación de unidades pendientes no cambia automáticamente pagos ni devuelve dinero. Aprobación siempre administrativa, sin portal cliente inferido. [G06](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).

## D13-E1: enlace cliente y cancelación parcial
Si pedido 12 tiene **5 entregadas y 7 pendientes**, la cancelación administrativa de 7 deja el historial íntegro, pero **no equivale automáticamente a marcar TERMINADO/COMPLETADO por recogida**. El enlace del cliente permanece activo mientras el pedido siga activo salvo revocación admin; el criterio de cierre especial de un pedido con resto cancelado o cancelación total aún exige política. Al marcar COMPLETADO tras la recogida, el enlace deja de dar acceso, sin borrar pagos ni volver a liberar G/E. [Ciclo de vida](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md).

## G03-C: cancelar lo no entregado no autoriza liquidación financiera inventada
El criterio posterior del propietario es **TERMINADO/COMPLETADO solo tras pago real aprobado y retiro de unidades debidas**. En cancelación parcial G03-B conservar snapshot y pagos; el importe a conciliar de unidades canceladas **sigue pendiente**. **No ajustar precio/marcar como pagado automáticamente** para cuadrar el cierre, aunque el pendiente físico pase a cero. Requerir conciliación económica separada y aprobación de admin. Si se entrega excepcionalmente con saldo, mantener pedido abierto/deuda. [Contrato](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md).
