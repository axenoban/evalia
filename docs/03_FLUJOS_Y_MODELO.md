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
