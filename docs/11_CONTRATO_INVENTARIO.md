# EVALIA — Contrato conceptual de inventario y compromisos

**Estado:** aclaración de dominio expresamente aportada por el propietario + propuesta técnica, NO migraciones ni reglas SQL definitivas. Fecha: 2026-11-22.

## Interpretación fijada de G03-02
El propietario desea **descontar de la disponibilidad al confirmar** para no aceptar ventas por encima del stock limitado. Las prendas pueden permanecer físicamente almacenadas y comprometidas con un pedido; el administrador necesita controlar el total por modelo y talla sin inspeccionar reservas manualmente.

## Magnitudes distintas, por variante modelo+color+talla
- `F`: unidades físicamente en custodia de EVALIA, estén libres o asignadas.
- `R`: unidades bloqueadas por reservas mayoristas **vigentes y no convertidas**.
- `P`: unidades asignadas a pedidos confirmados **aún no retiradas/despachadas** (incluye pedido directo).
- `A`: unidades disponibles para nueva venta o reserva.
- `D_futuro`: demanda de encargos futuros todavía sin existencias asignadas; no restarla de F ni contarla como A.

**Invariante propuesta:** `A = F - R - P`, con `F, R, P, A` enteros ≥ 0 por variante y `R + P ≤ F`. Los totales por modelo o talla son sumas de variantes; la validación se ejecuta sobre la combinación exacta de color y talla.

## Operaciones esperadas (sujetas a políticas aún abiertas)
| Evento | F | R | P | A | Explicación |
| --- | --- | --- | --- | --- | --- |
| Entrada física de n | +n | igual | igual | +n | Ingresan prendas reales |
| Nueva reserva de n desde disponible | igual | +n | igual | −n | Solo si reúne condiciones mayoristas y hay stock |
| Reserva de n convertida a pedido | igual | −n | +n | igual | Transferencia de asignación **sin doble descuento** |
| Pedido directo confirmado por n | igual | igual | +n | −n | Se asigna sin reserva previa |
| Vencimiento de reserva vigente por n | igual | −n | igual | +n | No se vence pedido convertido |
| Retiro/despacho de n asignadas | −n | igual | −n | igual | Mercancía deja custodia; pedido pendiente se reduce |
| Cancelación no entregada (propuesta) | igual | igual | −n | +n | **Pendiente G03-B**: condiciones, autorización y parcialidades |
| Encargo futuro sin stock | igual | igual | igual | igual | Demanda futura, no asignación de stock |

## Ejemplo verificable (solo demostración, no datos reales)
1. F=20, R=0, P=0 ⇒ A=20.
2. Reserva de 6 ⇒ F=20, R=6, P=0 ⇒ A=14.
3. Confirma esas 6 como pedido ⇒ F=20, R=0, P=6 ⇒ A=14.
4. Despacha 2 ⇒ F=18, R=0, P=4 ⇒ A=14.
5. Se crea pedido directo de 3 ⇒ F=18, R=0, P=7 ⇒ A=11.

## Reglas de seguridad
- Persistir/auditar movimientos y asignaciones con IDs por operación; nunca una simple modificación visual del total.
- Conversión, confirmación, liberación y despacho deben ser operaciones **atómicas**, con bloqueo/consistencia y prevención de reintentos duplicados; por concurrencia no admitir A negativo.
- Una reserva convertida deja de figurar en R, pasa a P y nunca cuenta simultáneamente en ambos.
- Diferenciar **cantidad de reservas vigentes** (conteo de reservas distintas) de **unidades reservadas**; una reserva multilínea puede abarcar variantes.
- El cierre o vencimiento de una reserva no debe liberar unidades ya asignadas a un pedido.
- Un despacho parcial reduce la asignación P solo por las unidades realmente salientes; conservar saldo y trazabilidad del pedido.
- Registro de datos agregados por modelo/talla con desglose de color, sin sustituir la verificación por variante.

