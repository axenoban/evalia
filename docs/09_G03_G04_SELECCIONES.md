# EVALIA — Selecciones G03/G04 (2026-11-22)

**Fuente:** respuesta directa del propietario, incluida su observación literal. **Estado:** registradas para revisión, **NO RATIFICADAS**, sin implementación, sin merge. Se preserva la diferencia entre selección, restricción expresamente indicada y regla pendiente. No reemplaza D01–D18.

## Selecciones textuales (16/16)

| ID | Respuesta del propietario | Estado |
| --- | --- | --- |
| G03-01 | Conservar las unidades bloqueadas a nombre del pedido | Seleccionada, no ratificada |
| G03-02 | Al confirmar el pedido | Seleccionada, no ratificada |
| G03-03 | Apartar unidades automáticamente al confirmar pedido directo | Seleccionada, no ratificada |
| G03-04 | Solo reservas pendientes no convertidas en pedido | Seleccionada, no ratificada |
| G03-05 | Liberar unidades asignadas y registrar la cancelación | Seleccionada, no ratificada |
| G03-06 | Asignar manualmente stock ingresado al encargo futuro | Seleccionada, no ratificada |
| G03-07 | Permitir entregas parciales con saldo pendiente registrado | Seleccionada, no ratificada |
| G04-01 | Pendiente de definir presentaciones | Abierta expresamente |
| G04-02 | Mezclar colores del mismo modelo | Seleccionada, no ratificada |
| G04-03 | Permitir cualquier mezcla con total calculado | Seleccionada, no ratificada |
| G04-04 | Cada presentación tiene una sola talla | Seleccionada, no ratificada |
| G04-05 | Minimos configurables según segmento o presentación | Seleccionada, no ratificada |
| G04-06 | Precio según tipo de cliente y presentación elegible | Seleccionada, no ratificada |
| G04-07 | Precio especial del cliente antes de tarifa general | Seleccionada, no ratificada |
| G04-08 | Fijar precio al confirmar pedido; reserva usa tarifa vigente | Seleccionada, no ratificada |
| G04-09 | Solo administrador con motivo e historial | Seleccionada, no ratificada |

## Observación adicional del propietario (transcripción literal)

> las reservas son solo para pedidos al por mayor, desde media docena en adelante por modelo a precio por mayor o precio por docena, es decir si la docena es 380, y se quiere 7 unidades, se ajusta al precio fijado en el modelo, tambien se podra llevar minimo 6 unidades por modelo, aunque sea m o xl o diferentes precios siempre y cuando sean 6 minimo por modelo, segun lo que se escojan al final se calculara el precio

## Reglas comerciales expresas extraíbles sin completar vacíos

1. **Reservas exclusivamente para pedidos mayoristas**; no se ha autorizado reservar inventario para pedidos minoristas.
2. **Mínimo 6 unidades por modelo para reserva mayorista** (media docena); el mínimo se evalúa **por modelo** y NO se sustituye por seis unidades repartidas entre modelos distintos.
3. Se permiten **colores mezclados del mismo modelo** (G04-02).
4. Se permite **mezclar modelos distintos** en el pedido (G04-03), con cálculo final por las prendas seleccionadas, **sin borrar el requisito de seis por modelo para reservar**. La presentación comercial y si la mezcla sucede dentro de una presentación o solo entre líneas siguen pendientes (G04-01).
5. La observación admite que el mínimo de seis por modelo pueda componerse de variantes M o XL, incluso con **precios diferentes**; sin embargo, **G04-04 afirma «Cada presentación tiene una sola talla»**. Se necesita distinguir entre mezcla en un **pedido** y mezcla dentro de una **presentación** antes de formalizar validación.
6. Se indica que al comprar 7 unidades, si la docena del ejemplo cuesta Bs 380, **se aplicará el precio fijado para el modelo**. **Bs 380 es un ejemplo del propietario, no un precio canónico universal; no se deduce fórmula Bs 380/12 × 7, redondeos ni tarifa unitaria concreta.**
7. Mínimos configurables por segmento/presentación (G04-05) son compatibles con **6 por modelo** para reservas mayoristas, siempre que una configuración no contradiga ese mínimo sin decisión posterior.
8. Segmento + presentación elegible determinan tarifa; precio especial explícito del cliente tiene precedencia sobre tarifa general (G04-06/G04-07). Precio definitivo se fija al confirmar el pedido, no al crear la reserva (G04-08).
9. Excepciones de precio manuales: **solo administrador**, con motivo e historial (G04-09). No se infiere descuentos ilimitados o cambios retroactivos.
10. La reserva mantiene unidades asignadas al convertirse en pedido (G03-01); un pedido directo confirma una asignación de unidades (G03-03); solo reservas no convertidas caducan automáticamente (G03-04).
11. La respuesta literal G03-02 indica **descontar inventario físico al confirmar pedido**, y G03-07 permite entregar parcialmente. Esa interpretación **necesita resolver la diferencia entre stock contable y prendas realmente presentes** antes de implementarla; no se corrige silenciosamente por «al entregar».
12. Cancelar antes de entregar libera unidades asignadas y conserva el historial (G03-05); para pedidos confirmados y entregas parciales se requiere una regla de reversión precisa, no inventarla.
13. Los encargos futuros reciben unidades recién ingresadas mediante **asignación manual** (G03-06), sin descontar unidades inexistentes.

