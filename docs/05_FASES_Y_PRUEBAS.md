# EVALIA — Fases de entrega y QA v0.2

**Estado:** plan propuesto sujeto a ratificación; no hay implementación ni pruebas de aplicación ejecutadas.

| Bloque | Objetivo | Aceptación candidata |
|---|---|---|
| E0 | Resolver G01–G09, modelo lógico y arquitectura D16 | Reglas trazadas a datos, estados, permisos y casos de prueba |
| E1 | Entorno Next.js/Supabase de desarrollo, autenticación de admin, catálogo y variantes | Login válido, acceso no autorizado denegado, CRUD, móvil |
| E2 | Stock por variante, movimientos y conciliación | Exactitud, auditoría, tests de concurrencia |
| E3 | Reservas, vencimiento, pedidos actuales y futuros | Sin sobreventa ni doble descuento; liberación idempotente |
| E4 | Tarifas, pagos externos, retiros, envíos y seguimiento | Precio histórico estable, registros y rastreo de operaciones |
| E5 | Módulo de personal con permisos concretos | Matriz de permisos, pruebas RLS positivas y negativas |
| E6 | Experiencia web de clientes según G02 | Solo datos autorizados y seguridad entre compradores |
| E7 | Hardening y despliegue | Backups/restauración, observabilidad, revisión de seguridad |

## Pruebas obligatorias sugeridas
- D02/D03/D08: dos reservas concurrentes de la última unidad no pueden sobreasignar.
- D04: vencimiento según **configuración aprobada**, idempotente, sin comprometer pedido ya confirmado.
- D10: pedido futuro no resta stock inexistente.
- D09: precio acordado no cambia retrospectivamente si se actualiza catálogo.
- D11: registro externo no equivale a pago electrónico automático.
- D13/D14/D18: aislamiento entre roles y protección de datos, tanto servidor como RLS.
- D17: funcionamiento web móvil/escritorio con conexión.

No desplegar datos personales ni bases de producción sin validación y recuperación probada.

## Criterios derivados de segunda ronda — NO ejecutados
- Reservas: 5 del mismo modelo debe rechazarse para **reserva mayorista**; 6 permite continuar a las demás validaciones; 3 del modelo A + 3 del B **no** satisfacen el mínimo de 6 **por modelo**.
- G03: confirmar reserva conserva asignación; pedido directo asigna; vencimiento automático no debe afectar pedido ya convertido; cancelación no duplica stock; parcial registra unidades pendientes; asignación a encargo futuro es manual.
- G03-02 aclarado: al confirmar desciende **disponibilidad**, no necesariamente el físico presente. Probar conciliación entre físico, reservas activas, pendientes de pedidos y despacho; quedan pendientes reglas de cancelación parcial.
- G04: 7 unidades con docena ejemplo Bs 380 no implican Bs 380/12 × 7; el importe depende de tarifa fijada por modelo/variante. Mezcla de modelos requiere cálculo por sus líneas y mínimos independientes. **Aclaración posterior:** un modelo solo puede tener una talla; prueba negativa para M+XL en un mismo modelo. Presentaciones y precios siguen pendientes.
- Cambios manuales de precio: solo admin, con motivo y auditoría. Precio acordado se fija al confirmar; reserva muestra tarifa vigente, sin congelarla salvo nueva regla.

No habilitar implementaciones/migraciones definitivas de G03/G04 sin cerrar [preguntas críticas](09_G03_G04_SELECCIONES.md).

## Casos nuevos de aceptación (ejemplos ficticios)
- Físico 20, reserva 6, pedido confirmado pendiente 0 ⇒ disponible 14.
- Convertir las 6 unidades reservadas en pedido confirmado ⇒ físico 20, reservas activas 0, pendiente de pedido 6, disponible **14**, nunca 8.
- Entregar parcialmente 2 del pedido ⇒ físico 18, pendiente 4, disponible **14**.
- Crear pedido directo confirmado de 3 desde disponible 14 ⇒ pendiente de pedido +3, disponible 11; no duplicar el compromiso.
- Reserva vence sin convertirse ⇒ reservado -6 y disponible +6, de forma idempotente.
- Dos sesiones intentan bloquear la última unidad de una variante ⇒ solo una tiene éxito.
- Filtrar modelo+talla agrupa variantes por color; sumar disponibilidad por color, pero no permitir seleccionar color agotado usando el subtotal agregado.
- Una reserva con varias líneas debe mostrar **unidades reservadas** y **conteo de reservas distintas** sin contarlas varias veces.
- Cancelación de pedido con despacho parcial: pendiente G03-B; no habilitar reversión automática de unidades ya entregadas sin política aprobada.
- No inferir que el total por modelo + talla satisface la combinación comercial de presentaciones: siguen pendientes G04-A/B/C.

