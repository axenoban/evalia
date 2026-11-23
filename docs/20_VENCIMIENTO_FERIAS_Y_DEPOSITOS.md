# EVALIA — G01/R09: calendario, depósitos y revisión al superar la semana adicional

**Fecha de selección:** 2026-11-22. **Estado:** calendario de siete días cerrado, registro posterior de depósito permitido y **tolerancia comercial usual de hasta una semana adicional** expresada por el propietario. **La fecha de inicio de la semana ya está fijada por decisión posterior: se cuentan 7 días naturales desde el vencimiento ordinario F de la feria, con hora límite 12:00. La decisión posterior autoriza **EN REVISIÓN + intento de contacto WhatsApp manual**, NO liberación automática, al alcanzar L**. PR #1 en borrador. **Sin SQL, aplicación o pagos implementados.**

## Declaración literal del propietario

> la reserva o liberacion sera de una feria, es decir si se reserva martes o miercoles, la reserva vence el sabado, si se reserva viernes o  sabado, la reserva vence el miercoles, las reservas en todas las fechas vencen al medio dia, a menos que se haya dejado un deposito, cosa que podremos registrar incluso despues del registro de reserva

## Matriz de vencimiento CONFIRMADA para los siete días (reservas sin depósito)

Las reservas **guardadas y todavía no convertidas en pedido** se apartan del stock apto disponible según la política B del surtido y R06. La vigencia se calcula por el **día local de creación/guardado de la reserva** y termina a las **12:00 (mediodía)** de la fecha establecida.

| Día en que se guarda la reserva | Vence a las 12:00 |
| --- | --- |
| **Domingo** | **Miércoles inmediatamente siguiente** |
| **Lunes** | **Miércoles inmediatamente siguiente** |
| **Martes** | **Sábado de la misma semana** |
| **Miércoles** | **Sábado de la misma semana** |
| **Jueves** | **Sábado de la misma semana** |
| **Viernes** | **Miércoles de la semana siguiente** |
| **Sábado** | **Miércoles de la semana siguiente** |

**Segunda decisión expresa del propietario (mapeo de días antes no contemplados):**

> Para EVALIA, las reservas creadas lunes, jueves o domingo seguirán esta regla: vencimiento automático según la próxima feria, sábado o miércoles a las 12:00, definiendo claramente el mapeo de cada día. Actualiza G01 y las pruebas documentadas en la rama feature, mantén PR #1 en borrador, sin SQL ni merge.

**Alcance de esta segunda decisión:** para los tres días nuevos se toma la **próxima feria en el futuro**: domingo/lunes → miércoles; jueves → sábado. Los cuatro días ya definidos conservan **literalmente** la regla comercial anterior, aunque no correspondan a la feria cronológicamente más cercana: martes/miércoles → sábado; viernes/sábado → miércoles siguiente. **No redefinir el calendario completo por una regla global de «primera feria» que anule las cuatro excepciones originales.**

**Desplazamiento esperado en días naturales (toda reserva vence en un día futuro, a las 12:00 locales):** domingo +3, lunes +2, martes +4, miércoles +3, jueves +2, viernes +5, sábado +4. El instante de creación puede ser antes o después del mediodía del propio día; el vencimiento señalado está siempre en fecha posterior.

La fecha/hora debe mostrarse en el administrador **explícitamente** y en el mensaje manual preparado de WhatsApp **si se incorpora al contenido aprobado del mensaje**. Propuesta técnica de zona local: **`America/La_Paz`** por operación EVALIA en Santa Cruz de la Sierra, Bolivia. Es una elección de zona del sistema propuesta para evitar discrepancias de servidor/UTC; la **hora comercial de las 12:00 sí fue definida expresamente** por el propietario.

### Calendario verificable (fechas ilustrativas)

