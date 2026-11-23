# EVALIA — D0-C2/D0-D/D0-E: surtidos por modelo y ajustes simples (APROBADO)

**Fecha:** 2026-11-23. **Alcance:** decisiones comerciales para V1. **Estado:** aprobadas por el propietario; implementación no iniciada. Prevalecen sobre cualquier exigencia histórica de contar/comprometer colores individualmente o registrar defectos uno a uno. Ver también [D0-C1](32_D0_C1_STOCK_CONSERVADOR.md).

## D0-C2 — inventario y selección de colores

1. El administrador registra las **docenas publicables totales por modelo**, de **talla única fija**, y selecciona los colores que se ofrecen en ese modelo a partir del catálogo maestro. La captura inicial **no exige cantidades por color**. Se mencionó que un modelo puede manejar hasta unos 13 colores; esto no establece una obligación de incluirlos todos en una docena ni una composición exacta.
2. Cada reserva/pedido mayorista compromete **cantidad surtida por modelo**, **no colores exactos**. La disponibilidad y la asignación se garantizan únicamente para ese modelo y su talla fija.
3. Ejemplo comercial ilustrativo: una docena podría contener diez colores distintos y dos prendas negras. **No convertir el ejemplo en regla fija**: un pedido no garantiza todos los colores ofertados ni dos negras; depende del surtido realmente apto y libre.
4. **Solicitudes de un color o combinación concreta** se acuerdan y verifican **fuera del sistema** (WhatsApp/presencial) durante V1. No crear pedidos/restricciones de stock por color ni un flujo de «reserva especial» en V1.
5. Los colores del modelo son **atributos informativos del catálogo**. Sin conteos por color, no inferir S_c, disponibilidad por color, ni compromisos E_c. En la entrega se comprueba físicamente que las prendas aptas del surtido correspondan al modelo; **no exigir al administrador que registre cada prenda entregada por color**. Registrar únicamente **unidades efectivamente entregadas por modelo**. Este es el alcance V1 posterior que sustituye el requisito documental anterior de G→E por variantes para toda entrega.
6. **No implementar variantes inventariables por color** en la V1 ni duplicar una existencia agregada como si fueran existencias por color. Se podrá evolucionar con trazabilidad de color en una versión posterior si se aprueba explícitamente.

## D0-D — venta física reflejada con ajuste manual

1. Las ventas presenciales **no generan una transacción de venta individual** en EVALIA. El administrador reduce las existencias publicables del modelo mediante un **ajuste rápido manual**.
2. El ajuste normal **no puede consumir unidades comprometidas** en reservas activas o pedidos confirmados pendientes de entrega. La venta presencial de prendas conservadas **fuera del cupo publicable** (D0-C1) no altera S del sistema.
3. El sistema **sí conserva el evento técnico del ajuste** con fecha, operador, modelo, antes/después y delta, sin obligar a registrar comprador, factura, color, prenda dañada o motivo comercial de cada venta.

## D0-E — reposición y conteo directo

1. **Añadir existencias:** sumar cantidad de unidades vendibles libres al total publicable del **mismo modelo**; no copiar cupos, colores ni pedidos de otro modelo.
2. **Establecer existencias:** introducir el nuevo **total publicable** tras un conteo. La operación normal valida que **S_nueva ≥ compromisos vigentes**; si no lo cumple, rechaza la corrección ordinaria y avisa al administrador.
3. **Excepción de escasez REAL:** si una inspección demuestra que la disponibilidad real ya no alcanza para compromisos previamente garantizados, **no falsear S ni eliminar reservas/pagos**. Conservar la falta en un registro de incidencia y bloquear nuevas reservas. El tratamiento comercial del déficit sigue **pendiente**, sin reponer/cancelar automáticamente; esta excepción debe diseñarse separadamente para no confundirla con una venta física habitual.
4. La interfaz podrá mostrar docenas y unidades equivalentes; **internamente las unidades son enteros** (12 unidades/docena) porque el mínimo mayorista por modelo es 6 y pueden existir pedidos de cantidades no múltiplos de 12.
5. Los ajustes/reintentos deben ser **atómicos, autorizados, idempotentes y auditables**. No permitir rebajar la capacidad comprometida mediante operaciones simultáneas de venta/ajuste/reserva.

## Contrato de disponibilidad V1 simplificado

Para cada modelo `m` de talla única:

- `S_m`: unidades aptas **publicables y comprometibles** que aún no se han entregado; puede ser menor que la existencia física total por decisión conservadora.
- `R_m`: unidades pendientes de reservas **guardadas vigentes**, incluida reserva en revisión con depósito; excluye borradores, vencidas y convertidas.
- `P_m`: unidades **no entregadas** de pedidos confirmados, directos o provenientes de reservas.
- `A_m = S_m − R_m − P_m`: disponibilidad para nuevas reservas/pedidos de ese modelo. En la experiencia comercial, solo permitir nuevas ventas si A alcanza; registrar déficits reales sin disimular el dato base.

La reserva guardada aumenta `R`; su conversión a pedido reduce `R` y aumenta `P` **en la misma cantidad**; una entrega real reduce simultáneamente `S` y `P`; una caducidad sin depósito reduce `R` una sola vez; ninguna de estas transiciones crea existencias. **No restar dos veces el cupo**. El precio mayorista sigue calculado por modelo y el estado de pago no altera existencias.

### Ejemplo

Modelo con `S=72`, `R=12`, `P=12`, `A=48`: una venta presencial de seis unidades que forman parte del cupo publicado ajusta `S=66` y deja `A=42`. No se modifica `R=12` ni `P=12`. Una venta de prendas del margen **no publicado** no afecta estos valores.

## QA documental adicional (no ejecutado)

| Caso | Escenario | Resultado exigido |
| --- | --- | --- |
| C2-01 | Modelo con 13 colores y 6 docenas | Una sola existencia S=72, sin columnas de cantidad por color |
| C2-02 | Cliente solicita color exacto | No hay reserva de color en V1; coordinación externa sin promesa digital |
| C2-03 | Guardar surtido de 12 sobre S=72 | R aumenta 12, A baja 12, no se crea E por color |
| C2-04 | Confirmar el surtido guardado | R baja 12, P sube 12, A invariable |
| C2-05 | Entregar 5 prendas aptas del pedido | S y P bajan 5, sin obligación de asignar variantes por color |
| D-01 | S72, R12, P12; venta física 6 publicadas | S66, A42; R/P siguen intactas; evento técnico único |
| D-02 | Venta de seis prendas no publicadas | S/R/P/A no cambian |
| E-01 | Añadir 12 unidades realmente aptas | S y A aumentan 12; único movimiento |
| E-02 | Establecer S por debajo de R+P en ajuste normal | Rechazo, sin cambios, aviso visible |
| E-03 | Faltante real bajo R+P | Registrar incidente, no eliminar compromisos; impedir nuevas reservas |
| E-04 | Dos ajustes/ventas/reservas concurrentes | Serialización por modelo, sin A consumida por duplicado |
| E-05 | Reintentar ajuste tras respuesta perdida | Idempotencia: mismo comando no se aplica dos veces |

**No autorizaciones nuevas:** no se abre un POS, inventario por color, rastreo de defectos, descuento, devolución, cancelación del cliente ni SQL. **Siguiente:** [D0-F modelo lógico reconciliado](34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md).
