# EVALIA — Entorno QA E1
Fecha: 25-11-2026 Bolivia. El propietario autorizó explícitamente crear evalia-qa dentro de AxeJR Studio solo con costo adicional cero. Supabase cotizó 0 USD/mes y el proyecto fue creado y confirmado ACTIVE_HEALTHY.

## Identidad y separación
- Producción: proyecto Supabase vbedfbijoqcqpzjzawrh, no modificado.
- QA: uhxelvufyukvbqajroja, us-east-1, organización AxeJR Studio, plan gratuito.
- QA se construyó desde cero con 22 migraciones de GitHub en orden, hasta 20261125233809_e1_session_policy.sql, ref a276688b318c402412378ec64b9dfe9634e8b8cd. Aplicadas por MCP; sus versiones remotas son timestamps nuevos, y el nombre de cada migración incluye el nombre original completo. No usar CLI db push ciegamente contra QA, revisar historial y reconciliar antes de futuras migraciones.
- Verificación: 31 tablas públicas, todas con RLS; 0 clientes, 0 pedidos, 0 usuarios, 0 administradores. Predicados admin/owner sin sesión devuelven false. Advisor: ledger privado sin políticas por diseño, 32 advertencias de funciones SECURITY DEFINER invocables por authenticated; revisar contra ACL y autorización explícita de cada función, no desactivar RPC comerciales indiscriminadamente.
- Vercel proyecto evalia: variables Preview limitadas a feature/evalia-e1-estabilidad. URL y clave publicable apuntan únicamente a QA. SUPABASE_SECRET_KEY en esa rama contiene marcador inválido QA_NOT_CONFIGURED para no heredar la clave de producción. Sustituir exclusivamente por la clave secreta del proyecto QA mediante panel Vercel; no compartir en chat/Git/CI. No modificar variables de producción ni otras ramas. Las previews anteriores no son candidatas certificadas.

## Intervención mínima del propietario (panel, nunca credenciales por chat)
1. En el proyecto QA, Authentication > configuración de acceso: desactivar registro público y confirmar TOTP habilitado para enrolamiento y verificación. Configurar la URL del sitio y redirecciones al candidato QA cuando exista; no reutilizar URL de producción.
2. En Authentication > Users crear dos cuentas exclusivas de QA con correos controlados y contraseñas nuevas; confirmar correo desde el panel si corresponde. Facilitar únicamente los UUID no secretos de las cuentas o indicar los correos de prueba para asignar roles owner y operator en public.admin_profiles. No copiar contraseñas, usuarios ni tokens de producción.
3. En API Keys del proyecto QA obtener su clave secreta de servidor. En Vercel proyecto evalia > Settings > Environment Variables editar SUPABASE_SECRET_KEY exclusivamente para Preview / feature/evalia-e1-estabilidad. No modificar la variable general ni la de Production. La clave publicable ya está configurada.
4. Verificar CI integral verde y generar preview nueva para ese commit, probar origen/configuración y permisos antes de entregar URL. El marcador impide pruebas del portal privado hasta configurar la clave.

## QA E1
CI 45725376863: Node y Next con npm ci aprobados, pgTAP 600/600 aprobado; el nuevo ensayo real SDK falló en enrolamiento TOTP. Se habilitó TOTP explícitamente en supabase/config.toml (6c408ca), se conservó código de error Auth sanitizado en mfa-client.js (5931fde). Causa exacta y corrección pendientes de nuevo CI; no declarar aprobada autenticación real todavía. La configuración local no modifica Auth del proyecto remoto.
Mantener PR #25 draft, sin merge ni publicación. No entregar preview mientras CI rojo, falta identidad QA o clave de servidor. E1-01/02 respaldo y restauración, idempotencia restante y aceptación física siguen abiertos.
