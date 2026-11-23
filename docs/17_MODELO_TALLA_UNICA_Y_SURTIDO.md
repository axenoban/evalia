# EVALIA — Contrato de dominio: un modelo, una talla, colores variables y surtido con cupo

**Fecha:** 2026-11-22. **Estado:** aclaración expresa del propietario registrada; diseño técnico propuesto, pendiente de ratificación PR #1. **Sin SQL ni implementación.** Esta aclaración es posterior y prevalece sobre interpretaciones anteriores de mezcla de tallas sin borrar citas históricas.

## Nueva aclaración del propietario (literal)

> normalmente por producto o modelo, las tallas son unicas, pero pueden ser M o XL o 2XL, pero eso noquiere decir que se pueden mesclar, es decir de un modelo sera todo talla M, de otro modelo todo sera xl, por modelo cambian los colores  y los precios y las tallas, tambien cuando un cliente pide un surtido, ya se habra definido la talla y el modelo, solo faltara la cantidad y los colores que sera registrados

## Reglas expresas y alcance

1. **Cada modelo comercial tiene exactamente una talla**, aunque otros modelos tengan tallas diferentes como M, XL o 2XL (ejemplos, no catálogo cerrado).
2. **No se mezclan tallas dentro del mismo modelo**. Que dos modelos sean similares no significa que compartan identificador, inventario o cupo.
3. **Cada modelo tiene su propia selección de colores y precios**. Los colores provienen del catálogo maestro reutilizable, pero se vinculan explícitamente a cada modelo. Se preserva D09: listas por cliente/presentación y reglas G04 abiertas; no inferir tarifa única ni tarifa numérica.
4. **Al seleccionar modelo, ya está determinada su talla**. La interfaz debe mostrarla automáticamente, sin ofrecer una matriz adicional de tallas dentro de ese modelo.
5. Para registrar surtido se requiere **cantidad de unidades**, necesaria antes de pulsar Guardar reserva y comprometer el cupo; **los colores específicos se asignan después**, tal como fue seleccionado en CR-01 B.
6. Reserva mayorista exige **mínimo seis unidades por modelo**; varios modelos en un pedido se evalúan **separadamente**. No se permite sumar tres unidades de un modelo talla M y tres de otro talla XL para satisfacer seis de un modelo.
7. El **stock apto para reservar** depende de prendas reales revisadas y aptas, no de planificación de fabricación ni de defectuosas; registrar mermas con trazabilidad.
8. Un surtido guardado garantiza **cantidad apta del modelo**, no colores concretos ni la composición «11 colores + negro doble» como norma fija. Debe validarse cupo antes de guardar y no hacer un segundo descuento al asignar los colores.

## Modelo conceptual resultante (candidato)

```text
CATÁLOGO_COLORES 1 — N RELACIONES_MODELO_COLOR N — 1 MODELO
MODELO [id, talla_única, datos comerciales; relación a tarifas]
MODELO 1 — N VARIANTE_COLOR (solo colores habilitados)
VARIANTE_COLOR [modelo, color; talla se deriva de modelo]
VARIANTE_COLOR 1 — N MOVIMIENTO_INVENTARIO / REGISTRO_QC
MODELO 1 — N CUPO_SURTIDO_PENDIENTE_DE_COLOR
RESERVA 1 — N LINEAS / CUPOS agrupados por modelo
```

La notación es conceptual: no aprobar nombres de tablas, campos ni relaciones SQL todavía. La definición de cómo cambiar la talla de un modelo que ya tiene historia comercial necesita decisión expresa para no reetiquetar ventas anteriores; por tanto no permitir una modificación destructiva por deducción.

## Contrato de cantidades del surtido de un modelo m

- `S_m`: total de unidades aptas físicas del modelo m, sumadas por los colores realmente existentes.
- `E_m`: total de unidades de ese modelo ya comprometidas por color (reservas exactas y pedidos sin entregar).
- `G_m`: cantidad de cupos surtidos reservados pero aún sin asignación de color.
- `A_m = S_m - E_m - G_m`: disponible agregado por modelo, antes de nuevos compromisos.

**Guardar surtido de n:** requiere `n` válido y `A_m >= n`, con mínimo mayorista por modelo; `G_m += n`, `A_m -= n`. Borrador previo no bloquea (R06).

**Asignar colores posteriormente:** distribuir `n` unidades entre colores **realmente aptos** del mismo modelo; `G_m -= n` y `E_m += n` en una transacción indivisible ⇒ `A_m` no cambia. No se garantizan colores específicos antes de esta operación.

**Pedido con color elegido:** verificar tanto el saldo libre del color como el disponible agregado de m, para no consumir unidades apartadas para surtidos pendientes.

**Despacho:** reducir físico apto en custodia y asignación exacta pendiente en la misma cuantía, preservando disponibilidad; si se detectan daños posteriores, registrar incidente y un posible déficit real, no ocultarlo.

## Casos ilustrativos, cifras ficticias

| Caso | Interpretación |
| --- | --- |
| Modelo A = talla M, colores negro/rosa | Válido: distintas prendas del **mismo modelo y talla** |
| Modelo B = talla XL, color negro | Válido: distinto modelo, otro precio y cupo |
| Intentar reservar «A: 3 M + 3 XL» | **Inválido**: A no tiene segunda talla |
| Cliente quiere A: 6 surtidas, sin colores | Guardar bloquea seis aptas del **modelo A**; colores más tarde |
| A tiene 12 aptas, 3 exactas comprometidas | A puede guardar surtido de 6 y dejar 3 de disponibilidad agregada |
| Después asignar 2 negras+4 rosas | Transferencia G→E del A; disponible agregado **sigue en 3** si hay stock real por color |
| A con defecto descubierto tras reservar | Registrar merma y cualquier déficit, sin inventar sustitución |
| Pedido con A y B | Dos grupos/modelos; **mínimo y precio de cada modelo** se tratan por separado |