- **Domingo 2026-11-22** → **miércoles 2026-11-25 12:00** (nuevo).
- **Lunes 2026-11-23** → **miércoles 2026-11-25 12:00** (nuevo).
- **Martes 2026-11-24** → **sábado 2026-11-28 12:00** (regla previa).
- **Miércoles 2026-11-25** → **sábado 2026-11-28 12:00** (regla previa).
- **Jueves 2026-11-26** → **sábado 2026-11-28 12:00** (nuevo).
- **Viernes 2026-11-27** → **miércoles 2026-12-02 12:00** (regla previa).
- **Sábado 2026-11-28** → **miércoles 2026-12-02 12:00** (regla previa).
- **Cruce de año (jueves 2026-12-31)** → **sábado 2027-01-02 12:00** (nuevo).
- **Cruce de año (martes 2026-12-29)** → **sábado 2027-01-02 12:00** (regla previa).

**Ya no quedan días de la semana sin vencimiento.** Las reservas de domingo, lunes y jueves son registrables como las demás y se calcula su fecha por la matriz. **No cambiar automáticamente el calendario por feriados o cierres extraordinarios**: la gestión de ferias canceladas/trasladadas continúa pendiente. La existencia de un depósito permite la excepción general sin cambiar ninguna fecha ordinaria de la matriz.

## Excepción expresa: depósito registrado después de reservar

1. **No es requisito inicial** efectuar depósito para guardar reserva: R06 guarda y aparta cantidad, con vencimiento ordinario calculado según la matriz.
2. Puede registrarse **un depósito de manera posterior a la creación de reserva**, desde el administrador, vinculado a **esa reserva y al cliente**. No exigirlo solo en el alta.
3. La excepción comercial «**a menos que se haya dejado un depósito**» implica que, **si el depósito consta como efectivamente recibido antes de vencer**, la reserva **no debe liberarse automáticamente** por el vencimiento ordinario de esa feria.
4. **Nueva aclaración posterior del propietario:** con depósito se puede esperar **hasta una semana adicional** para que el cliente **complete el saldo y retire el pedido**; es la tolerancia comercial habitual, y el propietario indica que normalmente no ha sido necesario esperar más. **La duración y su inicio quedan aprobados por decisión posterior:** el límite de tolerancia es **7 días naturales contados desde la fecha/hora de vencimiento original de feria**, a las **12:00**; no se cuenta desde la fecha del depósito. El mecanismo de liberación al concluir sigue pendiente. No imponer protección indefinida ni un plazo computable fingido, ni inventar porcentaje mínimo, penalización o devolución.
5. Registrar el depósito **no equivale a entregar mercancía ni a convertir automáticamente una reserva en pedido confirmado**. G03 mantiene «Confirmar pedido» como acción de administrador; el cupo sigue contándose una sola vez.
6. El registro es **manual para pagos externos** (D11), no supone cobro por pasarela, tarjeta, transferencia automática, OCR ni acceso bancario. El estado técnico «informado» vs «constatado» es recomendación de control, **no** un requisito que permita declarar dinero recibido sin comprobación.
7. Depositar **después de vencida** la reserva o registrar una transferencia con fecha anterior pero comunicada tarde: **no resucitar automáticamente una reserva ya vencida ni volver a bloquear stock que pudo venderse**. Son incidencias que requieren criterio del propietario/administrador y validación de disponibilidad, nunca reactivación silenciosa.

### Invariantes para arquitectura futura (candidatos, sin SQL)

