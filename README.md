# EVALIA — Catálogo, reservas y pedidos

**Estado:** descubrimiento y documentación v0.2, 22-11-2026. Las selecciones D01–D18 están **registradas, pendientes de ratificación y revisión del PR #1**. No existe aún sistema funcional, base de datos creada ni hosting productivo.

El primer módulo es **administración** de catálogo, reservas de stock disponible y pedidos; se preparará una arquitectura ampliable a personal y clientes sin implementar prematuramente sus accesos.

**Herramientas indicadas:** VS Code + Codex; Next.js y Supabase. Cambiar Codex por Claude Code en VS Code no modifica el producto. La arquitectura definitiva y su hospedaje se evalúan después del modelo de datos (D16).

## Documentación
- [Visión y alcance](docs/00_VISION_Y_ALCANCE.md)
- [Marca y operación](docs/01_MARCA_Y_OPERACION.md)
- [Arquitectura candidata](docs/02_ARQUITECTURA_PROPUESTA.md)
- [Flujos comerciales](docs/03_FLUJOS_Y_MODELO.md)
- [Registro literal D01–D18](docs/04_REGISTRO_DE_DECISIONES.md)
- [Fases y criterios QA](docs/05_FASES_Y_PRUEBAS.md)
- [Modelo conceptual de datos](docs/06_MODELO_CONCEPTUAL_DATOS.md)
- [Coherencia y pendientes](docs/07_REVISION_CONSISTENCIA.md)
- [Entorno VS Code/Codex/Claude](docs/08_ENTORNO_Y_AGENTES.md)
- [Reglas AGENTS](AGENTS.md) / [Claude](CLAUDE.md)

