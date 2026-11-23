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
