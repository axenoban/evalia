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
Las 16 selecciones están transcritas en [G03/G04 (no ratificadas)](docs/09_G03_G04_SELECCIONES.md). **Reserva mayorista solo desde 6 unidades por modelo**, con condiciones de composición y precio aún por precisar. Importante: se detectó tensión entre **descontar stock físico al confirmar** y **entregas parciales**, y entre **una talla por presentación** y **mínimo combinado de M/XL por modelo**. No se implementarán como reglas definitivas antes de resolverlas.
