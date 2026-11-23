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

## CR-01 resuelta: cupo garantizado B seleccionado (2026-11-22)
**Nueva respuesta literal:** «estaria bien garantizarle el pedido porque hasta el momento estos pedidos en fisico se han completado con normalidad, si no recogen o cancelan despues ya es indiferente si ha sido pedido de media o docena».
**Decisión comercial resultante:** para surtidos cuyas tonalidades EVALIA elige después, **garantizar la cantidad registrada con un cupo de existencias aptas bloqueado desde Guardar reserva**. No equivale a garantizar composición por color ni a reducir físicamente las prendas al confirmar. **R06 permanece vigente:** un borrador no bloquea. Decisión seleccionada, **pendiente de ratificación del PR**.
**No retiro/cancelación:** el tratamiento no depende de que se hubiera solicitado media docena o docena. Esto **no** decide el plazo de vencimiento, restituciones, penalizaciones, garantías postentrega, anticipos ni liberación de pedidos confirmados/parcialmente entregados.
**Pendiente técnico-comercial:** precisar la talla o conjunto de tallas elegibles para reservar el cupo; mantener el mínimo por modelo y las tarifas aún no definidas. Detalle [docs/16_DECISION_BLOQUEO_SURTIDO.md](16_DECISION_BLOQUEO_SURTIDO.md).

