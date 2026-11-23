# EVALIA — Visión y alcance v0.2

**Estado:** respuestas del 22-11-2026 registradas; pendientes de ratificación.

## Objetivo
Sistema comercial web responsive (D17), con **primera vista de administrador** para catálogo, reservas de existencias y pedidos (D01). Preparado para incorporar personal con permisos separados y cuentas de clientes después (D13/D14).

## Alcance seleccionado
- Dos segmentos: mayorista prioritario y minorista complementario (D06).
- Orígenes: feria, WhatsApp y web (D05); el canal web no implica, por ahora, checkout ni cuentas públicas.
- Producto por modelo-color-talla (D07); inventario exacto y movimientos (D08).
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
