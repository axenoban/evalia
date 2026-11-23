# EVALIA — skills para desarrollo de interfaces y operaciones

**Fecha:** 2026-11-23. **Estado:** candidato técnico, rama feature/skills-formularios-evalia. No autoriza cambios comerciales ni despliegue real.

Las skills son instrucciones reutilizables para agentes, **no implementan por sí solas** formularios ni instalan frameworks. Codex (VS Code) descubre .agents/skills/<nombre>/SKILL.md. Claude Code utiliza .claude/skills/<nombre>/SKILL.md, entradas que apuntan al mismo contenido sin copiarlo. AGENTS.md y decisiones posteriores aprobadas prevalecen siempre.

| Skill instalada | Uso |
| --- | --- |
| evalia-formularios | Campos, validación, errores, estados, accesibilidad, envío y responsive |
| evalia-catalogo | Alta rápida de modelo, talla fija, foto, colores informativos y stock conservador |
| evalia-reservas-pedidos | Carrito multímodelo, precios exactos, compromiso, vencimiento, depósito, pedido y entrega |
| evalia-ux-visual | Diseño visual coherente con marca y controles funcionales |
| evalia-pruebas-e2e | Node, pruebas manuales/Playwright cuando exista y pgTAP cuando se ejecute BD |
| evalia-seguridad-supabase | RLS, seguridad del backend, transacciones, concurrencia y despliegue responsable |
| supabase-postgres-best-practices | Skill oficial MIT de Supabase; SKILL.md y referencias completas, incluida licencia |

## Fuentes contrastadas
- Supabase, skill oficial PostgreSQL: https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices — copia local licenciada MIT.
- Vercel, pautas de interfaz y formularios: https://vercel.com/design/guidelines y https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines — referencia consultable, **no instalada** literalmente.
- Vercel, React/Next: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices — **candidata futura**, no instalada porque el proyecto actual usa JS sin React.
- Anthropic, pruebas web: https://github.com/anthropics/skills/tree/main/skills/webapp-testing — referencia externa; Playwright no está instalado por estas skills.
- Anthropic, diseño frontend: https://github.com/anthropics/skills/tree/main/skills/frontend-design — referencia externa; diseño del negocio y documentos aprobados tienen prioridad.

## Protocolo de uso
1. Verificar rama, HEAD, PR, diferencias y tests antes de editar.
2. Leer AGENTS.md, documentos canónicos aprobados y la skill del área. Para cambios UI sumar siempre evalia-formularios y evalia-pruebas-e2e. Para BD añadir evalia-seguridad-supabase y supabase-postgres-best-practices.
3. Mantener en feature/* las mejoras; probar con npm run check y, si está disponible, navegador/Playwright. No confundir pruebas Node con PostgreSQL real.
4. Entregar prueba local y obtener validación antes de fusionar. No modificar main ni convertir PR #1 de borrador sin autorización.

## Alcance presente
La demo permanece en site/ con datos ficticios en localStorage, sin autenticación, transacciones entre dispositivos, Supabase operativo ni pagos reales. Las migraciones de supabase/ aún requieren ejecución y pgTAP local. No se han modificado las interfaces con este paquete; la siguiente fase de mejoras deberá revisarse y validarse como trabajo separado.
