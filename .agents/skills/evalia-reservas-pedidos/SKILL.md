---
name: evalia-reservas-pedidos
description: Implementar y probar carrito mayorista, creación y confirmación de reservas, pedidos, abonos, vencimientos, entregas y cierre administrativo.
---
# Flujos canónicos de reservas y pedidos

Leer docs/39_CAPTURA_DOCENAS_COLORES_INDIVIDUALES.md (decisión más reciente), AGENTS.md, docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md, docs/22_DEPOSITOS_ABONOS_Y_SALDOS.md, docs/23_VALIDACION_ADMINISTRATIVA_PAGOS.md, docs/26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md, docs/27_SIMPLIFICACION_CANCELACIONES_V1.md, docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md y docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md.

## Contrato que la interfaz debe respetar
- Captura D2-B: `dozens` enteras surtidas más `extraColorIds` de 0–11 **distintos** por modelo; si no hay docenas, exigir **6–11 colores únicos**. Un modelo no puede escoger dos prendas adicionales del mismo color, y varios modelos no comparten mínimo. Talla fija. Mostrar muestras cromáticas interactivas.
- Registrar colores elegidos solo como selección individual solicitada; **no hay stock por color**, no afirmar disponibilidad por color. Cada línea guarda cantidad global `12×docenas + extras`. La conversión de reserva conserva exactamente el desglose sin doble bloqueo.
- Por modelo: precio_docena × cantidad / 12 usando decimal/racional exacto; redondear al entero más cercano, excepto fracción exactamente .50, que **se conserva**. Sumar subtotales redondeados por modelo; sin nuevo redondeo global ni descuentos en V1. Snapshot al confirmar.
- Disponibilidad A=S−R−P. Guardar reserva compromete R una vez; conversión a pedido transfiere R→P en una transacción; pedido directo compromete P. Entrega real disminuye S y P juntos, no cambia A.
- Vencimiento en America/La_Paz a las 12:00: domingo/lunes→miércoles inmediato; martes/miércoles/jueves→sábado inmediato; viernes/sábado→miércoles siguiente. Depósito aprobado oportunamente extiende hasta F+7 días; al llegar L pasa a revisión sin liberar cupo.
- Declarar depósito no es aprobarlo. Solo admin aprueba fondos recibidos. COMPLETADO exige pago total aprobado y entrega total registrada. Sin cancelaciones ni devoluciones en V1.
- Guardado y confirmación idempotentes. Mostrar resumen, saldo, estado, vencimiento y pasos siguientes. Ante error de stock indicar modelo y conservar entradas.

QA mínimo: 0 docenas con 5/6/11/12 colores, 1 docena con 0/1/11/12 extras, color repetido, color de otro modelo, edición auditada y revalidación de reserva, 5/6 unidades, varios modelos, .50, n>12, overbooking, doble click, expiración, depósito tardío, depósito oportuno, entrega parcial y cierre.
