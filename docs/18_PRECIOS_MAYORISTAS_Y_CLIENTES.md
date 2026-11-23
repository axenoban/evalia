# EVALIA — Precios mayoristas por modelo, sugerencias por talla y beneficios de cliente

**Fecha:** 2026-11-22. **Estado:** requisitos expresos y recomendaciones técnicas registradas, sujetos a ratificación del PR. **No SQL, no código ni tarifas reales inicializadas.** Aclaración posterior a G04/R01–R12.

## Declaración literal del propietario

> las reservas solo seran al precio de por mayor, es decir podemos realizar una tabla de precios por talla, ya sea por modelo o por tallas, hay veces en las que algunas tallas xl pueden costar 380 o 420, y las tallas M pueden varian segun el modelo, por ende puede ser mejor al registarr el modelo y la talla, definir el precio, con un precio sugerido base que se puede fijar, asi registrar mas rapido los diseños y modelos, ya que se debe registrar alrededor de 6 modelos o mas por feria, ademas que se debe de subir una foto del modelo, asi tambien asignar que colores estan disponiblers en cada modelo, podemos hacer un guardado o memoria de colores que se escogieron en el anterior modelo para registrar mas rapido, y tambien podemos hacer una memoria de que modelos son los que normalmente hay para m y cuale s para xl ya que siempre hay diferencias ya que estan detinadas para personas mayores y usan otros colores, puede existir tarifa especial por cliente se puede implmentar directo al cliente si es especial o si resive precio especial, definiendo para x cliente especial es -10bs en cada docena que pida, por ejemplo, y eso se deberia debitar directamente al registrarle el pedido a ese cliente

## Hechos comerciales y elecciones explícitas

1. Las **reservas son exclusivamente mayoristas**; al capturarlas se utilizará **tarifa mayorista**, no precio minorista. La tarifa especial del cliente puede ajustar el mayorista conforme a su configuración.
2. Cada **modelo tiene una sola talla**, pero varios modelos de la misma talla pueden tener **precios diferentes**. Los valores **Bs 380 o Bs 420 para ciertos XL** son ejemplos, no precios universales ni una tabla inicial autorizada. M también varía por modelo.
3. Al **registrar un modelo** se podrá **definir su propio precio**, partiendo de una **sugerencia base configurable** para registrar más rápido.
4. Un cliente marcado/configurado como **especial** puede tener un **beneficio registrado en su ficha** que debe sugerirse/calcularse al armar el pedido para ese cliente; ejemplo comercial: **Bs 10 menos por docena**. Esto es un **ejemplo de configuración**, no descuento global obligatorio.
5. El precio efectivo se debe explicar/desglosar al administrador; se conserva G04-08 de **precio fijado al confirmar el pedido**, mientras la reserva muestra tarifa vigente. No inferir que la mera solicitud congela tarifas.
6. Las ventas **minoristas directas** siguen dentro de D06; lo que queda limitado a mayorista es **la función de reservas**. No transformar automáticamente ventas minoristas en reservas.

## Arquitectura recomendada de precios (NO aprobada como tablas)

| Capa | Propósito | Regla de precedencia candidata |
| --- | --- | --- |
| Sugerencia por talla | Mostrar un **precio mayorista predeterminado** al dar de alta un nuevo modelo; editable y opcional si no se define | **Solo autocompletar**; nunca sobrescribe precio propio del modelo |
| Precio propio del modelo | Tarifa mayorista efectiva configurada en el modelo y su presentación correspondiente | **Fuente principal**, puede diferir de otro modelo de la misma talla |
| Condición especial por cliente | Beneficio explícito asociado al contacto o cliente mayorista, con tipo/valor/alcance por decidir | Se **evalúa primero según G04-07**, sin ocultar el precio base ni duplicar descuentos |
| Precio acordado de pedido | Importe definitivo por línea en la confirmación, con motivo si cambia manualmente | **Snapshot histórico**; ningún cambio futuro del modelo/cliente lo modifica |

**Distinción crucial:** una sugerencia de talla **no es** una tarifa aplicable a un pedido cuando el modelo ya tiene precio propio. No imponer que todos los XL cuesten igual. El modelo también puede asociar futuros precios minoristas si se ratifican, pero la reserva utiliza **exclusivamente condiciones mayoristas**.

## Ejemplo de cliente especial (solo la parte inequívoca)

