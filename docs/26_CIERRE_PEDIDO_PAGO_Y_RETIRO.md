# EVALIA — G03-C / G06-C: cierre de pedido solo con recogida y saldo pagado (v0.1)

**Fecha:** 2026-11-22. **Estado:** regla comercial expresa aprobada por el propietario; documentación y QA de diseño en rama feature. PR #1 permanece en borrador, sin SQL, aplicación, pruebas ejecutables ni merge.

## Decisión expresa del propietario

> no pasa eso, el cliente no recoge si no termina de pagar, al menos se debe registrar como pagados si el pedido se confirma como completado, casos de que se recoge sin pagar con muy escepcionales que no considero necesario implmentarlo, o si se implmenta se utilizaria muy pocas veces, en caso de implementarse, no se cerraria, se mantendria como saldo pendiente , pero normalmente deberia registrarse directamente  que el pago se completo con normalidad

**Interpretación canónica:** la **venta con recogida habitual exige liquidar el importe antes de entregar**. Un pedido solo alcanza **TERMINADO/COMPLETADO** cuando se ha **registrado la recogida de todas las unidades que corresponde entregar** y **su obligación monetaria está saldada mediante pagos efectivamente recibidos y aprobados**. Si, excepcionalmente, se entregan prendas sin liquidar, la deuda sigue visible y el pedido permanece **ABIERTO/PENDIENTE**, sin cerrar ni borrar historial.

**Precisión de seguridad contable:** «registrar directamente que el pago se completó con normalidad» significa que el **administrador registra/aprueba un cobro que realmente recibió al retiro** (por ejemplo en efectivo o transferencia constatada). **NO significa generar un pago ficticio, autoadjudicar saldo a cero, ni aprobar una captura del cliente automáticamente** por marcar COMPLETADO. Toda imputación conserva identidad del evento, importe, actor y fecha.

## Contrato de cierre de pedido

### Precondiciones aprobadas

**C1 — cumplimiento físico:** todas las unidades **que corresponde entregar según el estado vigente del pedido** fueron efectivamente retiradas/entregadas, y no quedan compromisos de entrega pendientes. La gestión de devoluciones físicas de prendas ya entregadas sigue fuera de alcance.

**C2 — cumplimiento económico:** el **saldo exigible y conciliado del pedido es Bs 0** con pagos **APROBADOS/RECIBIDOS**; no se consideran pagos PENDIENTES, EN OBSERVACIÓN, RECHAZADOS ni comprobantes sin comprobar. La aprobación administrativa verifica dinero recibido; un importe digitado o una captura no son evidencia de cobro suficiente por sí solos.

**C3 — autoridad:** el **administrador** es el único que autoriza **marcar TERMINADO/COMPLETADO**. El cliente por enlace privado **no** puede marcar entrega, aprobar dinero ni cerrar pedido.

**C4 — atomicidad y auditoría:** al concluir C1+C2+C3, registrar estado COMPLETADO, momento/responsable y desactivar acceso del enlace por pedido **en una operación consistente**. No duplicar entrega, cobro ni evento de cierre por reintentos. Conservar historial completo de pagos y entregas. La revocación anticipada de la URL sigue permitida y es independiente del cierre comercial.

### Flujo habitual E1 (sin crear función excepcional compleja)

1. Administrador consulta saldo y lo que falta entregar; **no entrega normalmente si hay saldo por cobrar**.
2. Cliente paga el saldo mediante medio externo ya admitido (comprobante o pago constatado por el administrador). El administrador **verifica y registra/aprueba** el cobro real; **no** hace que el dinero aparezca automáticamente por cambiar estado. Si el cliente informó por enlace y adjuntó captura, sigue PENDIENTE hasta esa aprobación.
3. El sistema muestra **abonado verificado** y **saldo Bs 0**. El administrador registra físicamente la entrega/retiro de las unidades restantes y conserva el desglose histórico.
4. El administrador marca **TERMINADO/COMPLETADO**, previa validación de C1+C2, y el enlace de cliente deja de funcionar. No cerrar solo porque «pago=100 %» si las prendas siguen en almacén.

### Excepción rara de entrega con deuda — sin módulo dedicado E1

- Si ocurre una **entrega real con saldo pendiente**, la entrega puede quedar registrada como hecho físico **sin mentir sobre el pago** y el pedido queda **ACTIVO, CON SALDO PENDIENTE**. **No debe poder marcarse COMPLETADO** ni invalidarse el enlace por estado completado.
- El cobro posterior, cuando se recibe y aprueba, reduce el saldo conforme G06; el administrador podrá completar el cierre **solo cuando C1 y C2 se satisfagan**.
- La política de **autorización excepcional previa a entregar sin cobrar**, cobro de deuda, moras y responsable de autorizar excepciones **no se define** y no justifica implementar un flujo especial ahora. No autorizar indiscriminadamente una entrega sin saldo cero en el flujo habitual. En caso real se gestiona como incidencia/revisión administrativa con historial.
- **Pago registrado como recibido pero no verificado**, abonos rechazados y fotografías subidas por cliente no cuentan para cierre.
- **Precio tras cancelación parcial G03-B:** el importe histórico original del pedido se conserva, pero la **conciliación económica de unidades canceladas** sigue pendiente de definición; **no declarar Bs 0 artificialmente ni cerrar automáticamente** mediante un recálculo inventado, ni retener/reembolsar un depósito por deducción. Si una cancelación provoca discrepancia, registrar incidencia hasta conciliación.
- **Pago excedente:** no convertir un excedente en saldo cero sin registrar la incidencia de G06; su resolución sigue pendiente. No generar devoluciones automáticas.

