# EVALIA — Visión y alcance v0.2

**Estado:** respuestas del 22-11-2026 registradas; pendientes de ratificación.

## Objetivo
Sistema comercial web responsive (D17), con **primera vista de administrador** para catálogo, reservas de existencias y pedidos (D01). Preparado para incorporar personal con permisos separados y cuentas de clientes después (D13/D14).

## Alcance seleccionado
- Dos segmentos: mayorista prioritario y minorista complementario (D06).
- Orígenes: feria, WhatsApp y web (D05); el canal web no implica, por ahora, checkout ni cuentas públicas.
- Producto por **modelo con talla única**, colores asignados por modelo y stock por **modelo+color** (la talla se hereda del modelo; D07); inventario exacto y movimientos (D08).
- Reserva de stock disponible distinta de encargo futuro (D02/D10); reserva vigente bloquea disponibilidad (D03) y vence con plazo configurable y liberación automática (D04).
- Listas de precio por cliente/presentación (D09), **sin tarifas o unidades comerciales fijadas**.
- Registro manual de pagos externos (D11); retiro en feria y envíos nacionales (D12).
- Administración registra contactos inicialmente; usuarios de clientes posteriormente (D13).
- Personal con permisos específicos, a diseñar (D14).
- Mensajes de WhatsApp predefinidos, enviados manualmente (D15).
- Solo datos mínimos necesarios de contacto y entrega (D18).

## Tecnologías expresadas
VS Code + Codex, Next.js, Supabase. Claude Code puede reemplazar Codex sin reabrir el producto. La arquitectura de despliegue queda pendiente del modelo de datos (D16).

## Fuera de acuerdos
Ni anticipo obligatorio ni horas de reserva, descuentos, impuestos, reglas de paquetes, tipos de pago, tarifas de envío, permisos por función, checkout público ni integración automática de WhatsApp se consideran decididos.

La transición reserva → pedido es una decisión comercial aún abierta; **no descontar doble** ni convertir pedidos futuros en existencias.

## Aclaración posterior de reservas y precios (22-11-2026)
La observación directa limita **reservas a pedidos mayoristas, mínimo 6 unidades por modelo**. Esto no equivale a un mínimo global por pedido ni configura ventas minoristas. Se eligió reserva convertida en pedido conservando la asignación; pedido directo asigna stock; vencimiento solo para reservas no convertidas; pedidos futuros reciben stock por asignación manual; entregas parciales permitidas. Las presentaciones exactas **siguen abiertas (G04-01)**. Precios variables por modelo/talla y composición, sin fórmula para el ejemplo de Bs 380. Véase [registro específico](09_G03_G04_SELECCIONES.md). **Revisar los apartados anteriores a la luz de este complemento; no asumir que cualquier reserva minorista se permite.**

## Aclaración explícita de inventario — 2026-11-22
El propietario confirma que el «descuento al confirmar» busca impedir aceptar pedidos por encima de las existencias fijas, **no indicar una salida física inmediata**. Panel requerido: controlar fácilmente por **modelo y talla** cantidades en reservas, cantidad disponible y su estado; el color sigue siendo dimensión de variante por D07. Separar **existencias físicamente presentes**, **unidades en reservas vigentes**, **unidades asignadas a pedidos confirmados aún no entregados** y **disponibilidad para nuevas ventas**. En entregas parciales, el saldo pendiente conserva su asignación. La interpretación anterior de descuento físico debe leerse con esta aclaración posterior. Ver [diseño de panel](10_PANEL_STOCK_ADMIN.md) y [contrato](11_CONTRATO_INVENTARIO.md).

## Registro y captura real — aclaración posterior
R01–R12 seleccionados: administrador único registrador inicial, cliente con nombre y WhatsApp, búsqueda por teléfono sin fusión automática, **solo inventario inicial manual por variante**, carrito visual por modelo/color/talla y bloqueo solo en «Guardar reserva», edición con historial y validación, confirmación manual del administrador, WhatsApp con código enviado manualmente y sin solicitudes públicas en E1. Operativa: EVALIA publica modelos/precios/colores en grupo WhatsApp, compradores envían capturas y cantidades por privado; si piden **menos de docena** eligen colores o piden **surtido elegido por EVALIA**. Primero registrar colores reutilizables y luego asignar a modelos el conjunto de colores propio de cada uno. **No importar Excel/CSV ni automatizar WhatsApp** por deducción. Ver [registro literal](13_CUESTIONARIO_CAPTURA.md) y [modelo de colores](14_CATALOGO_COLORES_Y_VARIANTES.md).

