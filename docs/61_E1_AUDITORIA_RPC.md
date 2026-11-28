# E1-03 — Auditoría de RPC y privilegios (25-11-2026)
Consulta de catálogo de producción en solo lectura, baseline dffbb41. Se revisaron las definiciones y privilegios efectivos de 40 SECURITY DEFINER en public. 31 authenticated, 4 service_role, 5 internas. Todas search_path vacío, 0 grants PUBLIC, 0 ejecución anon. Los 31 avisos de advisor son exposición privilegiada autenticada, no 31 vulnerabilidades demostradas. No retirar permisos masivamente: las funciones sostienen flujos ya aprobados.

| Firma | Autorización observada |
|---|---|
| `adjust_model_inventory(uuid,text,integer,bigint,uuid)` | Administrador activo |
| `archive_evalia_model(uuid,timestamp with time zone)` | Administrador activo |
| `archive_evalia_order(uuid,text)` | Administrador activo |
| `can_manage_evalia_accounts()` | Predicado booleano |
| `client_evalia_order(text)` | Servicio (servidor) |
| `client_evalia_payment(text,numeric,text,uuid)` | Servicio (servidor) |
| `complete_evalia_order(uuid,uuid)` | Administrador activo |
| `confirm_evalia_reservation(uuid,uuid)` | Administrador activo |
| `create_evalia_model(text,text,numeric,uuid[],integer,uuid,text)` | Administrador activo |
| `create_evalia_order_delivery(uuid,jsonb,uuid,text,text)` | Administrador activo |
| `create_evalia_order(uuid,jsonb,uuid)` | Administrador activo |
| `create_evalia_reservation(uuid,jsonb,uuid)` | Interna, sin acceso API |
| `create_model_inventory()` | Interna, sin acceso API |
| `evalia_validate_lines(jsonb)` | Interna, sin acceso API |
| `evalia_validate_portions(jsonb)` | Interna, sin acceso API |
| `finalize_evalia_archived_photo(text)` | Administrador activo |
| `flag_stock_shortage(uuid,integer,uuid,text)` | Administrador activo |
| `get_evalia_order_delivery(uuid)` | Administrador activo |
| `get_evalia_order_finance(uuid)` | Administrador activo |
| `get_model_stock(uuid)` | Administrador activo |
| `is_evalia_admin()` | Predicado booleano |
| `is_evalia_owner()` | Predicado booleano |
| `issue_evalia_order_link(uuid,text)` | Administrador activo |
| `list_evalia_admins()` | Propietario |
| `log_evalia_recovery(uuid,uuid)` | Servicio (servidor) |
| `quick_evalia_checkout(uuid,text,uuid,text,boolean,boolean)` | Administrador activo |
| `record_evalia_delivery(uuid,jsonb,uuid)` | Administrador activo |
| `register_evalia_operator(uuid,uuid)` | Servicio (servidor) |
| `report_evalia_payment(uuid,uuid,numeric,uuid,text)` | Administrador activo |
| `review_evalia_payment(uuid,text,uuid,text)` | Administrador activo |
| `revise_evalia_order(uuid,jsonb,bigint,uuid)` | Administrador activo |
| `revise_evalia_reservation(uuid,jsonb,uuid)` | Interna, sin acceso API |
| `revoke_evalia_order_link(uuid)` | Administrador activo |
| `set_evalia_operator_active(uuid,boolean)` | Propietario + contraseña reciente |
| `set_evalia_order_prepared(uuid,boolean,bigint)` | Administrador activo |
| `update_evalia_customer_delivery(uuid,text,text,text,text,timestamp with time zone,uuid)` | Administrador activo |
| `update_evalia_customer(uuid,text,text,timestamp with time zone,uuid)` | Administrador activo |
| `update_evalia_model(uuid,numeric,text,timestamp with time zone,uuid)` | Administrador activo |
| `update_evalia_order_delivery(uuid,text,text,uuid)` | Administrador activo |
| `update_evalia_qr(text,boolean,uuid)` | Propietario |

## Hallazgos y acciones
- is_evalia_admin e is_evalia_owner verifican perfil activo con auth.uid(), pero no AAL, edad ni existencia de sesión. Reforzar en E1-04/05 con transición segura: enrolar propietario antes de exigir AAL2, y comprobar sesión real y antigüedad del lado BD/API, no solo UI. Las pruebas actuales aún no demuestran política MFA.
- can_manage_evalia_accounts exige sesión existente y AMR password de últimos 300 s. Actualización de QR solo exige owner; extender reautenticación a publicación de QR y demás operaciones sensibles según D04, junto con UI y RLS Storage. No cambiar política de QR aisladamente.
- create_evalia_model acepta reintento con mismo request_id sin comparar payload y no exige existencia del archivo inicial; incluir en E1-06 (no romper contratos de reintento actuales). Revisar resultados ambiguos y limpieza de cargas.
- Las RPC de reserva de creación/revisión están cerradas; confirmación histórica, incidencia de stock y funciones de apoyo deben mantener compatibilidad con pedidos previos. No reactivar reservas ni revocar permisos históricos sin pruebas.
- client_evalia_order/payment y register/log_recovery son service_role: preservar aislamiento servidor, tokens de cliente revocables y comprobaciones del actor. No exponer service_role al navegador.
- Nueva prueba pgTAP 090_e1_rpc_permissions.sql: inventario, search_path, ACL PUBLIC/anon y grants efectivos por firma, 28 llamadas sin perfil deben fallar con 42501, 3 predicados deben devolver false. Ejecutar exclusivamente en Supabase local de CI. Un inventario nuevo deberá actualizarse mediante revisión explícita. No sustituye pruebas con operador, propietario, suspensión y sesiones revocadas; ampliar en E1-04/05.

## Costos y continuidad
Equipo privado para respaldo diario confirmado por propietario; activación real y ensayo aislado pendientes, sin gasto adicional. E2 deberá incluir sostenibilidad de cuotas gratuitas, compresión de fotos, limpieza segura de huérfanas/reemplazadas, lazy loading, indicadores y alertas de consumo; preservar historial comercial. Revisión del alojamiento comercial pendiente y sin cambios de proveedor. No aplicar migraciones ni publicar main sin autorización.

## Regresión 45715801845 y corrección de divergencia
Node y Next aprobaron. PostgreSQL: 135/156 aserciones del nuevo archivo pasaron; 21 fallaron por EXECUTE efectivo de service_role en entorno reconstruido (have true, want false), aunque producción no concede esos grants. Los rechazos a usuarios sin perfil y ACL anon/authenticated no fallaron. Se conserva la matriz original, sin modificar asserts. El candidato ops/security/e1-align-service-role.sql revoca exclusivamente esos 21 grants; conserva las cuatro RPC service_role y el acceso administrativo autorizado. Como el entorno de asistencia no dispone de Supabase CLI/Docker ni acceso al registro npm, CI genera temporalmente la migración mediante supabase migration new antes de iniciar su BD aislada. Pendiente materializar esa migración como archivo versionado, retirar el paso temporal y repetir regresión integral; no integrar ni aplicar al remoto mientras tanto.