## Regla de estado y enlace privado D13-E1

| Condición física | Condición financiera | Estado del pedido | Acceso del enlace |
| --- | --- | --- | --- |
| Pendiente de entregar | Saldo > Bs 0 | ACTIVO / PENDIENTE | Activo salvo revocación |
| Pendiente de entregar | Saldo = Bs 0 aprobado | ACTIVO / PENDIENTE DE RETIRO | Activo salvo revocación |
| Entrega parcial | Pagado totalmente | ACTIVO / ENTREGA PARCIAL | Activo salvo revocación |
| Entrega total excepcional | Saldo > Bs 0 | ACTIVO / SALDO PENDIENTE | Activo salvo revocación |
| Entrega total | Saldo = Bs 0, aprobado; administrador confirma cierre | **TERMINADO/COMPLETADO** | **Desactivado** |
| Entrega total | Aviso de pago por cliente PENDIENTE, saldo todavía >0 | ACTIVO / REVISIÓN DE PAGO | Activo salvo revocación |

**Los nombres complementarios anteriores son descriptores funcionales**, no enumeraciones SQL aprobadas. La única transición de cierre es el estado **TERMINADO/COMPLETADO** con C1+C2+C3.

## QA documental de aceptación

| Caso | Resultado esperado |
| --- | --- |
| Pedido Bs 840, aprobados Bs 200+300, saldo Bs 340, falta entregar 12 | No entregar normalmente ni marcar COMPLETADO; enlace activo |
| Cliente informa pago Bs 340 con captura PENDIENTE, entrega todavía no realizada | Saldo **340**; no cerrar ni dar por recibido el aviso |
| Admin verifica y aprueba Bs 340, total recibido Bs 840, aún quedan prendas por retirar | Saldo 0, **no** COMPLETADO hasta recogida |
| Admin confirma recogida total de 12 con saldo 0 | **COMPLETADO** autorizado, enlace desactivado |
| Admin intenta marcar COMPLETADO con saldo 340 y entrega total excepcional | **Rechazar cierre**, mostrar pendiente 340 y conservar historial; enlace activo |
| Se entregan 5 de 12, saldo 0 | **No COMPLETADO**: quedan 7 por entregar; enlace activo |
| Se entregan 12, cliente solo informa pago pero no se verifica | **No COMPLETADO**: informe pendiente no cuenta como recibido |
| Cliente intenta completar mediante enlace privado | Denegado en backend; rol solo administrador |
| Admin recibe efectivo real por saldo al retiro y lo registra como abono aprobado | Se imputa cobro real una sola vez; sin exigir una captura del cliente por un pago registrado directamente por admin |
| Admin pulsa COMPLETADO sin registrar ningún pago del total Bs 840 | **Rechazo** y sin generación de cobro ficticio |
| Se registra dos veces el mismo pago o cierre, o hay simultaneidad con carga pendiente | Idempotencia: un abono y un cierre, validación server-side de estado y token |
| Cierre exitoso seguido por solicitud de captura desde enlace anterior | Acceso denegado; comprobantes y pagos históricos conservados |
| Cancelación G03-B deja discrepancia económica sin reconciliar | No ajustar histórico ni completar por cálculo inventado; conciliación pendiente |
| Pago mayor al importe histórico y sin conciliación | Señalar incidencia; no dar por automáticamente liquidado/reeembolsado |

**Pruebas de diseño**, no código ejecutado. Se mantienen separadas la suma de pagos aprobados y la evidencia física de entrega.

## Estado y siguientes decisiones

**RESUELTO G03-C/G06-C:** cierre normal exige **pago completo recibido/aprobado y recogida completada**, ambos registrados; solo administrador marca TERMINADO/COMPLETADO; cerrar no inventa un pago. Una entrega excepcional con deuda **permanece abierta con saldo pendiente**; no se desarrolla un flujo especial por defecto. El enlace deja de funcionar al completarse o revocarse manualmente.

**Pendientes:** autorización excepcional de entrega sin pago, conciliación monetaria G03-B después de cancelar unidades pendientes, devoluciones/reembolsos, verificación de métodos de cobro, pagos excedentes, y cierres por cancelación total sin recogida. No se introducen condiciones adicionales de política comercial arbitrarias, SQL ni merge.

## Aclaración prevalente E1: sin módulo de devoluciones/cancelaciones
**Decisión de alcance posterior:** el propietario no considera necesarias en E1 las devoluciones, cancelaciones por cliente ni gestión de reembolsos; estos casos se resolverán fuera y el administrador pretende cerrarlos. Esto **no cambia las condiciones C1+C2+C3 del cierre habitual** ni permite crear pago/entrega ficticia. El **cierre administrativo excepcional con diferencias de saldo/unidades** no tiene todavía contrato de regularización; NO diseñar bypass a C1/C2 sin aprobación, ni bloquear V1 con ese módulo. La solución G03-B detallada se difiere a fase futura. [Alcance](27_SIMPLIFICACION_CANCELACIONES_V1.md).
