# EVALIA — Flujos comerciales v0.2

**Estado:** flujos conceptuales con requisitos D01–D18 registrados, todavía no ratificados. No fija estados de pedido definitivos.

## Definiciones distintas
1. **Solicitud:** intención de compra, identificando origen feria, WhatsApp o web (D05). No reservar automáticamente por el hecho de solicitar.
2. **Reserva física:** aparta unidades realmente existentes de una variante; reduce disponibilidad mientras esté vigente (D02/D03). Vencimiento automático configurable sin plazo predefinido (D04).
3. **Encargo futuro:** pedido de unidades que todavía no se encuentran en stock físico, diferenciado de la reserva (D02/D10).
4. **Pedido:** constancia comercial con cliente, líneas, precios acordados y modalidad de entrega; confirmar qué hace con una reserva es G03.
5. **Pago:** registro manual de transacción externa, sin pasarela (D11).
6. **Entrega:** retiro en feria o despacho nacional (D12).

## Recorrido administrativo candidato
Seleccionar contacto → modelo/color/talla → consultar inventario → elegir reserva física o encargo futuro → aplicar lista de precios correspondiente → registrar pedido/pago externo/entrega según reglas por aprobar → conservar auditoría.

## Riesgos a evitar
- No confundir stock físico con cantidad libre para reservar.
- No descontar una segunda vez al convertir una reserva en pedido.
- No suponer que un encargo futuro crea unidades físicas.
- No liberar automáticamente una reserva ya transformada en otro tipo de compromiso sin regla expresa.
- No inferir que el canal web implica registro autónomo de compradores en E1 (D05/D13).
- No tratar pago externo como pago capturado o confirmado electrónicamente.

## Aperturas
G01 plazo y prórrogas; G02 solicitudes públicas; G03 transición reserva/pedido/entrega; G04 formatos y tarifas; G05 conciliación de inventario; G06 pagos y logística; G07 permisos; G08 datos y contactos.

## Adenda: segunda ronda G03/G04 (pendiente de ratificación)
1. Reserva: **solo mayorista**, desde **6 unidades por modelo**; no habilitar reserva minorista por deducción. Se permiten colores mezclados de un modelo, que **tiene una única talla fija** según aclaración posterior; los modelos M y XL son distintos y no suman unidades bajo el mismo modelo.
2. Reserva → pedido: conservar asignación de unidades; pedido directo asigna al confirmarse; **solo reserva pendiente sin convertir vence automáticamente**.
3. **Aclaración posterior de G03-02:** el propietario explica que al confirmar se descuenta la **disponibilidad para aceptar más pedidos**, mientras la existencia física permanece hasta retirar/despachar. La confirmación conserva asignación exclusiva; en entregas parciales baja el stock físico de lo efectivamente retirado/despachado y el pendiente asignado, sin vender dos veces.
4. Cancelación de lo no entregado: liberar asignación e historial; reversión de pedidos confirmados o parcialmente entregados sigue abierta. Encargo futuro: asignación manual de existencias ingresadas.
5. Precios por segmento/presentación, especial de cliente primero, fijación al confirmar, ajuste manual solo admin con motivo e historial. **G04-01 abierto**. Ejemplo de docena Bs 380 no determina precio de 7 unidades ni fórmula por unidad.
6. Mezclas entre modelos permitidas en pedido pero **no suman a un único mínimo mayorista de seis**: la observación exige seis por modelo. **Aclaración posterior:** cada modelo es de talla única; no se combinan tallas para alcanzar seis de un modelo. Sigue pendiente definir presentaciones y precios G04.

Consultar [registro literal de 16 selecciones, ejemplos y conflictos](09_G03_G04_SELECCIONES.md) antes de implementar.

## Vista administrativa para evitar revisiones manuales
Un tablero muestra, con filtros por modelo, talla y color: **físico, reservado en reservas activas, comprometido en pedidos sin entregar, disponible** y **número de reservas activas**. Se puede abrir el detalle de un modelo/talla hasta sus variantes y reservas/pedidos asociados; ningún subtotal sustituye verificar la variante solicitada. Ver [panel](10_PANEL_STOCK_ADMIN.md).