- **Reserva no confirmada sin depósito aplicable y vencida:** con la matriz aprobada para los **siete días**, pasarla a vencida y liberar el **saldo pendiente de stock aún reservado** en forma **atómica, auditable e idempotente**, incluyendo cupos surtidos G y asignaciones exactas E. La liberación aumenta disponible, pero **no cambia stock físico apto**.
- **Reserva con depósito efectivamente recibido a tiempo:** queda **protegida de la liberación automática ordinaria**, con **tolerancia comercial de hasta una semana adicional** para completar pago y retiro. El **ancla de esos siete días está definida**: vencimiento ordinario F **+ siete días naturales**, a las **12:00 locales**; el disparador de liberación después de la tolerancia **sigue pendiente**. Se puede calcular y mostrar el límite, pero no programar la cancelación/liberación automática sin la decisión faltante. El registro del depósito debe reevaluar la elegibilidad de vencimiento sin eliminar el rastro original.
- **Reserva convertida a pedido confirmado:** el vencimiento de la reserva **no libera asignaciones del pedido**; transición de reserva a pedido transfiere compromiso sin duplicación. G03-B rige pedidos parcial o totalmente pendientes de entrega.
- **Borrador:** no aparta stock y no debe «liberar» unidades al vencer; vencimiento G01 está definido para reservas **guardadas**.
- **Depósito registrado después del alta, antes del vencimiento:** asociarlo a la reserva existente, preservando código y sin crear una reserva nueva; mantener historial de importe, fecha efectiva declarada, fecha/hora de registro, observaciones, autor y soporte comprobante **solo si se aprueba capturarlo**.
- **Carrera en el vencimiento:** al resolver depósito vs expiración/confirmación, mantener una única decisión consistente. El registro tardío no debe anular una expiración ya aplicada ni sobrepasar inventario disponible.
- **No diferenciar plazo por cantidad** de media docena frente a docena; la política se establece por día de captura, etapa de compromiso y existencia de depósito, no por tamaño de reserva.
- **E1:** administrador único (R01) y WhatsApp manual (R11), sin automatismo de pasarela.

## Estados de decisión G01 y G06

| Cuestión | Estado | Motivo |
| --- | --- | --- |
| G01: domingo/lunes → miércoles | **RESUELTO** | Primera feria siguiente, miércoles 12:00 |
| G01: martes/miércoles → sábado | **RESUELTO** | Sábado de la misma semana, 12:00 |
| G01: jueves → sábado | **RESUELTO** | Primera feria siguiente, sábado 12:00 |
| G01: viernes/sábado → miércoles | **RESUELTO** | Miércoles de la semana siguiente, 12:00 |
| G01: calendario de los 7 días | **RESUELTO** | Las reservas pueden crearse cualquier día; ninguna fecha queda indeterminada |
| G01: hora de vencimiento | **RESUELTO** | 12:00 local del día calculado |
| G01: depósito posterior a crear reserva | **RESUELTO** | Registro posterior permitido |
| G01: depósito protege frente a vencimiento de feria | **RESUELTO como excepción** | No liberar automáticamente ese día si se recibió a tiempo |
| G01: plazo con depósito | **RESUELTO EN DURACIÓN Y ANCLA** | Vencimiento original de feria F **+7 días naturales, 12:00** |
| G01: entrada a revisión tras L con depósito | **RESUELTO** | **EN REVISIÓN** y contacto **WhatsApp manual**; sin liberación ni movimiento de dinero |
| G03-B/G06: resolución después de revisión | **PENDIENTE** | Plazo/intentos de respuesta, liberación/cancelación posterior y destino del depósito |
| G06: importe mínimo, prueba/validación y múltiples depósitos | **PENDIENTE** | Solo se confirmó posibilidad de registrar depósito |
| G03-B: pedido confirmado/parcial o cancelaciones | **PENDIENTE** | No aplicar vencimiento de reserva a pedido |
| G01: feriados, cierres excepcionales, fines de campaña | **PENDIENTE** | No inventar prórrogas o desplazamientos automáticos |

## QA de aceptación documental (NO ejecutado en una app)

