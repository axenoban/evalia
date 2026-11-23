# EVALIA — D0-02: modelo de amenazas, controles de acceso y QA transaccional (PROPUESTA)

**Fecha:** 2026-11-22. **Estatus:** revisión técnica/documental, sin aplicación, SQL, pruebas automáticas ni publicación. Complementa [D0-01](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md), [D13 enlace](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md), [G06 comprobantes](25_QR_Y_COMPROBANTES_CLIENTE.md) y [QA E1](28_BASELINE_V1_MODULOS_Y_READINESS.md).

## 1. Límite de confianza y actores

| Actor | Autorizado | Prohibido |
| --- | --- | --- |
| **Admin autenticado** | Catálogo, stock, reservar, confirmar, verificar pagos, entregar, cerrar, revocar | Crear saldo o entregas ficticios, saltar verificaciones o controles transaccionales |
| **Cliente con enlace de pedido** | **Consultar exclusivamente ese pedido**, saldo/aprobados, QR y declaraciones propias; reportar monto+captura | Leer otros pedidos/comprobantes, crear/editar/cancelar pedidos, aprobar pagos, ejecutar stock, forzar COMPLETADO |
| **Invitado sin token** | Ningún dato privado de pedido o pago | Enumerar IDs, acceder a imágenes de comprobantes o admin |
| **Job de vencimiento** | Recalcular F/L y transiciones idempotentes permitidas | Enviar WhatsApp, liberar pedidos confirmados, reactivar reservas con depósitos no aprobados |
| **Servicio/DB** | Aplicar validaciones de servidor y transacciones auditables | Interpretar clave `service_role` como usuario que ya tiene autorización comercial; no exponer secretos a navegador |

**Enlace privado no equivale a identidad fuerte del cliente:** es un token bearer; **cualquiera que conozca el enlace puede realizar las acciones limitadas**. Compartir por WhatsApp manualmente no lo vuelve no transferible. Requerir token aleatorio de alta entropía, cifrado TLS, no derivable del ID del pedido y revocable por administrador.

## 2. Diseño de acceso por enlace propuesto (sin código)

**Flujo recomendado:** el servidor recibe token, compara su verificador almacenado sin exponer secretos, resuelve un único pedido, valida **pedido activo + token no revocado + alcance limitado**, y crea una sesión estrecha protegida o sirve las operaciones por backend con verificación en cada petición. El navegador NO puede enviar `order_id` arbitrario para leer otro ni usar credenciales administrativas. Controlar referrer/logs/previews/caché/redirecciones de enlaces.

- Comprobantes: **bucket privado**, metadata vinculada a pedido y declaración, ruta generada en servidor, tipo real/ tamaño limitados, sin archivos ejecutables/SVG, escaneo/sanitización evaluados antes de producción. No almacenar el comprobante en Github ni CDN pública.
- **Revocación fuerte:** las URLs firmadas temporales ya emitidas pueden seguir válidas **hasta su caducidad**, e incluso objetos almacenados en caché no pueden “desverse” una vez descargados. Si se exige bloquear lecturas **inmediatamente** tras revocación/completado, **servir el comprobante por endpoint autenticado/proxy que revalide token cada vez**, no dar acceso directo persistente mediante signed URL. El navegador puede guardar copias que ya recibió: no prometer borrado remoto.
- Subida de comprobante y registro de declaración no forman una transacción única entre Storage y Postgres. Usar **flujo de carga temporal privada → validación → metadata ligada al pago** con manejo de fallos y limpieza de huérfanos; una subida incompleta **NO crea abono aprobado**. La validez del enlace y estado de pedido se revalidan antes de asociar el archivo; tareas de limpieza nunca eliminan evidencias contables ya ligadas.
- Administrador: autenticar con Supabase Auth o equivalente sujeto a ADR, validar en servidor rol/permiso antes de cualquier mutación; no conceder privilegios por una cabecera o payload del cliente. **RLS** reduce alcance de datos, no reemplaza validaciones de operación ni reglas de negocio. La secret/service key bypass RLS y queda exclusivamente en backend en rutas de mínimo privilegio (evitar exponer funciones genéricas sin control de identidad).
- **QR imagen** proporcionada por EVALIA: no suponer que QR bancario es reutilizable o sin fecha de vencimiento. QR no implica cobro confirmado, nunca mostrar como pago aprobado por descarga.
- Rate limit, tamaño/tipo de archivos, protección anti-CSRF cuando corresponda, mensajes de error no enumerables y registro de incidentes son requisitos técnicos previos a producción; umbrales exactos sujetos a ensayo y configuración, no reglas comerciales aprobadas.

