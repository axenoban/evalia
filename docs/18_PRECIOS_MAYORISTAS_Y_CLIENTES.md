# EVALIA — Precio mayorista por modelo: fórmula general desde seis unidades (v0.5)

**Fecha:** 2026-11-22. **Estado:** decisiones comerciales expresas registradas, sin ratificación del PR #1; **no hay código ni migraciones ni precios iniciales reales cargados**. La decisión posterior resuelve **los importes acabados exactamente en Bs 0,50: se conservan sin redondear**, y confirma pedidos con diferentes cantidades por modelo. El cálculo de más de 12 unidades de un **mismo** modelo quedó **APROBADO** posteriormente, aplicando exactamente la misma fórmula.

## Declaraciones del propietario — trazabilidad

**Primera declaración sobre precio propio de modelo, sugerencias y clientes especiales (histórica):**

> las reservas solo seran al precio de por mayor, es decir podemos realizar una tabla de precios por talla, ya sea por modelo o por tallas, hay veces en las que algunas tallas xl pueden costar 380 o 420, y las tallas M pueden varian segun el modelo, por ende puede ser mejor al registarr el modelo y la talla, definir el precio, con un precio sugerido base que se puede fijar, asi registrar mas rapido los diseños y modelos, ya que se debe registrar alrededor de 6 modelos o mas por feria, ademas que se debe de subir una foto del modelo, asi tambien asignar que colores estan disponiblers en cada modelo, podemos hacer un guardado o memoria de colores que se escogieron en el anterior modelo para registrar mas rapido, y tambien podemos hacer una memoria de que modelos son los que normalmente hay para m y cuale s para xl ya que siempre hay diferencias ya que estan detinadas para personas mayores y usan otros colores, puede existir tarifa especial por cliente se puede implmentar directo al cliente si es especial o si resive precio especial, definiendo para x cliente especial es -10bs en cada docena que pida, por ejemplo, y eso se deberia debitar directamente al registrarle el pedido a ese cliente

**Aclaración posterior que fija cálculo mayorista y difiere descuentos:**

> para pedidos de 6 a 11 unidades, el precio se debe carlcular automanticamente apartir del precio por docena, es decir si la docena es 420, la media sera 210, 7 unidades seran 245, es decir cada unidad adicionar mantendra el precio de unitario de la docena seria salido a 35 en este precio, y asi con los demas precios, ahora el descuento no es necesario que este desde la primera version, eso ya se puede reajustar o apregar un descuento por docena de sierta cantidad, ya que hay veces en las que el cliente quiere regatear o solicictar un descuento por varias docentas, pero no habre descuento para cantidades inferiores a docena

**Decisión posterior expresa sobre redondeo (2026-11-22):** «redondear el total por modelo al boliviano entero más cercano». **Vigente como selección de negocio para E1**, y prevalece sobre cualquier nota histórica de redondeo no definido.

**Última aclaración literal del propietario, posterior a RND-01 (2026-11-22):**

> si resulta con 50 centamos se mantiene eso, no se redondea, ahora para cantidades mayores, es decir de tal modelo puede escoger una docena pero de otro solo media, se puede, y el precio se calcula del mismo modo, solo se suman los precios

**Prevalencia histórica:** esta respuesta cerró el empate x,50 y confirmó pedidos con varios modelos. **Una respuesta posterior cierra además las cantidades 13+ del mismo modelo**; ver la última regla comercial.

**Decisión posterior que cierra MAY-12 (2026-11-22), respuesta literal a la pregunta por 19 prendas de un mismo modelo:**

> si, se aplica la misma formula

**Resultado comercial:** aplicar la misma proporcionalidad de docena a **cualquier cantidad entera mayorista n ≥ 6 del mismo modelo**. No hay tramos distintos o máximos a partir de 12. Se mantiene redondeo y excepción de 50 centavos por modelo; descuentos siguen fuera de E1.

## Reglas expresamente fijadas (alcance de primera versión E1)

