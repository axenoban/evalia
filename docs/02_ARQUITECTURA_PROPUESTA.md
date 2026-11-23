# ADR-001 — Arquitectura candidata v0.2

**Estado:** tecnología indicada; diseño técnico definitivo pendiente de modelo de datos y D16.

## Tecnología y herramientas indicadas por el propietario
- Entorno de edición: **VS Code**.
- Agente de desarrollo inicial: **Codex**; puede sustituirse solo por **Claude Code**, sin modificar el sistema.
- Framework: **Next.js**.
- Plataforma de datos: **Supabase**.
- D16 literalmente exige: **evaluar arquitectura después del modelo de datos**.

No es contradicción necesaria: las herramientas y tecnologías objetivo están indicadas, pero hosting, límites API/servidor, diseño Auth, SQL, operaciones de reserva, costes y entornos no están ratificados.

## Componentes a evaluar
- Next.js App Router y TypeScript con lógica de servidor cuando proceda; no asumir un sitio exportado solo estático.
- Supabase PostgreSQL como candidato de persistencia relacional y transaccional; Auth para administradores inicialmente; Storage para imágenes.
- RLS y validaciones de servidor por permisos; datos de clientes privados, sin secretos en el frontend.
- Reserva, liberación, conversión a pedido y movimientos físicos como **operaciones transaccionales**, sin lecturas + escrituras separadas desde navegador.
- Sesiones SSR con integración oficial de Supabase si se elige acceso con cookies en Next.js.
- Emplazamiento y despliegue productivo: **sin elegir** (no asumir Cloudflare, Vercel, GitHub Pages ni VPS).

## Invariantes técnicas propuestas, no políticas comerciales
IDs estables por variante; historial de movimientos; bloqueo atómico de stock; auditoría; idempotencia; precios acordados conservados históricamente; protección de registros y pruebas RLS. Evitar dobles compromisos entre reserva y pedido.

## Pendiente de confirmar
Modelo lógico, transiciones de stock (G03), plazos (G01), precios (G04), roles (G07), privacidad (G08), proveedor y entorno de despliegue (G09). Ninguna migración definitiva ni proyecto de producción se crea en esta fase.

## Referencias
- https://nextjs.org/docs/app
- https://nextjs.org/docs/app/getting-started/deploying
- https://supabase.com/docs/guides/auth/server-side
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys

## Riesgo de consistencia comercial añadido — G03/G04
**Aclaración C-G03-A confirmada después del cuestionario:** la acción de confirmar resta **disponibilidad comercial**, no existencias físicas todavía presentes. Se deben distinguir stock físico en custodia, reservas activas, compromiso de pedidos confirmados sin entregar y disponibilidad por variante; consultar [contrato conceptual](11_CONTRATO_INVENTARIO.md). Las entregas parciales reducen unidades físicamente presentes y las pendientes asignadas en igual cantidad, sin crear stock vendible artificial. Un pedido cancelado antes de entregar podría exigir reversión auditable. La validación de mínimos por modelo y el cálculo por variante/presentación requieren decisión de G04-01, C-G04-A y C-G04-C. Leer [selecciones de G03/G04](09_G03_G04_SELECCIONES.md) antes de elaborar SQL.
