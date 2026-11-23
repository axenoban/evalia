# EVALIA — Precios mayoristas por modelo y cálculo proporcional de 6 a 11 unidades (v0.2)

**Fecha:** 2026-11-22. **Estado:** decisiones comerciales expresas registradas, sin ratificación de PR #1; **no hay código ni migraciones ni precios iniciales reales cargados**. La declaración reciente prevalece sobre la hipótesis de descuento automático anterior.

## Declaraciones del propietario — trazabilidad

**Primera declaración sobre precio propio de modelo, sugerencias y clientes especiales (histórica):**

> las reservas solo seran al precio de por mayor, es decir podemos realizar una tabla de precios por talla, ya sea por modelo o por tallas, hay veces en las que algunas tallas xl pueden costar 380 o 420, y las tallas M pueden varian segun el modelo, por ende puede ser mejor al registarr el modelo y la talla, definir el precio, con un precio sugerido base que se puede fijar, asi registrar mas rapido los diseños y modelos, ya que se debe registrar alrededor de 6 modelos o mas por feria, ademas que se debe de subir una foto del modelo, asi tambien asignar que colores estan disponiblers en cada modelo, podemos hacer un guardado o memoria de colores que se escogieron en el anterior modelo para registrar mas rapido, y tambien podemos hacer una memoria de que modelos son los que normalmente hay para m y cuale s para xl ya que siempre hay diferencias ya que estan detinadas para personas mayores y usan otros colores, puede existir tarifa especial por cliente se puede implmentar directo al cliente si es especial o si resive precio especial, definiendo para x cliente especial es -10bs en cada docena que pida, por ejemplo, y eso se deberia debitar directamente al registrarle el pedido a ese cliente

**Aclaración posterior que fija cálculo mayorista y difiere descuentos:**

> para pedidos de 6 a 11 unidades, el precio se debe carlcular automanticamente apartir del precio por docena, es decir si la docena es 420, la media sera 210, 7 unidades seran 245, es decir cada unidad adicionar mantendra el precio de unitario de la docena seria salido a 35 en este precio, y asi con los demas precios, ahora el descuento no es necesario que este desde la primera version, eso ya se puede reajustar o apregar un descuento por docena de sierta cantidad, ya que hay veces en las que el cliente quiere regatear o solicictar un descuento por varias docentas, pero no habre descuento para cantidades inferiores a docena

## Reglas expresamente fijadas (alcance de primera versión E1)

1. **Las reservas son solo mayoristas**, desde mínimo **seis unidades por modelo**. La venta minorista directa de D06 es un flujo separado; no usar precio minorista en reservas.
2. Cada modelo tiene **una talla única** y un **precio mayorista por docena propio**. Se puede sugerir un precio base configurable por talla para registrar rápidamente un modelo, pero el administrador lo puede reemplazar en cada modelo. Valores de Bs 380 o Bs 420 son **ejemplos**, no precios globales por talla.
3. Para **cada cantidad entera n entre 6 y 11 unidades inclusive** del **mismo modelo**, el importe mayorista **se calcula automáticamente** con la regla **`total_exacto = (precio_docena_modelo × n) / 12`**. La tarifa unitaria implícita es `precio_docena_modelo / 12`. **Media docena:** `n=6 → precio_docena/2`. **Doce unidades:** precio de docena del modelo.
4. **Todos los colores del mismo modelo contribuyen a su cantidad n**, incluidos surtidos cuyo reparto de colores se determina después, siempre que se garantice cupo apto. **No sumar unidades de distintos modelos** para alcanzar el mínimo mayorista de seis o generar una sola tarifa de docena.
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

## Caso de precio docena Bs 380: cuestión de redondeo todavía abierta

- `6×380/12=Bs 190` exactos.
- `7×380/12=Bs 221,666666…` (importe **racional exacto**, no valor a cobrar redondeado todavía).
- `11×380/12=Bs 348,333333…` (racional exacto).

El usuario ha fijado la **proporción**, pero **no la política de redondeo**, nivel de precisión, momento de redondear (línea/modelo vs total del pedido) ni fracción de boliviano permitida para cobro. NO inventar Bs 221,67 ni Bs 222 como importe definitivo hasta que se defina el redondeo. **Recomendación técnica:** representar `precio_docena` en moneda exacta con operaciones decimales/racionales seguras, nunca coma flotante JS para importes de cobro, y redondear en una etapa explícitamente acordada.