1. **Las reservas son solo mayoristas**, desde mínimo **seis unidades por modelo**. La venta minorista directa de D06 es un flujo separado; no usar precio minorista en reservas.
2. Cada modelo tiene **una talla única** y un **precio mayorista por docena propio**. Se puede sugerir un precio base configurable por talla para registrar rápidamente un modelo, pero el administrador lo puede reemplazar en cada modelo. Valores de Bs 380 o Bs 420 son **ejemplos**, no precios globales por talla.
3. Para **cualquier cantidad entera n ≥ 6 del mismo modelo** (incluidas 13, 19, 24, 25 o más unidades), calcular automáticamente **`total_exacto = precio_docena_modelo × n / 12`** y aplicar **una única vez por modelo** el redondeo al boliviano entero más cercano, **salvo cuando la parte decimal sea exactamente `0,50`: mantener `x,50` sin redondear**. La tarifa unitaria matemática es `precio_docena_modelo/12` y no debe redondearse antes de multiplicar. Las cantidades de colores del mismo modelo se agrupan primero.
4. **Todos los colores y líneas del mismo modelo se suman antes de calcular y aplicar la regla de redondeo una única vez por modelo**, incluidos surtidos cuyo reparto de colores se determina después. **No sumar unidades de distintos modelos** para alcanzar el mínimo mayorista de seis, establecer tarifa de docena o redondear juntos. En un pedido multímodelo, el total del pedido es la **suma exacta de los subtotales finales de cada modelo (enteros o acabados en `,50`)**.
5. **No se implementa un motor de descuentos en E1**: ni descuento automático por cliente especial ni rebaja por negociación/múltiples docenas. La primera declaración sobre beneficio de **−Bs 10 por docena para cliente especial** pasa a **necesidad futura**, no se elimina del histórico ni se aplica.
6. **Regla general expresa incluso para una fase con descuentos:** **no habrá descuento en cantidades inferiores a una docena (6–11 unidades)**. En el futuro se podrá negociar/reajustar un descuento o establecerlo **por determinada cantidad de docenas completas**, pero **no se decidió la fórmula, elegibilidad, acumulación o implementación**. No aplicar `−Bs 10/12` por prenda.
7. Se conserva la selección anterior **G04-08: precio acordado se fija al confirmar pedido**, mientras la reserva puede mostrar cotización según tarifa vigente. El bloqueo de prendas **no equivale a congelar precio**, salvo decisión posterior. Pedidos confirmados retienen historial.
8. G04-09 prevé cambios manuales por administrador con motivo e historial, pero el usuario **difirió la funcionalidad de descuentos** de E1. No crear una vía alternativa de descuento disfrazada de ajuste sin aprobar su alcance de primera versión.

## Tabla de pruebas aritméticas con docena Bs 420 (ejemplo explícito)

Como `420/12 = Bs 35` por unidad, **no hay fracción monetaria en este ejemplo**.

| Cantidad del mismo modelo | Operación | Total |
| ---: | --- | ---: |
| 6 | 6 × (420 ÷ 12) | Bs 210 |
| 7 | 7 × (420 ÷ 12) | Bs 245 |
| 8 | 8 × (420 ÷ 12) | Bs 280 |
| 9 | 9 × (420 ÷ 12) | Bs 315 |
| 10 | 10 × (420 ÷ 12) | Bs 350 |
| 11 | 11 × (420 ÷ 12) | Bs 385 |
| 12 | 12 × (420 ÷ 12) | Bs 420 |

Los valores se aplican de manera idéntica a un surtido pendiente de colores, porque el **modelo y la cantidad** ya están fijados al reservar. No cambiar precio al distribuir colores a menos que exista otra política explícita futura.

## Docena Bs 380: aplicación del redondeo por modelo (decisión vigente)

La proporción exacta se calcula antes de la regla de redondeo y **se cobra el entero más cercano salvo empate exacto x,50, que se conserva**, una sola vez por modelo:

| Cantidad del modelo | Importe exacto matemático | Total de cobro |
| ---: | ---: | ---: |
| 6 | Bs 190 | **Bs 190** |
| 7 | Bs 221,666… | **Bs 222** |
| 8 | Bs 253,333… | **Bs 253** |
| 9 | Bs 285 | **Bs 285** |
| 10 | Bs 316,666… | **Bs 317** |
| 11 | Bs 348,333… | **Bs 348** |
| 12 | Bs 380 | **Bs 380** |

