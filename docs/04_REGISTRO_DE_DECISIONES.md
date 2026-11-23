# Decisiones EVALIA — Registro D01–D18

**Origen:** respuestas expresas del propietario, 2026-11-22.
**Estado global:** SELECCIONES REGISTRADAS / PENDIENTES DE RATIFICACIÓN. PR #1 en borrador. Ninguna selección equivale a merge aprobado.

| ID | Selección textual del propietario | Estado |
|---|---|---|
| D01 | Administrador: catálogo, reservas y pedidos | Registrada |
| D02 | Reservar stock y registrar encargos futuros por separado | Registrada |
| D03 | Bloquear unidades reservadas del disponible | Registrada |
| D04 | Plazo configurable con vencimiento automático | Registrada |
| D05 | Feria, WhatsApp y sistema web | Registrada |
| D06 | Mayoristas y minoristas, prioridad mayoristas | Registrada |
| D07 | Variantes por modelo, color y talla | Registrada |
| D08 | Inventario exacto con movimientos | Registrada |
| D09 | Listas de precio por cliente/presentación | Registrada |
| D10 | Permitir pedidos futuros diferenciados | Registrada |
| D11 | Registrar pagos externos manualmente | Registrada |
| D12 | Retiro en feria y envíos nacionales | Registrada |
| D13 | Administración registra clientes; cuentas después | Registrada |
| D14 | Administrador y personal con permisos específicos | Registrada |
| D15 | WhatsApp con mensajes predefinidos | Registrada |
| D16 | Evaluar arquitectura después del modelo de datos | Registrada |
| D17 | Web online responsive inicialmente | Registrada |
| D18 | Datos mínimos de contacto y entrega | Registrada |

Todas las filas son **selecciones candidatas a aprobación del producto** y conservan ese estado hasta el consentimiento del propietario.

## Observación tecnológica expresa
**VS Code con Codex, Next.js y Supabase; se podría pasar a VS Code con Claude Code, y solo cambiaría el agente.** Se registra como entorno/stack indicado, no como cierre prematuro de D16. El hosting y la topología de backend se elegirán después del modelo lógico.

## Parámetros abiertos (no inventar)
- G01: duración, prórroga y liberación de reserva.
- G02: alcance del canal web sin cuentas cliente iniciales.
- G03: reserva → pedido → salida física y encargos futuros.
- G04: listas/formatos, mezclas, precios, descuentos e impuestos.
- G05: inventario inicial, correcciones y entradas de producción.
- G06: registro de pagos externos, anticipos y entregas.
- G07: permisos exactos y mecanismo de acceso del personal/admin.
- G08: campos mínimos, consentimiento, acceso, retención.
- G09: arquitectura/hospedaje después del modelo de datos.

## Coherencia
D02/D03/D10 compatibles si reserva de stock real y pedido futuro permanecen separados; D05/D13 compatibles sin asumir checkout público; D01/D14 compatibles al diferir vista personal; D16 y stack informado compatibles cuando se distingue elección de herramientas de arquitectura productiva. Consultar docs/07_REVISION_CONSISTENCIA.md.

## Aprobación
Solo tras revisión explícita registrar: ID · APROBADA · fecha · selección literal · confirmación del propietario. Los Gxx requieren respuesta propia antes de introducir comportamiento comercial.
