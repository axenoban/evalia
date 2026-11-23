# EVALIA — D13-E1: enlace privado por pedido sin cuenta de cliente (v0.1)

**Aprobación:** 2026-11-22. **Fuente:** el propietario aprobó «esta bien tu recomendacion profesional en ambos casos, tanto para la estructura el pago del cliente como para el acceso del cliente», en respuesta a la recomendación concreta de **enlace único por pedido** como vía de acceso inicial y **vista mínima de cliente para pagos**. **Estado:** decisión de producto aprobada, especificación documental en rama feature, sin implementación, SQL, despliegue ni merge de PR #1.

## Alcance exacto de la nueva excepción E1

**Cambio de alcance posterior a D01/R01/R11/R12/D13:** aunque el primer diseño excluía cuentas e interacción de clientes, **ahora sí se autoriza una vista restringida de autoservicio por pedido mediante enlace privado**. Es una **excepción puntual** para consulta de ese pedido y declaración de pagos; **NO es un portal de cuentas, login, registro de clientes, catálogo público de pedidos ni checkout autónomo**.

- **Origen del pedido:** el administrador mantiene el registro/confirmación de pedidos conforme a R10 y flujo G03; **el cliente no crea ni confirma el pedido por sí mismo** solo por disponer del enlace.
- **Entrega del enlace:** el administrador comparte manualmente con el cliente, p. ej. por WhatsApp (R11). No enviar automáticamente por API ni asumir una integración de WhatsApp.
- **Alcance del enlace:** **un solo pedido concreto**; el cliente puede consultar únicamente **su resumen de pedido**, total confirmado, pagos **aprobados**, saldo pendiente, QR de pago y estado de **sus declaraciones de pago**. Puede usar **Agregar pago** para aportar monto e imagen de comprobante.
- **Prohibiciones cliente:** no autorizar aprobar/rechazar pagos, ver datos de otros clientes o pedidos, cambiar precio, unidades, inventario, estado de reserva, fecha F/L, confirmar/cancelar pedido ni editar depósitos aprobados. Un enlace de un pedido nunca permite enumerar todos los pedidos de un cliente.
- **Administrador:** crea/gestiona el pedido, comparte/revoca enlace y revisa declaraciones. Conserva la única capacidad de pasar un pago a **APROBADO / RECIBIDO** tras constatar ingreso, conforme a G06-VALIDACIÓN. Puede clasificar un comprobante como **EN OBSERVACIÓN** o **RECHAZADO** cuando no coincide, sin contar abono.
- **Sin cuenta de cliente:** el enlace actúa como credencial de acceso de capacidad limitada. Debe tratarse como **secreto**, no como un código de pedido adivinable; quien posee el enlace podría acceder a la vista permitida y adjuntar declaraciones, por lo que se requieren controles fuertes antes de publicar.

## Requisitos técnicos de seguridad para implementar el enlace (derivados; no reglas comerciales nuevas)

1. **URL no predecible:** generar un token aleatorio criptográficamente seguro y de suficiente entropía, **único para ese pedido**. No usar ID secuencial, teléfono, WhatsApp, nombre o código de pedido como credencial. Se puede mantener el código comercial visible **separado** de la credencial.
2. **Validación en servidor:** **cada** solicitud de consulta, declaración y carga se valida en backend y se vincula **exclusivamente al pedido asociado al token**. Nunca confiar en un `order_id` suministrado por el navegador para cambiar de pedido. Rechazar token inválido/revocado y acceso cruzado. Separar endpoints de administrador, protegidos por autenticación y rol, del acceso mínimo del enlace de cliente.
3. **Token secreto:** no guardar token en claro en logs/analítica ni exponerlo en capturas o consultas externas; considerar almacenar **solo digest/verificador** del token en servidor. Evitar filtraciones por referrer a servicios terceros, previsualizaciones, trackers, historial o redirecciones. HTTPS obligatorio. Recomendación técnica: canjear el token por una sesión de alcance estrecho en cookie segura/httpOnly, sin transmitir credenciales a proveedores terceros.
4. **Vigencia por estado y revocación (DECISIÓN POSTERIOR):** el enlace privado continúa activo **solo mientras el pedido siga activo y el administrador no lo haya marcado TERMINADO/COMPLETADO tras su recogida**. La entrega parcial no equivale a cierre; tener saldo pagado tampoco completa automáticamente el pedido. Tras la transición administrativa a TERMINADO/COMPLETADO, **rechazar acceso y nuevas cargas con ese enlace**. Además, el administrador puede **revocar el enlace en cualquier momento** y **emitir uno nuevo para el mismo pedido mientras permanezca activo**, sin alterar pedido ni historial. Un token revocado nunca recupera acceso. No es necesaria una fecha fija arbitraria: se usa el ciclo de vida del pedido. La recuperación de un enlace y la gestión de cierres especiales siguen sujetos a reglas específicas.
5. **Privacidad:** mostrar solo lo necesario para el pago del pedido; no listar cliente global, inventario interno, notas administrativas, otros pagos/cuentas, documentos internos ni información de otros compradores. No exponer URLs públicas permanentes de comprobantes; acceso a ficheros siempre autorizado y privado.
6. **Cargas seguras:** límite de cantidad/tamaño y tipos de archivo, comprobación real del formato, rate limiting y controles antiautomación, nombres generados por servidor, almacenamiento privado y enlaces de acceso de corta duración. El límite exacto de MB y la política de retención/escaneo requieren validación técnica antes de implementación; no aceptar archivos ejecutables ni SVG.
7. **No usar privilegios de administrador en el cliente:** las operaciones de la vista no pueden invocar endpoints administrativos ni exponer claves privilegiadas de Supabase. Aplicar separación de permisos, RLS cuando corresponda y controles de servidor; nunca usar solo filtros del frontend como protección.
8. **Entrega vía WhatsApp manual:** evitar incluir información sensible en la vista previa del enlace; no asumir que WhatsApp autentica al destinatario. El enlace es una credencial y debe poder revocarse si se comparte o reenvía.