**Orden preciso de operaciones:**
1. Agrupar todas las cantidades del **mismo modelo** en la operación, con independencia del reparto entre sus colores.
2. Obtener `importe_exacto_modelo = precio_docena_modelo × total_unidades_modelo / 12`.
3. **Aplicar una sola vez** al importe exacto la regla: si la fracción es **menor que 0,50**, cobrar el entero inferior; si es **exactamente 0,50**, **mantenerla**; si es **mayor que 0,50**, cobrar el entero superior. Se presupone importe no negativo; no aprobar importes negativos por deducción.
4. Calcular `total_pedido = suma(totales_finales_por_modelo)` **sin nuevo redondeo del total del pedido**. Los subtotales pueden ser enteros o valores exactos `x,50`. Mantener por separado el precio de docena, cantidad, resultado calculado y total cobrado para trazabilidad.

**No redondear por unidad ni por color**: por ejemplo, un modelo de docena Bs 380 con 2 prendas negras y 5 rosas se cobra por **7 unidades conjuntamente → Bs 222**, no por sumar importes redondeados individualmente por color.

**Caso exacto x,50: regla RESUELTA por decisión posterior.** Ejemplo docena Bs 381 y seis unidades: `381×6/12=Bs 190,50` → **se cobra Bs 190,50**, sin subir a 191 ni bajar a 190. Igualmente, Bs 191,50 se conserva. **No es un empate pendiente**: es una excepción deliberada al redondeo entero.

**Definición verificable para importes no negativos:** sea `T = P_docena × n / 12`, `k = parte_entera(T)`, `r = T − k`. Si `r < 0,50`, total `k`; si `r = 0,50`, total `T`; si `r > 0,50`, total `k+1`. Evaluar igualdad exacta con matemática decimal/racional, no con aproximaciones float. No redondear el precio implícito de una sola prenda.

## Pedido combinado: una docena de un modelo y media docena de otro

**Confirmado explícitamente por el propietario:** dentro de **un mismo pedido**, el cliente puede llevar una **docena del modelo A** y **media docena del modelo B**. Cada modelo mantiene **su talla, precio de docena, colores, mínimo mayorista y compromiso de stock independientes**; el total es una suma de subtotales, sin fusionar modelos para formar una presentación.

| Modelo ficticio | Precio de docena | Cantidad | Subtotal del modelo |
| --- | ---: | ---: | ---: |
| A | Bs 420 | 12 | Bs 420 |
| B | Bs 380 | 6 | Bs 190 |
| **Total pedido** | | **18 prendas en 2 modelos** | **Bs 610** |

**Ejemplo con excepción de 50 centavos:** A = 12 unidades, docena Bs 420 ⇒ 420; B = 6 unidades, docena Bs 381 ⇒ **Bs 190,50**; total del pedido **Bs 610,50**. No volver a redondear a Bs 610 ni a Bs 611 al sumar los modelos. Dos modelos independientes con Bs 190,50 cada uno sumarían Bs 381 exactos.

**Aclaración temporal:** en esa ronda se había confirmado únicamente el carrito multímodelo; **la respuesta posterior «si, se aplica la misma formula» ya autoriza 13, 18, 19 o más del mismo modelo**. El contrato vigente es la fórmula general n ≥ 6, sin interrupciones de tarifa al llegar a 12.

**Protección técnica recomendada:** calcular con aritmética decimal/racional exacta y aplicar la excepción de x,50 en cada modelo; nunca decidir dinero final con coma flotante binaria de JavaScript. Mantener importes en Bs con exactitud de media unidad cuando corresponda. No crear SQL ni código hasta ratificación de contrato.

## Diseño conceptual de precio para E1 (NO estructura SQL aprobada)

