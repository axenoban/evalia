---
name: evalia-reservas-pedidos
description: Implementar y probar carrito mayorista, creación y confirmación de reservas, pedidos, abonos, vencimientos, entregas y cierre administrativo.
---
# Flujos canónicos de reservas y pedidos

Leer AGENTS.md, docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md, docs/22_DEPOSITOS_ABONOS_Y_SALDOS.md, docs/23_VALIDACION_ADMINISTRATIVA_PAGOS.md, docs/26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md, docs/27_SIMPLIFICACION_CANCELACIONES_V1.md, docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md y docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md.

## Contrato que la interfaz debe respetar
- Reservas **solo mayoristas, al menos 6 unidades enteras POR modelo**; modelos diferentes no se agregan para alcanzar el mínimo. Talla fija, surtido sin prometer colores.
- Por modelo: precio_docena × cantidad / 12 usando decimal/racional exacto; redondear al entero más cercano, excepto fracción exactamente .50, que **se conserva**. Sumar subtotales redondeados por modelo; sin nuevo redondeo global ni descuentos en V1. Snapshot al confirmar.
- Disponibilidad A=S−R−P. Guardar reserva compromete R una vez; conversión a pedido transfiere R→P en una transacción; pedido directo compromete P. Entrega real disminuye S y P juntos, no cambia A.
- Vencimiento en America/La_Paz a las 12:00: domingo/lunes→miércoles inmediato; martes/miércoles/jueves→sábado inmediato; viernes/sábado→miércoles siguiente. Depósito aprobado oportunamente extiende hasta F+7 días; al llegar L pasa a revisión sin liberar cupo.
- Declarar depósito no es aprobarlo. Solo admin aprueba fondos recibidos. COMPLETADO exige pago total aprobado y entrega total registrada. Sin cancelaciones ni devoluciones en V1.
- Guardado y confirmación idempotentes. Mostrar resumen, saldo, estado, vencimiento y pasos siguientes. Ante error de stock indicar modelo y conservar entradas.

QA mínimo: 5/6 unidades, varios modelos, .50, n>12, overbooking, doble click, expiración, depósito tardío, depósito oportuno, entrega parcial y cierre.
