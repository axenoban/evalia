# EVALIA — Flujo de registro y captura de reservas v0.2

**Estado:** respuestas R01–R12 registradas por el propietario; el flujo siguiente separa **requisitos expresos**, **recomendaciones** y **reglas todavía abiertas**. Ninguna implementación ni esquema SQL fue autorizado. Fecha 2026-11-22.

## 1. Flujo operativo confirmado hoy

**EVALIA publica modelos con precios y colores en grupo de WhatsApp → cliente envía mensaje privado con captura del modelo y cantidades → EVALIA selecciona modelo, cantidades y colores o «surtido» → administrador registra la reserva.**

No confundir esta secuencia manual con autorización para automatizar WhatsApp, importar capturas, copiar precios a mano de una imagen mediante OCR o hacer pública la reserva.

## 2. Preparación del catálogo — requisitos expresos

1. Registrar **primero los colores en catálogo común** (no preregistro en cada modelo). La lista es reutilizable entre modelos.
2. Registrar el **modelo** con fotografía/datos y asignarle **solo los colores que tendrá ese modelo**. Un modelo puede ofrecer combinaciones de colores distintas de otro, incluso por un único color.
3. Cada **modelo tiene una talla fija**, elegida al crearlo. Asociar existencias a **modelo + color**, cuya talla se hereda del modelo (D07).
4. Cargar el inventario inicial **solo mediante ingreso manual por variante** (R04). La elección excluye una función de importación Excel/CSV de la primera fase.
5. Mostrar en catálogo solo colores asociados a cada modelo, distinguiendo color ofrecido de unidades realmente disponibles. Si cambia la paleta, no borrar datos que tengan historia comercial.

**Propuesta de implementación, no regla comercial:** catálogo `Color` reutilizable, relación `Modelo–Color`, variantes comercializables `Modelo–Color–Talla`, y movimientos de inventario asociados a cada variante. Ver [detalle](14_CATALOGO_COLORES_Y_VARIANTES.md).

## 3. Alta de reserva — requisitos seleccionados

1. **Solo administrador** abre «Nueva reserva» (R01) desde el catálogo visual con buscador y carrito (R05).
2. Buscar cliente por **WhatsApp** (R03), ofrecer coincidencias sin unir registros silenciosamente, o registrar **nombre + número WhatsApp** (R02).
3. Seleccionar modelo enviado por captura en WhatsApp; mostrar su **única talla** y colores disponibles; ingresar cantidades por modelo (y por color cuando el cliente los elige), sin selector para mezclar tallas dentro del modelo.
4. Para pedido **menor de una docena**, el cliente puede seleccionar colores o pedir **surtido** según la práctica descrita. **Nueva aclaración posterior:** en surtido los colores se asignan **después de registrar la operación inicial**, cuando se conoce el stock apto; el mínimo mayorista de 6 por modelo se mantiene y G04 sigue abierto.
5. Preparar un **borrador sin bloquear unidades** (R06). Para surtido con colores por asignar, distinguir una **solicitud no bloqueante** de una posible **reserva de cupo agregado** sin colores; el tipo de compromiso todavía requiere respuesta del propietario, ver [comparativa](16_DECISION_BLOQUEO_SURTIDO.md).
6. Pulsar **Guardar reserva** para selecciones de colores concretos: validar stock por variante y mínimo mayorista; exceso → rechazo y corrección (R07). **Para surtidos sin colores, no definir todavía si Guardar genera solo solicitud o bloquea un cupo agregado**: la regla necesita decisión específica y validación atómica diferente.
7. Al guardarse, generar **código** y permitir crear mensaje de WhatsApp para envío **manual** (R11), con datos autorizados. Evitar implementar envío automático.
8. La reserva tiene vencimiento **configurable**, pero **sin duración inicial decidida** (R09/G01); no fijar 24/48 horas por defecto.
9. Se puede **editar reserva** con revalidación de stock y conservación de historial (R08).
10. Solo administrador acciona **Confirmar pedido** (R10). Convertir reserva transfiere unidades reservadas a pedido pendiente sin descontar otra vez. Un pedido directo asigna una vez al confirmar (G03).
11. Solo interfaz de **administración** en la primera fase; un catálogo/solicitudes de cliente sin cuenta queda para fase posterior (R12).

