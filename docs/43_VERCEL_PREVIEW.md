# EVALIA — publicación completa Next.js en Vercel (candidato)

**Fecha de preparación:** 23-11-2026. **Estado:** rama feature preparada; despliegue Vercel pendiente de autorización del equipo. Esta guía no indica que exista todavía una URL de Vercel.

## Baseline aprobado

- El propietario validó la experiencia publicada en GitHub Pages el 23-11-2026.
- `dev/evalia-core` contiene el commit aprobado `fd12d8260e4fd48f6dd4fb85cfc0bb6f5d35ff47`, que incluye el panel y el backend Next.js completo.
- `main` sigue sin modificaciones; esta rama `feature/evalia-vercel-preview` nace directamente del baseline aprobado, sin merge.
- La versión accesible actualmente desde navegador continúa en https://axenoban.github.io/evalia/ y es una **vista administrativa estática**.
- El código del backend Next.js está en `web/app/api/`, `web/app/pedido/`, `web/app/p/[token]/`. `web/scripts/prepare-pages.mjs` es **exclusivo del workflow GitHub Pages** y no se ejecuta en Vercel.

## Plan de despliegue Vercel

1. Conceder acceso del conector de Vercel al equipo dueño del proyecto. No usar una cuenta o equipo diferente sin comprobar su propiedad.
2. Revisar si `axenoban/evalia` ya existe como proyecto en Vercel antes de crear otro. Configurar proyecto para el repositorio GitHub correcto.
3. **Root Directory = `web`**, framework `Next.js`, Node.js 22. Mantener configuración de Next.js servidor; **NO usar `output: 'export'`** ni fijar un `basePath` para Vercel.
4. Utilizar despliegues **Preview** desde `feature/evalia-vercel-preview`. No desplegar `main` (que no contiene aún la versión aprobada) ni promover a producción hasta pruebas funcionales.
5. Configurar los siguientes secretos/env vars **directamente en Vercel** para entorno Preview:
   - `NEXT_PUBLIC_SUPABASE_URL=https://vbedfbijoqcqpzjzawrh.supabase.co` (dato público).
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública del proyecto (dato público por diseño).
   - `SUPABASE_SECRET_KEY`: **clave secreta del backend de Supabase**, nunca copiarla en Git, un chat o una variable `NEXT_PUBLIC_`.
6. Confirmar que GitHub Actions pasa Node, compilación Next.js 16 y pgTAP antes de tomar como válida la URL.
7. Comprobar la vista administrativa con Supabase Auth y, en un entorno de datos aislado, las rutas `/p/{token}`, `/pedido`, `/api/cliente-pago` y `/api/cliente-qr`. El backend debe negar consultas con enlace revocado, suplantación de pedido y archivos inválidos.
8. **No enviar un enlace de Preview a compradores** ni abrir un entorno desprotegido con acceso a pruebas financieras. Mantener protección de despliegue compatible con la prueba administrativa; al pasar a producción se revisará la accesibilidad pública del enlace de cliente y su token.

## Acceso a Supabase y cautela con datos reales

La base remota ya contiene al menos un pedido comercial y un administrador. Ninguna prueba debe aprobar pagos ficticios, registrar retiros ficticios, ajustar stock real o cerrar pedidos existentes. Las pruebas transaccionales automatizadas de CI usan una instancia local con rollback.

No inventar cuentas bancarias ni reutilizar códigos QR no comprobados. La gestión del QR y de los comprobantes solo se habilita si existe backend Next.js con credenciales server-only protegidas.

## Validación requerida

- URL de Preview de Vercel y estado READY confirmados con herramienta de despliegue (no inferir URL).
- Next build, endpoints server y autenticación administrativa.
- Verificar headers `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, cookies seguras y separación de claves.
- Revisión de seguridad del portal de pagos, recuperación ante fallos, móvil y desktop.
- El usuario aprueba la prueba física. Solo después considerar integración a baseline y una versión publicable.

**Bloqueador actual:** autorización Vercel para el equipo asociado a la conexión. La publicación de GitHub Pages aprobada permanece intacta.

## Bloqueo verificado del conector Vercel (23-11-2026)

La autorización del equipo `galaxian131-9858` ya funciona. Sin embargo, Vercel respondió al intentar crear el proyecto vinculado a `axenoban/evalia`:

> Failed to link axenoban/evalia. You need to add a Login Connection to your GitHub account first.

No se creó proyecto ni despliegue Vercel; la lista de proyectos `evalia` del equipo sigue vacía. El requisito es **conectar GitHub como Login Connection en la cuenta Vercel del propietario**, distinto de autorizar acceso al equipo a través del conector ChatGPT.

Pasos: Vercel Dashboard → avatar → Settings → Authentication → Login Connections → conectar GitHub `axenoban`. Confirmar que Vercel GitHub App tiene acceso al repositorio `axenoban/evalia` (cuenta GitHub → Settings → Applications → Installed GitHub Apps → Vercel). Después volver a intentar la vinculación desde el conector. No crear manualmente otro proyecto ni pasar tokens, contraseña o secretos por el chat.

Documentación oficial: https://vercel.com/docs/accounts y https://vercel.com/docs/git/vercel-for-github.
