# EVALIA — D0-C1: stock conservador surtido sin registro individual de defectos

**Fecha:** 2026-11-23. **Estado:** aprobación comercial documentada en rama feature. No SQL, aplicación, PR integrado ni despliegue. Fuente del propietario: «si hay 6 docenas y media, registrar solamente como disponible 6 docenas, surtidas, dandome un margen de maniobra de hasta 6 prendas que pueden estar falladas o manchadas, y si no se sube al catalogo se puede vender de manera fisica en la tienda». También aclaró que las prendas manchadas se descartan sin entregarlas y no quiere invertir tiempo en registrarlas una por una.

## Política aprobada

1. **Alta rápida y conservadora por modelo:** el administrador podrá registrar directamente una cantidad **surtida comprometible** del modelo, sin contar previamente cada color. La talla sigue fija por modelo. La cantidad registrada puede ser deliberadamente menor que toda la producción.
2. **Ejemplo expreso:** si existen **6½ docenas = 78 prendas** físicas, se pueden registrar **6 docenas = 72 prendas** para reservas y pedidos, dejando **6 fuera de EVALIA** como margen para defectos o venta presencial. Son cifras de ejemplo, no fórmula general de «restar seis».
3. **No fichas individuales de calidad:** ni fotos de manchas, ni motivos de descarte, ni registro pieza por pieza, ni un módulo completo de merma/producción en V1. La prenda realmente defectuosa se descarta y nunca se entrega.
4. **Veracidad del cupo:** registrar 72 es válido solo si se puede cumplir con **al menos 72 prendas realmente aptas y libres**, incluso contando posibles sustituciones aptas del margen externo que todavía no se hayan vendido. Si 78 producidas incluyen 10 falladas, solo hay 68 aptas: **no registrar 72**. Registrar el número conservador real que el administrador pueda cumplir.
5. **Fuera del catálogo es fuera del inventario comprometible:** las seis no publicadas no forman parte de S registrado ni se pueden prometer automáticamente a clientes de EVALIA. Si son aptas y libres, pueden venderse físicamente en tienda. Nunca vender por fuera unidades ya comprometidas ni contabilizar dos veces las mismas prendas.
6. **Inventario surtido G:** para entradas agregadas del modelo, usar **disponible declarado = S_registrada − E_registrada − G_registrada** cuando los compromisos E/G consumen el mismo cupo contabilizado. Guardar una reserva G bloquea, confirmar desde reserva conserva G sin duplicar, pedido surtido directo garantiza G una vez. Asignar colores reales y entregar requiere prendas aptas; no aceptar asignaciones que excedan el cupo total ni prometer colores que no fueron verificados.
7. **Defectos posteriores:** si los dañados estaban entre prendas no publicadas y el cupo registrado sigue físicamente cubierto, **no se registra nada**. Si se descubre que el número prometido **ya no puede cumplirse**, no ocultar la falta: corregir el total comprometible de forma agregada con una incidencia y bloquear nuevas asignaciones; no exigir ficha por prenda, ni borrar compromisos/pagos automáticamente. La respuesta comercial ante escasez irreversible requiere decisión específica.
8. **D0-A permanece:** pedidos surtidos confirmados pueden conservar G sin colores hasta preparar entrega. Un color físico debe identificarse antes de retirar; no se modifica precio o depósito por la distribución de colores.

## Ejemplo de disponibilidad

| Operación | Registrado S | Comprometido G | Disponible A | Fuera EVALIA |
| --- | ---: | ---: | ---: | ---: |
| Fabricación ilustrativa 78, carga conservadora 72 buenas | 72 | 0 | 72 | 6 |
| Reserva surtida de 12 | 72 | 12 | 60 | 6 |
| Otra reserva surtida de 60 | 72 | 72 | 0 | 6 |
| Intento de reservar 6 adicionales | 72 | 72 | **0: rechazo** | 6 |
| Confirmar reserva existente sin colores | 72 | 72 | **0: igual** | 6 |