## 4. Surtido y producción real — aclaración posterior del propietario

**Decisión ya recibida:** cuando el cliente solicita surtido, EVALIA **asigna los colores después del registro inicial**, porque las prendas efectivamente aptas pueden variar tras descubrir manchas o defectos de costura. No elegir colores obligatoriamente antes de capturar el surtido: esta regla **sustituye la recomendación histórica de la primera versión del flujo**.

**Contexto productivo:** habitualmente se fabrican por modelo unas **6–6,5 docenas**, mencionando **once colores y negro repetido** para formar la docena; no existe garantía de cantidades idénticas por color después de la revisión. Registrar lotes, conteos aptos, mermas y defectos sin forzar esa composición.

**Elección comercial que falta:** el registro sin colores puede ser (A) **solicitud sin bloqueo ni garantía**, o (B) **reserva de cupo agregado por modelo/talla**, que protege unidades aunque deje los colores sin elegir. La alternativa B es más acorde con no sobrepasar stock, pero **no se considera aprobada** hasta que el propietario la confirme; requiere talla conocida y controles específicos para impedir doble asignación. Consultar [comparación A/B](16_DECISION_BLOQUEO_SURTIDO.md), [producción/calidad](15_PRODUCCION_CALIDAD_SURTIDO.md) y [R01–R12](13_CUESTIONARIO_CAPTURA.md).

No generar una reserva con unidades «garantizadas» si en realidad se guardó solo una solicitud. No prometer «once colores + negro doble» como composición fija. La asignación posterior de variantes tiene que quedar registrada y validada contra el stock realmente apto.

## 5. Registros resultantes (candidatos, NO SQL definitivo)

- Cliente/contacto sin Auth: nombre y WhatsApp, ID estable, posible segmento e historial.
- Catálogo de colores global; modelos; asignación de colores permitidos por modelo; tallas y variantes.
- Registro de lotes y control de calidad propuesto; entradas manuales de prendas **aptas** por variante, además de defectos/mermas separados, con actores y destinos pendientes G05/G07.
- Solicitud surtido inicial sin colores determinados, con código, cliente, modelo y cantidad; sin equipararla automáticamente a reserva. Reserva de variantes exactas o de cupo agregado solo según modalidad A/B que elija el propietario, vencimiento configurable e historial.
- Pedido enlazado a reserva o creado directamente, con compromisos por variante, precios históricos y entregas parciales.
- Mensajes WhatsApp preparados para envío manual. No copiar capturas ni datos reales al repositorio.

## 6. Seguridad y tests (propuesta)

RLS/validación servidor sobre datos de cliente y movimiento; operaciones de bloqueo bajo transacción PostgreSQL. En caso de elegir cupos agregados, validar tanto el total del modelo+talla como las existencias específicas por color; no permitir doble uso de unidades; pérdidas por defectos se auditan y se tratan como incidencias, nunca se ocultan.

## 7. Pendiente antes de construir las reglas

[Cuestionario y tensiones R01–R12](13_CUESTIONARIO_CAPTURA.md), **modalidad A/B del surtido sin colores** en [decisión pendiente](16_DECISION_BLOQUEO_SURTIDO.md), clasificación de calidad y pérdidas en [producción](15_PRODUCCION_CALIDAD_SURTIDO.md), G01, G03-B, G04-01/04-04 y precio por variante/presentación, G05/G07/G08. La composición por talla y precio sigue sin cerrarse.

**No ejecutar código, migraciones o merge en esta fase.**