- **Configuración por talla:** precio sugerido para alta de modelo, editable.
- **Modelo:** precio de **docena mayorista** propio, usado como base de cálculo; talla fija y colores vinculados al maestro global.
- **Línea de reserva/pedido:** modelo, cantidad total por modelo, base de docena capturada/consultada, cálculo proporcional y eventual estado de cotización. El color puede estar diferido para surtidos; **cantidad y modelo sí deben estar definidos** para cotizar y bloquear cupo.
- **Pedido confirmado:** guardar **por modelo** precio base de docena, cantidad agregada, resultado exacto antes de redondeo (o datos suficientes para reproducirlo), **total final del modelo (entero o x,50)** y regla/versión de cálculo; sumar totales de modelo y no recalcular pedidos históricos al modificar precios sugeridos/modelos.
- **Ficha de cliente especial:** conservar condición comercial como **requisito de fase futura**, no ejecutar descuentos automáticos en E1. Dejar el esquema futuro para negociar después, sin cargar valores inventados ni tratamiento parcial de docenas.

## P-01/P-02/P-03/P-04 — estado actualizado

| ID | Estado | Significado |
| --- | --- | --- |
| P-01 (precio 6–11) | **RESUELTO** | Proporción lineal exacta `(precio_docena × n)/12`, por modelo |
| P-02 (descuento 6–11) | **RESUELTO: PROHIBIDO** | Nunca aplicar descuento a menos de 12 unidades de ese modelo |
| P-03 (descuentos especiales/clientes) | **DIFERIDO** | No incluir motor de descuento en primera versión; requisitos de negociación futura sin algoritmo |
| P-04 (tarifa base) | **RESUELTO para cantidades mayoristas** | Precio de docena propio del modelo y fórmula única para cualquier n ≥ 6; presentación física/denominación G04-01 aún por detallar |
| P-05 (sugeridos por talla) | **DEFINIDO EN CONCEPTO** | Configurable, editable por modelo; valores iniciales no aprobados |
| P-06 (cobro) | **PARCIALMENTE RESUELTO** | **Entero más cercano por modelo y excepción x,50 conservada, ambos RESUELTOS**; impuestos/otros parámetros de cobro pendientes |

## Preguntas residuales antes del motor de precios definitivo

- **RND-01 y RND-02 — RESUELTOS:** docena Bs 380, 7 unidades → **Bs 222**, aplicando regla por modelo; **si el resultado termina exactamente en x,50, conservarlo** (P=381, n=6 → **Bs 190,50**), sin redondear de nuevo al sumar modelos.
- **MAY-12 — RESUELTO:** cantidades **13, 18, 19, 23, 24 o superiores del mismo modelo** se cobran por la **misma fórmula** `precio_docena×cantidad/12` y regla de redondeo por modelo. Independientemente, también es válido combinar varios modelos con cantidades diferentes en un pedido.
- **G04-01:** Denominaciones de presentación (docena/media docena/unidades de compra), posibles impuestos/registros; no inventar embalajes ni venta minorista.
- **E1:** En pedidos directos, ¿se permiten cantidades menores de seis a precio minorista, y cómo se calculan? D06 reconoce minoristas, pero no se ha fijado esa tarifa.
- **Cliente especial:** descuento manual y automatización futura **solo en docenas elegibles**, pendiente alcance y autorización; NO implementarlo mediante cambios silenciosos de precio.
- G01 reserva/vencimiento, G03-B cancelación, permisos e historial siguen abiertos.

## Casos para futura batería de pruebas

