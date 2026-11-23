# D9-B1 — Invitación y recuperación privada de cuentas
23-11-2026. Base: V1 consolidada 7564ebb97eb8b9b7566ee611c1dfa5785f098004; CI de esa base: 130 Node, 311 pgTAP, Next.js correcto. No sustituir el desglose de pedidos, catálogo, registro ni D9-A.

## Contrato
- El único administrador existente se convierte en propietario al aplicar migración; si existen más de uno, se detiene y se exige asignación explícita. En una instalación vacía crear el propietario mediante procedimiento seguro de bootstrap. El nuevo rol operativo no puede crear usuarios ni modificar el QR. No permitir otro propietario desde el gestor.
- El propietario abre Usuarios, introduce correo, confirma su contraseña propia directamente con Auth; backend verifica JWT, rol, AMR de contraseña reciente (5 min) y sesión vigente. Supabase Auth envía invitación al correo del nuevo administrador; solo se autoriza un perfil operativo. Si el envío se realiza pero falla el alta del perfil, no hay acceso comercial: revisar la cuenta huérfana sin promoverla automáticamente.
- El usuario recibe enlace nativo de un solo uso sujeto a expiración de Supabase. Abre /cuenta, elige contraseña propia (mínimo 8), vuelve al login. El flujo de recuperación usa el correo de la cuenta, no devuelve URL, token ni contraseña a ningún administrador. La pantalla de recuperación usa sesión aislada y elimina fragmento; al actualizar solicita cierre global de sesiones. Los JWT ya emitidos pueden seguir válidos hasta expirar.
- El propietario puede consultar correo/estado, pedir recuperación, suspender o reactivar operadores. La cuenta propietaria no se suspende. Suspensión invalida autorización comercial por BD, no es revocación instantánea de JWT/archivos firmados. Eventos de invitación, recuperación y estado auditados sin secretos. No habilitar registro público.
- Se conservan operaciones comerciales, RLS y contratos anteriores. Operadores pueden leer QR vigente pero no cambiarlo, subirlo ni eliminarlo. MFA, passkeys, vencimientos de sesiones y auditoría avanzada quedan en fases posteriores.

## Activación imprescindible (no incluida en CI)
1. Validar la migración 016 con Supabase local y respaldo; aplicar una vez a remoto solo después de autorización de despliegue y pruebas. Confirmar propietario único y advisors. No crear cuentas ficticias en la base comercial.
2. Supabase Authentication: desactivar altas públicas, mínimo 8 caracteres, ajustar expiración de enlaces a 30 minutos, configurar SMTP propio y correo remitente verificable. El SMTP compartido de Supabase solo entrega a miembros del equipo del proyecto: NO agregar operadores al equipo Supabase para solucionar el envío.
3. En URL Configuration: permitir exactamente el dominio operativo + /cuenta (y el preview específico durante QA); usar enlace de correo de Auth estándar que redirige con fragmento invite/recovery, no modificar plantillas a PKCE sin adaptar flujo. Verificar redirección y correo de prueba en entorno aislado. No usar dominios comodín amplios.
4. Vercel: EVALIA_ADMIN_ORIGIN (HTTPS sin ruta) o variables automáticas VERCEL_BRANCH_URL / VERCEL_PROJECT_PRODUCTION_URL. SUPABASE_SECRET_KEY existente exclusivamente servidor. El gestor requiere Next.js, no GitHub Pages.
5. QA: propietario invita a destinatario de prueba, enlace llega a su correo, caducidad/reutilización, contraseña privada, login operador, denegación gestor y cambios QR por API, suspensión con sesión abierta, reactivación y recuperación de contraseña por correo. Verificar que V1 completa sigue funcionando, no probar pagos/stock ficticios en producción. CI prueba permisos SQL y contratos, no demuestra entrega SMTP.

## Ajuste posterior aprobado
El propietario prefiere un mínimo de 8 caracteres (23-11-2026). Mantener una contraseña única y difícil de adivinar; recomendar MFA en la siguiente fase. La reducción de longitud es una decisión de usabilidad con menor margen de seguridad que el contrato original de 15 caracteres.


## Activación remota — 23-11-2026
- El propietario confirmó SMTP, redirección exacta y configuración de Auth con mínimo de 8 caracteres. El plan Free no ofrece backups programados; autorizó continuar sin contratar un plan superior ni exigir respaldo previo en esta fase. No se efectuó respaldo completo; riesgo residual registrado.
- CI del commit 4337131358d9dff80b4b40c37b620c105e79505b: Node, Next.js, pgTAP y flujo de Auth/Mailpit aprobados (run 45287165114).
- Migración 016 aplicada una sola vez. Supabase registró versión 20261123232210; se ajustó el nombre del archivo en GitHub conservando íntegro su blob 4c0e3e3881aba7ca4e5e047224ef945b822f39dd. No ejecutar otra vez la versión provisional.
- Verificación: 1 propietario activo, 0 operadores, 0 eventos; 7 pedidos, 3 modelos y 4 clientes antes y después. Ninguna tabla pública sin RLS. Anon no lista cuentas; authenticated no aprovisiona perfiles; service_role sí puede mediante RPC de servidor.
- Prueba pendiente: propietario entra en la Preview de D9-B1, abre Usuarios y envía invitación a un destinatario real autorizado; validar Brevo, canje, contraseña y permisos. No se crearon usuarios ficticios ni se modificaron pedidos reales.