## Lo que todavía requiere decisión comercial
- **G03-B:** anulación después de confirmación y entrega parcial, devoluciones y quién autoriza revertir asignaciones.
- **G04:** lista de presentaciones comerciales, regla «una talla por presentación» frente a mezcla M/XL en el pedido, precio real de 7 prendas y descuentos/impuestos.
- **G01:** plazo exacto y excepciones de caducidad.
- **G05/G07:** stock inicial, operaciones de ajuste y privilegios del personal.
- Ubicaciones físicas múltiples o traslados entre feria/almacén no están definidos; no inventar almacenes.
- Migraciones definitivas, columnas, mecanismos de sincronización y vistas materializadas no autorizadas todavía.

**No equivale a un sistema implementado ni a aprobación del PR.**

## Extensión de calidad y surtido por confirmar (2026-11-22)
El F anterior representa **físico en custodia según el alcance previo, que suponía prendas aptas**. En producción real con manchas/costuras defectuosas, es imprescindible separar **físico total**, **apto para vender** y **retenido/no apto**. Para calcular disponible de venta en una futura implementación debe utilizarse **F_apto** (nunca incluir prendas defectuosas), mientras los rechazados siguen contabilizados como unidades físicas o mermas según destino real. La política detallada de calidad permanece abierta; no reemplazar silenciosamente el concepto histórico F en datos de una BD aún inexistente.
Un surtido registrado **sin colores** no puede tratarse como R por variante hasta decidir la política de compromiso. Alternativas: (A) solicitud sin bloqueo ni garantía; (B) **cupo agregado por modelo/talla** con contabilidad independiente del compromiso exacto por variante. En (B), `A_pool = suma(F_apto,color − asignado_específico,color) − surtido_sin_color_bloqueado` por modelo+talla, siempre ≥0; operación por color debe comprobar además `F_apto,color − asignado_específico,color ≥ cantidad`. Al asignar los colores del surtido, reducir cupo agregado y aumentar asignación por variante **en la misma transacción**, preservando A_pool; no descontar dos veces. Si la talla tampoco está determinada, **este contrato de cupo por talla no resuelve la situación**, y debe decidirse un modelo más amplio o solicitud sin garantía.
Registro posterior de defectos que reduzca F_apto debe reflejar la realidad incluso si causa sobrecompromiso; generar alerta e incidencia explícita sin ocultar stock negativo lógico ni descartar eventos. No asumir automáticamente cambio de colores ni promesas a clientes. [Análisis de la decisión](16_DECISION_BLOQUEO_SURTIDO.md) y [producción/calidad](15_PRODUCCION_CALIDAD_SURTIDO.md).

## Decisión B confirmada a nivel comercial: garantía de cantidad antes de colores
El propietario optó por el **cupo agregado bloqueado** en una reserva surtida guardada. La alternativa A «solo solicitud sin garantía» ya no representa una reserva guardada; el **borrador** anterior a Guardar sigue libre de bloqueo conforme R06. Es una regla de negocio seleccionada, **sin autorización de migración SQL ni fusión**.
Para un grupo de variantes elegibles (provisionalmente **modelo+talla si esta se conoce**): `S = Σ stock apto en custodia`, `E = Σ compromisos exactos por variante aún no entregados`, `G = surtidos con cupo garantizado sin color`, `A = S − E − G`. Guardar reserva de `n` requiere `A >= n`, sin doble descuento. La reserva exacta por color exige **simultáneamente** disponibilidad de ese color y `A >= n` en el grupo elegible. Para repartir un surtido existente: reducir `G` y aumentar los compromisos exactos `E` por cantidades equivalentes en una única transacción; `A` se conserva. Un despacho físico reduce `S` y `E` del mismo elemento pendiente, también conservando `A`.
**Caso ilustrativo:** S=12, E=3, G=6 → A=3. Repartir 6 en colores: E=9, G=0 → A=3. Despachar 2 de lo asignado: S=10, E=7, G=0 → A=3.
**Aclaración posterior:** el propietario estableció que cada modelo tiene **talla única**. No hay conjuntos de tallas elegibles solapadas **dentro de un modelo**: el grupo para surtido es ese modelo y sus colores aptos; modelos distintos no comparten cupo. En caso de merma posterior, registrar la pérdida y alerta de sobrecompromiso real, no falsear `S` ni prometer sustitución automática.
**No retiro o cancelación:** no diferenciar reglas por media docena/docena; la liberación de `G` o `E` pendiente se implementará solo tras concretar vencimiento G01, estados y condiciones G03-B. No se infieren multas, depósitos ni plazos. [Documento de decisión B](16_DECISION_BLOQUEO_SURTIDO.md).