## Estructura visual aprobada para un solo pedido

| Zona visible al cliente | Contenido y permisos |
| --- | --- |
| Identificación | Código de pedido sin revelar claves internas |
| Resumen | Modelos/cantidades/importe confirmado y estado comercial no sensible del pedido |
| Saldo | Total histórico, pagos aprobados, saldo pendiente. Los **pendientes** aparecen aparte, no como abonados |
| Pagar | Imagen QR proporcionada por EVALIA y acción **Descargar QR**; se puede realizar captura de pantalla |
| Agregar pago | **Monto informado en Bs**, **captura del comprobante** y fecha/nota como información adicional; envío = declaración **PENDIENTE DE VERIFICACIÓN** |
| Mis pagos | Historial de declaraciones del pedido con estado **PENDIENTE**, **EN OBSERVACIÓN**, **APROBADO/RECIBIDO** o **RECHAZADO** y observaciones de revisión que el administrador autorice mostrar |
| Contacto | Número/canal de WhatsApp de EVALIA para dudas, sin envío automatizado |

**La vista no incluye** aprobación de pago, modificación de pedido, cancelación por cliente, devolución automática, consulta a otros pedidos, carrito público ni historial global de comprador.

## Reserva previa y enlace del pedido

El depósito puede abonarse **durante una reserva** según G01 incluso antes de que exista pedido confirmado. **Esta decisión aprueba enlaces por pedido una vez registrado**, no crea sin autorización un segundo tipo de enlace público por reserva. **En E1, el cliente puede enviar un comprobante de depósito de reserva por WhatsApp y el administrador lo registra/verifica** conforme a G01/G06. Al confirmar pedido se traslada su **mismo evento monetario** sin duplicación. La extensión a enlaces de reservas antes de confirmar requiere decisión expresa.

## QA de acceso (diseño documental)

| Caso | Resultado esperado |
| --- | --- |
| Enlace válido del pedido A | Solo datos autorizados del pedido A y sus propios pagos |
| Intento de consultar pedido B sustituyendo ID en ruta/cuerpo | **Acceso rechazado**, aunque exista el pedido B |
| URL con código comercial pero sin token secreto | **Acceso rechazado** |
| Enlace inexistente/revocado | **Acceso rechazado**, sin filtrar información sobre otros clientes |
| Dos clientes reenvían/enlazan una URL | Quien conozca el enlace podría acceder a la vista limitada; debe existir revocación; **no afirmar autenticación personal fuerte** |
| Cliente intenta aprobar su propia declaración | **Acceso prohibido**, solo rol administrador |
| Cliente modifica campos no permitidos en petición | Rechazar edición de precio, saldo, pedido, inventario y estados |
| Cliente ve QR y pulsa Descargar QR | Imagen correcta, sin confirmar ni simular cobro |
| Cliente registra pago en A con captura | Declaración vinculada **solo a A**, estado PENDIENTE, sin reducir saldo |
| Cliente crea muchas declaraciones/repite carga | Controles de rate limit y duplicados sin sumar abonos por reporte |
| Pide comprobante de B con token de A | **Acceso rechazado** y fichero B permanece privado |
| Token llega a registros/terceros o archivo público | **Falla de seguridad**: no aprobar despliegue mientras exista filtración |
| Reserva sin pedido confirmado | No generar enlace de pedido inexistente; depósito puede seguir flujo manual G01 |
| Pedido marcado **TERMINADO/COMPLETADO tras recogida**, enlace antes vigente | **Acceso DENEGADO**, incluso consulta, descarga QR y carga de comprobante; mantener historial interno |
| Pedido entregado parcialmente, sin marcar completado | Enlace **ACTIVO** y restringido al mismo pedido |
| Pedido totalmente recogido pero todavía activo/no marcado completado | Enlace **ACTIVO** hasta acción administrativa que cierre el pedido; no autocerrar por entrega o pago aislado |
| Administrador revoca token con pedido activo | **Acceso DENEGADO inmediatamente**; si emite uno nuevo, el antiguo sigue inválido |
| Pedido cancelado o terminado por flujo distinto de recogida | **Política específica pendiente**; no suponer que es un pedido completado con entrega íntegra |

