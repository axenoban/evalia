# EVALIA — D0-A: confirmación de pedido surtido con colores aún pendientes (APROBADO)

**Fecha:** 2026-11-22. **Rama:** `feature/fundamentos-reservas-pedidos`. **Tipo:** aprobación comercial vinculante para V1, registrada como contrato documental. PR #1 permanece DRAFT, sin SQL, código de aplicación ni merge.

## Decisión expresa

**Recomendación presentada al propietario:** «permitir confirmar el pedido conservando su cupo surtido garantizado, y exigir asignar los colores reales antes de entregar las prendas. Esto se adapta al funcionamiento de EVALIA sin reservar stock por segunda vez».

**Respuesta literal del propietario:** «esta bien esa recomendacion, continuemos».

**D0-A — APROBADO:** un pedido de **surtido** puede **confirmarse sin tener todavía asignados sus colores**, **siempre que sus unidades estén garantizadas** por existencias reales aptas no comprometidas del **mismo modelo y talla fija**. La selección posterior de color es parte de la preparación/entrega, **no requisito previo de confirmación**. Ningún color particular ni composición por tonos está garantizado hasta que se asigne efectivamente.

## Invariantes que rigen V1

1. **Una talla por modelo.** La cantidad surtida `n` se asigna al modelo completo; no sumar stock de otra talla/modelo. Sigue el mínimo de **n ≥ 6 por modelo al crear pedido/reserva mayorista**; los distintos colores no tienen mínimo separado.
2. **Stock físico apto** `S_m=Σ_c S_{m,c}`, **exacto** `E_m=Σ_c E_{m,c}`, **surtido aún sin color** `G_m`, **disponible** `A_m=S_m−E_m−G_m`. Los compromisos E y G pertenecen tanto a reservas guardadas como a pedidos confirmados **aún sin entrega**, sin duplicarlos.
3. **Guardar reserva surtida G** requiere `A_m ≥ n` y se contabiliza solo `G_m+=n`. Borrador no afecta cupos ni S.
4. **Confirmar desde reserva guardada G:** transferir **titularidad** de ese mismo cupo del registro de reserva al pedido en **una transacción**; `ΔS=ΔE=ΔG=ΔA=0`. No sumar un segundo G al confirmar. El depósito vinculado se conserva como el **mismo pago**, no se duplica.
5. **Confirmar pedido directo surtido:** si no existía reserva, comprobar cupo y crear `G+=n` **solo una vez**; `ΔS=0` y `ΔA=−n`. Si el cupo no alcanza, rechazar confirmación completa (incluidos otros modelos del mismo pedido) sin mutaciones parciales.
6. **Asignación de colores posterior:** antes de entregar cualquier prenda deben identificarse y validar sus colores reales y aptos del **mismo modelo**. Transferir el número efectivamente asignado `q` desde el G de **ese pedido** a E de las variantes elegidas, en una operación atómica; `ΔG=−q`, `ΣΔE=+q`, `ΔS=0`, `ΔA=0`; exigir `0<q≤G_pedido` y `S_c−E_c≥q_c`. Nunca contar dos veces una asignación ya realizada ni elegir colores de stock defectuoso.
7. **Entrega física:** cada unidad que salga debe estar asignada a una variante/color. Para entregas `d_c`, simultáneamente `ΔS_c=−d_c` y `ΔE_c=−d_c`. No entregar directamente desde G «anónimo» ni descontar S al confirmar. El saldo pendiente físico de pedido se actualiza con el evento de entrega auditado.
8. **Pago y cierre:** la cantidad/valor confirmado se determina por modelo antes de elegir colores, usando precio mayorista aprobado. La asignación posterior **no recalcula el precio**, no crea un abono ni valida un comprobante. Pedido puede estar CONFIRMADO y con colores pendientes, pero **no COMPLETADO** hasta retiro efectivo de todas las unidades debidas y saldo cero de pagos reales **APROBADOS/RECIBIDOS** por administrador.
9. **Vencimiento G01:** una reserva ya convertida en pedido **no** se libera por alcanzar F/L. El reloj de feria solo aplica a la reserva no convertida. La conversión y el cron concurren bajo la misma verificación de estado.
10. **Operaciones transaccionales:** bloquear disponibilidad **a nivel de modelo**, no solo por color, y comprobar al guardar, confirmar pedido directo, asignar G→E y entregar. La transición reserva→pedido y G→E son idempotentes, conservan rastro y están protegidas frente a acciones simultáneas.
11. **No inventar garantía por color:** la garantía inicial es de cantidad apta agregada; no asumir reparto de once colores, negro doble ni paquetes físicamente idénticos.
12. **Merma posterior:** si se descubre una prenda defectuosa tras haber comprometido G, registrar la pérdida real de aptitud y alertar si surge déficit. **No inventar reposición, sustitución, cambio de precio o cancelación automática.** La política comercial ante merma y sobrecompromiso es el siguiente bloque D0-C, todavía pendiente.

**Nota sobre asignación parcial:** está autorizado que los colores puedan definirse después de confirmar y **antes de cada salida física**. La forma operativa exacta de asignación por lotes/parcialidades, quién decide la combinación final y la UI de color pendiente siguen sujetas al diseño, sin alterar el principio `G→E` y sin imponer una composición comercial.