## Coherencia y cuestiones aún abiertas

**Resueltas por esta aclaración:** C-G04-A / CR-02 (mezcla M/XL en mismo modelo), identificación de talla en el cupo B y necesidad de evitar un catálogo cartesiano talla×color dentro de un modelo. **Las elecciones textuales históricas G04-04 y R05 se preservan**: la talla puede ser filtro de modelos, pero no selector de varias tallas dentro del modelo.

**No resueltas:**
- G04-01: presentaciones y tarifas precisas; precio del ejemplo de siete unidades; redondeos/impuestos; si existe diferencia de tarifa entre colores del mismo modelo, no está establecido.
- G01/R09: plazo de vencimiento y prórrogas; G03-B: cancelación/entrega parcial/no retiro; no decidir penalizaciones.
- Control de calidad: inspección, destino de defectos, mermas y lote (docs/15).
- Política futura para **cambiar la talla de un modelo existente** o crear un nuevo modelo si se fabrica el diseño en otra talla.
- G07/G08 roles, protección de clientes; D16 arquitectura final.

**No crear SQL, desplegar, modificar main ni fusionar PR #1 hasta cerrar reglas y ratificación.**

## Precios y captura visual coherentes con talla única
El precio mayorista efectivo se **define individualmente para cada modelo**, aunque existan recomendaciones base por talla. Los ejemplos XL Bs 380 y Bs 420 muestran por qué no debe imponerse una tarifa única de XL. La **fotografía, los colores y la talla fija** son datos de la ficha de modelo; recuperar plantilla de colores del anterior o por talla no cambia modelos previos. Una reserva utiliza **solo tarifa mayorista**, con beneficios especiales configurados en el cliente cuando son aplicables; la conversión a pedido conserva compromiso de unidades y el snapshot monetario se fija al confirmar. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [alta rápida](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## Proporción mayorista por docena (decisión posterior)
Cada modelo de talla única tiene precio mayorista propio **por docena**; para 6–11 unidades de ese modelo, precio matemático `P_docena × n/12`, sin distinguir colores que se asignen después. Ejemplo Bs 420 → 6 Bs 210, 7 Bs 245. **E1 no tendrá descuentos** ni por cliente especial; no hay descuento inferior a docena, tampoco posteriormente. El precio base sugerido por talla sigue siendo editable para cada nuevo modelo y no cambia precios de modelos existentes. Falta política de redondeo para base Bs 380 y regla de cantidades >12. [Fuente](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Precio por modelo entero — regla RND-01 posterior
Con talla única y colores variables, calcular `P_docena_modelo×n_total_modelo/12`, **redondear una sola vez al entero Bs más cercano por modelo**, sin redondear cada color o unidad; sumar subtotales de modelos diferentes después. P=380 n=7 → 222; asignar los colores de surtido diferido **no modifica precio ni consume dos veces stock**. No descuentos E1. Empate exacto .50 sin política aún (RND-02), importes >12 pendientes. [Regla](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Cierre monetario: fracción exacta de 0,50 no se redondea
Cada modelo conserva talla única, colores propios y precio docena particular. Cotizar 6–11 por proporción y 12 como docena, aplicar redondeo entero al **total del modelo** excepto **x,50 exacto que se mantiene**. Se permiten diferentes modelos con diferentes cantidades en un pedido, p. ej. A docena y B media docena; precios y mínimos por modelo siguen independientes. Sumar precios de modelos sin redondear el total global. A P=420 n=12, B P=381 n=6 ⇒ **Bs 610,50**. Reserva surtida no necesita colores iniciales para calcular el subtotal. No descuentos E1; MAY-12 (más de doce del mismo modelo) sigue abierto. [Precio](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## MAY-12 cerrado: total flexible a partir de seis unidades
En EVALIA el modelo tiene una sola talla, precio mayorista propio de docena y colores elegibles. **Cualquier cantidad n≥6 de un mismo modelo** (incluida n=19 o 24) usa `total_exacto=P_docena*n/12`. Redondeo **una vez por subtotal de modelo** a entero cercano, **salvo fracción .50 exacta conservada**; los colores pueden asignarse después sin alterar importe. Sumar modelos por sus subtotales finales. No sumar unidades de distintos modelos para cumplir el mínimo de seis de cada modelo, ni precios por tramos 13+. P=420 n=19→Bs 665. MAY-12 está aprobada a nivel comercial; resto G04-01 físico y SQL pendientes. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## D0-A — confirmar pedido manteniendo cupo G del modelo, sin color previo
**El propietario aprobó** confirmar pedido surtido con **cantidad garantizada** y colores pendientes. Cada modelo conserva su única talla y un G agregado respaldado en stock apto; la conversión reserva→pedido mueve titularidad del mismo cupo sin duplicarlo, mientras pedido directo crea G tras validar A. Definir colores **antes de retirar prendas reales**, convirtiendo G→E por variante con `ΔA=0, ΔS=0`. Ningún requisito de composición por colores es inferido; el precio mayorista se calcula por modelo sin esperar colores. [D0-A](31_D0_A_CONFIRMACION_SURTIDO_SIN_COLORES.md).