| Caso | Comportamiento esperado |
| --- | --- |
| Martes 2026-11-24, guardar reserva sin depósito | Vencimiento sábado 2026-11-28 a las 12:00 |
| Miércoles 2026-11-25, guardar reserva sin depósito | Vencimiento sábado 2026-11-28 a las 12:00 |
| Viernes 2026-11-27, guardar reserva sin depósito | Vencimiento miércoles 2026-12-02 a las 12:00 |
| Sábado 2026-11-28, guardar reserva sin depósito | Vencimiento miércoles 2026-12-02 a las 12:00 |
| Martes 2026-12-29 | Vencimiento sábado 2027-01-02 a las 12:00 |
| Viernes 2026-11-27, depósito ingresado administrativamente el martes 2026-12-01 | No liberar automáticamente el miércoles 2026-12-02 si se registra como recibido a tiempo |
| Reserva guardada con cupo surtido G=6, no convertida, sin depósito y vencida | Liberar seis unidades **solo una vez**, sin alterar S físico |
| Reserva con colores exactos E y un pedido confirmado | Expiración solo actúa sobre **reservas todavía vigentes**, nunca libera stock ya trasladado al pedido |
| Reejecutar proceso de vencimiento sobre reserva ya vencida | No duplicar liberación de cupo ni alterar inventario |
| Domingo 2026-11-22, guardar reserva sin depósito | Vencimiento miércoles 2026-11-25 a las 12:00 |
| Lunes 2026-11-23, guardar reserva sin depósito | Vencimiento miércoles 2026-11-25 a las 12:00 |
| Jueves 2026-11-26, guardar reserva sin depósito | Vencimiento sábado 2026-11-28 a las 12:00 |
| Jueves 2026-12-31, guardar reserva sin depósito | Vencimiento sábado 2027-01-02 a las 12:00 |
| Domingo 2026-11-22 a las 11:00 o 22:00, guardar reserva sin depósito | **Misma fecha** miércoles 2026-11-25 a las 12:00: importa el día local de alta |
| Reserva activa el día del vencimiento a las 11:59:59 | Vigente mientras no haya llegado la hora establecida, salvo otros cambios |
| Reserva no confirmada sin depósito al llegar al vencimiento de las 12:00 | Elegible para expiración y liberación idempotente de sus cantidades pendientes |
| Depósito anotado después de que el vencimiento ya fue ejecutado | No reactivar ni readjudicar stock automáticamente; incidencia administrativa |
| Un pedido por 6 unidades y otro por 12, mismo día de registro | **Misma matriz temporal** si ninguno tiene depósito, sin privilegio por cantidad |
| Borrador sin Guardar reserva | Ningún cupo asignado, por tanto vencimiento no tiene stock que liberar |

## Pendientes para la siguiente pregunta al propietario

1. **Cómo resolver el caso DESPUÉS de marcar EN REVISIÓN e intentar contactar por WhatsApp manual**: sin respuesta, nuevas prórrogas, cancelación/liberación manual, plazo y número de intentos aún pendientes.
2. **Destino del depósito** después de esa resolución: no retener, reembolsar o compensar automáticamente sin nueva aprobación.
3. **Definir depósito** para protección: importe mínimo, confirmado vs solamente notificado, cuándo se acredita y cómo se registra uno recibido tarde.
4. **G03-B:** cancelación con depósito, pedidos ya confirmados y entrega parcial, destino de pago si se cancela.
5. Régimen excepcional por feriado/cambio de día de feria y aviso al cliente: no aprobado.

**El mapeo de lunes, jueves y domingo está resuelto**; no volver a preguntar por esos días salvo un cambio expreso de las reglas.

**No crear SQL, modificar main, ni fusionar PR #1.**

## Nueva observación del propietario — protección limitada de reserva con depósito (2026-11-22)

**Declaración literal:**

> normalmente si ya realizo un deposito, podemos esperar hasta una semana mas , normalmente no ha pasado que haya durado mas de ese tiempo en completar el pago y el recogo del pedido

**Decisión comercial extraída sin suposiciones:**
- Un depósito efectivamente recibido permite **esperar hasta una semana adicional** para terminar de **pagar** y **recoger**. No es una protección permanente.
- Se trata del **comportamiento habitual de EVALIA** y no equivale por sí solo a una orden de **liberación automática exacta** siete días después de una fecha escogida arbitrariamente.
- Se mantiene el **vencimiento de feria ordinario** guardado como referencia histórica. No se libera la reserva el día de feria si consta depósito recibido a tiempo.
- El **inicio de la semana adicional aún es ambiguo**. Si una reserva se crea un martes y vence un sábado, pero el depósito llega el viernes, **contar desde sábado** y **contar desde viernes** producen fechas distintas. Ambas son posibilidades sin aprobación y **no se debe decidir entre ellas en código/SQL**.
- El fin de la protección requiere definir **liberación automática o revisión administrativa**, qué hacer si queda saldo o falta retiro, y tratamiento/devolución de depósito. **No inventar confiscaciones, penalizaciones ni vencimientos alternos**.
- Una anotación de depósito **posterior a una reserva ya expirada y liberada** nunca puede bloquear de nuevo existencias automáticamente: antes deben revisarse estados, stock y la regla de pagos tardíos.
- Como la fecha exacta extendida no está acordada, el sistema futuro debería distinguir por ahora conceptual y visualmente: **«Con depósito — protegida del vencimiento de feria; fin de tolerancia pendiente de parametrizar»**, no mostrar «sin vencimiento» ni fabricar una fecha de siete días.