## Cuestiones bloqueantes identificadas (sin respuestas supuestas)

- **C-G03-A — Saldo físico vs confirmado/entregado:** ¿confirmar pedido significa descontar el saldo de existencias *del sistema* aunque las prendas sigan físicamente en almacén, manteniendo un registro separado de «pendiente de retiro/entrega»? ¿O también deben considerarse físicamente retiradas al confirmar? La elección G03-02 se conserva hasta respuesta expresa.
- **C-G03-B — Anulación y entrega parcial:** al cancelar un pedido ya confirmado, ¿cómo revertir el descuento y qué cantidad se puede devolver a disponible? Si hubo entrega parcial, nunca restaurar automáticamente como disponible la porción entregada. Reglas sobre devoluciones pendientes.
- **C-G04-A — Talla y presentación:** G04-04 exige una talla por presentación, pero la observación admite sumar M y XL para alcanzar seis por modelo; ¿el mínimo cuenta entre *líneas separadas por talla* de un mismo pedido? ¿Permite mezclar tallas dentro de una presentación? No reinterpretar sin autorización.
- **C-G04-B — Presentaciones:** G04-01 quedó expresamente *pendiente*. ¿Qué presentaciones existen comercialmente (unidad, media docena, docena, lotes libres), su capacidad y su relación con el mínimo de seis?
- **C-G04-C — Precio de 7 unidades y precios diferentes:** ¿cuál es la tarifa parametrizada aplicable a cada variante/presentación y cómo se calcula el total si los modelos/tallas tienen distinto precio? No proporcionalizar Bs 380 ni fijar precios con conversaciones previas.
- **C-G04-D — Mezcla y elegibilidad:** «cualquier mezcla» G04-03 no puede interpretarse como que 3 unidades del modelo A + 3 del B cumplen el mínimo **por modelo** de seis. Confirmar solo si el mínimo vale por pedido, por presentación o por línea agrupada por modelo, según el escenario de venta.
- **C-G04-E — Alcance y vigencia de tarifas:** si una reserva no fija precio (G04-08), debe decidirse qué se muestra al cliente y qué ocurre cuando cambia tarifa antes de confirmar; monedas, impuestos, redondeos, fechas y escalones permanecen sin fijar.

## Casos de validación funcional a resolver

| Caso | Lo que sí sabemos | Lo que NO se puede calcular / aprobar |
| --- | --- | --- |
| Reserva mayorista: 5 del mismo modelo | No cumple mínimo 6 por modelo | Reglas de otras ventas minoristas |
| Reserva: 7 unidades del modelo A, combinando colores | Cumple mínimo numérico y se permiten colores mezclados | Precio final sin tarifa configurada |
| Reserva: modelo A (3 M + 3 XL) | Observación permite contar ambas tallas por modelo | Si están en una o dos presentaciones frente a G04-04 |
| Reserva: modelo A (3) + modelo B (3) | No cumple mínimo de 6 **por modelo** | Posibles excepciones administrativas, no autorizadas |
| Pedido: A (6) + B (6) | Se permite mezclar modelos si se respetan condiciones de cada uno | Total sin tarifas por variante/cliente/presentación |
| Ejemplo docena Bs 380, pedido de 7 | Aplicar precio fijado para el modelo | No existe regla de Bs 380 ÷ 12, ni redondeo definido |
| Pedido confirmado con 6 asignadas; se entregan 2 | Se permiten entregas parciales y quedan 4 por entregar | Saldo físico contable y reversión exacta requieren C-G03-A/B |

**Siguiente paso:** resolver C-G03-A/B y C-G04-A/B/C antes de migraciones SQL. No dar por aprobado el registro ni cambiar el PR de borrador.

## Nueva aclaración expresa posterior — C-G03-A (2026-11-22)
El propietario confirma que «descontar» al confirmar se refiere a la **cantidad que permanece disponible para aceptar pedidos**, porque las existencias físicas son limitadas y necesita evitar cálculos manuales de reservas por modelo. Quiere un **panel de administración con cantidades reservadas y disponibles por modelo y talla** (y posibilidad de desglosar color para respetar D07). Las prendas asignadas al pedido pueden seguir físicamente en custodia y pendientes de entrega: **confirmado no es sinónimo de físicamente retirado**.

Por tanto:
- **C-G03-A resuelta semánticamente**, prevalece sobre el interrogante histórico anterior sobre qué es «descontar físicamente». La respuesta literal G03-02 «Al confirmar el pedido» se conserva como antecedente.
- La confirmación debe **asignar y descontar de la disponibilidad** de nuevas compras, no duplicar la reserva al convertirla en pedido.
- **C-G03-B queda abierto**: las reglas exactas de cancelación/reversión tras entrega parcial todavía necesitan aprobación.
- **G04-01 y C-G04-A/B/C no cambian**; esta aclaración no define presentaciones, mezcla de tallas dentro de una presentación ni precios.
- Ver [contrato conceptual](11_CONTRATO_INVENTARIO.md) y [panel administrativo](10_PANEL_STOCK_ADMIN.md).