## Ramas
main = publicable; dev/evalia-core = baseline validado futuro; feature/* = pendientes de aprobación. El PR #1 debe mantenerse como borrador; main no se modifica en esta entrega.

El repositorio es público: no introducir datos reales de clientes, credenciales ni comprobantes.

## G03/G04 — segunda ronda de decisiones
Las 16 selecciones están transcritas en [G03/G04 (no ratificadas)](docs/09_G03_G04_SELECCIONES.md). **Reserva mayorista solo desde 6 unidades por modelo**, sin combinar tallas dentro de un mismo modelo; **cada modelo tiene una talla propia**, precio y conjunto de colores. Las presentaciones y tarifas siguen por definir. **Aclaración posterior:** descontar al confirmar significa descontar **disponibilidad comercial**, no retirar físicamente la prenda; el control del saldo pendiente de entrega es necesario. La aclaración posterior resuelve la tensión anterior: **un modelo no mezcla tallas**; M y XL corresponden a modelos distintos. No se implementarán como reglas definitivas antes de resolverlas.

## Control de existencias para administrador
- [Panel por modelo, talla y color](docs/10_PANEL_STOCK_ADMIN.md): propuesta de interfaz con stock físico, reservado, pedidos por entregar y disponible; también conteo de reservas.
- [Contrato conceptual de inventario](docs/11_CONTRATO_INVENTARIO.md): aclaración de disponibilidad comercial y conciliación tras confirmar y entregar.
La **aclaración C-G03-A quedó resuelta a nivel conceptual**, pero no se aprobó aún esquema SQL, aplicación, cancelación parcial ni el conjunto de reglas G04.

## Próxima definición: captura de reservas y registros
- [Propuesta operativa de captura de reservas](docs/12_FLUJO_CAPTURA_RESERVAS_PROPUESTA.md) — recomendación, no aprobada.
- [Cuestionario R01–R12 de registros y canal](docs/13_CUESTIONARIO_CAPTURA.md) — pendiente de respuestas.

## R01–R12 — Captura de reservas definida por selección
- [Respuestas registradas R01–R12 y flujo actual WhatsApp](docs/13_CUESTIONARIO_CAPTURA.md)
- [Flujo operativo revisado](docs/12_FLUJO_CAPTURA_RESERVAS_PROPUESTA.md)
- [Catálogo maestro de colores y asignación por modelo](docs/14_CATALOGO_COLORES_Y_VARIANTES.md)
**R04: solo stock inicial manual por variante** (no importar Excel/CSV en la primera fase). Registro de colores **antes de crear modelos**, con colores específicos asignados a cada modelo. El surtido puede bloquear **cantidad agregada sin colores concretos**, según decisión posterior del propietario; la selección de variantes específicas ocurre después. Presentaciones G04 y alcance de talla siguen abiertos.

## EVALIA no es un sistema genérico: producción, calidad y surtido posterior
El propietario confirmó que **los colores de los surtidos se asignan después de recibir/registrar la solicitud**, ya que la producción real puede sufrir mermas por manchas o defectos de costura. Se documentó la operación de referencia de **6 a 6,5 docenas por modelo** (orientativamente 72–78 prendas), **11 colores con negro repetido** en la docena habitual, **sin garantía de composición exacta** después de control de calidad. No elevar estos datos a cuotas o fórmulas obligatorias.
- [Producción, calidad, mermas y surtido diferido](docs/15_PRODUCCION_CALIDAD_SURTIDO.md)
- [Cupo garantizado para surtidos: decisión B seleccionada](docs/16_DECISION_BLOQUEO_SURTIDO.md)
Los estados previstos distinguen **producción planificada, prendas revisadas aptas, defectos, reservas de variantes concretas, solicitudes de surtido sin asignar y pedidos pendientes**. **Nueva decisión:** el propietario eligió **garantizar la cantidad del surtido mediante cupo agregado bloqueado** al guardar la reserva, con colores asignables posteriormente. Como la **talla es fija para cada modelo**, el cupo se calcula para ese modelo y sus colores aptos, sin combinar tallas. El esquema SQL sigue sin ratificarse.

## Confirmación de cupo y cancelaciones de surtido (nueva ronda)
**B seleccionada:** reservar cantidad mayorista de un modelo sin escoger todavía colores; la reserva consume cupo del inventario apto y protege la cantidad disponible. Cancelación o falta de retiro se gestionará sin distinguir la condición solo por ser media docena o docena. **No se definieron** vencimiento exacto, penalización, anticipo, devolución ni acciones automáticas por inasistencia. Consultar [decisión y contrato](docs/16_DECISION_BLOQUEO_SURTIDO.md).

## Aclaración final de tallas por modelo
**Un modelo = una talla fija (ejemplos M, XL o 2XL), conjunto de colores propio y estructura de precios del modelo.** Dos modelos pueden tener tallas y tarifas distintas. En surtido se conoce el modelo y por tanto la talla; se registra la **cantidad antes de guardar/bloquear cupo** y se completan sus colores después. Esta aclaración corrige interpretaciones anteriores de mezcla de tallas dentro del mismo modelo. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Nueva definición: precios mayoristas y alta rápida para la feria
- [Tarifas mayoristas por modelo y clientes especiales](docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md)
- [Alta rápida de modelos: foto, colores recordados y plantillas por talla](docs/19_ALTA_RAPIDA_MODELOS_FERIA.md)
**Reservas exclusivamente a precio mayorista**; sugerencia configurable **por talla** para facilitar el alta, pero **precio efectivo propio de cada modelo** (incluso dentro de una talla). Beneficio especial configurable en ficha de cliente, ejemplo **−Bs 10 por docena**. **No extenderlo automáticamente a 6–11 unidades ni sumar descuentos entre modelos sin decisión.** Se prevé registrar **seis o más modelos por feria**, con fotografía y selección reutilizable de colores; no se copiará inventario del anterior.

## G04 — Precio de 6 a 11 prendas DEFINIDO (2026-11-22)
Para reservas **solo mayoristas**, el importe del modelo con `n=6..11` será `precio_docena_modelo × n / 12`. Ejemplo docena Bs 420: media Bs 210; 7 Bs 245; unidad implícita Bs 35. El precio de la docena es **propio de cada modelo**, aunque pueda venir sugerido por talla. **No hay descuentos en la primera versión**, y no habrá descuentos para cantidades **inferiores a docena**. Regalos o rebajas por docenas negociadas con un cliente se estudiarán **después**. Falta precisar redondeo de tarifas como Bs 380 (7=Bs 221,666…), cantidades >12 y datos de cobro. [Contrato actualizado](docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## P-06 / RND-01: política de redondeo seleccionada
**Decisión confirmada por el propietario:** después de aplicar `P_docena×n/12`, **redondear el total del MODELO al boliviano entero más cercano** (no cada prenda ni cada color), **antes de sumar los distintos modelos** del pedido. Ejemplo P=380, n=7 → **Bs 222**; P=420, n=7 → **Bs 245**. **Único caso matemático aún abierto:** empate exacto en x,50 (ej. docena Bs 381 y 6 unidades → 190,50). No aplicar un desempate no aprobado. [Contrato y QA](docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## RND-02 resuelta y combinación de modelos permitida (2026-11-22)
**Nueva decisión expresa:** si el subtotal exacto de un modelo termina en **Bs 0,50**, **se mantiene sin redondear**; de lo contrario se redondea al boliviano entero más cercano. P_docena=381, n=6 → **Bs 190,50**; P=380, n=7 → **Bs 222**. **Pedido multímodelo:** puede contener 12 unidades del modelo A y 6 del modelo B (mínimo 6 por modelo); P_A=420 y P_B=380 → **Bs 610**, o P_B=381 → **Bs 610,50**. Sumar subtotales ya calculados **sin un segundo redondeo global**. **No extrapolar a 13+ de un mismo modelo**, que continúa pendiente. [Contrato](docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## MAY-12 — Resuelto: misma fórmula para 6 o más prendas de un modelo
**Última aprobación:** el propietario confirma **«si, se aplica la misma formula»** para 13 o más prendas de un mismo modelo. Por tanto, `precio_modelo = redondeo_EVALIA(precio_docena_modelo × cantidad_total_del_modelo / 12)` para **cualquier entero cantidad ≥ 6**, sin un nuevo escalón al llegar a 12, 19 o 24. P=420, n=19 ⇒ **Bs 665**; n=24 ⇒ **Bs 840**. Se mantiene la excepción de **Bs 0,50 exactos**, el redondeo una vez por modelo, el total de pedido como suma y **ningún descuento E1**. **MAY-12 queda cerrado**; G04-01 presentaciones físicas y otras reglas comerciales no monetarias permanecen abiertas. [Contrato](docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## G01/R09 — vencimientos por feria y depósitos (selección del propietario)
**Martes o miércoles:** reserva guardada sin depósito vence **sábado 12:00**. **Viernes o sábado:** vence **miércoles siguiente 12:00**. El propietario confirma que **depósitos pueden registrarse después de crear la reserva** y protegen de la liberación automática ordinaria al constar recibidos a tiempo. **Pendientes:** día lunes/jueves/domingo, duración/protección posterior con depósito y pagos/cancelaciones. No inventar plazo de depósito ni reabrir automáticamente reservas vencidas. [Contrato de ferias](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — Calendario semanal de reservas COMPLETO (2026-11-22)
**Decisión posterior que prevalece:** la política automática cubre los siete días. **Domingo/lunes → miércoles siguiente 12:00**; **martes/miércoles → sábado de esa semana 12:00**; **jueves → sábado de esa semana 12:00**; **viernes/sábado → miércoles siguiente 12:00**. El dueño seleccionó «próxima feria» específicamente para los días antes no definidos **domingo, lunes y jueves**; las reglas previas para los otros cuatro días **no cambian**. El depósito externo sigue pudiendo registrarse posteriormente y, si consta recibido a tiempo, evita el vencimiento ordinario. **Ya no quedan días pendientes**, pero sí falta decidir hasta cuándo se mantiene una reserva con depósito y G03-B. [Calendario y QA](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — depósito: semana adicional habitual (nuevo requisito)
El propietario indica que si la reserva tiene **depósito recibido**, normalmente **puede esperarse hasta una semana más** para que el cliente **termine de pagar y recoja**; no suele necesitar más plazo. **La tolerancia de siete días es selección comercial**, no autorización para asignar automáticamente una fecha final arbitraria: falta decidir si se cuenta desde **vencimiento ordinario de feria** o desde **depósito** y qué sucede al finalizar (liberación automática o manual, depósito/devolución). El calendario de vencimiento ordinario para los siete días permanece intacto. [Contrato G01](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — semana con depósito desde feria original (APROBADO)
El propietario eligió **contar 7 días naturales desde el vencimiento original de feria F**, siempre **12:00**, no desde el depósito. Ejemplo alta martes 2026-11-24 → F sábado 2026-11-28 12:00; con depósito oportuno → L sábado **2026-12-05 12:00**. Alta viernes 2026-11-27 → F miércoles 2026-12-02, L miércoles **2026-12-09 12:00**. Ya no queda pendiente el inicio de la semana; **sí qué hacer al llegar L con pago y stock reservado** (liberación automática/manual, devolución y G03-B). Mantener PR borrador. [G01](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**Decisión aprobada G01-L:** agotada la semana adicional de una reserva con depósito oportuno y sin pago/retiro cerrado, marcar **EN REVISIÓN** para **intento de contacto manual por WhatsApp**. No liberar stock ni resolver dinero automáticamente. Cancelación/respuesta posterior sigue pendiente. [G01](docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).
