# E1-04 / E1-05 — Contrato de MFA y sesiones
Estado: preparación, sin activación. Decisiones D03 y D04 del plan V1.1: TOTP obligatorio para propietario, optativo para operadores, sesión de hasta 30 días y reautenticación sensible. No exige plan superior. No modificar producción antes de autorización.

## Evidencia de arquitectura (consulta remota solo lectura)
46 políticas RLS public/storage: 45 utilizan is_evalia_admin o is_evalia_owner; la excepción es profile_self_read (lectura exclusiva de auth.uid() en admin_profiles). Por ello puede conservarse acceso al perfil propio antes de completar MFA sin abrir pedidos ni catálogo. auth.sessions contiene id, user_id, created_at, aal, not_after; auth.mfa_factors contiene user_id, status y factor_type. Revisar también permisos directos y RPC del inventario E1-03.
Documentación oficial consultada: https://supabase.com/docs/guides/auth/auth-mfa y https://supabase.com/docs/reference/javascript/auth-mfa-enroll.

## Flujo previsto
1. Contraseña mediante Supabase Auth; obtener identidad actual y perfil propio activo. No cargar workspace antes de autorización.
2. Propietario sin factor TOTP verificado: pantalla de enrolamiento. Crear factor, mostrar QR solo durante el proceso, desafío y verificación de código. No guardar secretos TOTP, QR, OTP ni contraseña en almacenamiento, logs o analítica; borrar estado al salir/cambiar usuario.
3. Operador sin factor: puede continuar. Operador que voluntariamente activa TOTP requiere AAL2 en accesos siguientes. Factor no verificado no cuenta.
4. Con factor verificado y AAL1: desafío. Sesión AAL2 no es suficiente por sí misma; confirmar con servidor antes de cargar datos. Datos inconsistentes, errores, factor incompatible o cuenta suspendida: bloquear, ofrecer reintento/recuperación. No suponer que un error equivale a ausencia de factor.
5. Validar misma identidad antes y después de cada operación asíncrona, invalidar generaciones en cierre/cambio de usuario y limpiar datos comerciales al perder acceso. Usar SDK MFA; no realizar llamadas a Auth dentro de callback onAuthStateChange.
6. La máquina pura web/lib/mfa-flow.js solo determina presentación, no concede autorización. Aún no está conectada a HomePage.

## Política efectiva prevista (pendiente implementación y QA)
- Reforzar is_evalia_admin/is_evalia_owner mediante un predicado compartido de acceso que verifique perfil activo, sesión real ligada a auth.uid y session_id firmado, edad absoluta desde auth.sessions.created_at inferior a 30 días y not_after cuando corresponda. No renovar antigüedad con refresh ni basarse en reloj de navegador. AAL2 obligatorio para owner y para operador con factor verificado. Comprobar factor verificado vigente para evitar aceptar un AAL2 anterior a eliminación de factores. No basarse en user_metadata.
- Reautenticación: conservar contrato existente de contraseña reciente (300 segundos) para acciones de cuentas; aplicar también al cambio de QR junto con sus políticas de escritura Storage. Completar desafío MFA de la nueva sesión antes de ejecutar operación protegida. Verificar credenciales y AAL desde servidor/BD; no confiar en un checkbox o variable de UI. No exigir contraseña en cada operación comercial ordinaria.
- No cambiar permisos service_role de portal privado ni romper recuperación/invitación. El acceso de cliente por token no es sesión administrativa. Revisar URLs firmadas emitidas antes de revocación: no prometen revocación instantánea.
- No habilitar un bypass temporal de AAL2 para el propietario en producción. Si el nuevo flujo requiere despliegue previo, ensayar secuencia completa en entorno aislado; activar política únicamente cuando exista cliente compatible y propietario haya enrolado factor. Antes de publicar, confirmar procedimiento de emergencia desde panel de Supabase bajo titularidad verificada, copia de seguridad y método de recuperación de autenticador; no permitir desactivar MFA por correo sin comprobación independiente. Factor de recuperación adicional preferible; validar límites y revocación.
- Mantener persistencia nativa de Supabase (dispositivo personal) y comprobar límite en servidor; recordar sesión no implica acceso indefinido ni persistir contraseña fuera del gestor del navegador.

