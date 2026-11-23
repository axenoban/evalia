# EVALIA — Auditoría UX: reserva vs. pedido (propuesta, no cambio canónico)

**Origen:** el propietario aprobó V1 con «Prueba correcta» y señaló que reservas y pedidos parecen cumplir la misma función a primera vista. **Estado:** propuesta para revisar visualmente, no implementada y no aprobada como rediseño. **Rama exclusiva:** feature/evalia-ux-reservas-pedidos. **Baseline funcional protegido:** dev/evalia-core @ a509260d.

## Diagnóstico comprobado en código
1. `web/app/page.jsx` reutiliza `BookingPanel` para cliente, modelos, docenas, colores y cálculo de importes, con radio `Reserva` vs `Pedido directo` en el paso 3. Esta reutilización es correcta: compartir el formulario no implica que el estado comercial sea el mismo.
2. El texto principal dice «Arma la reserva o el pedido», mientras que el resumen común muestra «Importe total», aun cuando el SQL **solo congela el precio cuando se crea el pedido**. Una reserva no conserva precio histórico contractual; al convertir se toma el precio vigente del modelo. Esto se debe explicar o someter a decisión comercial si se quiere congelar precio desde la reserva; **no modificar SQL sin autorización**.
3. En `Reservations` se muestra vencimiento F, depósitos, edición y botón «Confirmar como pedido». En `Orders` aparecen saldo aprobado, historial de cobros, recogidas y enlace privado. La diferencia existe, pero la entrada compartida enmascara el cambio de etapa.
4. Guardar reserva y crear pedido ambos descuentan de disponibilidad global, de ahí otra fuente de percepción similar. La conversión mueve cupo de «reservado» a «pendiente de entrega», sin descontar dos veces.
5. Reserva sin depósito aprobado expira F (próximo miércoles o sábado según matriz exacta). Si el depósito se verifica oportunamente, protege hasta L=F+7 días; al llegar L pasa a revisión sin liberar stock automáticamente. Pedido confirmado no sigue el ciclo F/L: permanece activo hasta recogida y cierre.
6. El depósito de reserva no es confirmación de compra; al convertir se conserva como abono sin duplicarlo. El enlace de cliente para QR y comprobantes está habilitado por pedido confirmado, no por reserva.

## Propuesta visual de bajo riesgo
- Empezar «Nueva operación» con la pregunta legible **«¿El cliente ya confirmó la compra?»** (sin alterar catálogo, cupos ni flujo SQL).
- Mostrar dos opciones de igual nivel, pero con jerarquía y consecuencias claras:
  - **No, apartar prendas → Crear reserva temporal.** Mensaje: «Cupo apartado; pendiente de confirmar compra. Vence según próxima feria; depósito aprobado modifica el plazo.»
  - **Sí, compra confirmada → Registrar pedido.** Mensaje: «Venta confirmada; precio congelado y pendientes de cobro/recogida. Se habilita enlace privado de cliente.»
- En `BookingPanel`, modo reserva: **«Importe de referencia»** y aclaración de que el valor actual puede cambiar al confirmar; en pedido: **«Total del pedido»**. No convertir el importe mostrado en una garantía de precio.
- Titular la sección de seguimiento **«Reservas por confirmar»**, y los pedidos **«Pedidos confirmados»**. Mostrar en cada tarjeta solo los controles propios de su etapa y el paso siguiente destacado.
- Estados de flujo simples, sin nuevos estados SQL: **Reserva → Confirmar compra → Pedido → Pago aprobado → Retirada → Completado**.
- No fusionar bases, eliminar reservas ni convertir automáticamente a pedidos: se perderían vencimientos, capacidad de edición y protección de depósitos.

## Decisión de diseño abierta
El propietario debe confirmar si quiere conservar ambas operaciones con etiquetas y transiciones más explícitas, o si desea una captura única con decisión de estado presentada de otra manera. Esto afecta la arquitectura visual y percepción comercial, **pero no requiere ni autoriza cambiar reglas**. El cambio de precio entre reserva y pedido es una cuestión comercial aparte que también debe aclararse antes de cambiar comportamiento.

## Verificación futura
Prueba en celular y escritorio: una persona nueva debe poder explicar qué ocurre al guardar reserva vs. pedido, cuál caduca, qué se puede editar, por qué el stock queda bloqueado y cuándo se habilitan QR/entregas sin explicación previa del administrador. Confirmar CI Node/Next y ausencia de cambios SQL.