**Casos candidatos para validar una vez ratificada el ancla:**

| Escenario | Resultado comercial ya confirmado | No decidido |
| --- | --- | --- |
| Reserva martes, feria vence sábado; depósito recibido jueves | Se protege de la expiración del sábado; tolerancia de hasta 7 días adicionales | Fecha de inicio y fin de los 7 días |
| Reserva viernes, feria vence miércoles; depósito recibido martes posterior | Se protege de la expiración del miércoles; cliente puede completar pago y retiro en la semana adicional | Si vence martes, miércoles siguiente u otra fecha |
| Cliente paga el saldo y retira antes del límite | Registrar operaciones y evitar liberar stock ya entregado | Flujo preciso de confirmación/entrega G03-B |
| No completa pago ni retira tras la tolerancia | La protección no se presume indefinida | Revisión/manual/auto y destino del depósito |

**No modificar política de 12:00 de vencimiento de feria sin depósito; no asumir que ese horario rige también el nuevo límite con depósito** hasta precisar el ancla y la operación de salida. [Decisiones G03-B](09_G03_G04_SELECCIONES.md).

## ÚLTIMA DECISIÓN PREVALENTE — ancla de la semana con depósito CERRADA (2026-11-22)

**Respuesta literal del propietario:** «la primera opcion esta bien», aceptando la alternativa de **contar desde el vencimiento original de feria** frente a contar desde la recepción del depósito.

### Contrato temporal

Para una reserva guardada, aún vigente y sin convertir a pedido, sea **F** su vencimiento **ordinario por feria**, determinado por el calendario de siete días, siempre a las **12:00 locales**.

- **Sin depósito aplicable:** el vencimiento de reserva continúa en **F**.
- **Con depósito efectivamente recibido antes de F:** límite ampliado **L = F + 7 días naturales**, siempre **12:00 locales**, aunque el depósito se registre días después de guardar la reserva. La fecha del depósito **no recalcula F ni L**.
- **Al llegar a L:** termina la tolerancia comercial, pero la **acción sobre el inventario y el dinero no está aprobada**. **No liberar automáticamente cupos G/E, cancelar ni confiscar/devolver depósitos** hasta resolver G03-B/G06. Mostrar que se alcanzó L y que requiere política/gestión administrativa. No prometer vigencia indefinida.
- **Reserva ya vencida y con stock liberado:** un depósito posterior no la reactiva ni reaparta unidades automáticamente.
- **Pedido confirmado o parcialmente entregado:** no se libera por reloj de reserva. Conserva los compromisos según flujo propio G03-B aún pendiente.
- Mantener F original y L calculado como marcas distintas; las notas anteriores «ancla pendiente» son histórico **expresamente superado** por esta decisión.

| Día de reserva | Feria original F | Límite L con depósito oportuno |
| --- | --- | --- |
| Martes 2026-11-24 | Sábado 2026-11-28, 12:00 | **Sábado 2026-12-05, 12:00** |
| Viernes 2026-11-27 | Miércoles 2026-12-02, 12:00 | **Miércoles 2026-12-09, 12:00** |
| Domingo 2026-11-22 | Miércoles 2026-11-25, 12:00 | **Miércoles 2026-12-02, 12:00** |
| Jueves 2026-12-31 | Sábado 2027-01-02, 12:00 | **Sábado 2027-01-09, 12:00** |

**Prueba de invariancia del depósito:** para una reserva del martes 24/11 con F=28/11 a las 12:00, recibir depósito el miércoles 25/11 o viernes 27/11 produce **el mismo L: sábado 05/12 a las 12:00**. No usar `deposit_at+7d`. A las 11:59:59 de L permanece dentro de tolerancia; a las 12:00 se cumple L sin que eso autorice por sí mismo una liberación de stock.

