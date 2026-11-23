# EVALIA — Panel administrativo de disponibilidad por modelo y talla

**Estado: requerimiento visual confirmado por el propietario, especificación funcional candidata; no existe aún implementación.** Fecha: 2026-11-22. Relacionado con D07, D08, G03-01/02/03/04/07 y C-G03-A.

## Problema que resuelve
El administrador no quiere calcular manualmente cuántas prendas tiene libres sumando reservas y revisando pedidos uno por uno. Cada reserva o pedido confirmado debe reflejarse inmediatamente en un total **disponible** que no permita ofrecer más unidades que las existentes.

## Jerarquía de navegación recomendada
- **Inventario y reservas**: vista principal del administrador, accesible desde menú lateral.
- Filtros de **modelo**, **talla** y **color** (colores opcionales hasta filtrar). Filtro adicional estado/reservas puede diseñarse.
- Fila de **modelo+talla** con totales derivados de sus colores; expandir para ver **modelo+talla+color**, que es la unidad real de validación de stock por D07.
- Desde cada fila, acción para consultar reservas/pedidos que ocupan unidades (con acceso autorizado); no obliga al usuario a reconstruir totales leyendo cada operación.
- Responsive: tabla en escritorio; tarjetas expandibles/filtrables en móvil.

## Indicadores mínimos
1. **Existencias físicas (F):** unidades todavía bajo custodia de EVALIA, incluidas las ya asignadas aún no entregadas.
2. **Reservadas (R):** unidades en reservas activas no convertidas en pedido; mostrar además **número de reservas activas** como dato distinto del número de prendas.
3. **En pedidos pendientes de entrega (P):** unidades confirmadas y asignadas, pero aún no retiradas/despachadas; las entregas parciales mantienen asignado solo el saldo pendiente.
4. **Disponibles (A):** unidades libres para nuevas reservas o pedidos = F − R − P por variante.
5. **Encargos futuros:** cantidad de demanda futura **separada**, que no suma existencias físicas ni se resta automáticamente del disponible (D10, G03-06).

Recomendación UX: destacar **Disponibles** y alertar ante cero/unidades insuficientes; no fijar umbrales de «stock bajo» sin decisión. Indicar fecha/hora de actualización y canal del pedido solo cuando ayude a la gestión. Una actualización visual no sustituye la validación transaccional de la BD.

## Boceto de tabla (solo números ficticios)

| Modelo | Talla | Físico | Reservado | Pendiente de entrega | Disponible | Reservas activas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Modelo A | M | 20 | 6 | 4 | 10 | 2 |
| Modelo A | XL | 12 | 0 | 8 | 4 | 0 |
| **Modelo A · total** | — | **32** | **6** | **12** | **14** | **2** |

El subtotal se suma desde las variantes de color. Que el total del modelo sea 14 **no significa que un color agotado pueda venderse**. Si una misma reserva incluye varios colores/tallas, contar su **ID una sola vez** en «reservas activas», aun cuando tenga múltiples líneas.

## Acciones a diseñar sin asumir permisos finales
- Ver disponibilidad y desglose de reservas/pedidos por variante.
- Registrar movimiento físico con motivo (reglas de ajuste y permisos pendientes G05/G07).
- Iniciar reserva mayorista, con validación de **≥6 unidades por modelo** y existencia suficiente en cada variante; las mezclas de presentación pendientes G04 no deben forzarse.
- Registrar pedido directo con validación atómica de disponibilidad.
- Consultar saldos por entregar y eventos de reserva vencida.
- Visualizar y filtrar encargos futuros independientemente.

## Reglas de interfaz vs backend
Al hacer una operación, el frontend puede mostrar disponibilidad instantánea y refrescarse; pero el servidor/SQL debe validar que la asignación no sobrepase A. No realizar bloqueo de stock con varias lecturas/escrituras de JavaScript client-side. En dos sesiones simultáneas solo una puede tomar la última unidad de la misma variante.

## No aprobado aún
Diseño visual exacto, alertas de umbral, reglas de ajustes, permisos de personal, estados definitivos de pedidos, reglas de G04, comportamiento de cancelaciones tras entrega parcial ni sincronización sin Internet. El sistema no está publicado.

## Panel y catálogo reutilizable tras selección R01–R12
Mostrar modelo/talla con expansión por color, **solo colores asignados a cada modelo**, diferenciando oferta del color frente a inventario físico y disponible. Para alta: pantalla previa **Colores** (maestro global) → **Modelos** (colores vinculados) → **Variantes e inventario** (stock inicial manual por color+talla). Desde el dashboard se puede abrir el catálogo visual/carrito para reserva admin, que bloquea solo tras **Guardar reserva**. Si cliente pide «surtido», la asignación exacta por color/talla sigue en decisión CR-01; nunca indicar stock suficiente por subtotal de modelo si uno de los colores está agotado.

