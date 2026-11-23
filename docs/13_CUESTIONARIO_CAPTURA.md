# EVALIA — R01–R12: decisiones de registro y captura de reservas

**Fecha de recepción:** 2026-11-22. **Estado:** 12 selecciones registradas, pendientes de ratificación formal; PR #1 permanece en borrador. Ninguna es implementación ni política que autorice fusionar la rama.

## Respuestas literales del propietario

| ID | Respuesta recibida | Estado |
| --- | --- | --- |
| R01 | Solo administrador inicialmente | Seleccionada, no ratificada |
| R02 | Nombre y número de WhatsApp | Seleccionada, no ratificada |
| R03 | Buscar por teléfono y sugerir coincidencias sin unir registros automáticamente | Seleccionada, no ratificada |
| R04 | Solo registro manual por variante | Seleccionada, no ratificada |
| R05 | Catálogo visual con buscador y carrito por modelo talla y color | Seleccionada, no ratificada |
| R06 | Solo al guardar formalmente la reserva; borrador sin bloqueo | Seleccionada, no ratificada |
| R07 | Rechazar el exceso y permitir modificar cantidades | Seleccionada, no ratificada |
| R08 | Si con validación de stock y registro de cambios | Seleccionada, no ratificada |
| R09 | Plazo configurable; duración inicial pendiente de definir | Seleccionada, no ratificada |
| R10 | Botón Confirmar pedido ejecutado por administrador | Seleccionada, no ratificada |
| R11 | Codigo de reserva y mensaje preparado para WhatsApp enviado manualmente | Seleccionada, no ratificada |
| R12 | Primera fase solo administrador; solicitudes publicas en fase posterior | Seleccionada, no ratificada |

## Observación del propietario, conservada literalmente

> actulmente se suben los modelos con los precios, colores al grupo de whattsapp de  clientes, y los clientes nos hablan al privado con la captura del modelo definiendo sus cantidades, y si quieren menos de una docena normalmente escogen colores o piden surtudo para q ue nosotros escojamos los colores o los que queden disponible, por ello al realizar la reserva, se debe escoger el modelo ,  y si es menor a una docena se deba seleccionar los colores, estos colores quier oque se registren antes incluso  de los modelos, y al registrar el modelo asignar los colores que tendra el modelo ,ya que siempre puede variar aunq sea por un color, de esta manera tendemos los colores diponibles y seleccionables por modelo

## Traducción a requisitos de producto (sin añadir normas comerciales)

**Registro y cuentas.** En la primera fase solo el administrador crea reservas (R01). Cliente sin cuenta, con nombre y WhatsApp (R02); buscar por teléfono y presentar posibles coincidencias sin fusionar automáticamente clientes (R03). El uso/retención de datos personales sigue sujeto a G08.

**Carga de existencias.** R04 reemplaza expresamente la sugerencia anterior de importar Excel/CSV: **solo carga manual del stock inicial por variante modelo + talla + color**; no incluir importación como requisito de E1. Antes de crear modelos se registran los colores en un catálogo reutilizable; al crear/editar un modelo se le asigna su conjunto de colores, que puede cambiar entre modelos. Ver [maestro de colores](14_CATALOGO_COLORES_Y_VARIANTES.md).

**Captura.** Catálogo visual + buscador + carrito con modelo, talla y color (R05). Borrador sin bloqueo; solo **Guardar reserva** bloquea unidades (R06). Si falta stock, impedir asignación excesiva, explicar cantidades reales y permitir corregir (R07). Modificar una reserva requiere validación de stock y auditoría (R08).

**Confirmación.** Vencimiento configurable, duración inicial **no definida** (R09/G01). Solo el administrador usa la acción **Confirmar pedido** (R10). Código de reserva con mensaje WhatsApp preparado y envío manual (R11); no asumir WhatsApp API ni importación automática de capturas. Primera fase solo web administrativa; solicitudes públicas después (R12).

**Reserva mayorista preexistente.** Seguir aplicando **mínimo seis unidades por modelo** (G03/G04), separado de presentación comercial pendiente G04-01. Este cuestionario no cambia el umbral ni fija tarifas.

## Flujo de WhatsApp efectivamente descrito