## Aclaración final del alcance de cupo
**Modelo ⇒ talla única:** el grupo de surtido es el **modelo concreto**, ya determinado con su talla antes de crear la reserva; no requiere una selección adicional de tallas. Sean `S_m` las existencias aptas por colores del modelo m, `E_m` las unidades exactas ya comprometidas y pendientes, y `G_m` las unidades de surtidos sin colores con cupo garantizado. `A_m=S_m−E_m−G_m`; `A_m≥0` antes de crear nuevos compromisos. Para asignación de color c también debe existir apto restante de c, y la operación de transferencia G→E conserva A. **El número solicitado debe conocerse al Guardar reserva**; una solicitud sin cantidad no puede garantizar cupo. Si aparece una merma posterior, conservar el dato real aunque origine incidencia de déficit.
No inventar que un modelo con M y XL admita suma intertallas; son modelos diferentes con sus cupos por separado. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## G01: liberar una reserva vencida por feria sin duplicar stock
Vigencia aprobada **solo para fechas de alta martes/miércoles → sábado a las 12:00** y **viernes/sábado → miércoles siguiente a las 12:00**. Al cumplirse la caducidad de reserva **no convertida y sin depósito aplicable**, trasladar G/E **pendiente** de comprometido a libre, **sin alterar S (stock físico apto)**. Actualizar disponible agregado `A=S−E−G` exactamente una vez; proceso **atómico, idempotente y auditable**. **Depósito registrado posteriormente a la reserva**, recibido antes de vencer, impide liberación por reloj ordinario, pero el plazo definitivo posterior es una decisión pendiente. No liberar compromiso de pedido confirmado ni vencimiento parcial sin G03-B. Para lunes/jueves/domingo no asumir vencimiento. Registro de depósito no equivale a reposición de stock ni a despacho o pago automático. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 calendario completo: liberación en feria por todos los días de alta
Las fechas ordinarias ahora se pueden calcular para **cualquier día semanal**: domingo/lunes → miércoles 12:00, martes/miércoles/jueves → sábado 12:00, viernes/sábado → miércoles 12:00 de la semana siguiente. La elección «próxima feria» solo completó lunes/jueves/domingo; martes y viernes conservan sus excepciones previas. Al vencer sin depósito recibido a tiempo y sin pedido confirmado, liberar **solo el compromiso G/E aún pendiente** una sola vez, aumentando disponible `A=S−E−G`, nunca stock físico S. Conservar idempotencia y auditoría aun en límite exacto 12:00; una reserva convertida no pierde su compromiso de pedido. Las reglas anteriores «lunes/jueves/domingo sin plazo» quedan superadas. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 depósito: protección de cupo por tolerancia de una semana
Los cupos agregados de surtido G y asignaciones exactas E siguen bloqueados cuando una **reserva tiene depósito efectivamente recibido a tiempo**; el reloj ordinario de feria no puede liberarlos. Se seleccionó comercialmente una **tolerancia de hasta siete días adicionales** para pago y recogida, **sin ancla cronológica ni acción final todavía definidas**. No liberar automáticamente G/E en fecha `deposit_at+7d` ni `fair_deadline+7d` por inferencia. Al cerrar G01/G03, la liberación futura de saldos pendientes deberá ser atómica, auditable e idempotente, sin afectar stock físico S ni el compromiso de pedidos confirmados. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — mantener protección de reserva depositada hasta F + 7 días
Depósito recibido oportunamente: proteger del vencimiento ordinario F; **límite de tolerancia L=F+7 días naturales, 12:00 locales**. La fecha es independiente del día de recepción del dinero. Guardar F y L. **Al alcanzar L todavía NO existe autorización de liberar automáticamente los cupos surtidos G o exactos E ni cancelar con dinero**: G03-B/G06 pendientes. Liberación de reserva sin depósito en F sigue atómica/idempotente, nunca aumenta S físico ni libera pedido convertido. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**Invariante G01-L:** la transición EN REVISIÓN por depósito deja **G y E inalterados**, S físico inalterado, A comercial inalterado. Se presenta intento de WhatsApp manual; no se vende ni reasigna ese cupo por pasar L. Solo una decisión futura de cancelación puede permitir liberación, con transacción idempotente. Sin depósito, caducidad de F libera cupo de reserva no convertida.