## Flujo de captura seleccionado R01–R12 y WhatsApp
1. Publicación manual de modelos/precios/colores en grupo WhatsApp (práctica actual), recepción privada de captura, cantidades y elección de colores o surtido para pedidos menores de una docena.
2. El administrador selecciona cliente existente buscando por teléfono o lo registra con nombre+WhatsApp; no crea cuenta Auth ni fusiona automáticamente duplicados.
3. **Preparación de catálogo:** colores globales registrados antes del modelo → selección de colores del modelo → variantes por modelo+talla+color → alta inicial **manual** de stock por variante.
4. Carrito visual con cantidades por variante y resumen por modelo, con mínimo mayorista vigente de 6 unidades por modelo. Borrador sin bloqueo.
5. Solo en **Guardar reserva** se valida stock real por variante y se bloquea transaccionalmente; exceso → rechazo con corrección; edición controlada con auditoría.
6. Código y WhatsApp manual; vencimiento configurable sin duración inicial; solo administrador confirma el pedido, trasladando reserva a pedido sin segundo descuento. Primera fase no acepta solicitudes públicas autónomas.
7. **Surtido no resuelto:** reservar stock específico exige elegir variantes color+talla; la selección hecha por EVALIA antes del guardado es recomendación, no regla vigente. Ver [selecciones](13_CUESTIONARIO_CAPTURA.md), [flujo](12_FLUJO_CAPTURA_RESERVAS_PROPUESTA.md) y [colores](14_CATALOGO_COLORES_Y_VARIANTES.md).

## Aclaración posterior: surtido con asignación diferida y calidad
La preferencia expresa del propietario es **registrar primero el surtido y asignar colores después**; la calidad real puede alterar el número de prendas vendibles. La recomendación histórica de escoger colores *antes* de registrar el surtido queda **superada para la captura de solicitud**; **sigue abierta** la cuestión de si se puede bloquear un cupo de cantidades sin colores y desde qué evento. Separar **demanda registrada** de **unidades comerciales comprometidas**.
Flujo especializado propuesto: planificar lote de un modelo → anotar entradas/revisión por variantes color+talla → separar prendas aptas de defectos/manchas y registrar merma → registrar solicitud con colores o «surtido a completar» → asignar colores del stock apto más tarde → confirmar pedido → entrega y conciliación. No afirmar que las 11 opciones de color con negro doble estarán completas por docena; es patrón habitual no garantizado. Ver [dominio de producción y calidad](15_PRODUCCION_CALIDAD_SURTIDO.md) y [política pendiente](16_DECISION_BLOQUEO_SURTIDO.md).

## Elección expresa posterior — surtido con cantidad garantizada (B)
**Al guardar una reserva surtida**, el administrador compromete inmediatamente **un cupo de cantidad** del stock físicamente apto del modelo y grupo de variantes elegibles, **aunque los colores se determinen después**. Se conserva el mínimo mayorista vigente de **seis unidades por modelo**. Un surtido de cantidad bloqueada no es una mera solicitud sin stock asegurado. El borrador previo a Guardar reserva no bloquea (R06). **No se garantiza tono concreto** hasta asignarlo; si la talla también es flexible, acordar antes qué variantes participan en el cupo.
La asignación posterior de colores transfiere cupo genérico a asignaciones exactas **sin reducir nuevamente el disponible agregado**. Los pedidos por color y los surtidos compiten por el mismo stock apto, por lo que validar ambos niveles. Si aparece un defecto posteriormente, registrar incidencia e insuficiencia explícita, sin esconderla.
**Cancelación o no retiro:** el propietario no quiere una regla especial por media docena/docena. La liberación/registro procedente se aplicará por cantidades pendientes según las condiciones generales que faltan por definir (G01, G03-B); no programar vencimiento automático al no presentarse.
Ver [B elegida](16_DECISION_BLOQUEO_SURTIDO.md) y [contrato](11_CONTRATO_INVENTARIO.md).