**Advertencia:** el margen físico de seis no es una garantía de seis unidades aptas adicionales; puede incluir prendas defectuosas. No se registra ni se suma al cupo digital salvo nueva alta explícita de unidades realmente aptas y libres.

## D0-C2 — conflicto arquitectónico pendiente

Las decisiones anteriores R04, [14](14_CATALOGO_COLORES_Y_VARIANTES.md), [11](11_CONTRATO_INVENTARIO.md) y [29](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) exigían carga de **stock por variante/color** para garantizar reservas exactas: `S_m = Σ S_c`. La nueva decisión permite cargar **solo S_registrada por modelo sin saber S_c**. No se pueden deducir automáticamente «6 negras» de un total de 72 surtidas, y tampoco sumar 72 genéricas a otras 72 por color sobre las mismas prendas.

**APROBADO D0-C1:** carga rápida por modelo, margen conservador, ninguna ficha por defecto, ventas externas de sobrantes no publicados.

**NO DECIDIDO D0-C2:** cómo se ofrecerán **pedidos de colores específicos** sobre ese stock agregado. Opciones de negocio para elegir posteriormente: **A)** surtido garantizado por total y, si solicitan un color específico, administrador verifica físicamente ese color antes de prometerlo; **B)** mantener conteos verificables por color para reservas exactas mientras el surtido comparte un solo cupo sin duplicaciones. La arquitectura unificada S/E/G no debe programarse sin esta decisión. Conservar la modalidad de color exacto del diseño anterior, pero no simular disponibilidad por color a partir de un total desconocido.

## QA documental (no pruebas ejecutadas)

| ID | Prueba | Criterio |
| --- | --- | --- |
| QC01 | 78 físicas, 72 comprometibles | Registrar S=72, no 78; seis no publicadas |
| QC02 | Sobre 72, reservar 12 surtidas | G=12, A=60 |
| QC03 | S=72, G=72; reservar otras seis | Rechazar, aunque haya sobrante externo |
| QC04 | Convertir reserva a pedido confirmado | G no se duplica |
| QC05 | Venta presencial de 2 prendas excluidas y libres | No cambiar S/G/A registrados |
| QC06 | Encontrar defecto entre las no publicadas | Sin obligación de ficha o ajuste individual |
| QC07 | 78 producidas con 10 falladas | Solo 68 aptas: no declarar S=72 |
| QC08 | Faltante que compromete unidades ya reservadas | Incidencia visible y freno a nuevas asignaciones, sin promesas falsas |
| QC09 | Cliente pide seis negras y solo existe S_modelo=72 | No afirmar disponibilidad de negro sin verificación; D0-C2 |
| QC10 | Dos admins asignan última capacidad surtida a la vez | Solo una asignación exitosa, sin sobreventa |
| QC11 | Confirmar G surtido y luego asignar colores | Conservación del mismo cupo, sin segundo descuento |
| QC12 | Comprobante de pago pendiente | No cambiar inventario ni descontar saldo antes de aprobación admin |

**Siguiente decisión D0-C2:** ¿para un pedido que exige colores exactos, prefieres verificarlos físicamente solo cuando se soliciten o seguir registrando el stock por color? No resolver por inferencia.

**Estado de Git:** solo Markdown en rama feature, PR #1 DRAFT. No SQL ni aplicación.

## D0-C2 resuelto posteriormente (2026-11-23)
El propietario eligió solo cantidad total en docenas por modelo y selección de colores ofertados **sin cantidades por color**. Pedidos surtidos sin composición garantizada, solicitudes especiales gestionadas fuera del sistema en V1. Aprobó además ajustes agregados para ventas físicas, reposiciones y correcciones del total con protección de reservas, sin fichas individuales de defectos. Ver contrato [D0-C2/D/E](33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md) y [D0-F propuesta](34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md). La pregunta D0-C2 arriba queda superada por esta decisión.
