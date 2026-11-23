# EVALIA — E1: simplificación de cancelaciones y devoluciones (decisión prevalente)

**Fecha:** 2026-11-22. **Tipo:** decisión de alcance E1. Solo documentación en rama feature; PR #1 permanece borrador; sin SQL, código ni merge.

## Fuente literal

> no considero que vaya a registrarse devoluciones o cancelados por el cliente, se marcara como terminado o completado y por fuera se arreglara , no considero necesario implementar estas especificacionesal menos para una primera version

## Dentro y fuera de E1

**APROBADO:** NO implementar módulos de **cancelación de pedido solicitada por el cliente**, devolución de prendas, reembolso, nota de crédito, recálculo financiero por devolución ni seguimiento automatizado de incidencias excepcionales en V1. El propietario gestionará manualmente estos casos fuera del software y usará el cierre administrativo cuando corresponda. Tampoco se habilitarán acciones de cancelación/devolución en el enlace privado del cliente.

**Conservar en V1:** registro y confirmación administrativa de pedido, stock físico y compromisos, reservas y sus vencimientos G01, entregas, depósitos y abonos aprobados, enlace privado por pedido, QR/captura y cierre normal.

**G03-B-PARCIAL diferido:** la regla conceptual anteriormente aprobada de «cancelar solo unidades pendientes no entregadas con autorización administrativa, preservando las entregadas» y sus QA documentales se conservan **como material de una fase posterior**. Ya **no es requisito de implementación ni prueba obligatoria para liberar E1**. Igualmente se difiere el cálculo de dinero a devolver o compensar tras cancelación.

## Operativa de cierre y protección de datos

**Caso ordinario:** el cliente paga íntegramente, el administrador comprueba y aprueba el dinero realmente recibido, registra la recogida física y marca TERMINADO/COMPLETADO. Su enlace privado queda desactivado como ya se aprobó.

**Incidencia excepcional:** el propietario indica que resolverá cancelaciones o devoluciones **fuera de EVALIA**, y pretende **marcar terminado/completado** el pedido cuando dé el caso por resuelto. No exigiremos para E1 una pantalla especializada que capture cantidades devueltas, pagos reembolsados, penalizaciones o motivos comerciales.

**Advertencia de integridad:** resolver algo fuera del sistema **no autoriza** inventar pagos, marcar prendas no retiradas como entregadas, incrementar stock físico ni liberar compromisos G/E sin una operación válida. Una etiqueta COMPLETADO por sí sola no concilia el saldo financiero ni actualiza las existencias. La política para un **cierre administrativo excepcional** con saldo no conciliado o stock comprometido sigue siendo técnicamente ambigua frente al contrato anterior G03-C/G06-C. **No implementar un bypass de los controles de cierre ordinario** a partir de esta frase. Si se necesita de verdad esa excepción en la V1, habrá que definir cómo registrar su regularización de forma auditable; por ahora no es un requisito de lanzamiento.

**Entrega excepcional con deuda real:** mantener deuda visible y pedido abierto según G03-C; no dar por pagado ni ocultar la obligación mediante el cierre administrativo. Esto no requiere un módulo especial de crédito en E1.

## QA de alcance — no ejecutable todavía

1. Enlace privado de cliente solo permite ver pedido/QR/saldo y declarar pago, **no cancelar pedido ni registrar devolución**.
2. No hay botones, endpoints o modelos financieros de reembolsos automáticos ni solicitudes de cancelación de clientes en E1.
3. El cierre normal sigue exigiendo pago aprobado completo, entrega realmente registrada y acción del administrador.
4. Cerrar no registra ingresos falsos ni salidas físicas que no ocurrieron.
5. Incidencias atendidas fuera no alteran por sí solas saldo, dinero aprobado, inventario físico, reserva ni compromisos.
6. G03-B «12 confirmadas, 5 entregadas, 7 canceladas» permanece como caso QA **de fase futura**, no bloqueante de E1.
7. La caducidad automática de **reservas sin depósito** G01 sí sigue vigente: la simplificación solo aplica a **cancelaciones/devoluciones de pedidos**.
8. Pagos pendientes de verificación no se aprueban por marcar TERMINADO; QR y comprobantes siguen bajo control admin.
9. Cualquier futura implementación de cierre administrativo excepcional debe preservar historial e impedir descuadre silencioso de inventario/saldo.

## Dependencias y seguimiento

**Cerrado en alcance:** se excluyen cancelaciones/devoluciones del cliente, conciliaciones de esas incidencias y G03-B implementable en E1. **Abierto, no bloqueante:** la mecánica excepcional de cierre sin registro especializado, que requerirá ratificación si se solicita programarla. Mantener documentación histórica sin borrar la decisión conceptual G03-B para futuras versiones.

**Siguiente paso lógico:** verificar qué funcionalidades del núcleo de stock/reservas/pedidos siguen siendo necesarias en E1 y preparar un checklist de readiness documental antes de autorizar SQL o desarrollo. No realizar merges.

## Referencia de alcance consolidado
[28](28_BASELINE_V1_MODULOS_Y_READINESS.md) refleja que cancelaciones/devoluciones y G03-B quedan **fuera de V1**, con contratos históricos preservados para futuro. Los tests de cancelación no son gate de E1. Las reglas G01 de caducidad y G03-C de cierre verdadero siguen vigentes; no falsificar pagos/entregas en incidencias externas.