## Invariante G03-B-PARCIAL — cancelar solo compromisos pendientes
Nueva decisión **aprobada** para pedidos confirmados/parcialmente entregados: mediante autorización administrativa `cancelar(q)`, exclusivamente `0<q≤cantidad_pendiente_no_entregada`. En el modelo, `cantidad_confirmada=cantidad_entregada+cantidad_pendiente+cantidad_cancelada`; cancelar q reduce **compromiso E/G** en q, aumenta disponible **A** en q y **no incrementa existencias físicas S** (ya permanecían en custodia). Ejemplo pedido 12, entregado 5, pendiente 7 → cancelar 7 deja 5 entregadas, 7 canceladas, pendientes 0; `ΔS=0`, `ΔA=+7`. Entregas anteriores ya redujeron S en su momento. Mantener trazabilidad por color/modelo, idempotencia y transacción frente a entregas simultáneas; no devolver stock físico de prendas retiradas. Pagos/depósitos son gestión separada G06; no liberación automática por reloj de reserva G01. [Contrato](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## Aclaración prevalente E1: sin módulo de devoluciones/cancelaciones
El algoritmo G03-B de cancelar q pendiente y liberar E/G se conserva **como diseño FUTURO**, no función de E1. Las caducidades de reserva G01 sí aplican en E1. Terminar/completar pedido por una incidencia atendida externamente NO puede aumentar S, liberar E/G ni simular entrega: sin ajuste auditado no hay modificación de inventario. [Alcance](27_SIMPLIFICACION_CANCELACIONES_V1.md).

## ADR-D0-01 posterior — barrera transaccional para exacto E y surtido G
**Diseño técnico candidato, sin SQL:** usar exclusión por modelo para todas las operaciones que alteran S/E/G, incluso compras exactas de diferentes colores; comprobar en el mismo lock `F_c=S_c−E_c≥q` y `A_m=ΣS_c−ΣE_c−G_m≥q`. Asignar surtido `G→E` conserva A, sin duplicar reserva/pedido. Entrega física reduce **S y E simultáneamente**, no al confirmar. Merma real registra déficit y alerta, no borra promesa. Ver [D0-01](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) y [D0 QA](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md). **Confirmación con G sin color y regularización por merma siguen sin decisión.**

## Invariante D0-A APROBADA — pedidos confirmados pueden conservar cupo G
La titularidad de **G surtido sin colores** puede pasar de una **reserva guardada a pedido confirmado** sin cambiar G total, E, S o A; stock ya se comprometió al Guardar reserva. Pedido directo surtido crea G únicamente si existe A suficiente. La selección real de variantes antes del retiro mueve cantidad de ese G a compromisos E de colores aptos, **con `ΔS=0, ΔA=0`**, y la entrega física posterior reduce S y E para cada color. **No caducar cupo G de un pedido confirmado** por vencimiento F/L de su reserva antigua. Repeticiones/concurrencia: transacciones idempotentes por modelo. **La regla D0-A está aprobada**, aunque documentos antiguos la traten como duda. [Contrato](31_D0_A_CONFIRMACION_SURTIDO_SIN_COLORES.md).

## D0-C1 — decisión posterior de inventario conservador (2026-11-23)
D0-C1 posterior: el admin puede declarar un **cupo surtido agregado y conservador** inferior al físico fabricado (78→72) sin fichas individuales de merma. Las seis no publicadas no entran en disponibilidad, salvo alta real posterior, y solo son aptas para venta física si libres/no comprometidas. Si la disponibilidad efectiva es menor al cupo prometido, registrar incidencia agregada, bloquear sobreventa sin inventar sustituciones. **D0-C2**: viejo `S_m=ΣS_c` no se aplica sin desglose de colores; no inventar stock exacto por tono ni duplicar inventario. [Canon](32_D0_C1_STOCK_CONSERVADOR.md).