## Resolución comercial posterior de la opción A/B (2026-11-22)
**El propietario seleccionó B: garantizar cantidad de una reserva surtida desde que se GUARDA, sin exigir colores al registrar; EVALIA asigna los colores después.** El borrador previo sigue sin bloquear (R06). El sistema debe verificar que existe suficiente stock **apto y no comprometido** dentro del conjunto de variantes elegibles del modelo, y reservar el cupo agregado sin doble compromiso; colores concretos se elegirán en una transacción posterior. Esta aclaración **supera** los pasajes históricos que rotulan A/B como abiertos. La talla ya está fijada por el modelo; se garantiza su **cantidad apta** al guardar, pero no los colores específicos aún pendientes.
La falta de retiro/cancelación no tendrá un tratamiento diferente solo por el volumen media docena versus docena. Siguen pendientes el plazo de vencimiento, reglas de liberación de pedido confirmado, entregas parciales, política de daños, precios y devoluciones. [Contrato B](16_DECISION_BLOQUEO_SURTIDO.md).

## Cierre de tallas por modelo (2026-11-22)
**Un modelo tiene una sola talla**, aunque el catálogo de EVALIA contenga modelos M, XL o 2XL; **no se combinan tallas de un mismo modelo**. El surtido identifica primero modelo ⇒ talla ya conocida ⇒ **cantidad necesaria para guardar** ⇒ colores pendientes de repartir posteriormente. La asignación de colores transferirá cupo agregado del modelo a variantes específicas sin segundo descuento. Un carrito puede contener varios modelos con talla/precio diferentes; cada modelo se calcula y valida separadamente. [Regla canónica](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Registro ágil tras nueva decisión de precios
Antes de recibir pedidos, dar de alta modelos por [flujo de seis o más por feria](19_ALTA_RAPIDA_MODELOS_FERIA.md): foto, talla única, precio propio partiendo de sugerencia por talla, y colores recuperados de plantilla/último modelo (si administrador confirma). En reserva: **solo condiciones mayoristas** y precio configurado por modelo, con beneficio elegible desde ficha del cliente al preparar el pedido. La regla especial ejemplo **−Bs 10 por docena** no define rebaja para 6–11 unidades ni mezclas entre modelos. No aplicar precio de venta minorista en reserva. Mantener congelación de tarifa en confirmación e historial de G04-08. [Reglas](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Cálculo automático del pedido antes de guardar (nueva aclaración)
El administrador elige cliente, modelo de talla fija y `n` unidades (mínimo mayorista 6 por modelo). Para `n=6..11` se muestra **`precio_docena_modelo × n / 12`**, con la política de **redondeo aún por definir** cuando el precio no sea divisible por 12. Surtido puede tener colores pendientes: no impide calcular precio porque modelo y cantidad ya están determinados. **No incluir descuentos en E1**; la condición comercial especial −Bs 10/docena de anteriores preguntas queda aplazada y **nunca** aplica a compras inferiores a doce unidades. Precio final se registra al confirmar pedido conforme G04-08. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Corrección posterior de redondeo para el pedido
**Decisión RND-01:** en captura de reserva mayorista de 6–11 prendas, agrupar por modelo sus colores e importe: `P_docena×n/12` → **redondear total de modelo al boliviano entero más cercano**. Si hay varios modelos, **sumar cada subtotal ya redondeado**. Ejemplo P=380, n=7 → Bs 222. Los colores del surtido pueden asignarse después sin modificar precio. No descuentos E1; no aplicar fórmula 13+ hasta decisión. Para empate exacto x,50 falta criterio (RND-02). Este apartado **prevalece sobre la frase anterior «redondeo por definir»**. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Flujo RND-02 y carrito con cantidades diferentes por modelo
En un mismo carrito/reserva mayorista se puede incluir, por ejemplo, **A: 12 unidades** y **B: 6 unidades**, respetando cada mínimo individual. La cotización por modelo aplica `P_docena×n/12` para 6–11 y precio íntegro para 12; regla de redondeo **entero más cercano salvo que termine exactamente en Bs 0,50: se conserva**. Mostrar subtotales A y B y **sumar sin segundo redondeo**. Con P_A=420, P_B=381 → 420+190,50=**Bs 610,50**. Guardar reserva bloquea stock apto de cada modelo por separado; elegir colores surtidos después no recalcula precio ni toma otra vez cupo. No inventar cálculo 13+ de un mismo modelo. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Reserva/pedido desde seis prendas de cualquier modelo: fórmula continua
**MAY-12 cerrada por aprobación expresa.** La captura acepta cualquier cantidad entera **≥6 de cada modelo** (si stock apto disponible), incluidas 13, 19 y 24; calcular `P_docena×cantidad/12` con regla de entero más cercano excepto x,50 exacto mantenido, **una vez por modelo**. Un carrito con varios modelos suma estos subtotales sin redondeo global. El surtido se aparta por cantidad en el modelo al guardar, colores después; el precio no se duplica por asignación posterior. No crear tramos especiales ni descuentos E1. P=420 n=19 → **Bs 665**. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Paso de expiración por feria y registro posterior de depósito
Al pulsar **Guardar reserva** (R06) se confirma cantidad y se aparta stock apto; según el **día local**, fecha de caducidad calculable: martes/miércoles → sábado 12:00, viernes/sábado → miércoles siguiente 12:00. Mostrar vencimiento al administrador. **Después de guardar**, el administrador puede añadir un **depósito externo** vinculado a esa misma reserva (D11) que, si se recibió antes del vencimiento, **bloquea la expiración ordinaria**; sin decidir duración posterior. Si llega el vencimiento sin depósito aplicable y sigue siendo reserva sin pedido, liberar solo cantidades pendientes, preservando historial. No revivir reservas expiradas mediante depósito registrado tarde. **Lunes/jueves/domingo, comprobación y destino del dinero, prórroga con depósito** pendientes. [Contrato G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Regla posterior G01: todas las reservas guardadas llevan vencimiento calculado
En el administrador, para cualquier día de alta local: **domingo/lunes ⇒ miércoles próximo 12:00; martes/miércoles ⇒ sábado 12:00; jueves ⇒ sábado próximo 12:00; viernes/sábado ⇒ miércoles siguiente 12:00**. Los días nuevos usan próxima feria y los anteriores conservan plazos propios. El depósito externo se puede registrar después y protege de la liberación ordinaria cuando se recibió antes de vencer; **no genera plazo nuevo por deducción**. No se bloqueará guardar una reserva porque sea lunes/jueves/domingo por falta de calendario. Sigue excluyéndose la caducidad de pedidos confirmados; liberación de G/E y sus pruebas deben ser idempotentes. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Etapa posterior: completar pago y retiro en reserva depositada
El administrador puede registrar depósito externo **al crear o posteriormente a Guardar reserva**. Si consta efectivamente recibido antes del vencimiento de feria, la reserva continúa protegida. EVALIA admite **hasta una semana adicional** para que el cliente **pague el saldo y recoja**, pero la cuenta exacta y la liberación al final están pendientes: **no transformar una tolerancia habitual en un `expires_at` elegido arbitrariamente**. La ficha debe conservar la fecha de feria original, el depósito y auditoría; no habilitar cancelación o restitución sin decidir destino del dinero y pedidos parciales. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Flujo G01 — calcular ampliación con depósito desde feria original
Al guardar reserva calcular y mostrar fecha de vencimiento ordinaria F. Si el cliente deposita después del alta **y antes de F**, actualizar vista con **límite L=F+7 días naturales a las 12:00**, no desde el depósito. Por ejemplo martes 2026-11-24 → F 28/11 12:00 → L 05/12 12:00. Protección de cupo G/E al F si el depósito consta recibido a tiempo; no crear una reserva nueva ni reactivar la ya liberada. **No ejecutar liberación automática en L** sin regla de tratamiento del depósito y saldo. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).