## 3. Pruebas de concurrencia e integridad para ejecutar cuando exista infraestructura

| ID | Prioridad | Preparación y acción | Resultado verificable |
| --- | --- | --- | --- |
| C01 | P0 | Modelo S=6, E=0, G=0; dos admins intentan reservar exactamente 6 al mismo tiempo | Solo una transacción triunfa; `A=0`, nunca E=12 |
| C02 | P0 | Modelo S=12, E=0, G=0; reserva G=6 concurre con reserva exacta E=8 | Solo la combinación legal cabe; no prometer 14 |
| C03 | P0 | Modelo S=12, E_negras=3, G=6; dos reservas exactas de colores diferentes simultáneas | Límite **global A=3** se respeta; aislamiento entre colores no permite 6 extras |
| C04 | P0 | S_negras=3, E_negras=2; S_rosas=9; petición exacta 2 negras | Rechazar por `F_negras=1`, aunque A global alcance |
| C05 | P0 | G=6; asignar 4 negras+2 rosas con stock suficiente | G baja 6, E sube 6, S igual, **A invariable** |
| C06 | P0 | Asignación G→E y vencimiento F disputan misma reserva | Una transición válida; no convertir G en E y después volver a liberar unidades inexistentes |
| C07 | P0 | Guardar 2 modelos, M1 con stock y M2 sin stock | Rechazo conjunto, sin compromiso parcial de M1 |
| C08 | P0 | Reserva exacta E=6, convertir a pedido y repetir 10 veces | Un solo compromiso, titularidad de pedido única, A constante |
| C09 | P0 | Pedido confirmado de 12 unidades, entregar 5 | S baja 5 y E baja 5, A no cambia; 7 quedan pendientes |
| C10 | P0 | Entrega concurrente dos veces de las últimas unidades | Nunca salida física duplicada ni S negativo; historial único |
| C11 | P0 | Llega F con reserva sin depósito, cron ejecutado 10 veces | Liberar E/G una sola vez, S sin cambios |
| C12 | P0 | Depósito aprobado oportuno protege reserva en F; llega L sin cerrar | **EN REVISIÓN** + tarea manual única, E/G/S sin modificar |
| C13 | P0 | Aviso de pago antes de F, aprobación después de liberación | Reserva no revive; conservar incidencia cronológica |
| C14 | P0 | Reserva depositada convertida a pedido antes de F/L | Cron no afecta stock/pedido; abono depositado se vincula una sola vez |
| C15 | P0 | Merma real reduce S por debajo de E+G | Registrar pérdida/alerta de déficit; rechazar nuevas asignaciones; no borrar compromisos |
| C16 | P0 | Cliente reporta 200 en pedido Bs 840; admin aprueba | Antes 840 pendiente, después 640; solo una aprobación; cliente nunca autoaprueba |
| C17 | P0 | Pago ya aprobado se vuelve a asociar a pedido o se reintenta aprobación 10 veces | No duplicar abono; historial único de una recepción |
| C18 | P0 | Pago aprobado total, pero falta retiro | No permitir COMPLETADO ni caducar enlace por saldo cero |
| C19 | P0 | Entrega total, queda saldo aprobado por pagar | No permitir cierre normal, sin generar pago ficticio |
| C20 | P0 | Admin cierra correctamente; petición de carga y cierre concurrentes | Link deja de aceptar escrituras después del commit; historia intacta |
| C21 | P0 | Pedido A con token A solicita B cambiando ID/ruta | Denegar en servidor; ningún dato de B |
| C22 | P0 | Revocar token mientras el cliente tiene una pestaña abierta | Nueva lectura/escritura denegada; antiguo nunca se reactiva tras emitir otro |
| C23 | P0 | Cliente intenta acceso a comprobante ajeno desde A o URL de Storage pública | Denegar; bucket privado; no leaks por signed URL persistente |
| C24 | P0 | Archivo enorme, MIME falso, SVG/script, ruta manipulada | Rechazar sin exposición ni aprobar pago; no almacenar ejecutables públicos |
| C25 | P0 | Crear dos declaraciones duplicadas o reenviar mismo comprobante | Ninguna se aprueba automáticamente; administrador detecta posible duplicado; solo un cobro real validado |
| C26 | P0 | Solicitud de admin intenta ignorar permisos y reserva más que A | API/DB rechaza; no confiar en interfaz |
| C27 | P0 | Pérdida de respuesta al cliente tras commit: reenviar con la misma clave de idempotencia | No repetir efectos de reserva, depósito, entrega o cierre |
| C28 | P1 | Calendario completo y límites 11:59:59 / 12:00, año/mes nuevo en `America/La_Paz` | F/L exactos sin horario del navegador; calendario G01 aprobado |
| C29 | P1 | Precio Bs 381 x 6 + Bs 420 x 12 | Subtotales 190,50 + 420 = Bs 610,50, sin segundo redondeo |
| C30 | FUTURO | Cancelación G03-B de 7 pendientes tras 5 entregadas | **NO implementar como test bloqueante V1**, solo backlog documental |

