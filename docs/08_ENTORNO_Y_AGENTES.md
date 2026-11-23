# EVALIA — Entorno de trabajo y agentes

**Selección explícita:** VS Code con Codex, framework Next.js y plataforma Supabase. Se puede utilizar VS Code con Claude Code; **solo cambia la herramienta de IA**, no el producto o su stack.

## Responsabilidades
- **VS Code:** edición y terminal local.
- **Codex / Claude Code:** agente ejecutor sujeto a los mismos requisitos, repositorio y permisos disponibles.
- **Next.js:** tecnología de aplicación web indicada. Arquitectura runtime, APIs, Server Functions y alojamiento sujetos al modelo (D16).
- **Supabase:** plataforma indicada de PostgreSQL/Auth/Storage; ninguna instancia productiva existe aún.
- **GitHub:** código, historial, PRs y QA; nunca almacenamiento de datos de negocio.

## Procedimiento común
1. Verificar branch, HEAD, diff, estado de PR y CI reales.
2. Leer AGENTS.md y los documentos D01–D18, modelo conceptual y G01–G09.
3. Trabajar en feature/*, no modificar baseline ni inventar negocios.
4. Usar pruebas repetibles, revisión de permisos y transacciones.
5. No hacer merge ni deploy productivo sin aprobación.

## Seguridad
No comitear archivos .env reales; usar variables de entorno seguras y separar claves publicables de las secret keys. Autorización/RLS no puede depender del estado visual de una página. La metodología y documentos deben ser portables entre Codex y Claude Code.

## Referencias
- https://nextjs.org/docs/app
- https://supabase.com/docs/guides/auth/server-side
- https://supabase.com/docs/guides/database/postgres/row-level-security

**D16 sigue abierto:** el hosting y los contratos técnicos finales se definen después del modelo de datos.
