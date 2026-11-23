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
**Importante:** si diferentes reservas tienen conjuntos de tallas elegibles solapados, la simple suma por modelo+talla no demuestra disponibilidad global ni garantía de una combinación específica: elegir primero política de talla/mezcla. En caso de merma posterior, registrar la pérdida y alerta de sobrecompromiso real, no falsear `S` ni prometer sustitución automática.
**No retiro o cancelación:** no diferenciar reglas por media docena/docena; la liberación de `G` o `E` pendiente se implementará solo tras concretar vencimiento G01, estados y condiciones G03-B. No se infieren multas, depósitos ni plazos. [Documento de decisión B](16_DECISION_BLOQUEO_SURTIDO.md).
