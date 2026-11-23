# EVALIA — Producción, control de calidad, mermas y surtidos posteriores (v0.1)

**ESTADO: contexto operativo descrito + propuesta de sistema especializado. NO RATIFICADO / NO IMPLEMENTADO.** Fecha: 2026-11-22.

## Declaración de negocio

El propietario indica que **los colores de los surtidos se deciden después**, porque algunas prendas se pierden por defectos de confección o manchas y las docenas no siempre quedan completas. Señala una producción habitual aproximada de **6 a 6,5 docenas por modelo**, con **11 colores y el negro repetido** al conformar una docena, pero la disponibilidad final por color puede variar. Quiere registrar también lo que se descarta o aparta, en lugar de controlar mermas por fuera, y pide un sistema especializado para EVALIA.

**Interpretación sin inventar:** 6–6,5 docenas equivalen aritméticamente a unas 72–78 unidades *si se refiere al total del modelo*, pero no se presume que sean existencias reales ni producción por color; confirmar unidad/periodicidad. Once colores, negro «doble», es **referencia de composición habitual**, no obligación por cada docena. No inventar lista de colores, mínimos por tono, tolerancias ni reparto exacto.

## Módulos propuestos para EVALIA, sin implementar

| Módulo | Qué controlaría | Estado |
| --- | --- | --- |
| Maestro de colores y modelos | Colores reutilizables y subconjunto de colores permitido por modelo | Requisito expreso |
| **Lote de producción** | Modelo, fecha/campaña si se define, cantidad prevista, unidades recibidas e incidencias | Propuesta especializada |
| **Revisión de calidad** | Conteos reales aptos y no aptos por talla/color, motivos mancha/falla de costura y otros por definir | Necesidad de registrar incidencias expresamente indicada; diseño propuesto |
| **Inventario vendible** | Prendas aptas efectivamente contadas, no producción prevista ni piezas defectuosas | Control necesario para evitar sobreventa |
| **Merma/retención** | Defectos identificados, destino físico y responsable (pendientes) | Propuesta |
| **Reservas con colores fijos** | Asignaciones exactas por variante modelo+color+talla | Selección R01–R12/G03 |
| **Surtidos con color por asignar** | Solicitudes registradas antes de elegir colores; distinguir compromiso o demanda sin garantía | Momento posterior confirmado, bloqueo no decidido |
| **Pedidos y despachos** | Confirmación, pendientes, entregas parciales y salidas | Selecciones previas, detalles pendientes |

## Proceso recomendado, no política aprobada
1. Crear colores en catálogo maestro; asignar los realmente producidos a cada modelo.
2. Registrar **lote previsto** de producción por modelo, sin aumentar disponibilidad por previsión.
3. Registrar recepción o terminación del lote y contar cantidades **reales** de cada variante, mediante carga manual por modelo+talla+color (R04).
4. Realizar revisión de calidad: clasificar aptas, retenidas por defectos y mermas; especificar motivo y no borrar el historial. No decidir automáticamente si una manchada es reparable o desperdicio.
5. Solamente unidades **aptas y contabilizadas** pueden ofrecerse como stock vendible.
6. Capturar por WhatsApp reserva de colores elegidos o **surtido a completar**. El segundo no recibe colores todavía; su eventual efecto en disponibilidad requiere política definida.
7. Cuando EVALIA elija colores, asignarlos de modo trazable por variante y actualizar compromiso/estado sin doble descuento.
8. Entregas, ajustes y discrepancias quedan auditados; pedidos ya comprometidos afectados por defectos generan incidencia y revisión, nunca silencio.

## Caso ilustrativo (no inventario real)
- Lote previsto de 72 prendas de un modelo.
- Resultan 70 aptas y 2 no aptas por mancha/costura (supuesto ficticio).
- El catálogo registra la **realidad:** 70 aptas, 2 no aptas; no vende 72.
- Una solicitud de surtido por 6 prendas se captura **sin colores**. Si es solo solicitud, su impacto en disponible es 0. Si se ratifica cupo agregado, se resta 6 del total apto asignable del grupo definido (modelo/talla), sin comprometer todavía colores.
- El administrador asigna colores después conforme al stock real, sin forzar la composición nominal de una docena.

## Contabilidad y trazabilidad
- Cantidad prevista ≠ cantidad recibida ≠ cantidad inspeccionada apta ≠ disponible ≠ comprometida ≠ físicamente entregada.
- No ocultar pérdidas mediante corrección de totales sin causa. Registrar la incidencia y su efecto real (defecto visible, reparación, descarte, etc., según políticas por cerrar).
- Si un defecto se descubre **después** de reservar/confirmar, el stock apto debe corregirse aunque cause un déficit comercial; alertar y bloquear nuevas promesas, no falsificar cantidades.
- No descontar un mismo compromiso de surtido dos veces al asignarle colores.

## Definiciones por cerrar (consultar con propietario)
1. ¿La reserva de surtido aún sin colores **bloquea cantidad** del modelo/talla o es mera solicitud sin garantía?
2. ¿En qué momento del proceso se cuentan prendas como aptas? ¿Quién valida calidad? ¿Qué significa reparable, manchada, descartada?
3. ¿El patrón once colores + negro doble es composición preferente o presentación/paquete exigible, y si se acepta composición incompleta?
4. ¿Las 6–6,5 docenas son total aproximado fabricado por modelo por lote o corresponden a otra unidad/periodo?
5. ¿Se garantiza talla antes que color en surtido o también se asigna después? El bloqueo genérico por modelo+talla necesita talla conocida.
6. ¿Cómo resolver déficit de colores o cancelación parcial sin reemplazar prendas sin consentimiento?

## Entregables posteriores a decisión
Modelo lógico específico para lotes, control de calidad, variantes aptas, asignaciones exactas o flexibles y seguimiento; matriz de roles, pruebas de integridad de stock y panel por modelo/talla/color. No SQL ni implementación en este bloque.