## QA adicional por R01–R12 / colores (casos candidatos)
- Solo admin puede abrir/guardar reservas y confirmar; datos de clientes protegidos. Nombre y WhatsApp, búsqueda por teléfono sin fusionar coincidencias.
- Alta: primero color maestro, luego modelo vinculado a uno o varios colores; mostrar únicamente colores asociados y variantes existentes; stock inicial **ingresado manualmente** por variante (sin importación en E1).
- El modelo A y B pueden tener colores diferentes. Color permitido pero agotado no se muestra como disponible; un subtotal por talla no permite vender un color con cero saldo.
- Borrador sin bloqueo, Guardar reserva transaccional y rechazo corregible por exceso, sin parcialidad oculta. Edición revalida y audita.
- Cliente puede indicar colores o surtido en solicitud de menos de docena. **Hasta aprobar CR-01**, no bloquear stock sin asignación precisa por variante; mostrar propuesta de selección admin antes de guardar, no elegir colores arbitrariamente.
- Mínimo mayorista de **6 unidades por modelo**; no suponer que la opción «surtido» evita este mínimo.
- Solo admin confirma; reserva→pedido no duplica compromiso, mensaje WhatsApp manual con código. Duración del vencimiento no definida; no programar plazos asumidos.
- Sin acceso a solicitudes públicas/clientes de autoservicio en E1.

Bloqueantes: [casos CR-01–CR-07](13_CUESTIONARIO_CAPTURA.md), presentaciones G04, cancelaciones parciales G03-B, caducidad G01.

## Ampliación EVALIA: lotes, control de calidad y surtidos pospuestos (QA candidato)
- Registro de lote planificado de 72 unidades (6 docenas) **no** incrementa stock vendible automáticamente. Cantidad final real debe ingresarse y aprobarse tras revisión.
- Una prenda con mancha o fallo de costura queda registrada como no apta, sin contar en stock ofertable; ninguna merma se pierde del historial. Devolución de esa unidad a apta solo mediante proceso de revisión autorizado pendiente.
- Modelo con 11 colores y negro adicional **no garantiza** exactamente esos colores si la fabricación tiene pérdidas; no autorizar reparto forzado ni prometer un negro doble.
- El surtido sin colores concretos se captura como demanda pendiente de asignación; **hasta aprobar modalidad**, no simular compromiso/garantía. Al asignar colores, validar existencias reales por talla+color.
- Si se aprueba futuro **cupo agregado** de surtido: para cada modelo+talla, `disponible_agregado = suma(aptas - asignaciones_específicas) - cupo_surtido`; impedir dos reservas simultáneas que superen el total. Un pedido de color específico debe respetar tanto el saldo de ese color como la capacidad global restante. Al asignar surtido, transferir cupo a variantes sin descontar doble. Si una merma inesperada deja déficit, generar incidente y no ocultarlo.
- Si se elige solicitud sin bloqueo: registro no altera disponible ni promete cumplimiento; al asignar colores realizar transacción real.
- Entregas parciales y G03-B siguen abiertos; en ninguno de los dos modos se puede afirmar colores/stock asegurados sin reglas aplicables y stock apto.

Ver [plan especializado](15_PRODUCCION_CALIDAD_SURTIDO.md) y [decisión pendiente](16_DECISION_BLOQUEO_SURTIDO.md).

