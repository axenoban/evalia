# EVALIA — G06: depósitos como abonos y múltiples pagos parciales (v0.1)

**Fecha de decisión:** 2026-11-22. **Estado:** selección de negocio aprobada en la rama feature para documentación/QA, todavía sin aplicación, sin SQL, sin integración bancaria y sin merge de PR #1. **Fuente comercial:** respuesta expresa «si, esta bien, continuemos» a la pregunta: «¿Confirmas que los depósitos deben descontarse del total a pagar y que podremos registrar varios pagos parciales hasta completar el pedido?», acompañada de la propuesta de registro manual, suma de abonos y conciliación económica separada en cancelaciones.

## Alcance comercial aprobado para E1

1. Un **depósito** efectuado para una reserva es un **abono económico** del cliente que debe **descontarse del total del pedido** al confirmarse y vincularse la reserva a ese pedido. No es descuento comercial de precio, una comisión, una venta separada ni dinero que se deba registrar por duplicado.
2. Pueden registrarse **múltiples pagos parciales sucesivos**. El total abonado es la **suma de los pagos efectivamente recibidos** y asociados a la operación. El cliente puede liquidar el saldo en varios abonos.
3. El **saldo pendiente** de un pedido confirmado se calcula con el **importe histórico confirmado** (snapshot G04-08) **menos la suma de abonos recibidos y contabilizados una sola vez**. `diferencia = total_confirmado - total_abonado`. Si diferencia es positiva, es el **saldo por pagar**; si es cero, no queda saldo; si es negativa, existe **exceso pendiente de conciliación**, no devolución automática.
4. Se conserva el **historial de cada pago**. Registrar un segundo pago **no sustituye** ni sobreescribe el primero, y el depósito ligado a una reserva **no se duplica** al confirmar y transferirla a pedido. Evitar que una misma operación se asigne simultáneamente a más de un pedido.
5. **E1: registro manual de operaciones externas** (D11) realizado por administrador, sin pasarela bancaria, API de WhatsApp ni prueba de transferencia automática. **Afirmar que un cliente notificó un pago no equivale a haber recibido el dinero**. La forma de comprobar/validar la recepción y los campos obligatorios exactos todavía requieren ratificación.
6. Una **cancelación administrativa de unidades no entregadas G03-B** no genera devolución, retención, penalización o recálculo de tarifa automáticamente. El registro de pagos queda íntegro y cualquier **conciliación económica** derivada de lo cancelado debe resolverse por separado, bajo política comercial pendiente. No fijar `precio_nuevo = cantidad_entregada × precio_unitario` por deducción; los precios en pedidos confirmados se preservan.
7. **Depósito que protege la reserva en G01:** el evento recibido oportunamente puede influir en su vencimiento `L=F+7 días naturales, 12:00`; la **asociación contable al pedido** al confirmar no vuelve a registrar el cobro ni cambia F/L. Una reserva en **EN REVISIÓN** mantiene su depósito e inventario hasta resolución de negocio; no aplicar su depósito a un pedido distinto sin decisión.
8. Esta aprobación **NO define**: importe mínimo de depósito, número máximo de pagos, método bancario obligatorio, comprobante requerido, estado de verificación, manejo de correcciones/reversas, pagos excesivos, créditos a favor, devoluciones, impuestos, quién paga envíos o reglas de liberación tras no respuesta. Son requisitos diferenciados para próximos bloques.

## Ejemplo principal aprobado — Bs 840

| Evento externo registrado | Abono del evento | Total recibido acumulado | Saldo por pagar |
| --- | ---: | ---: | ---: |
| Se confirma pedido con precio histórico Bs 840 | — | Bs 0 | **Bs 840** |
| Depósito recibido al reservar, después asociado sin nuevo ingreso | Bs 200 | Bs 200 | **Bs 640** |
| Pago adicional | Bs 300 | Bs 500 | **Bs 340** |
| Pago final | Bs 340 | Bs 840 | **Bs 0** |

**Diferencia contable:** `840−(200+300)=340`; `840−(200+300+340)=0`. Un depósito de Bs 200 ligado inicialmente a reserva es **un mismo cobro** cuando el pedido se confirma; no sumar Bs 200 dos veces ni reiniciar saldo.

## Casos monetarios de precisión

- Pedido multímodelo confirmado por **Bs 610,50** (A=420, B=190,50). Depósito **Bs 200**, otro pago **Bs 110,50** ⇒ abonado **Bs 310,50**, pendiente **Bs 300**. **Conservar centavos recibidos**, no aplicar otra vez la regla de redondeo por modelo a cada pago ni al saldo.
- Pedido **Bs 840**, pagos **Bs 200 + Bs 300 + Bs 400 = Bs 900**: diferencia `−60`. **Registrar exceso Bs 60 como incidencia por conciliar**. No convertirlo silenciosamente en descuento, pérdida de depósito, reembolso o crédito automático. Si los pagos pueden sobrepasar el total o deben rechazarse antes de registrar es una decisión de validación pendiente.
- Pedido **Bs 840**, pagos reportados por cliente por **Bs 200** pero **no constatados**: no afirmar cobro confirmado, ni dar por recibido dinero. La forma exacta de validación manual queda pendiente; **no dar protección a reserva solo por un mensaje del cliente sin corroborar recepción**.
- Un evento de pago ingresado por error o duplicado **no debe borrarse silenciosamente**: la política de corrección y reversa contable aún no se aprobó. Requiere trazabilidad cuando se implemente.