1. EVALIA **publica modelos, precios y colores en un grupo de WhatsApp**.
2. El cliente escribe **por privado con captura del modelo y cantidades**.
3. En el administrador se busca ese modelo y se prepara la reserva, con el cliente asociado.
4. Para **menos de una docena** (sin alterar el mínimo de 6 por modelo vigente para reservas mayoristas), el cliente normalmente **elige colores** o solicita **«surtido»**, dejando que EVALIA elija los colores disponibles.
5. **Antes de crear un modelo**, sus colores deben poder existir en el catálogo global; a cada modelo se le asignan sus colores específicos. No todas las variantes tendrán el mismo color.
6. El sistema solo debe ofrecer las combinaciones pertenecientes al modelo. La cantidad disponible se verifica por **modelo + talla + color**, no por el total agregado del modelo.

No se ordenó guardar capturas en la BD, extraer datos con OCR, leer automáticamente grupos de WhatsApp ni definir colores por defecto.

## Distinción «colores seleccionados» vs «surtido» — PENDIENTE DE DECISIÓN

**Confirmado:** el cliente puede elegir colores o pedir surtido por debajo de una docena; en surtido EVALIA decide los colores disponibles.

**Restricción técnica:** no es seguro bloquear un genérico «6 prendas del modelo A» si el sistema maneja saldos por talla y color. La reserva finalmente comprometida debe registrar las variantes concretas para no prometer dos veces un mismo color.

**Recomendación a validar:** cuando el cliente solicita surtido, el administrador selecciona los colores que efectivamente se apartarán **antes de Guardar reserva** y el sistema valida stock de cada variante; el carrito puede mostrar la etiqueta comercial «Surtido (selección EVALIA)» sin reemplazar las líneas concretas. Alternativa que requiere decisión: conservar la solicitud como **borrador sin bloqueo** hasta que EVALIA asigne colores. **No implementar asignación automática ni selección arbitraria de variantes sin aprobación.**

## Tensiones y parámetros abiertos

- **CR-01 (surtido):** momento de selección de colores por EVALIA y posibilidad de sustitución si luego falta color.
- **CR-02 (presentaciones y tallas):** **Resuelto mediante aclaración posterior:** cada modelo tiene una única talla, no admite combinación M/XL; G04-04 resulta coherente. Sigue abierto G04-01 presentaciones.
- **CR-03 (menos de docena):** confirmar si selección de colores es obligatoria exactamente para 6–11, y el comportamiento para 12 o más; no asumir surtido automático ni colores para docenas sin instrucción.
- **CR-04 (precios):** mantener sin resolver el cálculo de siete unidades, diferencia por modelos/tallas, redondeo y tarifas. Los precios publicados en el grupo no autorizan actualizarlos automáticamente en BD.
- **CR-05 (vencimiento):** G01/R09 no contienen plazo inicial ni reglas de prórroga.
- **CR-06 (cambios del catálogo):** decidir tratamiento del color ya asignado a un modelo y usado en reservas/pedidos cuando deje de producirse; técnicamente preservar historia y referencias.
- **CR-07 (privacidad y correcciones):** normalización de teléfonos, coincidencias, historial y actores (G07/G08).

## Invariantes propuestos para QA

- Registro manual de stock inicial por variante; no importación automática.
- Catálogo global de colores reutilizable; cada modelo ofrece solo sus colores asignados.
- Dos modelos pueden tener conjuntos distintos de colores.
- Si un color deja de ofrecerse no se deben borrar los registros históricos que lo referencian.
- Cliente ya existente puede seleccionarse desde su número sin fusionar registros en silencio.
- Borrador no bloquea disponibilidad.
- Guardar una reserva con variante agotada falla sin asignación parcial accidental.
- Reserva de surtido que bloquea stock no debe carecer de asignación exacta por variante **si se valida la recomendación de resolución previa**.
- Conversión reserva → pedido no hace doble descuento; solo admin confirma.
- La reserva no se publica automáticamente a clientes sin autenticación en E1.

Ver [flujo operacional](12_FLUJO_CAPTURA_RESERVAS_PROPUESTA.md), [modelo conceptual](06_MODELO_CONCEPTUAL_DATOS.md), [colores](14_CATALOGO_COLORES_Y_VARIANTES.md) y [consistencia](07_REVISION_CONSISTENCIA.md).