## Decisiones pendientes que NO deben inventarse

- **Vigencia ordinaria ya RESUELTA:** enlace activo mientras el pedido siga activo y **NO** se marque TERMINADO/COMPLETADO tras recogida; al completarse, negar acceso, y el administrador puede revocarlo antes y sustituirlo por otro mientras esté activo. **Pendientes:** recuperación del acceso tras pérdida, cierre excepcional/cancelación sin recogida íntegra, reglas de reapertura y efecto de pago pendiente al cerrar; no inventar caducidad en días.
- **Visibilidad de datos personales** y detalles sensibles de pago en la pantalla, nivel mínimo final de resumen de pedido.
- **Política de límites/retención** de archivos, evidencias, tamaños, respuestas a intentos repetidos y soporte de rechazo; requisitos técnicos razonables deben validarse antes de publicar.
- **Depósito en reserva antes de confirmación**, si más adelante requiere también un enlace temporal de autoservicio, aún no autorizado.
- **Reembolsos, cancelaciones económicas, método de comprobación bancaria y pagos excesivos** permanecen en G06/G03-B.

**Próximo desarrollo documental:** flujo de QR como imagen + captura obligatoria de comprobante + estados de revisión en [docs/25_QR_Y_COMPROBANTES_CLIENTE.md](25_QR_Y_COMPROBANTES_CLIENTE.md). Sin implementación, SQL ni merge.

## ÚLTIMA DECISIÓN D13-E1 — el enlace dura hasta COMPLETADO tras recogida, con revocación (2026-11-22)

**Declaración literal del propietario:** «esta bien el enlace tiene que durar lo que el pedido este activo y por lo menos se marque en terminado o completado, cuando el cliente ya recoja dicho pedido, y como dices en tu recomendacion, el enlace puede ser revocado si se requiere».

**Regla comercial aprobada:** el acceso privado de **UN pedido** funciona **mientras el pedido esté activo**, salvo revocación administrativa. Cuando el administrador verifica la recogida y **marca el pedido como TERMINADO/COMPLETADO**, el enlace **deja de dar acceso**. Esta decisión **reemplaza la anterior incertidumbre sobre la duración del enlace**; **NO** fijar TTL comercial arbitrario de X días ni expirarlo por la fecha de feria G01 (que rige reservas sin pedido, no pedidos confirmados).

**No confundir cuatro hechos distintos:**
- **Pago completo:** reduce el saldo financiero a cero, **pero no marca automáticamente el pedido como terminado** si no se ha recogido toda la mercancía.
- **Entrega parcial:** conserva pendientes y compromisos, **no marca COMPLETADO** ni expira el enlace.
- **Recogida total:** se registra físicamente; el **administrador marca TERMINADO/COMPLETADO** para cerrar el pedido y su acceso. No inventar que un cliente pueda marcarlo cerrado desde su enlace.
- **Revocación del enlace:** puede ejecutarse **en cualquier estado activo**, incluso ante filtración o reenvío de la URL; invalida el token, **no cancela el pedido, no libera inventario ni devuelve pagos**. El administrador puede emitir un **nuevo token único** para el mismo pedido activo sin reactivar el antiguo.

**Garantía de seguridad:** la comprobación de `pedido_activo && !enlace_revocado && !pedido_completado` debe realizarse **en servidor en cada lectura y cada escritura/carga**, no solo al abrir el enlace. Después de completar/revocar, tampoco se deben permitir nuevos comprobantes, accesos a los anteriores, consultas de saldo ni descarga del QR por ese token. Archivos e historial siguen conservados de forma privada para el administrador; invalidar el enlace **no borra ni modifica pagos aprobados o pendientes**. No reutilizar tokens. Si una carga coincide con el instante de cierre/revocación, validar estado al confirmar la operación para no aceptar declaraciones una vez desactivado.

### QA de vigencia por ciclo de vida — documental

