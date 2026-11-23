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

## Evaluación adicional de G03/G04 (22-11-2026)
**Respuestas recopiladas: 16/16.** Se definió reserva **solo mayorista** con mínimo 6 **por modelo**, no por suma de modelos; se permiten combinaciones de modelos y colores, y en la observación se admite agregar M/XL y precios distintos por modelo. Pendientes G04-01 presentaciones y precio de un pedido de 7 unidades. El ejemplo de Bs 380 por docena **no autoriza prorratear**.

**Dos tensiones que exigen confirmación explícita:**
1. **G03-01/G03-02/G03-07 (ACLARADO 2026-11-22):** el propietario explica que confirmar descuenta **disponibilidad**, manteniendo físicamente las prendas hasta su retiro/despacho. Separar saldo F físico, R reservas vigentes y P pedido pendiente; disponible A=F−R−P. **C-G03-A resuelto conceptualmente. C-G03-B sigue abierto** para cancelación de pedidos parcialmente entregados y reversión.
2. **G04-04 + observación:** presentación homogénea por talla, pero mínimo mayorista cumplido sumando 3 M + 3 XL por modelo; decidir si las tallas se agrupan entre distintas líneas/presentaciones o si se pretende mezclarlas dentro de una presentación (C-G04-A/B).

**Preguntas que bloquean SQL comercial:** C-G03-B, C-G04-A, C-G04-B, C-G04-C. **C-G03-A ya aclarado** mediante explicación directa del propietario. En segundo nivel: vigencia/prórrogas G01, tarifas/condiciones G04, permisos G07, política de privacidad G08. [Documento G03/G04](09_G03_G04_SELECCIONES.md). No declarar G03/G04 cerrados por el mero envío del cuestionario.

## Revisión R01–R12 y nuevo caso «surtido» (2026-11-22)
**Las 12 elecciones son compatibles** con D01–D18 y los compromisos G03 ya aclarados. R04 corrige la recomendación documental anterior: **registro manual por variante, no importador** en la fase inicial. R12 confirma que no habrá solicitudes públicas en E1. R09 conserva **sin definir** el vencimiento inicial. R10 confirma la acción explícita solo admin.

**Nuevo riesgo CR-01 — surtido:** comprador pide surtido para menos de una docena, EVALIA elige colores; si la reserva bloquea stock por variante, debe determinarse **qué colores/tallas** se asignaron. Recomendación sin aprobación: el administrador compone el surtido desde stock disponible **antes de Guardar reserva**; alternativa: solicitud sin bloqueo hasta la asignación. No reservar un saldo abstracto a nivel modelo.

**CR-02/03:** G04-04 «una talla por presentación» sigue pudiendo convivir con varios renglones M/XL por modelo, pero el propietario no lo resolvió; G04-01 presentaciones aún abiertas. Para cantidades inferiores a docena se describe elección de color o surtido; **política para >=12 unidades no especificada**, ni se concede derecho a surtido automático.

**CR-04:** el grupo WhatsApp publica precios, pero ello no define una integración de precios ni la fórmula de 7 unidades; modelo/color/talla diferentes pueden tener tarifa diferente. **CR-05:** duración inicial de reserva aún abierta. **CR-06:** colores del modelo pueden cambiar, preservar referencias históricas. **CR-07:** contacto/privacidad y posibles duplicados. Consultar [registro](13_CUESTIONARIO_CAPTURA.md) y [colores](14_CATALOGO_COLORES_Y_VARIANTES.md).

## Diagnóstico nuevo: demanda de surtido y pérdidas de fabricación
**La asignación de colores después fue elegida expresamente.** La recomendación previa de asignar colores antes de guardar era razonable para reservas exactas, pero **no refleja la operación EVALIA** y queda superada para registrar la solicitud. El riesgo es no distinguir una **solicitud de surtido sin garantía** de una **reserva agregada con cupo bloqueado**: son compromisos comerciales diferentes.
**R04 sigue siendo carga manual por variante**; la nueva propuesta de lote/calidad no obliga a automatizar/importar inventario. **11 colores + negro repetido**, producción orientativa **6–6,5 docenas/modelo** y mermas por manchas/costuras no autorizan inventario exacto simulado ni proporción fija por color/talla.
**CR-01 actualizado:** momento de selección de colores decidido = **posterior**; significado del bloqueo y del compromiso de surtido sin colores = **pendiente**. Si existe cupo agregado, hay que impedir sobreventa tanto por modelo/talla como por variante, y contemplar defectos descubiertos después. Si solo existe solicitud sin bloqueo, mostrar al cliente que stock/cantidades **no están garantizados** hasta asignar.
**CR-08 nuevo:** destino de defectuosos (reparación, descarte, segundo nivel de venta) y cuándo se certifica stock apto todavía no fueron elegidos. Evitar que el catálogo de once colores determine el inventario.
Véanse [producción y calidad](15_PRODUCCION_CALIDAD_SURTIDO.md) y [modalidades de reserva](16_DECISION_BLOQUEO_SURTIDO.md).

## Cierre parcial de CR-01: cupo garantizado elegido
**Resuelto por el propietario:** no es solicitud sin garantía; cada **reserva surtida guardada bloquea cupo de cantidad** aunque sus colores se seleccionen después. La alternativa A queda descartada **para reservas surtidas guardadas**. Requisitos compatibles con R06 porque borrador previo sigue sin bloquear, y con G03 porque la conversión a pedido no vuelve a descontar. Media docena/docena no deben disparar políticas diferentes de no retiro/cancelación.
**Pendiente esencial:** si la talla no se especifica, determinar conjunto de tallas elegibles y reglas de asignación antes de construir SQL. También siguen abiertos vencimiento automático, tratamiento específico de pedidos parcialmente entregados/confirmados, recuperación/merma, composición y precios G04. El contrato por variante requiere ampliación global por grupo, no simple resta por color. [Detalles](16_DECISION_BLOQUEO_SURTIDO.md).