## Flujo preciso con talla implícita por modelo
**Nuevo modelo:** crear modelo con talla fija y colores específicos. Al abrir reserva, buscar modelo ⇒ talla aparece informativa, **no selector que mezcle tallas** ⇒ ingresar cantidad obligatoria ⇒ seleccionar colores fijos o marcar surtido para completar después. **Guardar reserva surtida** aparta cantidad del **total apto del modelo**, sin asignación inicial por color. Cuando el administrador concrete el reparto, convertir cupo a líneas por color sin volver a descontar; al entregar, registrar variantes reales. Un carrito puede contener **modelos diferentes** de tallas y precios diferentes; cada modelo cumple su propio mínimo. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Precios mayoristas y cliente especial (aclaración posterior)
En reserva, el sistema utiliza **precios mayoristas**, no tarifas de venta minorista. Cada modelo tiene **talla única y precio propio** (no heredar permanentemente el precio de talla); un valor **sugerido por talla** ayuda en el alta, pero puede sobrescribirse individualmente. El administrador selecciona cliente con WhatsApp y, si tiene **condición especial configurada**, el pedido muestra/desglosa automáticamente su ajuste elegible; ejemplo **−Bs 10 por docena**. Se mantiene **prioridad de precio especial de cliente G04-07**, precio visible no congelado en reserva y snapshot al **confirmar pedido** (G04-08), excepción manual admin con motivo (G04-09). Queda abierto el cálculo de tarifas y descuento para 6–11 piezas y compra de varios modelos: [especificación](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).
Al crear modelo nuevo: **foto → talla única → precio sugerido editable → colores del maestro**, con selección recordada del modelo anterior/plantilla por talla, revisión y stock manual separado. [Alta rápida de feria](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## Regla posterior de precios calculados — reemplaza hipótesis históricas
**Reservas exclusivamente mayoristas.** Para 6–11 unidades de un modelo: `total_exacto = precio_docena_modelo × n / 12` (420/docena → 6=210 y 7=245). **Cálculo automático**, no ingreso manual por cada cantidad. El modelo tiene talla única y todos sus colores suman al total de ese modelo; surtido que aguarda colores conserva cantidad/precio sin prometer composición específica. **E1 sin descuentos** por cliente especial, regateo ni múltiples docenas. **Nunca descuento a menos de docena**, incluso cuando exista función posterior. Mantener G04-08 precio fijado al confirmar. Sin decisión de redondeo cuando aparecen decimales periódicos; importes >12 todavía abiertos. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Cálculo de importe final confirmado: redondeo a Bs entero por modelo
En la cotización mayorista, para cada modelo sumar sus cantidades de colores (y surtido pendiente) `n`; calcular `P_docena×n/12`; **redondear una sola vez al entero Bs más cercano para ese MODELO**; sumar importes enteros de modelos distintos para el total de pedido. P=380, n=7 → Bs 222. No redondear cada color ni todo el carrito junto. Se conserva modelo+talla única, cupo de stock garantizado sin asignación inicial de colores, **sin descuentos en E1** y precios congelados al confirmar pedido. Si importe exacto es x,50, falta decisión de desempate; no inventar. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Regla RND-02 aprobada y carrito mayorista multímodelo
Al elegir modelo, talla única y cantidad, calcular proporcionalmente su precio de docena (6–11) o la docena completa; redondear una vez **por modelo** al boliviano entero cercano, **salvo parte decimal exacta ,50 que se conserva**. El total del pedido se obtiene sumando estos subtotales, **sin redondeo global**. Ejemplo A 12 unidades P=420 + B 6 unidades P=381 ⇒ **Bs 610,50**. Cada modelo cumple por sí mismo mínimo mayorista 6; se permiten distintas cantidades de modelos en el mismo pedido. El precio no depende de si el surtido ya tiene colores asignados. **No fijar tarifa para >12 de un solo modelo** por esta aclaración; sigue MAY-12. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Cantidad mayorista abierta por modelo — decisión MAY-12
El administrador puede registrar **6, 7, 12, 13, 19, 24 o más prendas del MISMO modelo** sin cambiar su regla monetaria. Total exacto `P_docena_modelo×n/12`, con redondeo EVALIA por modelo (entero cercano, pero **mantener x,50 exacto**); sumar resultados de cada modelo al pedido sin nuevo redondeo. **P=420 n=19 → Bs 665**. El surtido puede mantener colores pendientes y garantía de cupo apto: el total monetario depende de modelo+cantidad, no de la composición posterior. No escalones extra, no descuentos E1. MAY-12 ya está **resuelto**, quedando G04-01 presentación física y otras reglas de inventario pendientes. [Precio](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Reserva: vencimiento de feria con depósito posterior (regla G01 vigente)
Flujo: **Guardar reserva** bloquea cupo de stock apto; determinar fecha de vencimiento por **día local de guardado**: martes/miércoles → **sábado 12:00**, viernes/sábado → **miércoles siguiente 12:00**. Una reserva guardada **sin depósito** y sin convertir en pedido vence bajo esa regla; liberar solo saldos pendientes, con trazabilidad e idempotencia. **Depósito registrado manualmente después de guardar**, si consta recibido antes de la caducidad, **exime del vencimiento automático ordinario**. No mover inventario físico ni devolver dinero automáticamente; no caducar un pedido ya confirmado. **No hay fecha aprobada para lunes/jueves/domingo ni política de extensión final con depósito**; tampoco penalizaciones o cancelaciones parciales. [Contrato G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01: calendario completo con domingo, lunes y jueves incluidos
**Última decisión expresa:** al Guardar reserva con fecha local de **domingo/lunes** calcular vencimiento **miércoles inmediato a las 12:00**; **martes/miércoles** a **sábado de esa semana 12:00**; **jueves** a **sábado inmediato 12:00**; **viernes/sábado** a **miércoles siguiente 12:00**. No generalizar «próxima feria» a los 4 días ya fijados; solo se aplicó a los 3 nuevos. **El vencimiento automático cubre los siete días** si la reserva sigue vigente, sin depósito y sin convertir en pedido. Regla de depósito posterior y separación de stock físico/comprometido intactas. **No inventar plazo posterior al depósito**. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Depósito: semana adicional como tolerancia comercial sin cronómetro inventado
Después de Guardar reserva, puede constar un depósito recibido (incluso registrado posteriormente). La reserva se **exceptúa del vencimiento de feria ordinario** y EVALIA puede **esperar hasta siete días adicionales** para concluir saldo y retiro. **No se sabe si los siete días comienzan al depositar o al vencer la feria**; no calcular ni ejecutar vencimiento de depósito arbitrario. Tampoco se decidió si el final debe resolverse automáticamente o con el administrador. No liberar pedido confirmado ni stock físico por el mero transcurso del plazo; preservar eventos de pago y auditoría. [Contrato G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — ancla aprobada de extensión con depósito
Con depósito recibido antes del vencimiento F de la reserva, calcular **L=F+7 días naturales, 12:00**. La fecha del pago no reinicia el plazo. Mostrar L y conservar el cupo al F. Si alcanza L, **el mecanismo de cierre de reserva depositada NO está aprobado**: no liberar automáticamente inventario ni confiscar/devolver pago sin decisión. Pedidos confirmados no quedan sujetos a reloj de reserva. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L:** al llegar L con depósito, no convertir la reserva en vencida/liberada; poner EN REVISIÓN y presentar seguimiento por WhatsApp **manual**, sin liberar el compromiso G/E y sin tocar S ni el depósito. El pedido confirmado queda fuera de este reloj. Sin respuesta, resoluciones futuras G03-B/G06 no inventadas.

## G03-B — cancelar solo el saldo no entregado de un pedido confirmado
Nueva decisión expresa: si un cliente confirmó 12 prendas, retiró 5 y solicita cancelar 7, el **administrador autoriza** la cancelación **de las 7 pendientes**, preservando 5 entregas históricas. `confirmado=entregado+pendiente+cancelado_no_entregado` en cada línea/modelo; liberar solo los compromisos de 7 pendientes, sin devolver unidades físicas ya entregadas al inventario. La cancelación **aumenta disponibilidad comercial A**, no existencias físicas S. Transición auditada, atómica e idempotente; no volver a aplicar mínimo mayorista contra 5 entregadas. **Pagos, devolución de dinero, reajuste monetario o depósito quedan pendientes G06**; el pedido no se vence por G01. [Contrato](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## G06 — registrar varios abonos y saldo del pedido
**Decisión aprobada:** una reserva puede tener depósito externo registrado manualmente (al alta o después); cuando se confirma como pedido, el depósito **se imputa a su importe, no se vuelve a cobrar ni registrar por duplicado**. El pedido confirmado conserva su precio histórico y admite **múltiples pagos parciales**; calcular `pendiente = total_confirmado − pagos efectivamente recibidos`. Ejemplo 840−200−300=340 Bs restantes. Al completar el pago, el saldo es cero, sin afirmar despacho automático. Ante cancelación G03-B, conservar los pagos/depósitos y **marcar necesidad de conciliación administrativa**; no descontar/reembolsar dinero automáticamente. [G06](22_DEPOSITOS_ABONOS_Y_SALDOS.md).

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
Flujo de pago aprobado: cliente informa pago → **PENDIENTE** → administrador comprueba recepción y **APRUEBA** → **APROBADO/RECIBIDO** se suma una vez al abonado; cualquier aviso sin aprobación no descuenta saldo ni amplía reserva. En E1 el informe puede recibirse por WhatsApp y registrarse manualmente; no se habilita autoaprobación ni portal público por deducción. [G06](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).

## Nuevo flujo cliente de pago E1 vía enlace de pedido (DECISIÓN POSTERIOR)
Admin crea/confirma pedido según reglas anteriores, **comparte manualmente URL privada por pedido**. Cliente abre **solo ese pedido**, ve total/saldo de pagos aprobados, **QR de EVALIA como imagen que puede descargar**, y **Agregar pago**: monto + captura de comprobante (+ fecha/nota). Declaración inicia **PENDIENTE**; revisión admin puede marcar **EN OBSERVACIÓN / RECHAZADO** sin abonar, o **APROBADO/RECIBIDO** con suma una vez tras constatar recepción. La UI no envía ni cobra dinero; **no pasarelas, tarjetas, OCR bancario ni integración WhatsApp**. Enlace no otorga permiso para modificar inventario, pedidos o aprobar pagos. Admin mantiene confirmación R10. Depósitos previos a pedido conservan captura admin/WhatsApp G01, no se inventa enlace de reserva. [Acceso](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md) · [Pagos](25_QR_Y_COMPROBANTES_CLIENTE.md).

## D13-E1 — vigencia del enlace del pedido ya aprobada
Un enlace privado de un pedido permite consultar saldo/QR/declarar comprobantes **durante todo el ciclo ACTIVO**, salvo revocación por administrador. La entrega parcial, el depósito o pago total **no lo cierran**. Después de **recogida física** el **administrador marca TERMINADO/COMPLETADO** y desde entonces el enlace deja de dar acceso, tanto lectura como nueva carga; el historial financiero/pedido sigue en backend. Revocación anticipada y sustitución por token nuevo sobre el mismo pedido activo están permitidas, nunca revivir token anterior. Pedidos cancelados sin recogida y saldo pendiente al cierre requieren política aparte. [D13](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md).

## G03-C — flujo de cierre habitual con pago al retirar (decisión prevalente)
La práctica aprobada es **no entregar normalmente antes de completar pago**. Al recoger, el admin verifica y registra el **abono efectivamente recibido**; solo pagos APROBADOS/RECIBIDOS cuentan para saldo. Registrar retirada física de unidades restantes y entonces admin marca **TERMINADO/COMPLETADO** **solo si saldo exigible=0 y retiro total**. **Nunca crear un pago ficticio por botón COMPLETADO**. Si muy excepcionalmente hubo retirada real sin pagar, mantener pedido **ACTIVO/CON SALDO PENDIENTE**, sin módulo especial de crédito por ahora. El enlace D13 sigue activo hasta cierre admin o revocación. No cerrar por pago total si hay pendientes físicos. [G03-C](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md).

## Aclaración prevalente E1: sin módulo de devoluciones/cancelaciones
En E1 **no implementar** flujo de cancelaciones/devoluciones por el cliente ni reajustes automáticos de stock/dinero; G03-B queda para fase futura. Casos raros se gestionan externamente; COMPLETADO normal continúa exigiendo retiro y pago real aprobado. Cierre excepcional con diferencias aún sin diseño seguro, no bypass. [Alcance](27_SIMPLIFICACION_CANCELACIONES_V1.md).
