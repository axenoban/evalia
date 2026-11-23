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
1. Reserva: **solo mayorista**, desde **6 unidades por modelo**; no habilitar reserva minorista por deducción. Se permiten colores mezclados y el usuario menciona tallas M/XL con precios diferentes sumadas por modelo, sujeto a contradicción G04-04 sobre «una talla por presentación».
2. Reserva → pedido: conservar asignación de unidades; pedido directo asigna al confirmarse; **solo reserva pendiente sin convertir vence automáticamente**.
3. **G03-02 seleccionó descontar inventario físico al confirmar**, pero las entregas pueden ser parciales. Diferenciar confirmación comercial, permanencia material de las prendas, saldo pendiente y movimiento contable; **sin interpretar la palabra físico por cuenta propia**.
4. Cancelación de lo no entregado: liberar asignación e historial; reversión de pedidos confirmados o parcialmente entregados sigue abierta. Encargo futuro: asignación manual de existencias ingresadas.
5. Precios por segmento/presentación, especial de cliente primero, fijación al confirmar, ajuste manual solo admin con motivo e historial. **G04-01 abierto**. Ejemplo de docena Bs 380 no determina precio de 7 unidades ni fórmula por unidad.
6. Mezclas entre modelos permitidas en pedido pero **no suman a un único mínimo mayorista de seis**: la observación exige seis por modelo. ¿Presentación de una sola talla o suma de tallas separadas por modelo? Sin resolver.

Consultar [registro literal de 16 selecciones, ejemplos y conflictos](09_G03_G04_SELECCIONES.md) antes de implementar.
