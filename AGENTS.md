# Reglas de desarrollo — EVALIA

Obligatorias para Codex, Claude Code u otros agentes.

## Fuente de verdad
1. Identidad de marca documentada y requisitos aprobados formalmente.
2. D01–D18 en docs/04_REGISTRO_DE_DECISIONES.md: **selecciones registradas, NO ratificadas como especificación definitiva**.
3. Modelo conceptual y preguntas G01–G09, diferenciando hechos de propuestas.
4. Código probado y migraciones versionadas cuando existan.

**No inventar:** precios, plazos, descuentos, mezclas de colores, tallas válidas, estados de pedidos, anticipos, condiciones de envío, permisos de personal o reglas de cancelación.

## Git
Verificar rama, HEAD, historia, archivos y CI. main = publicable, dev/evalia-core = último baseline validado cuando exista, feature/* = pendiente de prueba. No force push, reescritura o merge ciego. Mantener PR #1 como borrador hasta aprobación. Cambios medianos, con QA.

## Entorno
VS Code + Codex, sustituible por Claude Code sin alterar stack ni requisitos. Next.js + Supabase son tecnologías indicadas; D16 deja la arquitectura y el hosting pendientes hasta después del modelo de datos.

## Seguridad
La autorización debe verificarse en BD/API; esconder botones no protege. Supabase: RLS y tests de acceso cruzado. Solo claves publicables en navegador conforme a RLS; nunca exponer secret key ni datos sensibles. Reservas, inventario y confirmaciones deben ser atómicos, auditables e idempotentes. No desplegar datos de negocio reales sin políticas, backups y restauración probada.

No construir SQL definitivo ni imponer defaults comerciales donde existan preguntas abiertas. Distinguir siempre HECHO / REGISTRADO / PROPUESTA / PENDIENTE / APROBADO.

## Segunda ronda comercial — bloqueo documental
Antes de generar modelos/migraciones, leer [G03/G04 registrados](docs/09_G03_G04_SELECCIONES.md). **Reservas solo mayoristas con mínimo de 6 unidades por modelo**; presentaciones exactas pendientes, precio variable según modelo/variante y tarifa configurada. Nunca deducir Bs 380/12 × 7. **Aclaración posterior C-G03-A:** al confirmar se descuenta del **disponible para nuevas ventas**, no del stock físicamente presente; prendas confirmadas quedan asignadas al pedido hasta entrega. Implementar contadores separados, sin doble descuento. Tampoco resolver por cuenta propia una talla por presentación frente al mínimo de seis que puede contar M/XL; pedir decisión al propietario. Mantener PR en borrador.

## Inventario — decisión explicada por el propietario
Leer [contrato conceptual](docs/11_CONTRATO_INVENTARIO.md) y [panel administrativo](docs/10_PANEL_STOCK_ADMIN.md) antes de implementar. La disponibilidad por variante modelo/color/talla debe excluir tanto reservas vigentes como unidades asignadas a pedidos confirmados aún no entregados. Una reserva convertida transfiere compromiso sin contabilizarlo dos veces. Una entrega parcial mueve saldo físico y pendiente de pedido de forma coherente. El dashboard muestra unidades reservadas, cantidad de reservas activas, unidades pendientes de entrega y disponibles; filas agregadas por modelo/talla con desglose de color. No prometer existencias basándose solo en totales agregados. **G03-B cancelaciones parciales y G04 composición/precios permanecen abiertos.**

## Registro R01–R12 y colores previos al modelo
Leer [R01–R12](docs/13_CUESTIONARIO_CAPTURA.md) y [catálogo de colores](docs/14_CATALOGO_COLORES_Y_VARIANTES.md). **Solo administrador** en E1, cliente con nombre y WhatsApp, búsqueda por teléfono sin fusión automática, inventario inicial **manual por variante** sin importador, catálogo visual/carrito, borrador sin bloqueo y guardado transaccional, error de stock corregible, edición auditada, plazo configurable sin valor inicial, confirmación exclusiva de admin, WhatsApp manual y solicitudes públicas futuras. Primero se dan de alta **colores globales**, luego **modelos** y sus colores asignados, después **variantes y stock por modelo+talla+color**. El cliente puede pedir «surtido», pero no se debe bloquear un agregado indeterminado que sobreasigne colores agotados; pendiente aprobación del modo de asignación. Respetar mínimo 6 por modelo en reservas mayoristas y NO inventar tarifa para menos de docena.

## Prioridad EVALIA: fabricación y calidad reales (nueva aclaración)
Consultar [producción/calidad](docs/15_PRODUCCION_CALIDAD_SURTIDO.md) y [bloqueo de surtidos por decidir](docs/16_DECISION_BLOQUEO_SURTIDO.md). El propietario **elige asignar colores del surtido posteriormente**; NO volver a imponer que se elijan antes de registrar la solicitud. Documentar cantidades fabricadas, inspeccionadas, aptas, defectuosas/manchadas y ajustes con trazabilidad. La pauta de 6–6,5 docenas por modelo, once colores y negro repetido es **contexto productivo habitual**, no una lista exacta ni regla rígida. Nunca contar producción prevista o prenda no apta como disponible. **No equiparar registrar surtido sin colores con bloqueo efectivo:** falta decisión entre solicitud sin garantía y bloqueo agregado de cupo; la segunda exige un control transaccional específico sin sobreventa, sin prometer colores concretos. Las aclaraciones posteriores prevalecen sobre recomendaciones anteriores sin alterar su registro histórico.
