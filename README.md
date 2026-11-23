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
Las 16 selecciones están transcritas en [G03/G04 (no ratificadas)](docs/09_G03_G04_SELECCIONES.md). **Reserva mayorista solo desde 6 unidades por modelo**, con condiciones de composición y precio aún por precisar. **Aclaración posterior:** descontar al confirmar significa descontar **disponibilidad comercial**, no retirar físicamente la prenda; el control del saldo pendiente de entrega es necesario. Sigue abierta la tensión entre **una talla por presentación** y **mínimo combinado de M/XL por modelo**. No se implementarán como reglas definitivas antes de resolverlas.

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
Los estados previstos distinguen **producción planificada, prendas revisadas aptas, defectos, reservas de variantes concretas, solicitudes de surtido sin asignar y pedidos pendientes**. **Nueva decisión:** el propietario eligió **garantizar la cantidad del surtido mediante cupo agregado bloqueado** al guardar la reserva, con colores asignables posteriormente. El esquema SQL sigue sin ratificarse; definir previamente talla o criterios de variantes elegibles.

## Confirmación de cupo y cancelaciones de surtido (nueva ronda)
**B seleccionada:** reservar cantidad mayorista de un modelo sin escoger todavía colores; la reserva consume cupo del inventario apto y protege la cantidad disponible. Cancelación o falta de retiro se gestionará sin distinguir la condición solo por ser media docena o docena. **No se definieron** vencimiento exacto, penalización, anticipo, devolución ni acciones automáticas por inasistencia. Consultar [decisión y contrato](docs/16_DECISION_BLOQUEO_SURTIDO.md).
