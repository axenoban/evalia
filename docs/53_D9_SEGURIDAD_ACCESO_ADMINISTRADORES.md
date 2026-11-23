# D9 — Seguridad, autenticación y administradores
Fecha: 23-11-2026. Alcance aprobado por el propietario. Baseline inicial: dev/evalia-core @ 868144f0c7eecbab4dd715882b07f25b8578f356.
Estado: D9-A candidato; D9-B a D9-D pendientes. No integrar sin validación explícita.

## D9-A — acceso y protección web inicial
- Formulario POST con identificadores estables, autocomplete username/current-password y lectura FormData para admitir autocompletado del navegador; opción mostrar/ocultar. Nunca guardar contraseñas en almacenamiento propio. El gestor del navegador decide si ofrece guardarlas.
- Supabase ya persistía sesión y renovaba tokens; se conserva. Ausencia normal de sesión sin mensaje de error. Errores de acceso genéricos.
- Revalidación de identidad y autorización SQL al cargar/refrescar datos y al regresar a pestaña visible; intervalo 60 s mientras visible. Invalida cargas pendientes y limpia estado al cerrar o perder autorización. Cierre fallido mantiene el panel bloqueado y permite reintentar. No equivale a revocar instantáneamente todos los JWT ni a expiración backend.
- Cabeceras globales iniciales (anti-iframe, nosniff, Permissions-Policy, Referrer-Policy, CSP parcial base/object/frame). Mantener no-referrer y no-store en portal. No se afirma que la CSP parcial impida XSS; definir CSP completa y probar Next.js/impresión/archivos. GitHub Pages no aplica headers Next.js.
- No se cambian reglas comerciales, tablas, cuentas, tokens ni despliegue estable.

## Auditoría preliminar del remoto, solo lectura
29/29 tablas public con RLS, 3 buckets privados, 1 administrador. Advisor: 23 SECURITY DEFINER invocables por authenticated (anon sin EXECUTE; controles de admin en cuerpos de operaciones; función is_evalia_admin verifica pertenencia), 1 advertencia de protección de contraseñas filtradas desactivada. No confundir advertencias con vulnerabilidades demostradas. Auditar grants, políticas, RPC y rutas contra identidades reales en entorno aislado. Nunca simular ventas/pagos en remoto comercial.

## Contrato aprobado para los siguientes bloques
D9-B: owner y operator; ambos gestionan negocio; solo owner gestiona usuarios, seguridad y QR. Invitaciones privadas, no registro público. Roles/estado consultados en BD, nunca user_metadata ni botones; bloquear escalada, preservar al último propietario, proteger RPC y Storage del QR, audit trail. Identificar propietario existente antes de migrar; prueba de usuarios sin permiso, operador y propietario, incluyendo API directa. Sin aplicar migración remota hasta pruebas y autorización.
D9-C: MFA con TOTP, recuperación segura, reautenticación para QR/permisos; sesiones de dispositivo personal hasta 30 días, inactividad 30 min, revocación remota y comprobación backend. Evaluar passkeys sin depender de características experimentales. Contraseñas >=15 para nuevas/cambios, no cortar acceso existente sin recuperación. Confirmar plan y capacidades de Supabase; no simular límites de sesión con JS.
D9-D: ASVS 5 nivel 1 y controles seleccionados nivel 2, auditoría de API/portal/tokens/archivos, rate limits, CSP completa, logs sin secretos, dependencias y lockfiles, escaneo de secretos, rotación de credenciales divulgadas, backup y restauración comprobada, monitorización. No declarar cumplimiento/certificación sin evidencia.

## QA de D9-A
CI: npm run check y build Next.js. Prueba en Preview con URL estable y dispositivo personal: 1) sin sesión no aparece error automático; 2) credencial errónea mensaje genérico; 3) Chrome ofrece guardar/autocompletar (si gestor habilitado y sin exclusión de dominio); 4) recarga conserva sesión; 5) mostrar/ocultar no modifica valor; 6) salir elimina datos y no reabre al recargar; 7) dos pestañas, salir en una y comprobar bloqueo de la otra; 8) volver a pestaña valida permisos; 9) portal privado, imágenes y ventana impresión conservan comportamiento; 10) inspeccionar cabeceras de respuesta en Preview. Probar pérdida de perfil y cierre fallido solo en entorno aislado; jamás retirar al único administrador real.
