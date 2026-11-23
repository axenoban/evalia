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
4. **Revocación y renovación:** el administrador debe poder **revocar un enlace comprometido y emitir otro** sin cambiar el número ni los datos del pedido. Los enlaces revocados dejan de dar acceso. **Aún por definir** la expiración comercial por defecto (fecha exacta, cierre de pedido o manual), reemisión y recuperación; **no convertir esta indefinición en enlaces permanentemente válidos al publicar**.
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
| Pedido cancelado/cerrado y enlace aún accesible | **Política de revocación/solo lectura por definir**; no permitir acciones no aprobadas |

## Decisiones pendientes que NO deben inventarse

- **Vigencia exacta de la credencial** de enlace, regeneración al cerrar pedido y reglas de recuperación; la **capacidad de revocarlo** es requisito de seguridad.
- **Visibilidad de datos personales** y detalles sensibles de pago en la pantalla, nivel mínimo final de resumen de pedido.
- **Política de límites/retención** de archivos, evidencias, tamaños, respuestas a intentos repetidos y soporte de rechazo; requisitos técnicos razonables deben validarse antes de publicar.
- **Depósito en reserva antes de confirmación**, si más adelante requiere también un enlace temporal de autoservicio, aún no autorizado.
- **Reembolsos, cancelaciones económicas, método de comprobación bancaria y pagos excesivos** permanecen en G06/G03-B.

**Próximo desarrollo documental:** flujo de QR como imagen + captura obligatoria de comprobante + estados de revisión en [docs/25_QR_Y_COMPROBANTES_CLIENTE.md](25_QR_Y_COMPROBANTES_CLIENTE.md). Sin implementación, SQL ni merge.
