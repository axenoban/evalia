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

## Segunda ronda G03/G04 — respuesta del propietario (2026-11-22)
**16/16 decisiones literales**, reglas extra de mayoristas, ejemplos y ambigüedades documentadas en [G03/G04: selecciones](09_G03_G04_SELECCIONES.md). Siguen **seleccionadas y pendientes de aprobación formal**, no fusionadas en main.

- G03: unidades se conservan asignadas al pedido, pedido directo asigna al confirmar, solo reserva sin convertir vence, cancelación libera e historiza, encargo futuro se abastece por asignación manual, entrega parcial habilitada. **G03-02 indica descuento físico al confirmar**: falta precisar cómo se representa una prenda que sigue en almacén y qué se revierte en una cancelación.
- G04: **G04-01 está pendiente de definición**; sí se admiten mezclas de colores, mezclas de modelos con total calculado, una talla por presentación, mínimos configurables, tarifas por segmento/presentación, especial de cliente antes de tarifa general, precio fijado en confirmación y cambios manuales solo administrador auditados.
- Condición mayorista adicional: **las reservas solo son para pedidos al por mayor con al menos 6 unidades por modelo**. Ejemplo de docena de Bs 380 y 7 unidades no fija una fórmula ni el precio de ninguna variante.
- **Conflicto a resolver:** G04-04 una talla por presentación frente a observación que permite contar M y XL (diferentes precios) para seis unidades por modelo. Las mezclas entre modelos no anulan el mínimo por modelo.

## Ratificación conceptual adicional de G03-02 (2026-11-22)
El propietario aclara el propósito de su selección «Al confirmar el pedido»: **reducir inmediatamente la cantidad disponible para aceptar otras reservas/pedidos, porque existe una cantidad física limitada**. No quiere revisar modelo por modelo ni reserva por reserva para conocer disponibilidad. **La mercancía sigue físicamente en su poder hasta el retiro/despacho y debe figurar como asignada pendiente de entrega.** Mostrar reservas y existencias por modelo y talla; desglosar color para D07. C-G03-A pasa a **aclaración resuelta a nivel de dominio**; no hay autorización para fusionar PR ni desplegar sistema. C-G03-B (cancelación posterior a entrega parcial) y C-G04-A/B/C continúan pendientes. Detalle: [contrato](11_CONTRATO_INVENTARIO.md) y [panel](10_PANEL_STOCK_ADMIN.md).

## Nueva ronda — R01–R12 seleccionadas (2026-11-22)
Las 12 respuestas exactas se conservan en [registro R01–R12](13_CUESTIONARIO_CAPTURA.md). Incluyen **solo admin inicial**, **nombre y WhatsApp**, **búsqueda por teléfono**, **stock inicial manual por variante** (sustituye sugerencia de importación), **catálogo/carrito**, **borrador sin bloqueo**, **rechazo de exceso**, **edición auditada**, **plazo configurable sin duración inicial**, **confirmación manual admin**, **WhatsApp manual con código** y **web de clientes en fase posterior**. Todas **seleccionadas, pendientes de ratificación**; no se fusiona el PR.

En la observación adicional se establece: **colores globales deben registrarse antes de modelos**, asignar a cada modelo los colores que ofrece, variar ese conjunto por modelo; clientes responden al grupo WhatsApp por privado con capturas y cantidades, y si piden menos de una docena eligen colores o solicitan «surtido» (EVALIA elige). Esto no resuelve G04-01, G04-04, precios ni el momento exacto de asignación de colores en un surtido bloqueante. [Catálogo conceptual](14_CATALOGO_COLORES_Y_VARIANTES.md).

## Aclaración posterior: decisión sobre surtidos y operación de producción (2026-11-22)
**Declaración del propietario:** «lo mejor es asignar despues, ya que hay veses en las que se pierden una que otra prenda por mala costura, por machas y no quedan las docenas completas, nosotros por modelo hacemos 6 docenas a 6 docenas y media, donde hay 11 colores y el negro es doble . con eso se h ace la docena, pero no podemos garantizar que de los 11 o 12 colores las cantidades seran exactas, podemos registrarlo y luego por fuera quitarlo o apartarlo pero seria lo correcto registrar todo para que sea un sistema completo y especializado para evalia, no quiero un sistema generico de reservas».

**Captura de surtido:** la **asignación de colores ocurre después** de registrar la solicitud/operación inicial. Ya no proponemos color obligatorio al primer registro de la solicitud. **No resuelto:** ¿se bloquea desde ese registro cantidad agregada de modelo/talla (sin prometer colores) o se crea solicitud sin garantía hasta asignar? Las dos opciones se contrastan en [DECISION_BLOQUEO_SURTIDO](16_DECISION_BLOQUEO_SURTIDO.md).

**Fabricación y QC:** producción aproximada por modelo 6–6,5 docenas, gama usual de once colores con negro adicional para docena; los resultados reales varían por prendas defectuosas/manchadas. **No son reglas exactas ni datos iniciales de inventario.** Registrar lote, conteos reales por variante y mermas como propuesta especializada en [PRODUCCION_CALIDAD_SURTIDO](15_PRODUCCION_CALIDAD_SURTIDO.md). No eliminar la elección R04 de entrada manual por variante. Pendiente definir inspección, categorías de defectos, destino físico y tratamiento de prendas parcialmente afectadas.