## Modelo conceptual futuro — sin SQL ni diseño físico aún

**Sugerencia técnica, no campos obligatorios aprobados:**
- Evento de abono con identificador estable, referencia a cliente y reserva/pedido, **importe Bs**, fecha/hora de recepción registrada y de alta administrativa, responsable y estado verificable de recepción, soporte de comprobante opcional sujeto a decisión.
- Libro de movimientos inmutable/auditable con **asociación única del evento de abono** al documento comercial; traslado de vínculo `reserva → pedido confirmado` sin crear un segundo pago. Una operación bancaria no debe reflejarse dos veces por repetición del registro, importación o confirmación.
- Totales derivados de eventos recibidos, no de un campo `monto_abonado` manipulable que pierda historial. Operar con decimal exacto, conservar los 50 centavos admitidos en los importes de pedido; la tarifa se redondea por **modelo antes de confirmar**, no por pago.
- Distinguir **importe pendiente por pagar**, **excedente por conciliar** y **ajuste económico por cancelación**: no combinar automáticamente conceptos incompatibles.

## QA documental — G06-PAGOS

| Caso | Resultado esperado |
| --- | --- |
| Pedido confirmado Bs 840 sin pagos | Abonado 0; pendiente 840 |
| Depósito de Bs 200 recibido al reservar, luego se confirma pedido Bs 840 | Abonado **200**, pendiente **640**, **sin duplicar** el depósito |
| Mismo pedido, registrar otro abono Bs 300 | Abonado **500**, pendiente **340** |
| Registrar pago final Bs 340 | Abonado **840**, pendiente **0**, historial tres cobros |
| Repetir la asociación de reserva a pedido diez veces | Total abonado sigue **840** (o 200 antes de restantes), no se generan cobros adicionales |
| Pedido Bs 610,50; pagos 200 y 110,50 | Abonado **310,50**; saldo **300** |
| Pedido Bs 840; ingresos que suman 900 | Excedente **60** sujeto a revisión, no reembolso/retención automática |
| Cancelar 7 no entregadas de pedido con 5 entregadas y depósito 200 | Stock: solo 7 compromisos liberados; **el abono 200 sigue registrado**, ajuste monetario no automático |
| Reserva recibida con depósito oportuno aún no convertida a pedido y llega a F | Protege stock hasta L de acuerdo con G01; no confirmar pedido ni duplicar pago |
| Mismo evento de abono vuelve a procesarse o se intenta asociar a dos pedidos | No duplicar suma/cobro; evento/auditoría único; requerir resolución administrativa si conflicto |
| Usuario informa por WhatsApp «ya transferí» sin recepción constatada | No contabilizar como cobro confirmado ni habilitar protección sin una constatación válida |
| Modificar precio sugerido del modelo tras confirmación | No modificar total confirmado, pagos históricos ni saldo del pedido ya confirmado |
| E1 sin descuentos por cantidad ni ficha especial | Depósito y abono **no son descuentos**; sus efectos monetarios no alteran el precio base |
| El cliente cancela o reclama devolución | No generar devolución, nota de crédito, penalización o nueva tarifa sin política posterior |

**Importante:** estos son **casos de aceptación documental**, no tests ejecutados contra software ni migraciones implementadas.

## Pendientes y próxima decisión

**G06-PAGOS seleccionado**: depósito se imputa al precio del pedido como abono, admite varios pagos parciales posteriores, cálculo derivado del saldo, historial y no duplicación; dinero de cancelaciones en conciliación administrativa.

**Siguiente definición prioritaria G06-VALIDACIÓN:** determinar cuándo una operación se considera **efectivamente recibida**: ¿se permite que el administrador registre pago **informado** pero todavía no verificado, o todo pago ingresado equivale a **recepción comprobada por el administrador**? Esta elección afecta tanto el saldo de caja como la protección de las reservas por depósito G01. No implementar una convención sin elección.

**Otros pendientes**: devolución/cancelación con depósito, pagos a destiempo, créditos/excesos, métodos/soportes, gastos de envío, devoluciones físicas G03-B, y esquemas SQL. **PR #1 continúa en borrador sin merge**.

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
**DECISIÓN POSTERIOR G06-VALIDACIÓN:** «esta bien, el administrdor debe aprobar el pago si el cliente agrega un pago». El pago **informado/agregado por cliente** inicia **PENDIENTE DE VERIFICACIÓN**, sin contar en abonado o saldo ni proteger G01; solo **administrador** comprueba recepción y **APRUEBA** como **APROBADO/RECIBIDO**, y recién entonces imputa una vez. Se preservan pagos múltiples, historia, snapshot y devolución/cancelación por conciliar. No aprobar portal de cuentas cliente E1 por deducción (D13/G02 pendiente). Ver [contrato específico](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).