**Para lanzar:** C01–C29 deben convertirse en tests reales (automatizados cuando sea razonable) y pasar en ambiente de pruebas; C30 no bloquea E1. Estos criterios son **propuestos**, no tests ejecutados.

## 4. Riesgos de seguridad y observabilidad

| ID | Riesgo | Invariante de respuesta |
| --- | --- | --- |
| SEC01 | Token adivinable/filtrado por logs, referer o WhatsApp reenviado | Token fuerte, privacidad de URL, revocación, mínimo dato mostrado |
| SEC02 | Lectura/escritura cruzada entre pedidos por ID sustituido | Bind de acceso al pedido derivado del token en backend; pruebas negativas |
| SEC03 | `service_role` en navegador o backend sin permisos | Secret nunca en cliente; validación en servidor para toda mutación, RLS para datos |
| SEC04 | Storage público o signed URL todavía válida después de revocar | Bucket privado, endpoint autenticado por solicitud si revocación inmediata es requisito |
| SEC05 | Archivo malicioso/masivo y duplicados | Validar real MIME/tamaño, rate limit, uploads privados, idempotencia |
| SEC06 | Pérdida de consistencia por cron/lock multioperación | Transacciones atómicas, jerarquía de locks, retries completos limitados con mismo ID |
| SEC07 | Saldos/cobros ficticios por COMPLETADO | Enlace a eventos monetarios aprobados, entrega física e historial, nunca modificar por etiqueta |
| SEC08 | Datos de clientes y comprobantes retenidos indefinidamente | Retención, privacidad y backups por definir antes de publicar; no inventar políticas legales |

**Revisión de producción previa:** análisis de RLS por rol, threat model del enlace, Storage privado, CSRF/rate limit, logs de auditoría sin tokens, backups restaurados, cron repetible, hora local confirmada y pruebas de carreras reales. El hecho de redactar esta lista NO implica que ninguna de estas protecciones ya esté implementada.

## 5. Decisiones por aprobar antes de SQL/publicación

1. **D0-A:** confirmar pedido con G todavía sin colores: ¿se admite y se asignan antes de retirar, o debe fijarse color antes de Confirmar? La primera versión no debe inventar una regla.
2. **D0-B:** esquema de encargo futuro sin inventario y momento de asignación real; no bloquear existencias inexistentes.
3. **D0-C:** ajustes/mermas auditados y criterio ante merma que provoca sobrecompromiso.
4. **D0-D:** transferencia anterior a F aprobada después, y rechazo/corrección de abonos, sin resurrección automática.
5. **D0-E:** arquitectura final transaccional y autentificación admin + sesiones de enlaces, garantías de revocación, almacenamiento privado.
6. **D0-F:** QR válido, retención y política de privacidad de comprobantes, host/cron y backups.

**Resultado:** matriz QA y controles técnicos **documentados**; permisos, transacciones y tests aún **no implementados ni validados contra PostgreSQL**. El siguiente paso recomendado es revisar D0-A/D0-C como decisiones que afectan las transiciones esenciales, antes de diseñar SQL.