## Regla posterior de talla única por modelo (2026-11-22)
**Declaración del propietario:** «normalmente por producto o modelo, las tallas son unicas, pero pueden ser M o XL o 2XL, pero eso noquiere decir que se pueden mesclar, es decir de un modelo sera todo talla M, de otro modelo todo sera xl, por modelo cambian los colores y los precios y las tallas, tambien cuando un cliente pide un surtido, ya se habra definido la talla y el modelo, solo faltara la cantidad y los colores que sera registrados».
**Regla seleccionada:** cada modelo lleva **talla única** y el administrador configura sus **colores y precios propios**. **No mezclar tallas dentro de un mismo modelo.** En surtido se conocen modelo y talla de antemano; se registra **cantidad antes de guardar para poder bloquear cupo**, se permite escoger colores después (CR-01 B vigente). Resuelve **C-G04-A/CR-02 sobre mezcla de tallas**; corrige lectura histórica de G04-04 y la observación anterior M/XL, **sin modificar las citas originales**. G04-01 presentaciones y fórmula de precios siguen abiertos. [Contrato canónico](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Selección posterior: precio mayorista por modelo, sugerencias, foto y clientes especiales (2026-11-22)
**Declaración literal del propietario:** «las reservas solo seran al precio de por mayor, es decir podemos realizar una tabla de precios por talla, ya sea por modelo o por tallas, hay veces en las que algunas tallas xl pueden costar 380 o 420, y las tallas M pueden varian segun el modelo, por ende puede ser mejor al registarr el modelo y la talla, definir el precio, con un precio sugerido base que se puede fijar, asi registrar mas rapido los diseños y modelos, ya que se debe registrar alrededor de 6 modelos o mas por feria, ademas que se debe de subir una foto del modelo, asi tambien asignar que colores estan disponiblers en cada modelo, podemos hacer un guardado o memoria de colores que se escogieron en el anterior modelo para registrar mas rapido, y tambien podemos hacer una memoria de que modelos son los que normalmente hay para m y cuale s para xl ya que siempre hay diferencias ya que estan detinadas para personas mayores y usan otros colores, puede existir tarifa especial por cliente se puede implmentar directo al cliente si es especial o si resive precio especial, definiendo para x cliente especial es -10bs en cada docena que pida, por ejemplo, y eso se deberia debitar directamente al registrarle el pedido a ese cliente».

**Reglas/requisitos expresos:** las reservas solo se realizarán con tarifa **mayorista**; la talla es única por modelo; cada modelo establece su **precio específico** y puede partir de un **precio base sugerido por talla** (no obligatorio ni igual para todos). Los ejemplos Bs 380/Bs 420 de ciertos XL y variaciones M **no son tarifas generales**. Crear ~6 modelos o más por feria con **fotografía del modelo** y asociación de sus colores. Recordar selección de colores del modelo anterior y preferencias/plantillas de colores frecuentes por talla para acelerar el alta. Configurar **beneficio individual en ficha de cliente especial**, ejemplo **descuento de Bs 10 por docena**, que aparezca/calculado en el pedido al seleccionar ese contacto.

**Separación selección vs política no cerrada:** el texto ejemplifica el ajuste, **no define tratamiento de seis, siete u once unidades, descuentos entre varios modelos, prioridad entre precio especial fijo y descuento ni si un cambio de tarifa impacta reservas antes de confirmar**. Preservar G04-07/08/09 y no inventar fórmula. [Contrato de precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [alta rápida](19_ALTA_RAPIDA_MODELOS_FERIA.md). PR sigue en borrador; sin implementación.

## Aclaración comercial posterior: precio de 6–11 y descuento diferido (2026-11-22)
**Nueva declaración literal del propietario:** «para pedidos de 6 a 11 unidades, el precio se debe carlcular automanticamente apartir del precio por docena, es decir si la docena es 420, la media sera 210, 7 unidades seran 245, es decir cada unidad adicionar mantendra el precio de unitario de la docena seria salido a 35 en este precio, y asi con los demas precios, ahora el descuento no es necesario que este desde la primera version, eso ya se puede reajustar o apregar un descuento por docena de sierta cantidad, ya que hay veces en las que el cliente quiere regatear o solicictar un descuento por varias docentas, pero no habre descuento para cantidades inferiores a docena».
**Decisiones que prevalecen sobre propuestas anteriores:** (a) **proporción automática exacta** de docena del propio modelo para cada entero `n=6..11`: `P×n/12`; caso P=420 → 6=210, 7=245; (b) **no se requiere descuento en primera versión**, ni beneficio automático de ficha de cliente ni regateo; (c) **ningún descuento para cantidades inferiores a docena**. Descuentos por negociación o varias docenas son un requisito **futuro** y no autorizan porcentajes, descuento prorrateado ni ajuste sin auditoría. P-01 **resuelto**, P-02 no descuento subdocena **resuelto**, P-03 diferido. **Pendiente:** redondeo para P=380 y n=7, reglas >12, presentaciones nominales G04-01 y G04-08 snapshot. [Contrato actualizado](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Decisión RND-01 — redondeo del cálculo mayorista (2026-11-22)
**Declaración expresa del propietario:** «Para EVALIA, la política de redondeo del cálculo mayorista será: redondear el total por modelo al boliviano entero más cercano. Documenta esta decisión si es definitiva, revisa los casos de prueba y conserva el PR #1 en borrador sin implementar SQL ni realizar merge».
**Seleccionada y registrada:** `importe_modelo = redondear_al_entero_más_cercano(P_docena_modelo×cantidad_modelo/12)`, aplicada **una vez al total del modelo** y **antes de sumar modelos**. P=380 n=7 → Bs 222. No crear descuentos E1. La decisión corrige el pendiente RND-01 y prevalece sobre apuntes antiguos que indicaban que ningún redondeo estaba decidido. **Caso límite RND-02 sin respuesta**: x,50 (P=381 n=6=190,50) no tiene desempate designado. La base de cálculo para >12 y G04-01 aún pendientes. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## RND-02 cerrada y pedido con cantidades distintas por modelo (2026-11-22)
**Declaración literal nueva:** «si resulta con 50 centamos se mantiene eso, no se redondea, ahora para cantidades mayores, es decir de tal modelo puede escoger una docena pero de otro solo media, se puede, y el precio se calcula del mismo modo, solo se suman los precios».
**Seleccionado:** si el resultado proporcional calculado para un **modelo** termina **exactamente en 50 centavos**, ese subtotal **se mantiene sin redondear**. Si no termina exactamente en x,50, se aplica entero más cercano según RND-01. **RND-02 queda resuelta**; ejemplo P=381, n=6 ⇒ Bs 190,50. **Pedido multímodelo permitido:** el mismo comprador puede solicitar **una docena del modelo A y media docena del modelo B**; cada modelo cumple mínimo seis, se calcula su subtotal y **se suman los precios sin nuevo redondeo**. A P=420 n=12 + B P=381 n=6 ⇒ Bs 610,50. **No se afirmó que se permita/calcule 13+ del mismo modelo**, pendiente MAY-12. Se conservan G04-08 snapshot, E1 sin descuentos, G04-01 presentaciones nominales sin resolver. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## MAY-12 — Decisión explícita: precio proporcional para 13 o más del mismo modelo (2026-11-22)
**Respuesta literal del propietario a «si el cliente pide 19 prendas del mismo modelo cuya docena cuesta Bs 420, ¿aplicamos también la misma fórmula proporcional?»**: «si, se aplica la misma formula».
**Regla resultante aprobada como selección comercial:** para **todo entero n≥6 por modelo**, sin cambiar reglas al pasar 12, `total_exact_m = P_docena_m×n/12`. Aplicar al total **del modelo** el redondeo a entero más cercano, **salvo conservar x,50 exacto**; sumar modelos independientes sin segundo redondeo. Ejemplo P=420 n=19 → **Bs 665**; P=381 n=18 → **Bs 571,50**. **MAY-12 RESUELTA**, prevalece sobre advertencias históricas de 13+ pendiente; sin descuentos E1, G04-01 presentación/embalaje sigue abierto. El PR #1 permanece DRAFT, sin SQL ni merge. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Nueva decisión G01: reserva hasta la feria siguiente; depósito posterior (2026-11-22)
**Declaración literal del propietario:** «la reserva o liberacion sera de una feria, es decir si se reserva martes o miercoles, la reserva vence el sabado, si se reserva viernes o  sabado, la reserva vence el miercoles, las reservas en todas las fechas vencen al medio dia, a menos que se haya dejado un deposito, cosa que podremos registrar incluso despues del registro de reserva».
**Regla expresamente confirmada:** una reserva guardada **martes/miércoles** tiene vigencia hasta el **sábado de esa semana a las 12:00**; una guardada **viernes/sábado** tiene vigencia hasta el **miércoles de la semana siguiente a las 12:00**. Las reservas con **depósito efectivamente recibido** son excepción al vencimiento ordinario, y el depósito puede **registrarse incluso después del alta inicial de reserva**.
**Pendientes NO decididos:** días lunes/jueves/domingo; qué plazo sustitutivo obtiene la reserva con depósito y quién puede liberarla; importe del depósito, comprobación, devoluciones, pagos tardíos y régimen de pedido convertido/parcial G03-B. No inventar una prórroga indefinida, no revivir automáticamente cupos liberados, no afectar stock físico. G01 **parcialmente resuelto**, ya no pendiente de duración para los cuatro días expresamente indicados. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## Cierre del calendario G01 — lunes, jueves y domingo también automáticos (2026-11-22)
**Última selección literal del propietario:** «Para EVALIA, las reservas creadas lunes, jueves o domingo seguirán esta regla: vencimiento automático según la próxima feria, sábado o miércoles a las 12:00, definiendo claramente el mapeo de cada día. Actualiza G01 y las pruebas documentadas en la rama feature, mantén PR #1 en borrador, sin SQL ni merge».
**Criterio interpretativo de los 3 días nuevos:** domingo → miércoles inmediato a las 12:00; lunes → miércoles inmediato a las 12:00; jueves → sábado inmediato a las 12:00, por ser las ferias siguientes del calendario. **Sin alterar elecciones previas**: martes/miércoles → sábado de esa semana 12:00 y viernes/sábado → miércoles siguiente 12:00. **G01 calendario/horario CERRADO para 7 días**; se aceptan reservas cualquier día con fecha calculada. **G01 no totalmente cerrado** porque el plazo final de reserva con depósito, comprobación/pagos tardíos, cancelación y festivos siguen pendientes. [Contrato](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — nueva precisión sobre reservas con depósito (2026-11-22)
**Declaración literal del propietario:** «normalmente si ya realizo un deposito, podemos esperar hasta una semana mas , normalmente no ha pasado que haya durado mas de ese tiempo en completar el pago y el recogo del pedido».
**Regla comercial registrada:** un depósito efectivamente recibido a tiempo protege del vencimiento ordinario de feria; EVALIA está dispuesta a **esperar hasta una semana adicional** para completar **pago y recogida**, pues normalmente ese tiempo ha sido suficiente. **No se ha definido qué fecha inicia la cuenta de los siete días** (depósito vs feria) ni si la liberación posterior es automática o revisión manual. Es una tolerancia de negocio, **NO una fecha concreta de expiración ni una orden de confiscar/devolver dinero**. No alterar el mapeo de siete días aprobado ni reactivar reservas expiradas mediante anotación tardía. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

## G01 — ancla de depósito expresamente aprobada (2026-11-22)
**Respuesta literal:** «la primera opcion esta bien», refiriéndose a **contar desde vencimiento original de feria**, no desde la fecha de depósito. **Decisión:** con depósito efectivamente recibido antes de F, **límite ampliado L=F+7 días naturales, 12:00 locales**. Ejemplo reserva martes 24/11, F sábado 28/11 12:00, L sábado 05/12 12:00. La duración/ancla están resueltas y prevalecen sobre dudas históricas. **No está resuelto si al alcanzar L procede liberación automática, revisión administrativa, devolución o retención del depósito, ni G03-B**. PR #1 borrador, sin SQL/merge. [G01](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**G01-L — decisión posterior (2026-11-22):** con depósito recibido oportunamente antes de F, la reserva no convertida ni concluida que alcanza **L=F+7 días naturales, 12:00** entra en **EN REVISIÓN** y genera un **pendiente de intento de contacto manual por WhatsApp** para el administrador (R11). **No enviar automáticamente, no liberar stock reservado G/E, no modificar inventario físico S, disponibilidad A ni depósito**. Procesar transición idempotente y auditable; no aplicarla a pedidos confirmados/parciales. Sin depósito, caducidad ordinaria en F. **Sin respuesta:** reglas de cierre, cancelación, dinero y plazos aún abiertas G03-B/G06. [Contrato canónico](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).

**Declaración literal del propietario:** «en el poco probable caso, marquemos en revision donde se intentara contactar con el cliente por whattsapp». **Elección:** al alcanzar L, marcar EN REVISIÓN e intentar contacto WhatsApp (manual E1), sin liberar prendas ni dinero. Lo pendiente es la resolución tras contacto.

## Decisión G03-B-PARCIAL: cancelar pendientes con autorización administrativa (2026-11-22)
El asistente propuso: pedido **12 prendas**, **5 retiradas**, **7 por entregar**; cancelar **únicamente las 7 todavía pendientes**, **previa autorización administrativa**, conservando íntegro el historial de las cinco entregadas; cualquier ajuste monetario por separado. **Respuesta literal del propietario:** «ok aprovamos esa recomendacion, pasemos a lo que sigue».
**APROBADO:** cancelar/restituir a disponibilidad comercial **solo saldos no entregados** de pedidos confirmados, incluidos parcialmente despachados, con autorización admin; `ΔS=0`, `Δ(E/G)=−q`, `ΔA=+q`, preservando la entrega histórica. No programar reembolso, confiscar depósito ni recalcular tarifas confirmadas por suposición. **G03-B parcialmente resuelto, G06 pagos/cancelaciones monetarias y devoluciones físicas de entregados sin definir**. Continuar siguiente bloque de conciliación. [Contrato nuevo](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## G06-PAGOS — depósitos como abono y varios pagos parciales (2026-11-22)
**Pregunta aprobada por el propietario:** «¿Confirmas que los depósitos deben descontarse del total a pagar y que podremos registrar varios pagos parciales hasta completar el pedido?». **Respuesta literal:** «si, esta bien, continuemos».
**APROBADO:** el depósito registrado durante la reserva se **aplica al precio confirmado del pedido**; los posteriores pagos parciales incrementan **total abonado** y disminuyen el **saldo restante**. Historial por operación sin doble conteo ni reescritura. Ej.: precio Bs 840, depósito Bs 200, abono posterior Bs 300 → **500 recibidos, 340 pendientes**. La cancelación del saldo no entregado **NO implica devolución/retención o cambio de precio automático**; requiere conciliación manual de G06. **Pendiente por definir:** qué significa pago reportado vs efectivamente recibido, comprobantes, corrección, exceso, devolución, depósitos mínimos, G03-B monetario y envíos. [Contrato](22_DEPOSITOS_ABONOS_Y_SALDOS.md).

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
**Respuesta literal del propietario:** «esta bien, el administrdor debe aprobar el pago si el cliente agrega un pago». **Seleccionado G06-VALIDACIÓN:** aviso de pago de cliente **PENDIENTE DE VERIFICACIÓN**, no recibido; solo administración constata y **APRUEBA** para contabilizarlo y afectar saldo/G01, sin duplicar eventos. La frase «cliente agrega» no aprueba por sí sola un portal público de cuentas D13/G02 en E1. Rechazos/reversiones, evidencias y pago recibido antes de F pero aprobado después siguen abiertos. [Contrato](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).

## D13-E1 y G06-CLIENTE — recomendación de acceso y pago aprobada (2026-11-22)
**Respuesta literal:** «esta bien tu recomendacion profesional en ambos casos, tanto para la estructura el pago del cliente como para el acceso del cliente».
**Contexto preciso aprobado:** la propuesta profesional fue **(1)** vista mínima de cliente con pedido, saldo, QR, carga de captura y estado de pago, manteniendo administrador como aprobador; **(2)** **Opción 1: enlace único y privado por pedido** en lugar de cuenta de cliente en V1. **Se autoriza esta excepción estrecha E1**, antes solo admin, sin ampliar a crear/confirmar/cancelar pedidos, sin cuentas cliente, sin pasarela ni tarjeta, sin QR inventado. El enlace debe ser secreto, revocable y de alcance por pedido; los comprobantes privados. No decidir por inferencia vigencia exacta del enlace ni banco/QR. [D13](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md) · [G06](25_QR_Y_COMPROBANTES_CLIENTE.md).

## D13-E1 — duración del enlace por pedido activo y revocación aprobada (2026-11-22)
**Declaración literal:** «esta bien el enlace tiene que durar lo que el pedido este activo y por lo menos se marque en terminado o completado, cuando el cliente ya recoja dicho pedido, y como dices en tu recomendacion, el enlace puede ser revocado si se requiere».
**Elección:** mantener activo enlace privado únicamente mientras el pedido permanezca activo; tras recogida y **marca administrativa TERMINADO/COMPLETADO** dejar de permitir consulta o cargar comprobantes. El administrador puede **revocar anticipadamente** y emitir reemplazo para el mismo pedido activo sin revalidar token antiguo. Pago total o entrega parcial no son estado completado. No definir plazo fijo por días. **Pendiente:** cancelación total sin recogida y si es admisible cierre con saldo monetario pendiente. [Contrato](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md).