## Matriz obligatoria
Owner AAL1 sin factor: no comercial, sí acceso al flujo de enrolamiento; owner AAL1 con factor: no comercial, sí desafío; owner AAL2 con factor vigente y sesión válida: acceso; owner AAL2 sin factor: denegado. Operador sin factor AAL1: acceso; operador con factor AAL1: denegado; operador con factor AAL2: acceso; operador suspendido, sesión inexistente/revocada/ajena/expirada o JWT sin sesión: denegados. Probar límite 30 días, refresh que no extiende, acceso directo API/Storage/RPC, reautenticación vencida, recuperación e invitación, cambio de identidad, desafío cancelado/código inválido, portal e impresión. Ejecutar Node, Next, pgTAP y QA físico con entorno aislado, nunca datos de clientes reales en CI.

## Dependencia
No activar autenticación nueva ni publicar antes de resolver el CI de E1-03 y versionar su migración. Las pruebas nuevas de estado puro son independientes del SQL y no alteran el login vigente.

## Incremento de implementación
- E1-03: CI 45716595374: 557/557 pgTAP y Node/Next correctos; migración de ACL generada por CLI, versionada como 20261125225217_e1_align_service_role.sql. No aplicada a producción.
- mfa-client.js y mfa-gate.jsx integrados en HomePage, con perfil propio y comprobación server-side antes de workspace. TOTP manual, secreto solo en memoria; opción voluntaria de enrolamiento de operador. No habilitar esta Preview contra datos comerciales para QA.
- Gestión de cuentas y cambio de QR usan sesión efímera propia de reautenticación con contraseña + TOTP; cierre scope local. Validar en prueba física que no invalide la sesión principal, y ensayar recuperación de factor. QR no borra objeto tras resultado incierto.
- Candidato ops/security/e1-session-policy.sql: predicado privado de sesión vinculada a auth.uid, 720 horas, not_after, AAL y factor verificado; predicados admin/owner conservan firmas y grants; QR escritura exige contraseña reciente/MFA, borrado protege QR publicado. CI genera migración con CLI en entorno local. Pendiente materializar archivo versionado y retirar generación temporal tras verde.
- 13 archivos históricos pgTAP adaptan solo sus fixtures de autenticación (sesiones/claims y factor sintético para propietario), sin eliminar aserciones comerciales. Nuevo 091_e1_sessions_mfa.sql aporta 27 comprobaciones. No se ha probado aún la interacción real con SDK/Auth. No publicar hasta CI y QA física aislada.
- La prueba de respaldo en equipo del propietario sigue siendo requisito independiente para E1-01/02; se corrigió el flag oficial de CLI --db-url antes de iniciar el ensayo.

## Cierre técnico incremental — 25-11-2026
- CI 45722791727 (HEAD 6850882): 600/600 pgTAP en 21 archivos, Node, Next y auditoría npm sin vulnerabilidades reportadas. No equivale a aprobación de QA física.
- La migración generada por CLI en esa ejecución, `20261125233809_e1_session_policy.sql`, quedó materializada con el contenido concatenado de los dos candidatos SQL que pasaron la regresión. Se retiró la generación dinámica del workflow. No aplicada a producción.
- `web/package-lock.json` quedó versionado a partir de la compilación auditada (artefacto 15073320693, 34722 bytes; 63 entradas); los workflows principales utilizan npm ci. El lockfile resuelve Next 16.4.6, React/React DOM 19.3.1 y supabase-js 2.119.2. Repetir regresión sobre el HEAD definitivo.
- `web/tests/e1-auth-live.mjs` añade integración con Auth real, MFA TOTP, reautenticación efímera, concurrencia de altas y caducidad de sesión. Solo ejecuta si el proyecto y puerto corresponden al stack desechable de GitHub Actions; nunca acepta conexiones remotas. Resultado pendiente al registrar este cambio.
- Infraestructura revisada: un único proyecto Supabase comercial y ninguna rama de base de datos de pruebas. No utilizar despliegues Preview conectados a producción. Para QA web externa, elegir y autorizar un proyecto Supabase independiente de coste adicional cero, configurar variables exclusivas del candidato y verificar migraciones, identidad y ausencia de datos reales antes de entregar URL. No desplegar ni activar políticas de producción.
- E1 no se da por cerrado: además del CI actual, faltan QA física, recuperación real de respaldo y los puntos pendientes de idempotencia/seguridad que registra la auditoría (en particular alta de modelos y acciones compuestas).