## Diseño conceptual de precio para E1 (NO estructura SQL aprobada)

- **Configuración por talla:** precio sugerido para alta de modelo, editable.
- **Modelo:** precio de **docena mayorista** propio, usado como base de cálculo; talla fija y colores vinculados al maestro global.
- **Línea de reserva/pedido:** modelo, cantidad total por modelo, base de docena capturada/consultada, cálculo proporcional y eventual estado de cotización. El color puede estar diferido para surtidos; **cantidad y modelo sí deben estar definidos** para cotizar y bloquear cupo.
- **Pedido confirmado:** guardar precio base de docena, cantidad, resultado monetario final y regla/versión de cálculo; no recalcular pedidos históricos al modificar precios sugeridos/modelos.
- **Ficha de cliente especial:** conservar condición comercial como **requisito de fase futura**, no ejecutar descuentos automáticos en E1. Dejar el esquema futuro para negociar después, sin cargar valores inventados ni tratamiento parcial de docenas.

## P-01/P-02/P-03/P-04 — estado actualizado

| ID | Estado | Significado |
| --- | --- | --- |
| P-01 (precio 6–11) | **RESUELTO** | Proporción lineal exacta `(precio_docena × n)/12`, por modelo |
| P-02 (descuento 6–11) | **RESUELTO: PROHIBIDO** | Nunca aplicar descuento a menos de 12 unidades de ese modelo |
| P-03 (descuentos especiales/clientes) | **DIFERIDO** | No incluir motor de descuento en primera versión; requisitos de negociación futura sin algoritmo |
| P-04 (tarifa base) | **PARCIALMENTE RESUELTO** | Precio por docena propio de cada modelo; G04-01 presentaciones nominales y política de >12 pendientes |
| P-05 (sugeridos por talla) | **DEFINIDO EN CONCEPTO** | Configurable, editable por modelo; valores iniciales no aprobados |
| P-06 (cobro) | **PENDIENTE** | Redondeo, precisión, impuestos, método de cobro, confirmación de tarifa |

## Preguntas residuales antes del motor de precios definitivo

- **RND-01:** Si docena es Bs 380, ¿cuánto se cobra exactamente por 7 prendas: Bs 221,67; Bs 222; Bs 220 u otra política? ¿Redondeo por modelo o por pedido?
- **MAY-12:** ¿Cómo se cobran **13–23 unidades y los múltiplos de docena** con cantidad restante? La regla explícita confirma 6–11 y docena completa, pero no decide otros tramos.
- **G04-01:** Denominaciones de presentación (docena/media docena/unidades de compra), posibles impuestos/registros; no inventar embalajes ni venta minorista.
- **E1:** En pedidos directos, ¿se permiten cantidades menores de seis a precio minorista, y cómo se calculan? D06 reconoce minoristas, pero no se ha fijado esa tarifa.
- **Cliente especial:** descuento manual y automatización futura **solo en docenas elegibles**, pendiente alcance y autorización; NO implementarlo mediante cambios silenciosos de precio.
- G01 reserva/vencimiento, G03-B cancelación, permisos e historial siguen abiertos.

## Casos para futura batería de pruebas

1. Modelo A talla XL, docena ficticia Bs 420; n=6..12 → tabla anterior; con n=7, Bs 245.
2. Modelo B misma talla, docena Bs 380; para n=6, Bs 190; n=7 **requiere redondeo definido**.
3. Reserva surtida de 7 del modelo A, colores pendientes: **cantidad 7 y precio matemático 245** se conocen; luego asignar colores no cambia el precio.
4. Pedido de A (6) y B (6) → calcular **cada modelo por separado**, no tratarlo como una docena de un modelo.
5. Cliente especial antes marcado «−Bs 10» y 7 unidades → **sin descuento**, incluso en versión futura; en E1 **sin descuento también para 12**.
6. Cliente especial con 12 unidades en E1 → tarifa mayorista base sin beneficio automático; una futura función no recalcula pedidos confirmados del pasado.
7. Si cambia precio sugerido de talla, **no cambia precio base de docenas de modelos ya creados**.
8. Un administrador no podrá usar una ruta de ajuste como descuento de E1 sin regla/permiso definidos; preservar trazabilidad.

**No implementar el cálculo de cobro con redondeo arbitrario, ni crear tablas SQL o fusionar PR #1 hasta aprobación.**
