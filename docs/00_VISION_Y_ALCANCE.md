# EVALIA · Visión y alcance (borrador v0.1)

Estado: **DESCUBRIMIENTO, NO APROBADO** · 2026-11-22

## Propósito
Centralizar catálogo digital, reservas y pedidos de EVALIA para reducir confusiones de modelos, colores, cantidades, disponibilidad y seguimiento. La primera interfaz será para **administración**, con arquitectura preparada para añadir **personal y clientes** en fases posteriores.

## Contexto confirmado
EVALIA es una marca de moda femenina con foco comercial en mayoristas/revendedoras y público minorista complementario. Su línea inicial incluye blusas Morley con detalles brillantes; a futuro puede expandirse a otras prendas. Opera en Santa Cruz de la Sierra, comercializa presencialmente y mediante WhatsApp, con envíos nacionales. Los datos de negocio específicos (precios actuales, tallas, reglas de reserva, plazos, políticas de pago, envío, cancelación) **no se asumen como requisitos definitivos**.

## Alcance funcional por perspectivas
- **Administración (primera entrega):** gestión de productos/variantes/fotos, disponibilidad, clientes internos, solicitudes, reservas, pedidos, movimientos, seguimiento, reportes básicos y bitácora; sujeto al cuestionario.
- **Personal (evolución):** operar únicamente funciones delegadas, con trazabilidad y permisos independientes.
- **Clientes (evolución):** consultar catálogo, disponibilidad pública y enviar solicitudes o gestionar pedidos según decisiones futuras.

## Límites del MVP recomendados (pendientes de aprobación)
- Sin pago electrónico integrado al inicio; solo constancia de pagos fuera de la aplicación.
- Sin WhatsApp Business API automática al inicio; enlaces/mensajes preparados.
- Sin contabilidad integral, nómina ni producción industrial en la primera fase.
- Sin publicación de precios o existencias internas en repositorio público.

## Conceptos que requieren decisión
**Reserva** podría significar: (a) apartar unidades físicamente disponibles, (b) solicitud de fabricación futura, o (c) cita/turno de atención. No equiparar automáticamente reserva con pedido. Determinar en el cuestionario qué aplica.