| Estado/evento | Enlace | Datos/inventario |
| --- | --- | --- |
| Pedido confirmado con 12 prendas, ninguna entregada | **ACTIVO** | Cliente consulta solo su pedido y reporta pagos pendientes |
| Pedido de 12, entregadas 5, quedan 7 | **ACTIVO** | Las siete siguen comprometidas; no confundir entrega parcial con cierre |
| Pago total aprobado, aún quedan prendas por retirar | **ACTIVO** | Saldo 0 no implica recogida/completado |
| Las 12 recogidas pero administrador todavía no marca TERMINADO | **ACTIVO** | No autocerrar solo por evento de entrega |
| Administrador verifica recogida y marca **TERMINADO/COMPLETADO** | **DESACTIVADO** | Ninguna consulta/carga adicional; historial privado intacto |
| Admin revoca enlace de pedido aún activo | **DESACTIVADO** | Pedido continúa activo, pagos/stock sin cambios |
| Admin emite enlace nuevo para pedido aún activo | **Solo nuevo ACTIVO** | Token antiguo sigue inválido y ambos son exclusivos del mismo pedido |
| Solicitud antigua o carga tardía llega tras completar/revocar | **RECHAZADA en servidor** | No crear declaración ni acceso a imagen privada |
| Pedido parcialmente cancelado pero con entregas restantes pendientes | **ACTIVO mientras no se complete/cierre**, salvo revocación | G03-B controla cantidad pendiente; no inferir TERMINADO |
| Pedido totalmente cancelado sin recogida o con deuda al cierre | **Criterio de cierre especial PENDIENTE** | No inventar devolución ni permitir cierre financiero silencioso |

**Pendiente de negocio separado:** si el administrador puede marcar COMPLETADO con saldo monetario pendiente y cómo se gestiona un pedido cancelado completamente sin retiro. No imponer en esta decisión «saldo=0» como condición obligatoria ni permitir que una deuda se pierda al cerrar el enlace: el pago/deuda persiste en sistema administrativo. Los códigos técnicos concretos de estados son candidatos, no enum SQL aprobada.

**Estado:** vigencia ordinaria y revocación **RESUELTAS**; excepciones de cierre/cancelación/recuperación y reglas monetarias de cierre pendientes. Este bloque es exclusivamente documental; PR #1 DRAFT, sin SQL ni merge.

## ÚLTIMA NORMA DE CIERRE G03-C/G06-C — COMPLETADO requiere pago real y recogida (2026-11-22)
**Respuesta expresa del propietario:** «no pasa eso, el cliente no recoge si no termina de pagar, al menos se debe registrar como pagados si el pedido se confirma como completado, casos de que se recoge sin pagar con muy escepcionales que no considero necesario implmentarlo, o si se implmenta se utilizaria muy pocas veces, en caso de implementarse, no se cerraria, se mantendria como saldo pendiente , pero normalmente deberia registrarse directamente  que el pago se completo con normalidad».
El pedido **normalmente se entrega solo después de completar el pago**. Para que el administrador lo marque **TERMINADO/COMPLETADO** debe constar **saldo exigible Bs 0 con pagos efectivamente recibidos y APROBADOS** y **todas las prendas que corresponda entregar efectivamente recogidas**. **No** se genera ni aprueba un pago ficticio por marcar COMPLETADO; si paga al recoger, primero admin registra/aprueba el cobro real y deja constancia de la entrega. Al terminar correctamente, el enlace privado se desactiva como estaba definido.
**Excepción poco habitual:** si el cliente retira con deuda, conservar la entrega real, mantener **pedido ACTIVO/CON SALDO PENDIENTE** y **enlace activo salvo revocación**. No crear flujo especial de crédito/deuda ni permitir COMPLETADO mientras exista saldo; la administración futura podrá liquidarlo según G06. **Pago informado/captura pendiente NO cuenta como pagado**. Cancelación de cantidades sin entregar G03-B puede requerir conciliación financiera pendiente; no forzar saldo 0 con ajustes inventados. La anterior frase de este documento «si puede cerrar con saldo pendiente está pendiente» queda superada: **no puede**. La política de cancelación total sin entrega sigue pendiente. [Contrato de cierre](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md).

## Aclaración prevalente E1: sin módulo de devoluciones/cancelaciones
La URL cliente E1 solo permite ver pedido/QR/saldo y reportar comprobantes, **sin solicitar devoluciones ni cancelaciones**. El cierre normal pagado+retirado desactiva enlace; un cierre excepcional externo con discrepancias no implica borrar deuda, stock o acceso sin decisión segura posterior. [Alcance](27_SIMPLIFICACION_CANCELACIONES_V1.md).