## Panel especializado por modelo para producción y surtidos (aclaración posterior)
Además de físico/apto, reservado y pendientes, presentar **producción prevista, unidades revisadas aptas, unidades con defecto, cantidad por color/talla, solicitudes de surtido sin color y, si se ratifica, cupos agregados comprometidos** como indicadores independientes. Una incidencia de merma reduce solo el stock comercialmente apto y deja motivo/historial. Mostrar la composición real y los faltantes, sin prometer 11 colores + negro adicional por docena después de QC. La elección de colores de surtido es **posterior al registro inicial**; el bloqueo agregado es **opción pendiente**, no un indicador activo aprobado. [Especificación](15_PRODUCCION_CALIDAD_SURTIDO.md).

## Nueva elección: columnas de surtidos con cupo bloqueado
Mostrar separadamente (1) solicitudes/borradores sin compromiso, (2) **cupo de unidades surtidas garantizadas sin color** (activo tras Guardar reserva), (3) reserva exacta por color/talla, (4) pedidos pendientes de entrega, (5) disponibilidad apta restante por grupo/modelo y por variante. **No sumar los cupos surtidos a las reservas exactas dos veces tras asignar colores.** Un total por modelo/talla debe indicar explícitamente los cupos agregados que lo reducen; si la talla no se conoce, el alcance del grupo permanece por decidir. La operación de cancelar/no recoger no distingue cantidades media/docena, pero condiciones de liberación y vencimiento siguen sin definirse.

## Regla nueva: talla determinada por modelo
El dashboard muestra **modelo → talla fija (atributo informativo) → desglose de colores**. La talla no es un selector de variaciones dentro del modelo. Permite filtrar **modelos por talla**, sin mezclar inventarios de modelos distintos. Cupo surtido garantizado **por modelo** (que ya determina la talla), sin color inicial. La disponibilidad agregada del modelo se descuenta al guardar cantidad surtida, luego se transfiere al desglose por colores sin doble compromiso. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Panel: vencimiento por feria y depósito de reserva
Cada reserva guardada debería mostrar **fecha/hora de vencimiento calculada**, días restantes, situación de **depósito externo registrado** y si está protegida frente a expiración ordinaria (sin inventar fecha posterior). La pantalla administrativa permite registrar depósito **después de crear reserva**, con trazabilidad y sin mover inventario físico. En una reserva vencida sin depósito aplicable, la liberación aumenta disponibilidad comercial de G/E una vez, no aumenta stock físico. Un pedido convertido no debe figurar como reserva vencible. **Lunes/jueves/domingo carecen de fecha aprobada**, mostrar pendiente de regla en vez de fecha ficticia. Decidir alerta de clientes/avisos y evidencia de depósito antes de diseñar UI definitiva. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Panel con vencimiento para los siete días
Cada reserva **guardada y no convertida** puede mostrar su vencimiento sin dejar casos sin fecha: domingo/lunes → miércoles inmediato 12:00; martes/miércoles/jueves → sábado 12:00; viernes/sábado → miércoles siguiente 12:00. **La regla de «próxima feria» no debe reescribir martes/miércoles ni viernes/sábado**; sus reglas previas son específicas. Mostrar la fecha en la ficha y si un depósito registrado después del alta protege del vencimiento ordinario, sin fingir nueva fecha definida con depósito. El stock apto comprometido solo se libera por vencimiento de reserva no depositada vigente, no por pedido confirmado. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## UI pendiente — depósito con semana de tolerancia
Mostrar reserva con depósito recibido como **protegida del vencimiento ordinario de feria** y con nota **«hasta una semana adicional para completar pago y retiro»**. **No mostrar una fecha definitiva de liberación** mientras no se resuelva si la cuenta inicia al depositar o al vencer la feria. El panel deberá permitir rastrear registro de depósito posterior al alta, evento de pago/recogida cuando se definan y cualquier liberación auditada. No confundir protección de reserva con pedido confirmado ni mover stock físico al registrar dinero. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## UI G01 — mostrar L de depósito aprobado
Ficha de reserva: F (vencimiento ordinario de feria) y L (si depósito recibido a tiempo, **F+7 días naturales a las 12:00**). No calcular `deposit_at+7d`. Ejemplo F 28/11/2026 12:00 → L 05/12/2026 12:00. En L la UI puede indicar **plazo de tolerancia concluido**, pero **no debe liberar cupo ni cancelar dinero automáticamente** sin regla comercial. La fecha L ya puede presentarse; anotaciones anteriores «fecha sin definir» quedan superadas. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**UI propuesta:** bandeja «Reservas en revisión» con cliente, WhatsApp, código, F y L, estado del depósito, stock comprometido y acceso al contacto manual. Acción/bitácora de intento **registrada solo cuando realmente se haga**; generar plantilla no equivale a envío. Mantener cupo reservado durante revisión; sin botón de cancelación/liberación automática aprobado.

