# EVALIA — G01/R09: calendario semanal completo de vencimientos por feria y depósito posterior

**Fecha de selección:** 2026-11-22. **Estado:** calendario de los siete días definido como decisión de negocio en rama feature; PR #1 sigue borrador. **No SQL, no aplicación, no operaciones de pago implementadas.** Permanecen abiertas las condiciones finales de reservas con depósito y G03-B.

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
4. **No se conoce la nueva fecha o condición de finalización de la reserva con depósito**: no fijar protección indefinida, ni inventar plazo de prórroga, porcentaje mínimo, penalización, devolución, confiscación, obligación de pago o criterio de retiro.
5. Registrar el depósito **no equivale a entregar mercancía ni a convertir automáticamente una reserva en pedido confirmado**. G03 mantiene «Confirmar pedido» como acción de administrador; el cupo sigue contándose una sola vez.
6. El registro es **manual para pagos externos** (D11), no supone cobro por pasarela, tarjeta, transferencia automática, OCR ni acceso bancario. El estado técnico «informado» vs «constatado» es recomendación de control, **no** un requisito que permita declarar dinero recibido sin comprobación.
7. Depositar **después de vencida** la reserva o registrar una transferencia con fecha anterior pero comunicada tarde: **no resucitar automáticamente una reserva ya vencida ni volver a bloquear stock que pudo venderse**. Son incidencias que requieren criterio del propietario/administrador y validación de disponibilidad, nunca reactivación silenciosa.

### Invariantes para arquitectura futura (candidatos, sin SQL)

- **Reserva no confirmada sin depósito aplicable y vencida:** con la matriz aprobada para los **siete días**, pasarla a vencida y liberar el **saldo pendiente de stock aún reservado** en forma **atómica, auditable e idempotente**, incluyendo cupos surtidos G y asignaciones exactas E. La liberación aumenta disponible, pero **no cambia stock físico apto**.
- **Reserva con depósito efectivamente recibido a tiempo:** queda **protegida de la liberación automática ordinaria**; el estado y fecha final posteriores siguen por decidir. El registro del depósito debe reevaluar la elegibilidad de vencimiento sin eliminar el rastro original.
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
| G01: plazo y salida final con depósito | **PENDIENTE** | No inferir plazo ilimitado ni devolución |
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

1. **Hasta cuándo proteger una reserva con depósito**; quién decide liberación posterior, si se aplica prórroga manual o una nueva fecha de feria.
2. **Definir depósito** para protección: importe mínimo, confirmado vs solamente notificado, cuándo se acredita y cómo se registra uno recibido tarde.
3. **G03-B:** cancelación con depósito, pedidos ya confirmados y entrega parcial, destino de pago si se cancela.
4. Régimen excepcional por feriado/cambio de día de feria y aviso al cliente: no aprobado.

**El mapeo de lunes, jueves y domingo está resuelto**; no volver a preguntar por esos días salvo un cambio expreso de las reglas.

**No crear SQL, modificar main, ni fusionar PR #1.**
