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

**CR-02/03:** **Resuelto por aclaración posterior:** cada modelo tiene una talla fija y **no** combina M/XL; G04-04 queda compatible con esa restricción. **G04-01 presentaciones sigue pendiente**, sin fórmula de precios para siete unidades. Para cantidades inferiores a docena se describe elección de color o surtido; **política para >=12 unidades no especificada**, ni se concede derecho a surtido automático.

**CR-04:** el grupo WhatsApp publica precios, pero ello no define una integración de precios ni la fórmula de 7 unidades; modelo/color/talla diferentes pueden tener tarifa diferente. **CR-05:** duración inicial de reserva aún abierta. **CR-06:** colores del modelo pueden cambiar, preservar referencias históricas. **CR-07:** contacto/privacidad y posibles duplicados. Consultar [registro](13_CUESTIONARIO_CAPTURA.md) y [colores](14_CATALOGO_COLORES_Y_VARIANTES.md).

## Diagnóstico nuevo: demanda de surtido y pérdidas de fabricación
**La asignación de colores después fue elegida expresamente.** La recomendación previa de asignar colores antes de guardar era razonable para reservas exactas, pero **no refleja la operación EVALIA** y queda superada para registrar la solicitud. El riesgo es no distinguir una **solicitud de surtido sin garantía** de una **reserva agregada con cupo bloqueado**: son compromisos comerciales diferentes.
**R04 sigue siendo carga manual por variante**; la nueva propuesta de lote/calidad no obliga a automatizar/importar inventario. **11 colores + negro repetido**, producción orientativa **6–6,5 docenas/modelo** y mermas por manchas/costuras no autorizan inventario exacto simulado ni proporción fija por color/talla.
**CR-01 actualizado:** momento de selección de colores decidido = **posterior**; significado del bloqueo y del compromiso de surtido sin colores = **pendiente**. Si existe cupo agregado, hay que impedir sobreventa tanto por modelo/talla como por variante, y contemplar defectos descubiertos después. Si solo existe solicitud sin bloqueo, mostrar al cliente que stock/cantidades **no están garantizados** hasta asignar.
**CR-08 nuevo:** destino de defectuosos (reparación, descarte, segundo nivel de venta) y cuándo se certifica stock apto todavía no fueron elegidos. Evitar que el catálogo de once colores determine el inventario.
Véanse [producción y calidad](15_PRODUCCION_CALIDAD_SURTIDO.md) y [modalidades de reserva](16_DECISION_BLOQUEO_SURTIDO.md).

## Cierre parcial de CR-01: cupo garantizado elegido
**Resuelto por el propietario:** no es solicitud sin garantía; cada **reserva surtida guardada bloquea cupo de cantidad** aunque sus colores se seleccionen después. La alternativa A queda descartada **para reservas surtidas guardadas**. Requisitos compatibles con R06 porque borrador previo sigue sin bloquear, y con G03 porque la conversión a pedido no vuelve a descontar. Media docena/docena no deben disparar políticas diferentes de no retiro/cancelación.
**Tallas resueltas posteriormente:** la talla la define el modelo y no se mezcla; el cupo se calcula por modelo único, sin agrupaciones de tallas diferentes. También siguen abiertos vencimiento automático, tratamiento específico de pedidos parcialmente entregados/confirmados, recuperación/merma, composición y precios G04. El contrato por variante requiere ampliación global por grupo, no simple resta por color. [Detalles](16_DECISION_BLOQUEO_SURTIDO.md).