## Panel G03-B — saldo de pedido y cancelación autorizada
Mostrar por modelo/color: **confirmadas**, **entregadas históricas**, **pendientes comprometidas** y **canceladas sin entregar**; cuadrar `confirmado=entregado+pendiente+cancelado`. Una acción administrativa **Cancelar pendientes** debe mostrar el máximo elegible `≤ pendiente`, solicitar confirmación autorizada y registrar evidencia/auditoría. Después de cancelar 7 pendientes de pedido con 5 ya entregadas, el panel muestra **5 entregadas, 0 pendientes, 7 canceladas**, disponible +7 y físico sin aumento. **No incluir opción de devolver prendas ya entregadas** ni ajustar depósitos/reembolsos automáticamente; G06 pendiente. [Contrato](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## Panel financiero G06 propuesto — pagos, abonos y saldo
En la ficha de reserva/pedido, mostrar **total confirmado histórico**, depósito recibido y asociado, registros de pagos parciales, **total abonado acumulado** y **saldo por pagar** (o incidencia por exceso). Permitir alta manual de sucesivos abonos con historial y responsable; no presentar transferencia avisada como ingreso recibido por defecto. Ej.: Bs 840, depósito Bs 200 y otro pago Bs 300 → **Bs 340 por cobrar**. En cancelación G03-B, mostrar **conciliación económica pendiente**, sin opción automática de reembolso/retención no aprobada. La validación y evidencia exactas aún deben definirse antes de UI final. [G06](22_DEPOSITOS_ABONOS_Y_SALDOS.md).

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
**UI admin candidata:** bandeja «Pagos pendientes» con cliente, reserva/pedido, importe informado, soporte si se autoriza, estado y acción exclusiva de **Aprobar** tras comprobación real. Hasta aprobar: saldo y protección sin cambios; tras aprobar: imputar solo una vez y auditar. No exponer cuentas de clientes ni formularios públicos por deducción; validar D13/G02. [G06](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).

## Vista admin y cliente para comprobantes en E1 (nuevo alcance)
**Bandeja admin:** solicitudes de pago con código pedido, cliente, monto informado, vista segura del comprobante, estado, acción de **aprobar** tras constatar dinero, **rechazar u observar** sin abonar, y auditoría; solo aprobados afectan saldo. **Vista cliente por enlace privado de ese pedido**: resumen, saldo, QR imagen y descargar, captura de comprobante con monto y estado de sus pagos. No mostrar stock, notas internas, pedidos ajenos ni acciones de aprobación. El enlace secreto debe poder revocarse. Sin pasarela ni tarjeta; las decisiones de diseño/tamaño QR, política de archivo y vigencia del enlace todavía están abiertas. [D13](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md) · [G06](25_QR_Y_COMPROBANTES_CLIENTE.md).

## Admin: estado COMPLETADO y control manual de enlace cliente
Propuesta de ficha de pedido: indicar **enlace cliente ACTIVO/REVOCADO/DESACTIVADO POR COMPLETADO**, con acciones administrativas de **Revocar** y **Emitir reemplazo** para pedido activo; registrar historial de cambio de token sin exponer secretos. Al confirmar recogida completa, el administrador **marca TERMINADO/COMPLETADO** y se desactiva acceso del enlace, sin destruir comprobantes ni movimientos. Un pedido parcial permanece activo; pagar saldo no lo marca completado automáticamente. Si hay deuda en el momento de cierre, mostrar alerta/política pendiente (sin decidir si bloquear cierre). [D13](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md).

## Admin — botón COMPLETADO con validaciones de recogida y saldo
**Propuesta UI/contrato:** indicar por separado **unidades aún pendientes de entrega**, **total abonado aprobado** y **saldo por pagar**; la acción **TERMINADO/COMPLETADO** solo la ejecuta un admin después de recoger todo y **saldo 0 con dinero real registrado y verificado**. Si pago pendiente en revisión o deuda, mostrar razón de bloqueo; no crear ingreso ficticio mediante botón. Un pago al retirar se agrega desde el panel y se aprueba tras comprobar recepción, antes de cerrar. Si ocurrió entrega excepcional con deuda, mostrar **ACTIVO / SALDO PENDIENTE**, no cerrar ni revocar enlace por completado. Historial intacto. [Contrato](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md).

## Aclaración prevalente E1: sin módulo de devoluciones/cancelaciones
V1 muestra acciones necesarias para reservar, confirmar, cobrar, entregar y completar normalmente; **sin botones de cancelación de pedido por cliente, devolución, reembolso ni cancelación parcial G03-B**. Casos excepcionales se acuerdan fuera del sistema. Un cierre excepcional con saldo/stock pendiente NO ajusta ni elimina movimientos automáticamente; necesita contrato posterior si se implementa. [Alcance](27_SIMPLIFICACION_CANCELACIONES_V1.md).

## D0-C1 — decisión posterior de inventario conservador (2026-11-23)
E1 D0-C1: permitir **entrada rápida de cantidad apta comprometible por modelo surtido**, sin cargar cada color ni cada mancha. Mostrar total registrado, G/E comprometido y disponible agregado; no sumar el margen de seis fuera del sistema. El ejemplo 78→72 es elección del admin, nunca descuento automático. Para exactos por color aún no existe S_c verificable: D0-C2 pendiente. [Canon](32_D0_C1_STOCK_CONSERVADOR.md).
