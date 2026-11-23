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

- Falta saber si **talla se define al registrar**. Cupo por modelo+talla no protege una petición con talla desconocida; no inventar agrupamiento entre tallas.
- Falta establecer plazo de reserva y qué ocurre al vencer si no hay colores asignados.
- Un patrón de **11 colores más negro adicional** no puede asegurarse por cantidad agregada cuando hay mermas; no afirmar que opción B garantice esa mezcla.
- Falta decidir si se puede dividir un surtido, confirmar pedido antes de asignar tonos, y quién resuelve faltantes.
- Precio para siete prendas y presentaciones por talla/modelo siguen sin aprobar.
- Calidad e inspección no justifican asumir que un lote previsto ya contiene stock vendible.

## Recomendación técnica
**B ya fue elegida expresamente por el propietario.** La reserva surtida guardada debe apartar cantidad apta sin fijar los colores y la decisión de talla o conjunto elegible deberá ser resuelta antes de implementar. Es necesario distinguir el compromiso comercial garantizado de colores aún indeterminados: el sistema no puede prometer tonos específicos.

**Cancelación y no retiro:** el propietario no distingue el tratamiento por media docena o docena. Esto no fija plazo ni sanciones, y la liberación del cupo deberá depender de las condiciones generales aprobadas de G01/G03-B. No construir SQL definitivo ni cambiar estado draft del PR.
