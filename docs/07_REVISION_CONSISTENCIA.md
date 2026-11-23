# Revisión de consistencia de selecciones EVALIA

**Fecha:** 2026-11-22. **Resultado:** no hay contradicciones insalvables; sí detalles no definidos que impiden convertir la selección en reglas definitivas.

| Selecciones | Veredicto | Necesidad de cierre |
|---|---|---|
| D02/D03/D08/D10 | Compatible separar reserva física y encargo futuro | G03: no doble descuento y transición a pedido |
| D03/D04 | Compatible bloqueo y vencimiento | G01: plazo inicial, prórrogas, excepciones |
| D05/D13 | Compatible web y clientes sin cuentas inicialmente | G02: web solo origen administrado o solicitudes públicas |
| D06/D09 | Compatible segmentación y listas | G04: tarifas, formatos, precedencia, mezclas |
| D07/D08 | Compatible variantes y stock exacto | G05: variantes reales, inventario inicial y movimientos |
| D01/D14 | Compatible admin primero, personal después | G07: permisos concretos y autenticación |
| D11/D12 | Compatible registro manual y dos entregas | G06: confirmación de pagos, anticipo y logística |
| D15/D18 | Compatible mensajes manuales y mínima información | G08: datos y consentimiento |
| D16 + entorno | No es contradicción si se separa stack de arquitectura | G09: Next.js + Supabase indicados; despliegue y diseño final pendientes |

## Pendientes por prioridad (NO DECIDIDOS)
**G03 — Ciclo de stock y pedido:** ¿cuándo pasa una reserva a pedido, cuándo se libera, cuándo sale stock físico? ¿Se puede cancelar y revertir? ¿Qué compromiso tiene un encargo futuro?

**G04 — Precios y formatos:** ¿qué es una presentación vendible, cómo se mezclan colores/tallas, qué tabla prevalece por cliente, qué descuentos/impuestos aplican? No importar precios históricos como normativa actual.

**G01 — Reserva:** ¿cuánto dura inicialmente el plazo configurable, quién lo amplía, qué ocurre al confirmar, cancelar o vencer?

**G02 — Web:** ¿en E1 solo registro administrativo de pedidos originados en web o también solicitudes públicas sin cuenta? D13 no autoriza checkout autónomo.

**G05 — Inventario:** ¿cómo registrar stock inicial, entradas, diferencias de inventario y producción tercerizada?

**G06 — Pago y envío:** ¿qué datos de pago externo se anotan, pagos parciales/anticipos, cuándo está preparado/despachado, quién paga el envío?

**G07 — Accesos:** ¿cuántos administradores, qué permisos tiene personal, quién puede ajustar precios/stock o cancelar, método de login?

**G08 — Privacidad:** ¿campos mínimos exactos, consentimiento de contacto, retención y eliminación, acceso a información de envío?

**G09 — Técnica:** tras modelo lógico, ratificar patrón Next.js/Supabase, SSR/servidor, hospedaje, costes, entornos y tareas programadas.

## Recomendación de secuencia
Cerrar G03 y G04 primero, luego G01/G02/G05, después G06–G08; por último G09. No introducir defaults temporales ni publicar un contrato SQL que los presuponga. PR #1 continúa en borrador.