Un modelo podría tener una **tarifa de docena de Bs 380** (ejemplo, no dato inicial de EVALIA), mientras un cliente concreto tiene configurado **descuento Bs 10 por docena**, lo que deja **Bs 370 por una docena completa elegible**. Para dos docenas enteras elegibles de ese mismo modelo, el ejemplo aritmético sería Bs 760 − Bs 20 = Bs 740 **si** la regla acordada es aditiva por cada docena y dentro de ese modelo. La definición de la aplicabilidad **entre modelos** queda pendiente. La cantidad de **6, 7 u 11 unidades no tiene importe ni descuento definido** con estos datos: no prorratear 380/12×7 ni 10/12×7.

El cliente no necesita una cuenta online para recibir el beneficio: la regla está en su **ficha administrativa** ligada a ID del cliente, no en su usuario Auth. Mostrar un resumen transparente de precio base, descuento elegible, total, responsable y versión de tarifa.

## Flujo propuesto de aplicación

1. El administrador abre **Nueva reserva mayorista** o **Nuevo pedido**.
2. Identifica al cliente por WhatsApp; recupera sus condiciones comerciales especiales si están configuradas.
3. Selecciona el modelo con talla única y precio propio; para reserva, el canal de cálculo debe ser **mayorista**.
4. Introduce la cantidad por modelo; el motor propone precio de la presentación aplicable conforme a G04 cuando se defina. **No inventar tratamiento de 6–11 unidades.**
5. Si hay condición especial, el sistema la evalúa **automáticamente según el alcance registrado**; el administrador ve desglose y cualquier condición no resuelta como pendiente, no un total falso.
6. Al **confirmar pedido**, fijar snapshot de precio aplicado/bonificación con referencia de regla; excepciones manuales solo admin y motivo/historial (G04-09).
7. Si se edita posteriormente una tarifa base o beneficio del cliente, **no recalcular retroactivamente** pedidos confirmados.

## Cuestiones esenciales pendientes de decisión

- **P-01: precio de 6–11 unidades** de un mismo modelo; ¿precio por media docena, precio unitario mayorista, tarifa escalonada o fórmula específica? No derivar proporcionalidad de docena.
- **P-02: descuento de cliente por docena** sobre 6–11 unidades, y suma de media docena/fragmentos entre modelos. ¿Solo docenas completas por **cada modelo**, fracción proporcional o reglas por presentación? No asumir.
- **P-03: mezcla de beneficios**: si un cliente tiene precio fijo especial y ajuste «−Bs 10 por docena», ¿son excluyentes, prioritarios o acumulables? G04-07 prioriza condición especial, no indica apilamiento.
- **P-04: estructura del precio** para cada modelo (docena y/o media docena y/o precio por unidad) y si color del mismo modelo altera precio; no crear tarifas ausentes.
- **P-05: precio sugerido por talla**: periodicidad de cambio y quién puede modificarlo, si puede copiarse de un modelo anterior; no inventar valores predeterminados.
- **P-06: impuestos, moneda de exportación, redondeos, negociación/ajustes, historial de vigencia y autorización** antes de implementar.
- G01 (vencimiento), G03-B (cancelación de pedidos/entrega parcial), G07/G08 y G04-01 siguen pendientes.

## Casos de aceptación

- Modelo A talla XL con mayorista ficticio 380 y modelo B talla XL con 420 → ambos se registran, sin sobrescribir tarifas por talla.
- Crear modelo con sugerido 380, editarlo a 420 y guardar → el precio propio es 420; cambiar sugerencia XL no modifica ese modelo.
- Reserva con modelo A y cliente normal → solo la tarifa mayorista del modelo/presentación aplicable.
- Cliente especial con beneficio de 10 Bs por docena para 12 piezas elegibles y precio base 380 → descuento calculado una vez y total 370, snapshot al confirmar.
- Cliente compra 7 unidades → **no calcular automáticamente** descuento ni importe usando fórmulas no aprobadas.
- Editar después la ficha del cliente especial → pedido ya confirmado conserva su historial de importes.
- Precio manual editado solo con permisos de administrador, motivo y evento auditable.
- Un cambio de precio al crear un nuevo modelo no modifica otro anterior de la misma talla.

**Este documento no autoriza todavía un catálogo de precios real, SQL ni desplegar un motor de tarifas incompleto.**
