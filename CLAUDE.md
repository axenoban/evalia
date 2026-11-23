# Claude Code — EVALIA

**Antes de otros documentos:** leer [Documento maestro EVALIA](docs/50_DOCUMENTO_MAESTRO_EVALIA.md), verificar HEAD de `dev/evalia-core` y el estado de GitHub. Las reglas históricas de reservas nuevas y PRs pendientes ya no describen la V1 vigente.

Claude Code en VS Code es un **agente alternativo a Codex**, no un cambio de framework, arquitectura, producto ni base de datos.

Leer [AGENTS.md](AGENTS.md), [decisiones](docs/04_REGISTRO_DE_DECISIONES.md), [modelo conceptual](docs/06_MODELO_CONCEPTUAL_DATOS.md), [pendientes](docs/07_REVISION_CONSISTENCIA.md) y [entorno](docs/08_ENTORNO_Y_AGENTES.md).

Antes de trabajar verificar rama, HEAD, PR y archivos reales. No inventar reglas, crear migraciones definitivas, exponer secretos o incorporar el PR #1 sin aprobación.

## Skills reutilizables
Claude Code descubre .claude/skills/; cada entrada apunta a su fuente canónica en .agents/skills/. Leer la fuente completa y sus referencias antes de cambiar formularios, catálogo, reservas, UX, pruebas o PostgreSQL. Ver docs/37_SKILLS_DESARROLLO_FORMULARIOS.md. Codex usa .agents/skills/ directamente.
