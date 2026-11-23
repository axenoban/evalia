# EVALIA — Flujo de registro y captura de reservas v0.2

**Estado:** respuestas R01–R12 registradas por el propietario; el flujo siguiente separa **requisitos expresos**, **recomendaciones** y **reglas todavía abiertas**. Ninguna implementación ni esquema SQL fue autorizado. Fecha 2026-11-22.

## 1. Flujo operativo confirmado hoy

**EVALIA publica modelos con precios y colores en grupo de WhatsApp → cliente envía mensaje privado con captura del modelo y cantidades → EVALIA selecciona modelo, cantidades y colores o «surtido» → administrador registra la reserva.**

No confundir esta secuencia manual con autorización para automatizar WhatsApp, importar capturas, copiar precios a mano de una imagen mediante OCR o hacer pública la reserva.

## 2. Preparación del catálogo — requisitos expresos

1. Registrar **primero los colores en catálogo común** (no preregistro en cada modelo). La lista es reutilizable entre modelos.
2. Registrar el **modelo** con fotografía/datos y asignarle **solo los colores que tendrá ese modelo**. Un modelo puede ofrecer combinaciones de colores distintas de otro, incluso por un único color.
3. Gestionar tallas conforme a D07 y asociar existencias a variantes **modelo + talla + color**.
4. Cargar el inventario inicial **solo mediante ingreso manual por variante** (R04). La elección excluye una función de importación Excel/CSV de la primera fase.
5. Mostrar en catálogo solo colores asociados a cada modelo, distinguiendo color ofrecido de unidades realmente disponibles. Si cambia la paleta, no borrar datos que tengan historia comercial.

**Propuesta de implementación, no regla comercial:** catálogo `Color` reutilizable, relación `Modelo–Color`, variantes comercializables `Modelo–Color–Talla`, y movimientos de inventario asociados a cada variante. Ver [detalle](14_CATALOGO_COLORES_Y_VARIANTES.md).

## 3. Alta de reserva — requisitos seleccionados

1. **Solo administrador** abre «Nueva reserva» (R01) desde el catálogo visual con buscador y carrito (R05).
2. Buscar cliente por **WhatsApp** (R03), ofrecer coincidencias sin unir registros silenciosamente, o registrar **nombre + número WhatsApp** (R02).
3. Seleccionar modelo enviado por captura en WhatsApp y sus variantes/quantidades disponibles; el sistema muestra totales **por modelo** y desglose de talla/color.
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
**El propietario seleccionó B: garantizar cantidad de una reserva surtida desde que se GUARDA, sin exigir colores al registrar; EVALIA asigna los colores después.** El borrador previo sigue sin bloquear (R06). El sistema debe verificar que existe suficiente stock **apto y no comprometido** dentro del conjunto de variantes elegibles del modelo, y reservar el cupo agregado sin doble compromiso; colores concretos se elegirán en una transacción posterior. Esta aclaración **supera** los pasajes históricos que rotulan A/B como abiertos. La clasificación de talla/mezcla sigue pendiente; no prometer una talla que no se garantizó.
La falta de retiro/cancelación no tendrá un tratamiento diferente solo por el volumen media docena versus docena. Siguen pendientes el plazo de vencimiento, reglas de liberación de pedido confirmado, entregas parciales, política de daños, precios y devoluciones. [Contrato B](16_DECISION_BLOQUEO_SURTIDO.md).
