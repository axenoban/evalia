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