1. Modelo A talla XL, docena ficticia Bs 420; n=6..12 → tabla anterior; con n=7, Bs 245.
2. Modelo B misma talla, docena Bs 380; para n=6, Bs 190; n=7, **Bs 222**; para n=8, **Bs 253**, n=10 **Bs 317**, n=11 **Bs 348**.
3. Reserva surtida de 7 del modelo A, colores pendientes: **cantidad 7 y precio matemático 245** se conocen; luego asignar colores no cambia el precio.
4. Pedido de A (6) y B (6) → calcular **cada modelo por separado**, no tratarlo como una docena de un modelo.
5. Cliente especial antes marcado «−Bs 10» y 7 unidades → **sin descuento**, incluso en versión futura; en E1 **sin descuento también para 12**.
6. Cliente especial con 12 unidades en E1 → tarifa mayorista base sin beneficio automático; una futura función no recalcula pedidos confirmados del pasado.
7. Si cambia precio sugerido de talla, **no cambia precio base de docenas de modelos ya creados**.
8. Un administrador no podrá usar una ruta de ajuste como descuento de E1 sin regla/permiso definidos; preservar trazabilidad.
9. Un solo modelo P=380 con 2 unidades negras y 5 rosas → 7 unidades globales, **Bs 222**; no redondear por color.
10. Dos modelos distintos ambos P=380 con 8 unidades cada uno → Bs 253 + Bs 253 = **Bs 506**; no redondear la suma exacta previa de ambos modelos (sería Bs 507).
11. Modelo P=381 con n=6 → Bs 190,50 exactos: **cobrar Bs 190,50 SIN redondear**; caso de desempate ya resuelto.
12. Modelo A docena Bs 420 con 12 prendas y modelo B docena Bs 380 con 6 prendas → **Bs 610** y reserva mayorista válida (mínimo 6 por modelo).
13. Modelo A 12 prendas P=420, modelo B 6 prendas P=381 → **Bs 610,50**; sumar subtotales sin nuevo redondeo.
14. Dos modelos distintos P=381 y n=6 cada uno → **Bs 190,50 + Bs 190,50 = Bs 381**.
15. Un modelo con n=13/19/24 usa **la misma fórmula aprobada** que n=6/12; por ejemplo P=420, n=19 → **Bs 665**, n=24 → **Bs 840**.
16. P=380, n=13 → 380×13/12 = Bs 411,666… → **Bs 412**; n=19 → 601,666… → **Bs 602**; n=24 → **Bs 760**.
17. P=381, n=18 → Bs 571,50 exactos, se **mantiene Bs 571,50**, sin redondear al entero.
18. P=420, n=25 → **Bs 875**; n=36 → **Bs 1260**, sin nuevo escalón de tarifas.
19. Un mismo modelo con 10 prendas de un color y 9 de otro: agrupar **19**, luego calcular y redondear **una sola vez**, no redondear paquetes de 12+7 por separado.
20. Carrito multímodelo A P=420 n=19 (Bs 665) + B P=381 n=6 (Bs 190,50) → **Bs 855,50**, sin redondeo global.

**RND-01, RND-02 y MAY-12 están resueltos comercialmente**: aplicar la misma fórmula para toda cantidad n ≥ 6 del modelo; redondear por modelo al entero más cercano salvo x,50 exacto conservado. No crear SQL, código ni fusionar PR #1 antes de ratificación.

## Contrato comercial consolidado vigente — prevalece sobre antecedentes históricos

- **Unidad comercial:** un modelo específico con talla única y un precio mayorista por docena propio; **mínimo de reserva seis prendas por modelo**, sin máximo de cantidad comercial definido.
- **Cantidad válida:** toda cantidad entera `n ≥ 6`, calculada de forma idéntica. **Sin escalones especiales** por pasar de 12, 24 o más prendas del mismo modelo.
- **Fórmula matemática:** `exacto_m = P_docena(m) * n_m / 12`; siempre sobre el **total del modelo** (colores exactos o surtido aún sin asignar).
- **Regla monetaria:** si fracción de `exacto_m` es menor a 0,50, entero inferior; si es exactamente 0,50, **mantener .50**; si es superior a 0,50, entero superior. Solo una aplicación **por modelo**; usar aritmética decimal/racional exacta.
- **Carrito mixto:** `total_pedido = Σ subtotal_final(modelo)`, **sin segundo redondeo** y respetando el mínimo por modelo.
- **Precio fijo histórico:** guardar snapshot monetario al confirmar, de acuerdo con G04-08; un cambio del precio sugerido del modelo no debe recalcular pedidos confirmados.
- **E1 sin descuentos**, incluso cuando la cantidad sea mayor a docena; no habilitar tarifas de negociación sin posterior definición/aprobación. El tratamiento comercial de ventas minoristas sigue aparte.
- **Historial:** los títulos, dudas y límites 6–11 / >12 de secciones anteriores documentan decisiones sucesivas pero **no son restricciones actuales**. La regla general actual **resuelve MAY-12**; G04-01 permanece abierto solo en aspectos de presentación/embalaje ajenos a la fórmula mayorista.