## C-G04-A / CR-02 — Resuelto mediante regla de talla única (2026-11-22)
La interpretación de que **un mismo modelo** puede sumar 3 M + 3 XL queda **expresamente descartada**. Cada modelo comercial está asociado con una **sola talla**, que puede variar entre modelos; los colores y precios también cambian entre modelos. Consecuencia: **G04-04 es compatible** con la regla del producto. Al registrar surtido se conoce modelo/talla; se debe registrar cantidad para garantizar cupo; colores se asignan después. No hay necesidad de cupo intertallas. **Pendientes:** G04-01 (presentaciones) y tarifas/precisiones del ejemplo de 7, G01, G03-B, calidad, cambios históricos de talla. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Nueva revisión — mayorista, precios por modelo, cliente especial y plantillas
**Compatibilidad:** D06 (minorista adicional) y regla posterior de **reservas solo mayoristas** son coherentes: la venta directa minorista puede seguir, pero no crear reservas minoristas. D09/G04-06/07 y **precio propio por modelo**, sugerencia por talla y beneficio por cliente conviven si la sugerencia **solo autocompleta**, no decide la tarifa de otros modelos. G04-08 fija importes **al confirmar**, aunque el administrador puede ver una cotización durante la captura. G04-09 preserva permisos/motivo para excepción.
**Bloqueante P-01/P-02:** tarifa y descuento a media docena o siete prendas, y descuento entre modelos, sin resolución; nunca suponer Bs 380/12×7 ni −10/12×7. **P-03:** no acumular precio especial fijo + descuento sin regla. **P-04:** G04-01 continúa abierto para presentaciones. **P-05:** sugerencia por talla configurable pero no se han fijado importes universales. **P-06:** impuestos/redondeos sin definir.
**Alta rápida:** fotografía y seis o más modelos por feria, paleta desde anterior y plantillas por talla no contradicen catálogo maestro ni talla única. Copiar **selección**, no existencias/foto/precios confirmados; no forzar colores según edad del cliente ni clasificar automáticamente a personas.
Referencias: [precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [alta](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## Corrección comercial por aclaración directa — P-01/P-02 (2026-11-22)
**RESUELTO:** el precio para 6–11 unidades de un modelo es **proporcional a su precio de docena**: `P×n/12`, de manera automática. Esto **supera todas las advertencias históricas de no prorratear P/12** y la incertidumbre por siete unidades, pero **no** cierra el redondeo de fracciones monetarias. Ejemplo Bs 420/docena: 6=210, 7=245, 11=385. Ejemplo Bs 380/docena: 7=221,666… **matemáticos, cobro pendiente**.
**Descuentos:** NO implementar motor de descuentos en E1, por cliente especial o negociación; **prohibir descuentos inferiores a docena** incluso en fase posterior. La antigua solicitud de −Bs 10/docena queda en backlog futuro y no debe activarse por deducción. P-03 acumulación deja de bloquear E1 porque descuentos están fuera de alcance.
**Abiertos:** G04-01 presentaciones nominales, cantidad >12 (especialmente restos tras docenas), RND-01 política monetaria, G04-08 instantánea, G01/G03-B stock/cancelación, precios minoristas de pedido directo. [Fuente actualizada](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## RND-01 resuelta — redondeo entero al total de modelo
**Aclaración posterior prevalente:** P-01 proporción `P×n/12` y **redondeo al boliviano entero más cercano de CADA modelo**. P=380, n=7 → Bs 222. Sumar colores/líneas del mismo modelo primero; luego redondear y sumar modelos diferentes. Corregir notas previas «sin redondeo aprobado» como historia superada. **RND-02 permanece abierto únicamente para empate exacto .50** (P=381, n=6 → Bs 190,50, dos enteros igualmente próximos). **MAY-12** importe de 13+ sigue abierto; G04-01 presentaciones, descuentos futuros, G01/G03-B también. QA: dos modelos P=380 con ocho unidades cada uno se cobran Bs 506, no Bs 507. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## RND-02 cerrada y distinción entre pedido multímodelo y MAY-12
El usuario **aprobó mantener cualquier subtotal matemático que termine exactamente en Bs 0,50**, sin elevarlo ni bajarlo. El resto de subtotales de modelo se redondea al boliviano entero más cercano. **RND-02 resuelta**: P=381, n=6 → Bs 190,50; no elegir half-up ni half-even. Se suma el total **ya calculado** de modelos diferentes, sin redondear la suma. P_A=420 con n_A=12 y P_B=381 con n_B=6 → **Bs 610,50**; cada modelo cumple su mínimo de 6. **G04 permite distintos tamaños de compra por modelo dentro de un pedido**. La frase «cantidades mayores» del propietario describe 18 prendas totales en dos modelos: NO determina tarifa para **13+ unidades en un mismo modelo**, por lo que MAY-12 sigue abierto. No descuentos E1; G04-01 nominal y G01/G03-B permanecen abiertos. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Cierre MAY-12 — fórmula única para todo modelo con 6 o más prendas (2026-11-22)
**Resuelto expresamente por el propietario** al responder «si, se aplica la misma formula»: no hay escala nueva para n=13,19,24 u otra cantidad ≥6 del mismo modelo. El precio mayorista se obtiene de `P_docena×n/12`, agregando colores/líneas del mismo modelo, y redondeando **una sola vez al entero más próximo salvo x,50 exacto conservado**. Los modelos diferentes se calculan separadamente y sus importes se suman sin redondeo global. E1 sigue sin descuentos y la tarifa propia de cada modelo persiste. **MAY-12 ya no es un bloqueo**, contrariamente a anotaciones históricas anteriores. G04-01 queda abierto solo para aspectos de formato/presentación que no cambian esta fórmula; G01/G03-B/QC y venta minorista directa todavía pendientes. [Precio](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Auditoría G01/R09 — vigencia de feria parcialmente resuelta
**Regla expresa posterior:** de reserva **martes/miércoles** a **sábado 12:00**; de reserva **viernes/sábado** a **miércoles siguiente 12:00**; **depósito puede registrarse después** y evita liberación ordinaria si fue efectivamente recibido a tiempo. Compatible con R06 (borrador sin bloqueo), D04 (vencimiento automático), G03-04 (solo reserva no convertida vence), CR-01 B (cupo surtido garantizado), D11 (registro manual pago externo), R10 (confirmación solo admin), QA de idempotencia. **G01 ya tiene duración para 4 días concretos y hora fija**, pero NO está cerrado: **lunes/jueves/domingo**, destino de reserva con depósito y casos tardíos sin política. No inventar nuevos días de feria, protección infinita ni multas por no retiro. Los pedidos parcialmente entregados siguen con G03-B abierto. **Riesgo operativo:** depósito y job al mediodía deben evitar carrera que libere stock ya protegido; automatismo debe dejar evidencia de cada decisión. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Auditoría final del calendario G01 — siete días definidos (2026-11-22)
**Ya no está pendiente lunes/jueves/domingo.** El propietario eligió «próxima feria» para esos tres días: **domingo y lunes → miércoles siguiente 12:00; jueves → sábado siguiente 12:00**. **Reglas anteriores conservadas**: martes/miércoles → sábado 12:00; viernes/sábado → miércoles siguiente 12:00. Las **7 variantes** de día de registro están definidas; el algoritmo no debe aplicar la próxima feria a martes y viernes, pues contradiría la política histórica. El calendario G01 está resuelto para reservas no convertidas y sin depósito, pero **protección posterior con depósito, incidencia por pago tardío, feriados y G03-B siguen pendientes**. En QA validar semana completa, fin de año, instante 12:00, depósito y carreras/duplicaciones. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Auditoría de tolerancia con depósito: siete días expresados, ancla pendiente
La regla G01 de los siete días de la semana y sus 12:00 **no cambia**. El propietario comunica que con **depósito** puede esperar **hasta una semana adicional** para que terminen pago y retiro; práctica histórica suele quedar dentro de ese tiempo. **Se reduce incertidumbre:** ya existe horizonte comercial de hasta una semana; **pero no está cerrado el cálculo exacto del nuevo vencimiento** porque puede empezar desde feria o desde depósito. También sigue sin aprobarse liberación automática, devolución y gestión de parciales/confirmados G03-B. No representar nunca «sin vencimiento» ni generar una marca temporal inventada. [Fuente G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — decisión posterior cierra ancla de siete días
La primera opción seleccionada significa **L=F+7 días naturales desde vencimiento ordinario de feria, a las 12:00**, para depósitos recibidos oportunamente. **No** se cuenta desde la fecha del depósito y las anotaciones anteriores «ancla pendiente» quedan superadas. La fecha límite ahora es computable para cualquier día de reserva, sin afectar el calendario de 7 días. **La acción final al llegar L no está decidida**; no se deben liberar automáticamente G/E de reservas depositadas ni tomar decisiones monetarias o sobre pedidos parciales G03-B. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**Auditoría:** la anotación anterior «acción final L pendiente» queda **parcialmente superada**: EN REVISIÓN y WhatsApp manual están definidos; la **resolución después del intento** y el dinero siguen pendientes. No crear mecanismo que libere G/E al L ni extender expiración G01 a pedidos confirmados. Riesgo de tarea duplicada mitigado por idempotencia.

## Auditoría G03-B parcial — reversión exclusiva del compromiso no entregado
El propietario **aprueba cancelar solo saldo pendiente, con autorización administrativa**, conservando lo físicamente entregado en el historial. Ejemplo 12=5 entregadas+7 canceladas; al cancelar 7 `ΔS=0`, `ΔA=+7`. **G03-A** sigue diferenciando confirmación (compromiso/descuento disponible) de entrega física (sale S); **G03-B queda parcialmente cerrado para las cancelaciones de lo no entregado**. No reponer mercancía ya entregada ni reabrir la reserva G01; idempotencia y concurrencia obligatorias en diseño futuro. **Todavía abierto:** reembolso/deposito/precio para cancelación, devoluciones de productos entregados, cancelación de pedido sin cantidades físicas elegibles y tratamiento monetario G06. [Contrato](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## G06-PAGOS — auditoría de abonos aceptados y conciliación por cancelación
**Se cierra parcialmente G06:** depósito aplica al importe confirmado, varios pagos parciales permitidos, sumatoria de ingresos recibidos y saldo pendiente derivados, traslado reserva→pedido sin doble conteo. Compatible G01 (depósito oportuno protege reserva), G04-08 (precio histórico), G03-B (cancelar pendientes solo afecta compromiso físico/comercial, sin reembolso automático) y D11 (registro manual externo). Ejemplo 840−200−300=**340**. **Pendientes abiertos:** verificación/constatación del depósito, comprobantes, pagos excesivos, reversión por error, devolución/retención por cancelación, costo de envío y G03-B dinero. Evitar que un pago anunciado sea considerado cobrado sin constatación, o que un depósito se contabilice dos veces al convertir reserva en pedido. [G06](22_DEPOSITOS_ABONOS_Y_SALDOS.md).