**No ejecutar migraciones comerciales, fusionar el PR ni marcar estas respuestas como aprobadas sin ratificación.**

## Nueva respuesta posterior: CR-01 cambia (2026-11-22)
**Expresamente decidido:** elegir los colores del «surtido» **después del registro inicial**, no antes, debido a variaciones reales de producción y mermas de prendas por manchas y costuras. La recomendación previa en esta página de asignar antes de guardar **queda superada respecto al momento de captura**. **Por definir:** si ese registro representa una solicitud sin bloqueo o reserva con **cupo agregado** bloqueado a nivel modelo/talla, sin garantizar colores concretos; ver [comparativa](16_DECISION_BLOQUEO_SURTIDO.md).
También se solicita un sistema propio de EVALIA que registre fabricación y control de calidad, con producción habitual **aproximada de 6–6,5 docenas por modelo**, **once colores con negro repetido**, y composición real que puede verse afectada por defectos. Ver [producción especializada](15_PRODUCCION_CALIDAD_SURTIDO.md). Las respuestas R01–R12 permanecen intactas.

## CR-01 — decisión de garantía posterior recibida (2026-11-22)
**Se escogió B:** registrar la reserva surtida, **bloquear un cupo de cantidad apta** al guardar y elegir colores más adelante. A no será el comportamiento de una reserva guardada; solo puede existir borrador no bloqueante conforme R06. Esta decisión sustituye el carácter hipotético de «cupo agregado» de la sección anterior.
La cancelación/falta de retiro **no distingue comercialmente** media docena y docena por sí sola; plazo, devoluciones y saldos parciales siguen pendientes. La talla queda definida por el **modelo único** conforme a aclaración posterior, sin agrupación de varias tallas en un modelo; no inventar precio por surtido. [Decisión y condiciones](16_DECISION_BLOQUEO_SURTIDO.md).

## Aclaración final sobre tallas y registro de cantidad (2026-11-22)
Cada **modelo** comercial tiene una **sola talla** (ejemplos M, XL o 2XL); distintos modelos pueden tener distintas tallas, colores y precios. No sumar M y XL **dentro del mismo modelo**. Al crear surtido se conoce modelo y por tanto talla; la **cantidad debe registrarse antes de Guardar** para poder garantizar cupo de stock apto. Solo la distribución por colores se completará después. Esta precisión prevalece sobre inferencias previas R05/G04, sin alterar respuestas literales R01–R12. [Contrato](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Nueva observación sobre precios y registro de modelos
El propietario desea **reservas únicamente mayoristas**, **precio propio por modelo** con **sugerencia editable por talla**, foto de cada modelo, colores reutilizados del anterior y preferencias por talla para acelerar **seis o más modelos por feria**. Cliente especial puede tener **descuento por docena** en su ficha; ejemplo **−Bs 10 por docena**, propuesto/calculado al capturar un pedido. No hay autorización para calcular descuentos fragmentarios ni mezclar tallas en un modelo. [Precios y conflictos P](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [alta rápida](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## Precio de cantidad mayorista y descuentos — aclaración posterior
El cálculo de **6–11 unidades por modelo** ya fue determinado: `P_docena × n/12`, automático. Docena Bs 420 → media 210, siete 245. La anterior duda sobre siete unidades queda resuelta **en fórmula**; falta redondeo de ejemplo Bs 380, siete unidades. Se descarta **motor de descuentos para E1**, incluidos beneficios de cliente configurados o negociación; se prohíbe **cualquier descuento para menos de 12 unidades** al introducir una funcionalidad futura. Permanecen abiertas modalidades >12 y tarifas minoristas. [Precio canónico](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## RND-01 — resultado de política monetaria
El propietario seleccionó **redondear el precio final de cada modelo al boliviano entero más cercano** después de `P_docena×n/12`. Ejemplo docena Bs 380, siete unidades → **Bs 222**. Sumar las líneas de colores del modelo antes del cálculo, y sumar los modelos ya redondeados al final. Se mantiene que E1 no incluye descuentos. La duda histórica sobre redondeo a entero ya está resuelta, con única excepción matemática **.50 exacto** (criterio de empate aún pendiente). [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).
