# EVALIA — Decisión B seleccionada: cupo garantizado para surtidos (v0.2)

**Estado: decisión comercial B seleccionada por el propietario; implementación y ratificación del PR pendientes.** Fecha: 2026-11-22. Los colores se asignan después y la **cantidad sí queda garantizada** al guardar una reserva surtida sobre existencias aptas y no comprometidas. R06: borrador no bloquea.

## A. Solicitud surtida sin bloqueo (alternativa considerada, no elegida para reserva guardada)
- Registrar cliente, modelo, cantidad, talla **si se conoce**, origen WhatsApp y etiqueta «surtido pendiente de asignar».
- No descontar ningún stock ni prometer unidades al cliente hasta elegir variantes exactas; el cupo puede agotarse.
- Al asignar colores más tarde, verificar inventario apto y guardar una **reserva efectiva** de variantes en transacción. Si no alcanza, avisar.
- Ventaja: implementación sencilla y robusta para stock variable por calidad.
- Riesgo: no protege al comprador que solicitó seis piezas mientras EVALIA atiende otros pedidos.

## B. Reserva de cupo surtido sin colores — SELECCIONADA
- Registrar **cliente + modelo + cantidad + talla conocida**, sin colores. Apartar una cantidad **agregada** de todas las variantes aptas elegibles del mismo modelo+talla; **no garantizar tonos específicos**.
- Aparte de reservas exactas por color, mantener **cupo surtido pendiente de asignación (G)**; no confundirlo con prendas concretas ni con una simple solicitud.
- Para un grupo modelo+talla:
  - `S` = suma del stock apto efectivamente contado por sus colores.
  - `E` = total de unidades ya asignadas específicamente a reservas y pedidos (por color), aún no entregadas.
  - `G` = total de unidades de surtidos sin color con cupo ya bloqueado.
  - `A = S − E − G`, **sin negativos** para nuevas asignaciones.
- Una reserva fija por color `c` por cantidad `n` requiere **dos condiciones simultáneas**: suficiente `S_c − E_c ≥ n` y suficiente cupo global `A ≥ n`. Evita vender toda la disponibilidad de los colores mientras hay surtidos genéricos comprometidos.
- Al asignar un surtido de `n`, transferencia **atómica** `G − n` y `E_c + n` (entre colores/tallas elegibles), con suma individual que no exceda stock apto; `A` no cambia y no hay segundo bloqueo.
- Al vender/entregar, mantener la distinción entre mercancía físicamente custodiada y pendientes por despachar. Los cambios por mermas se registran como realidad física, aunque generen incidencias de sobrerreserva que deben resolverse manualmente.
- Ventaja: garantiza cantidad global comprometida y deja elegir colores después, ajustándose a producción desigual.
- Riesgo: es más complejo de implementar, auditar y conciliar; **no garantiza ningún color específico, talla no conocida ni docena de composición fija**. Requiere evitar sobreventa bajo concurrencia y criterio de prioridad en caso de faltantes posteriores.

## Ejemplo ficticio que diferencia ambas opciones

Modelo A, talla M: `S=12` unidades aptas en distintos colores. Reserva exacta por 3 negras `E=3`. Cliente pide surtido de 6 sin colores.

| Enfoque | E exactas | G surtido pendiente | Nuevas unidades disponibles | Compromiso con cliente |
| --- | ---: | ---: | ---: | --- |
| A: solicitud | 3 | 0 | 9 | Sin garantía de 6 |
| B: cupo agregado | 3 | 6 | 3 | Se apartan 6 sin fijar tonos |

Si luego se detectan dos prendas no aptas, el total apto baja de 12 a 10; en B la nueva disponibilidad agregada es 1, siempre que no afecte asignaciones exactas. Con más pérdidas podría surgir **déficit**; no maquillar ni ocultar el problema. Debe notificarse y decidir una sustitución/reevaluación.

## Limitaciones y reglas NO fijadas

- **RESUELTO posteriormente:** la talla **está fijada por el modelo**; no se mezclan tallas dentro de un modelo, por lo que el grupo de cupo es **un modelo con su talla fija** y sus colores aptos.
- Falta establecer plazo de reserva y qué ocurre al vencer si no hay colores asignados.
- Un patrón de **11 colores más negro adicional** no puede asegurarse por cantidad agregada cuando hay mermas; no afirmar que opción B garantice esa mezcla.
- **D0-A RESUELTO posteriormente:** se puede **confirmar pedido surtido antes de asignar tonos**, siempre con cantidad garantizada. Todavía está por definir el procedimiento ante faltantes/mermas y la política operativa de división/asignación parcial.
- Precio para siete prendas y presentaciones por talla/modelo siguen sin aprobar.
- Calidad e inspección no justifican asumir que un lote previsto ya contiene stock vendible.

## Recomendación técnica
**B ya fue elegida expresamente por el propietario.** La reserva surtida guardada debe apartar cantidad apta sin fijar los colores; la **talla ya viene determinada por el modelo**, conforme a la aclaración posterior. Es necesario distinguir el compromiso comercial garantizado de colores aún indeterminados: el sistema no puede prometer tonos específicos.