**Estado:** calendario G01 (7 días) RESUELTO; tolerancia (7 días naturales desde F, 12:00) RESUELTA; **acción final al alcanzar L, dinero, depósitos tardíos, feriados y pedidos parciales** PENDIENTES. Solo documentos, sin SQL ni merge.

## ÚLTIMA DECISIÓN G01-L — revisión administrativa y WhatsApp, sin liberación (2026-11-22)

**Declaración literal del propietario:** «en el poco probable caso, marquemos en revision donde se intentara contactar con el cliente por whattsapp».

**Qué sucede al llegar al límite ampliado L** (`L = vencimiento ordinario de feria F + 7 días naturales`, a las **12:00 locales**):

1. Si sigue siendo **reserva con depósito efectivamente recibido antes de F**, que **no se convirtió a pedido confirmado ni concluyó con pago y recogida**, cambiar automáticamente **solo su estado administrativo** a **EN REVISIÓN**, con **pendiente de intentar contacto por WhatsApp**. La regla es determinística y debe comprobar el estado más reciente.
2. **Contacto manual:** el administrador intentará contactar al cliente mediante su WhatsApp. Se mantiene R11: **E1 no incluye API de WhatsApp, envío automático ni confirmación de envío por generar un texto**. Se recomienda una acción de la ficha para registrar **fecha, responsable, resultado y observaciones** del intento real, sin inventar cantidad mínima de intentos, mensajes obligatorios ni plazo de respuesta.
3. **No liberar existencias ni mover dinero al entrar a revisión**: las cantidades exactas E y cupos surtidos G siguen reservados para el cliente, la disponibilidad comercial `A = S − E − G` no aumenta y el stock físico apto S no cambia. El depósito registrado permanece asociado e intacto; **no cancelación automática, multa, confiscación ni devolución** por mero vencimiento de L.
4. **Idempotencia:** ejecutar la evaluación temporal repetidas veces no debe crear revisiones, tareas de contacto ni movimientos duplicados. Solo el administrador acredita un contacto realizado; el scheduler no envía mensajes.
5. **No confundir estados:** una **reserva sin depósito** vence y libera su compromiso todavía reservado al llegar a F, conforme a la regla original. Un **pedido confirmado** (o parcialmente entregado) no debe entrar en el vencimiento de reservas ni perder su compromiso; su tratamiento sigue G03-B.
6. **Tras la revisión**, qué hacer cuando el cliente **no responde**, pide plazo extra, quiere cancelar o no termina de pagar es **un nuevo punto de decisión**: no aprobar liberación posterior ni disposición del depósito por inferencia. Preservar auditoría y prevenir sobreventa.

### Criterios QA para la entrada en revisión (NO ejecutables hasta desarrollar app)

| Situación | Resultado esperado |
| --- | --- |
| Reserva martes 2026-11-24, depósito recibido a tiempo | F sábado 2026-11-28 a las 12:00, L sábado **2026-12-05 12:00** |
| Esa reserva a las **2026-12-05 11:59:59** | Continúa dentro del plazo ampliado, no aplicar transición L |
| Esa reserva a las **2026-12-05 12:00**, sin completar pago/retiro y sin confirmar pedido | **EN REVISIÓN**, pendiente contacto WhatsApp **manual**, **sin liberar G/E** ni mover depósito |
| Reserva viernes 2026-11-27 con depósito oportuno | F miércoles 2026-12-02 12:00, L miércoles **2026-12-09 12:00**, mismo proceso |
| Repetir job de revisión 10 veces | Una sola transición administrativa y tarea pendiente, **0 envíos WhatsApp automáticos**, 0 liberaciones duplicadas |
| Reserva sin depósito al llegar F | Vencimiento ordinario y liberación de cupo pendiente, **no EN REVISIÓN por esta excepción** |
| Reserva convertida a pedido antes de L | No tocar por scheduler de reservas; compromiso del pedido protegido |
| Administrador intenta contactar y no obtiene respuesta | Registrar intento real si hay funcionalidad, **seguir en revisión**, sin cancelación ni devolución automática |
| Depósito anotado después de reserva ya expirada y liberada | No resucitar cupo ni rehacer reserva automáticamente; incidencia administrativa |