## Ejemplo 1 — reserva convertida sin colores

Para un modelo de talla única: antes de reservar hay `S=18, E=3, G=0, A=15`. Se guardan **12 surtidas**:

| Evento | S | E | G | A |
| --- | ---: | ---: | ---: | ---: |
| Antes de reservar | 18 | 3 | 0 | 15 |
| Guardar reserva surtida 12 | 18 | 3 | 12 | 3 |
| Confirmar pedido aún sin colores | **18** | **3** | **12** | **3** |
| Asignar colores para sus 12 unidades, suponiendo variantes elegibles disponibles | **18** | **15** | **0** | **3** |
| Entregar 5 unidades previamente asignadas | **13** | **10** | **0** | **3** |

La fila de asignación de colores presupone que existen **12 unidades aptas concretas** elegibles según `S_c−E_c`; si no existen, la operación de asignación **se rechaza sin modificar saldos**. El ejemplo solo muestra magnitudes agregadas, no inventa una distribución por colores.

## Ejemplo 2 — pedido directo

Modelo `S=10,E=2,G=0,A=8`. Confirmar pedido surtido **6** sin reserva anterior: `S=10,E=2,G=6,A=2`. Repetir idéntica confirmación con misma clave de idempotencia no crea otro pedido/cupo. Intentar confirmar otro surtido **6** sobre ese modelo en paralelo debe fallar porque **A=2**.

## QA D0-A — aceptación documental, no ejecutada

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| A01 | Reserva surtida 12 sobre S=18 E=3 G=0 → confirma sin colores | S18 E3 G12 A3 antes y después de confirmar; pedido CONFIRMADO |
| A02 | Confirmación directa surtida 6 con A8 | G+6, A−6, S intacto; pedido confirmado sin colores |
| A03 | Intentar directo 6 con A5 | Rechazo total, sin pedido parcialmente confirmado ni cupo ficticio |
| A04 | Confirmar una reserva guardada 10 veces/reintentos concurrentes | Transferencia de titularidad única; nunca G duplicado |
| A05 | Asignación de colores G12→E12 con variantes aptas suficientes | G−12, E+12, S y A intactos; mismo modelo |
| A06 | Pretender asignar 5 de un color con solo 4 libres | Rechazo atómico de asignación; no consumir G ni E parcial |
| A07 | Intentar salida física mientras pedido conserva G sin color de las prendas a retirar | Rechazo: cada prenda entregada requiere variante exacta registrada |
| A08 | Pedido confirmado sin colores y llega vencimiento F/L de su reserva anterior | No expira pedido ni libera G por cron |
| A09 | Pago aprobado total y pedido aún con prendas G sin entregar | Continúa ACTIVO, enlace privado vigente salvo revocación |
| A10 | Confirmación de pedido con surtido de modelo distinto o varias tallas mezcladas | No fusionar stock entre modelos; cada modelo tiene talla fija |
| A11 | Confirmación multímodelo y un modelo sin disponibilidad | Rechazar todas las líneas del pedido, no reserva parcial |
| A12 | Merma después de confirmar que deja A<0 | Registrar merma e incidencia sin liberar cupos ni prometer reposición; D0-C sigue abierto |
| A13 | Reporte de pago/comprobante a pedido aún con G pendiente | Sigue pendiente hasta admin; aprobar pago no cambia G/E |
| A14 | Entregar 5 de 12 surtidas después de asignar sus colores reales | Reducir S/E 5, conservar 7 pendientes, A invariable; no COMPLETADO |

## Pendientes posteriores — no confundir con D0-A

**D0-A CERRADO:** es válido confirmar con cupo surtido G sin colores asignados y elegir los colores reales antes de la entrega.

**D0-C ABIERTO:** mermas/manchas o defectos detectados después de reservar/confirmar y tratamiento de déficit o cambio de colores; registrar stock físico real y proteger historial es obligación técnica, pero reponer, ofrecer otro surtido o modificar entrega requiere política comercial.

**D0-B ABIERTO:** encargos futuros sin stock apto y momento de disponibilidad.

**D0-D ABIERTO:** pagos realmente acreditados antes de F pero aprobados después de caducidad; no resucitar reserva automáticamente.

**G03-B/devoluciones FUERA V1:** no añadir cancelación parcial ni reembolso por esta aprobación.

**Regla de precedencia:** esta aprobación posterior sustituye toda frase histórica de [16](16_DECISION_BLOQUEO_SURTIDO.md), [29](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) o [30](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md) que mantuviera abierta la pregunta **confirmación de pedido con G sin colores**. El resto del documento continúa vigente en su contexto.

**Estado:** solo documentación en la rama feature, PR #1 DRAFT, no SQL ni aplicación.

## D0-C1 — decisión posterior de inventario conservador (2026-11-23)
D0-C1 posterior: G de surtido confirmado puede respaldarse con **stock agregado conservador registrado por modelo**, sin desglose inicial de colores. Ejemplo 78 producidas, 72 aptas declaradas, seis fuera de cupo. No cambia D0-A (colores antes de entregar), y no permite prometer tonalidades exactas sin D0-C2. [Canon](32_D0_C1_STOCK_CONSERVADOR.md).