**Cancelación y no retiro:** el propietario no distingue el tratamiento por media docena o docena. Esto no fija plazo ni sanciones, y la liberación del cupo deberá depender de las condiciones generales aprobadas de G01/G03-B. No construir SQL definitivo ni cambiar estado draft del PR.

## Decisión expresa recibida después de la comparación (2026-11-22)

> estaria bien garantizarle el pedido porque hasta el momento estos pedidos en fisico se han completado con normalidad, si no recogen o cancelan despues ya es indiferente si ha sido pedido de media o docena

**Selección B confirmada en términos comerciales:** al pulsar **Guardar reserva** para un surtido, garantizar su **cantidad total** con un cupo de existencias físicamente aptas aún no comprometidas, aunque se decidan los colores posteriormente. El borrador no bloquea (R06). No se garantiza un color específico ni una composición fija de once colores/negro repetido; no contar producción prevista ni unidades defectuosas.

**Cancelaciones y no retiro:** la política se aplicará por igual independientemente de que sean seis o doce prendas; esto **no** define multas, plazo, penalización, anticipo, devolución, momento automático de liberación ni tratamiento de prendas ya entregadas. G01 y G03-B siguen abiertos.

**Aclaración posterior que resuelve ese pendiente:** cada modelo tiene talla única (M, XL, 2XL son ejemplos de modelos distintos), sin mezcla de tallas. Al guardar surtido se conoce modelo y talla, se registra cantidad para el cupo; los colores se asignan después. Ver [contrato ampliado](11_CONTRATO_INVENTARIO.md).

**Estado:** decisión seleccionada y documentada en feature; sin autorización para ejecutar migraciones ni fusionar PR.

## CR-02 / C-G04-A cerrada: no mezclar tallas dentro de un modelo (2026-11-22)
Un modelo comercial = **una única talla**, con conjunto de colores y esquema de precios propios. Elegir el modelo determina la talla; en la reserva surtida se registra cantidad y se bloquea un cupo agregado de prendas aptas **de ese modelo**, que serán repartidas por color posteriormente. No existe cupo flexible entre modelos ni tallas. Las cantidades de dos modelos diferentes **no se suman para cumplir el mínimo de seis por modelo**. No inventar el importe de siete unidades: G04-01/criterios de precio permanecen abiertos. [Contrato](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Cupos surtidos garantizados y vencimiento por feria
La decisión B de **cupo surtido garantizado** sigue vigente desde Guardar reserva, sin necesidad de colores concretos. **G01 posterior:** reservas guardadas martes/miércoles sin depósito aplicable vencen sábado 12:00; viernes/sábado sin depósito aplicable vencen miércoles siguiente 12:00. Liberar al vencer solo cupos G todavía pendientes (o E exactos) una sola vez y con historial; no alterar stock físico ni liberar compromiso ya transferido al pedido. El depósito puede registrarse **después de crear reserva**, y si se recibió a tiempo protege del vencimiento ordinario, sin nueva duración aprobada. Falta decidir vencimientos de lunes/jueves/domingo y plazo tras depósito. [Contrato G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 completa las fechas de liberación por feria
Al Guardar reserva surtida, el cupo G del modelo queda garantizado hasta vencimiento aplicable. **Calendario completo:** domingo/lunes → miércoles inmediato 12:00; martes/miércoles/jueves → sábado 12:00; viernes/sábado → miércoles siguiente 12:00. «Próxima feria» amplió solo los 3 días antes abiertos; martes y viernes mantienen reglas originales. Sin depósito aplicable, caducidad de reserva no confirmada libera G o E pendiente una sola vez, sin modificar físico ni liberar pedidos convertidos. Depósito recibido a tiempo, incluso registrado después del alta de reserva, evita la liberación ordinaria; nueva vigencia con depósito sigue pendiente. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**Cupo surtido B:** al alcanzar L con depósito y pasar EN REVISIÓN, el compromiso G del modelo se **mantiene**, igual que E ya asignado; no se libera ni modifica S. El administrador intenta WhatsApp de manera manual. Tras contacto, la liberación del cupo requiere una decisión posterior G03-B/G06.

## D0 — transacciones para reserva de cupo por modelo (PROPUESTA)
El cupo surtido G aprobado **compite por el mismo disponible A del modelo** que E exacto, por lo que un lock solo por color no basta. [D0-01](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) recomienda serializar mutaciones por modelo y transferir `G−q/E+q` en **una transacción**, nunca dos RPC separadas. Confirmación de pedido con G aún sin color (D0-A) no ha sido ratificada: no elegir un orden por suposición. [QA](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md).

## DECISIÓN POSTERIOR D0-A: la confirmación NO exige colores
**Aprobado por el propietario:** el surtido G garantizado puede **pasar de reserva a pedido confirmado sin definir tonos**. Los colores se asignan sobre existencias aptas del mismo modelo **antes de la entrega física**. La reserva y el pedido confirmado no duplican G; pedido directo comprueba A y crea G una vez. Transición G→E atómica y sin segundo descuento, ver [D0-A](31_D0_A_CONFIRMACION_SURTIDO_SIN_COLORES.md). La duda anterior «confirmar antes de asignar tonos» **está RESUELTA**, pero dividir surtido/forma exacta de asignación parcial y resolución de déficit por merma siguen sujetas a diseño/política posterior.