**Estado después de esta decisión:** calendario G01 **resuelto**; fecha F **resuelta**; depósito antes de F protege; límite L=F+7 días **resuelto**; al llegar L **EN REVISIÓN + WhatsApp manual** **resuelto**. **Pendiente G03-B/G06:** qué hacer después de contactar, plazos, cancelaciones, devoluciones/retenciones, parcialidades y verificación de pagos. **Sin SQL, sin código, PR #1 DRAFT, sin merge.** Las anotaciones anteriores «qué hacer al alcanzar L pendiente» quedan superadas únicamente para **entrada en revisión**, no para resolución posterior.

## Distinción G03-B posterior — cancelación de saldo de pedido confirmado
Una decisión comercial posterior **sí autoriza cancelar administrativamente las cantidades de un pedido confirmado que todavía no se entregaron**, preservando la historia de unidades entregadas. Ejemplo 12 confirmadas, 5 entregadas, 7 pendientes → cancelar 7 libera solo esos compromisos, **sin incrementar stock físico**, con auditoría. **No confundir** con la reserva depositada EN REVISIÓN de G01-L: su entrada en revisión **no autoriza automáticamente la cancelación**, aunque exista una acción administrada para pendientes de pedido confirmado. Los depósitos/reembolsos y la resolución de revisión no respondida siguen pendientes G06/G03-B. [Contrato](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md).

## G06 — aplicación contable del depósito sin duplicación en la confirmación
El propietario aprobó que un depósito **efectivamente recibido** para una reserva se **impute como abono al pedido** cuando se confirme. Mantener un solo evento de ingreso y transferir la asociación reserva→pedido sin duplicar el cobro; otros pagos parciales pueden registrarse después. Este vínculo contable **no modifica F ni L** y tampoco convierte la reserva en pedido automáticamente; G01 conserva plazos/condiciones por depósito oportuno y G01-L revisión WhatsApp manual. El aviso de una transferencia sin recepción comprobada no debe contarse como dinero recibido ni protección automática; el procedimiento concreto de constatación sigue pendiente. [G06](22_DEPOSITOS_ABONOS_Y_SALDOS.md).

## G06-VALIDACIÓN — aprobación administrativa de avisos de pago (2026-11-22)
**Nueva regla G06-VALIDACIÓN:** un depósito **informado por cliente** permanece PENDIENTE hasta aprobación exclusiva del administrador tras constatar recepción. **No protege F** por mera captura o aviso. Aprobado oportunamente permite L=F+7 a las 12:00; si se aprueba después de que F venció y el cupo se liberó, **no reactivar automáticamente**, revisar cronología y disponibilidad. Sin cambios al calendario ni EN REVISIÓN/WhatsApp manual en L. [G06](23_VALIDACION_ADMINISTRATIVA_PAGOS.md).

## G06-CLIENTE posterior — comprobante del pedido por enlace, reserva anterior sigue manual
La vista autorizada por enlace privado corresponde **a pedido registrado/confirmado**, con QR e imagen de comprobante para declarar pago pendiente. **No autoriza todavía un enlace público para una reserva sin pedido**. Un depósito en fase de reserva sigue pudiendo informarse por WhatsApp y registrarse por administrador, aprobándose solo cuando se constató ingreso. Un comprobante no aprobado no protege F ni altera L; si después se confirma pedido, trasladar el mismo depósito aprobado sin duplicación. [D13](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md) · [G06](25_QR_Y_COMPROBANTES_CLIENTE.md).

## D0 — implementación temporal sin abrir políticas comerciales (PROPUESTA)
[29](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) y [30](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md) proponen scheduler transaccional idempotente que revalida pago y estado de reserva bajo el mismo bloqueo antes de liberar en F o marcar EN REVISIÓN en L; **no liberar E/G por revisión**, sin WhatsApp automático y sin resurrección tras expiración. `America/La_Paz` continúa propuesta técnica de zona comercial, no hecho operativo ratificado. Aprobación tardía de depósito con recepción previa a F mantiene incidencia pendiente D0-D.