## Necesidad especializada posterior: fabricación, control de calidad y surtidos
La operativa EVALIA precisa registrar **producción por modelo, diferencias reales por color/talla y defectos** (manchas, fallos de costura), no solo manejar reservas genéricas. El propietario describe lotes habituales de aprox. **6–6,5 docenas por modelo**, **11 colores con negro repetido en la composición de docena**; esas cifras son referencia operativa variable, no compromisos de producción ni existencia exacta. Quiso **asignar colores de surtidos después**, cuando conozca disponibilidad real. Ver [producción/calidad](15_PRODUCCION_CALIDAD_SURTIDO.md) y [alternativas de cupo](16_DECISION_BLOQUEO_SURTIDO.md). Posteriormente se eligió **cupo garantizado de surtido**. La talla del cupo es la del **modelo único** y sus colores se asignan después; véase la decisión canónica más reciente.

## Regla expresamente aclarada: talla única del modelo
El propietario confirma que **cada modelo tiene una sola talla**: pueden existir modelos M, XL o 2XL, pero **no se mezclan tallas en un mismo modelo**. El conjunto de colores y la tarifa comercial pueden ser diferentes para cada modelo. El surtido ya identifica modelo y talla; **al registrar la reserva hace falta cantidad (obligatoria para garantizar cupo) y los colores quedarán pendientes para asignación posterior**. Esto sustituye las interpretaciones de G04 que contaban M+XL dentro del mismo modelo, sin modificar el texto histórico de las respuestas originales. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Funciones comerciales nuevas: precio mayorista editable, cliente especial y alta ágil
La reserva sigue siendo **solo mayorista**. Cada modelo de talla única define **su precio propio**, pudiendo partir de una **sugerencia base de precio mayorista por talla**, editable y sin imponer precio homogéneo entre modelos de igual talla. El administrador necesita registrar **aproximadamente seis o más modelos por feria**, con **foto**, colores propios y posibilidad de recordar la selección anterior/usar plantillas habituales por talla. La **ficha de cliente** puede contener beneficio especial (ejemplo **−Bs 10 por docena**), aplicado al armar el pedido. **La aplicación a 6–11 unidades y entre modelos queda pendiente**, así como el contenido de presentaciones G04-01. El precio acordado se congela al confirmar (G04-08). [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md); [alta rápida](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## Vencimiento por feria y depósito posterior (nueva regla G01)
Reserva mayorista guardada sin depósito: **martes/miércoles → sábado mediodía**; **viernes/sábado → miércoles siguiente mediodía**. Se permite **registrar un depósito después de guardar** para protegerla del vencimiento ordinario; destino posterior no aprobado. Días **lunes/jueves/domingo** sin regla; pago/penalización/cancelación con depósito también pendientes. La expiración no altera mercancía física ni libera pedidos ya confirmados. [Política documentada](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — calendario resuelto también para domingos, lunes y jueves
La selección posterior cubre **los siete días**: **domingo/lunes → miércoles 12:00**, **martes/miércoles → sábado 12:00**, **jueves → sábado 12:00**, **viernes/sábado → miércoles siguiente 12:00**. Los días nuevos siguen la feria futura más cercana; se conservan las reglas previas de martes/miércoles y viernes/sábado. **No hay días de alta de reserva pendientes**. El depósito puede registrarse posteriormente y exceptúa la caducidad ordinaria si se recibió a tiempo; nueva vigencia con depósito y G03-B continúan por decidir. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Tolerancia comercial de depósito — regla posterior
Si el cliente ya ha realizado un depósito registrado y recibido a tiempo, EVALIA **puede conservar la reserva hasta una semana adicional** para completar pago y retiro. La práctica habitual no ha superado ese plazo. **No se eligió desde qué fecha contar la semana ni la acción automática al finalizar**, por lo que no se introduce fecha límite ficticia o devolución/penalización inventada. Se preserva el calendario habitual de feria, válido para los siete días. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).
