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