## Pruebas candidatas de la elección B (cupo surtido garantizado)
- Guardar surtido de 6 del modelo con **stock apto elegible 12** y 3 unidades asignadas por color → cupo surtido 6, disponibles agregadas **3**; borrador previo no bloquea.
- Dos reservas de surtido simultáneas no pueden comprometer la última disponibilidad agregada dos veces.
- Venta directa de color concreto requiere stock de ese color **Y** cupo agregado todavía libre, nunca puede apropiarse de las seis unidades reservadas genéricamente.
- Asignar seis unidades surtidas a colores reales: cupo sin color −6, asignación exacta +6; disponibilidad agregada se mantiene igual.
- Una merma descubierta tras bloquear cupo puede causar déficit: registrar defecto e incidencia, no inventar prendas ni forzar repartos de 11 colores con negro adicional.
- Liberar cupo por cancelación de reserva aún no entregada **solo cuando se cumpla una condición de cancelación aprobada**, una sola vez y con auditoría; probar casos de media docena y docena bajo **misma política**, sin inventar plazo ni penalización.
- Entrega parcial/cancelación de pedido convertido sigue sujeta a G03-B y debe contar solo saldos pendientes.
- **Talla determinada por modelo:** toda reserva/surtido debe heredar la talla única del modelo, sin opción de combinar M/XL/2XL dentro del mismo. Cantidad informada al Guardar, cupo exclusivamente por modelo y sin doble asignación de colores.
Sin código/test ejecutable todavía: estos son escenarios de aceptación para el futuro.

