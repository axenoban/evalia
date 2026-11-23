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