## QA adicional — talla única por modelo y surtido
- Alta: modelo A talla M; al añadir colores negro/rosa, **ninguna variante** del modelo puede declararse XL. Modelo B talla XL es válido y tiene stock/precio propios.
- Carrito: cliente solicita 6 del A (talla M) y 6 del B (talla XL); son **dos modelos**, cada mínimo por modelo se evalúa por separado.
- No aceptar 3 del A-M + 3 del supuesto A-XL como seis del mismo modelo: A-XL no es variante válida del modelo A.
- Al seleccionar A la talla M se muestra **derivada** sin un selector independiente. Se pueden elegir varios colores del A.
- **Surtido:** seleccionar A-M, ingresar 6 unidades, Guardar reserva → cupo global del A reduce 6 y colores quedan pendientes; tras elegir 2 negras+4 rosas, cupo baja 6 y asignaciones exactas suben 6 **sin reducir por segunda vez** la disponibilidad.
- Guardar sin cantidad positiva o con cantidad superior al saldo apto no puede garantizar unidades; mostrar validación, no registrar compromiso.
- Un modelo con colores agotados puede tener stock total cero pese a tener colores asignados. Un modelo diferente no presta stock a A.
- Probar que cambiar talla de un modelo con historial **no reetiqueta** reservas/pedidos antiguos; política de cambio pendiente.
**No se han ejecutado tests funcionales**: estos son escenarios de aceptación. [Modelo con talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## Criterios QA candidatos — precios mayoristas y alta de modelos
- Talla XL con precio sugerido cualquiera; crear modelos XL-A y XL-B con precios mayoristas individuales ficticios **380 y 420**; el segundo no modifica al primero ni convierte la sugerencia en precio obligatorio.
- Modelo M con precio propio diferente de otro M; solo **una talla por modelo** y colores seleccionados del maestro, con foto del modelo antes de publicación (momento de obligatoriedad pendiente).
- Crear 6+ modelos de prueba para una feria, usar colores del último modelo y una plantilla por talla; editar selección para el nuevo modelo **sin mutar otro modelo o la plantilla**.
- Registrar foto A, foto B con identificadores de almacenamiento independientes; no copiar stock, movimientos ni historial al sugerir ajustes desde modelo anterior. No subir imágenes reales al repositorio.
- Cliente con regla especial explícita **−10 Bs por docena elegible**: docena completa a Bs 380 → Bs 370, desglosando ajuste y guardando snapshot al confirmar. Para 7 piezas **no calcular** automáticamente descuento ni precio sin política G04.
- Reserva de modelo solo tarifa mayorista; venta minorista directa no requiere habilitar reserva minorista. Variar tarifa sugerida por talla no cambia reservas confirmadas ni precios históricos.
- Una reserva abierta muestra tarifas vigentes sin snapshot de compromiso hasta confirmación según G04-08; los pedidos ya confirmados conservan importe aunque se edite la ficha del cliente.
- Excepciones manuales de precio solo administrador con motivo/bitácora; comprobar no duplicación de reglas especiales y políticas RLS.
**Bloqueantes** P-01/P-02 (6–11 unidades y beneficio), G04-01 presentaciones, P-03 acumulación, políticas de foto/plantilla. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [alta](19_ALTA_RAPIDA_MODELOS_FERIA.md).

## QA comercial nuevo — fórmula mayorista aprobada en concepto (2026-11-22)
- Si precio de docena del modelo = Bs 420, comprobar por **cada n entero 6–12**: `(n, total)=(6,210),(7,245),(8,280),(9,315),(10,350),(11,385),(12,420)`. No descuentos E1.
- Si docena Bs 380, `n=6 → Bs 190`; `n=7 → 380×7/12=Bs 221,666…` **sin valor final aprobado para cobro**; exigir regla de redondeo antes de implementar cobro final.
- En surtido pendiente de colores, la **cantidad y precio matemático se calculan antes**; asignar colores posteriormente no recalcula por color ni aplica doble descuento de stock.
- Con modelo A 6 + B 6, calcular **cada modelo de forma independiente** según su precio de docena; no sumar como 12 unidades de uno.
- Cliente especial con tarifa antigua «−Bs 10/docena»: **ningún descuento automático en E1**, incluso si compra 12; para cantidades **menores que 12** tampoco se permitirá descuento al incorporar la futura función.
- Reserva/cotización muestra tarifa vigente; pedido confirmado conserva snapshot de modelo, docena, unidades y total acordado tras definir redondeo (G04-08).
- Mantener test futuro por >12 unidades (todavía sin fórmula autorizada), descuento negociado para docenas posteriores, y restricciones de edición de precios.
**Estado:** escenarios de aceptación documentados, sin tests de código ni migraciones. [Precio canónico](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## QA RND-01 — redondeo entero por modelo (decisión expresa)
**Casos documentados sin código ejecutable**, con precio de docena y cantidad `n` del mismo modelo: P=380, (n, importe exacto, importe cobrado) = (6,190,190), (7,221,666…,222), (8,253,333…,253), (9,285,285), (10,316,666…,317), (11,348,333…,348), (12,380,380). P=420 mantiene (6,210),(7,245),(8,280),(9,315),(10,350),(11,385),(12,420).
- **Agrupación por colores:** modelo A P=380 con 2 prendas negras y 5 rosas → n_total_modelo=7, **Bs 222**. No redondear subtotal de cada color por separado (podría producir Bs 221).
- **Dos modelos distintos:** A P=380 n=8 y B P=380 n=8 → **Bs 253+253=Bs 506**. Redondear el total matemático global (506,666…→507) daría **resultado incorrecto**.
- **Surtido diferido:** bloquear cupo n=7 de un modelo P=380 → Bs 222; al asignar colores el importe permanece Bs 222 y stock no se descuenta dos veces.
- **Empate exacto aún pendiente:** modelo P=381, n=6 → Bs 190,50. El usuario eligió «entero más cercano», pero no eligió qué entero en empate; mantener este caso como **no resuelto** (no forzar redondeo al alza/par).
- **Historial:** precio confirmado se guarda por modelo con la política de redondeo; no recalcular tras editar precio sugerido o modelo.
Se preserva **sin descuentos E1**; no se aplica precio >12 por inferencia. La nota antigua sobre redondeo pendiente queda **superada**, excepto desempates exactos. [Política comercial](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Pruebas nuevas: RND-02 conserva Bs 0,50 y mezcla de modelos
**Decisión recibida:** subtotal de modelo cuya parte fraccionaria sea **exactamente 0,50** queda sin redondear; resto, entero más cercano. QA candidato **sin aplicación ejecutable todavía**:
- P_docena=381, n=6 → resultado exacto Bs 190,50, **final Bs 190,50**; no 190 ni 191.
- P_docena=383, n=6 → Bs 191,50 final; caso de otro empate para evitar redondeo escondido.
- P_docena=380, n=7 → Bs 221,666… ⇒ final Bs 222; n=8 → 253,333… ⇒ 253.
- Carrito mayorista: **modelo A 12 unidades, docena Bs 420** + **modelo B 6 unidades, docena Bs 380** ⇒ Bs 420 + Bs 190 = **Bs 610**; ambos cumplen el mínimo individual.
- Carrito: **modelo A 12 a Bs 420** + **modelo B 6, docena Bs 381** ⇒ Bs 420 + Bs 190,50 = **Bs 610,50**; **no redondear pedido completo**.
- Dos modelos P=381, n=6 cada uno ⇒ Bs 190,50 + Bs 190,50 = **Bs 381**, sin transformación artificial de subtotales.
- **Agrupar colores por modelo** antes de calcular; A P=380, 2 negras+5 rosas → 7 y Bs 222, no dos redondeos. Una reserva surtida con colores aún pendientes conserva el precio de su modelo.
- **No extrapolar** el ejemplo de 18 prendas del pedido a 18 unidades de **un solo modelo**: MAY-12 pendiente de política.
- **No descuentos en E1**, tampoco para 6–11 cuando se agregue módulo futuro. Snapshot G04-08 guarda subtotal final por modelo, incluido x,50 si corresponde.
**RND-01 y RND-02 resueltos.** Los escenarios anteriores marcados «empate pendiente» son antecedentes históricos superados por esta decisión. [Contrato de precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## QA MAY-12 — rango mayorista abierto n ≥ 6 (RESUELTO)
El propietario aprobó prolongar **la misma fórmula** a **13 o más unidades de un mismo modelo**, además de carritos con varios modelos. Criterios de prueba **documentales, no tests de software ejecutables**:
- Docena ficticia **Bs 420**: n=6 → 210; n=12 → 420; n=13 → **455**; n=19 → **665**; n=24 → **840**; n=25 → **875**; n=36 → **1260**.
- Docena **Bs 380**: n=13 → 411,666… ⇒ **Bs 412**; n=19 → 601,666… ⇒ **Bs 602**; n=24 → **Bs 760**. No crear tarifa distinta después de 12 unidades.
- Docena **Bs 381**: n=18 → **Bs 571,50** exactos, **sin redondear los 50 centavos**.
- **Mismo modelo, varios colores:** 10 unidades negras y 9 rosas de un modelo P=380 ⇒ n=19, **Bs 602**, calculado una sola vez; no dos redondeos independientes por color o por paquete.
- **Varios modelos:** A P=420 n=19 ⇒ 665; B P=381 n=6 ⇒ 190,50; **total pedido Bs 855,50**, sin nuevo redondeo. Cada modelo cumple mínimo de 6.
- **Sin descuentos E1** aunque n=24, 36 u otra cantidad mayor. Guardar snapshot al confirmar; color surtido pendiente no cambia precio.
- No aceptar reserva de 5 unidades de un modelo aunque otro tenga 19: mínimo aplica por modelo. Validar cupo apto/garantía de surtidos con las cantidades altas sin sobreventa.
**MAY-12 cerrado:** las advertencias históricas «13+ pendiente» de secciones anteriores son antecedentes superados. [Contrato canónico](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## QA G01 — vencimientos por feria y depósitos registrables después
**Criterios de aceptación documentados, NO pruebas ejecutadas contra una aplicación.** Operación local propuesta `America/La_Paz`:
- **Martes 2026-11-24** o **miércoles 2026-11-25** guardado sin depósito → vence **sábado 2026-11-28 a las 12:00**.
- **Viernes 2026-11-27** o **sábado 2026-11-28** guardado sin depósito → vence **miércoles 2026-12-02 a las 12:00**.
- **Cruce anual:** martes 2026-12-29 → sábado 2027-01-02 12:00.
- **Reserva con depósito registrado posteriormente y recibido a tiempo:** viernes 2026-11-27, depósito registrado martes 2026-12-01 → no liberar el miércoles 2026-12-02 por reloj ordinario. Fecha final con depósito **sin definir**.
- **Reserva de surtido G=6 expirada sin depósito ni confirmación:** G−6, disponible +6, stock físico idéntico; reintento no duplica liberación. También probar reserva exacta por color E.
- **Pedido confirmado antes de vencer:** al miércoles/sábado no se libera el stock del pedido; el compromiso ya fue transferido sin descontar doble.
- **Borrador:** no bloquea existencias ni libera nada al vencer.
- **Registro de depósito después de caducidad efectiva:** no revive compromiso ni reserva automáticamente; incidencia requiere revisión de inventario.
- **Lunes/jueves/domingo:** ningún vencimiento autogenerado porque no se aprobó calendario de esos días.
- **Media docena vs docena:** ambas con mismo día de guardado vencen al mismo momento si no hay depósito; sin trato especial por volumen.
- **Concurrencia en 12:00:** operación depósito/expiración no puede liberar simultáneamente cupo protegido ni asignar dos veces mismas prendas; mantener auditoría.
**G01 parcial:** faltan fechas de otros días y fin de vigencia con depósito; depósitos externos sin pasarela; G03-B cancelaciones/parciales sigue abierto. [Regla](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md).
