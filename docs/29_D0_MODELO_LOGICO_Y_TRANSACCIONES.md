# EVALIA — ADR-D0-01: modelo lógico transaccional de inventario, reservas y pedidos (PROUESTA, sin SQL)

**Corte:** 2026-11-22. **Naturaleza:** documento de diseño técnico para revisión, NO aprobación de arquitectura ejecutable, migraciones, entidades SQL definitivas, cambios de reglas comerciales o merge. Base observada: `feature/fundamentos-reservas-pedidos @ 416eaaad`, `main @ b3168aeb`; PR #1 DRAFT.

**Fuentes de negocio PREVALENTES:** [11 inventario](11_CONTRATO_INVENTARIO.md), [16 surtido garantizado](16_DECISION_BLOQUEO_SURTIDO.md), [17 talla única](17_MODELO_TALLA_UNICA_Y_SURTIDO.md), [18 mayorista](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [20 reservas/ferias](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md), [22–23 pagos](22_DEPOSITOS_ABONOS_Y_SALDOS.md), [24 acceso cliente](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md), [26 cierre](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md), [27 exclusiones](27_SIMPLIFICACION_CANCELACIONES_V1.md), [28 baseline E1](28_BASELINE_V1_MODULOS_Y_READINESS.md).

## 1. Decisión arquitectónica propuesta (para revisión, no implementada)

**Candidata:** aplicación web Next.js (interfaces/admin y servidor) + Supabase Postgres (fuente de verdad transaccional), Supabase Auth para operador administrador y Storage privado para evidencias. **Todas las mutaciones que cambien S/E/G deben ejecutarse en una misma transacción PostgreSQL en backend de confianza**, con locks de concurrencia e idempotencia. **No** encadenar lecturas y varias mutaciones separadas con cliente JavaScript o varias peticiones REST y asumir que son atómicas. Elegir antes de SQL entre **funciones transaccionales RPC con control de privilegios revisado** o **capa servidor con conexión transaccional gestionada**; Next.js no sustituye el control de integridad PostgreSQL.

Para la V1 pequeña, se **recomienda serializar todas las mutaciones de stock por modelo** mediante un **punto de exclusión por identificador de modelo**, adquirido en el servidor/DB al inicio de la operación. Eso simplifica la convivencia entre surtido G agregado y compromisos exactos E por color. Se permite concurrencia entre modelos distintos. **La representación física de ese bloqueo (fila guardiana/versionada o equivalente) y el nivel de aislamiento** deben revisarse y probarse; no se aprueba un mecanismo SQL concreto aquí.

Fuentes técnicas para validar D0 posteriormente: [PostgreSQL: bloqueo de filas](https://www.postgresql.org/docs/current/explicit-locking.html), [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase: Storage privado](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Supabase: claves API](https://supabase.com/docs/guides/getting-started/api-keys). Un secreto de servicio elude RLS; **no exponerlo al navegador**, ni atribuirle seguridad de RLS si se usa en backend.

## 2. Contrato de cantidades: una talla por modelo, color exacto y surtido genérico

Para cada modelo `m`, con **una sola talla propia** y conjunto de colores permitidos `C_m`:

- `S_c`: unidades **aptas**, físicamente presentes para un color `c` de `m`. Prendas defectuosas NO se incluyen en S; registrar pérdidas de aptitud como movimiento real y incidencia.
- `E_c`: compromisos **exactos por color** de unidades todavía físicamente no entregadas; incluir tanto reservas guardadas como pedidos confirmados todavía pendientes, sin contarlos doble.
- `G_m`: compromisos **de surtido sin colores asignados** garantizados por cantidad dentro de ese mismo modelo, de reservas activas y, si el flujo futuro lo admite, pedidos no entregados.
- `S_m = Σ_c S_c`, `E_m = Σ_c E_c`, `A_m = S_m − E_m − G_m`: disponibilidad comercial total del modelo.
- `F_c = S_c − E_c`: margen físico no asignado exactamente en ese color; puede estar **protegido parcialmente por G agregado**. Por eso `F_c > 0` **NO basta** para aceptar una nueva venta exacta.
- **Nueva reserva/pedido exacto de `q` en `c`:** debe validar simultáneamente `q>0`, `F_c≥q` y `A_m≥q`, además de la restricción mayorista `n≥6` **sumando líneas del mismo modelo al crear la operación**. Si uno falla, rechazar sin mutación parcial.
- **Nueva reserva surtida de `q` (colores pendientes):** `A_m≥q` y la cantidad comercial válida; `G_m += q`, `A_m -= q`, **sin** asignar ninguna variante ficticia y **sin** modificar S.
- **Asignación posterior `G_m→E_{c_i}`:** si `Σ q_i=q` y `G_m≥q`, cada color habilitado cumple `S_c−E_c≥q_i`; operación única `G_m -= q`, `E_{c_i} += q_i`, sin tocar S y **sin cambiar A_m**. No trasladar stock entre modelos/tallas.
- **Conversión reserva guardada → pedido confirmado:** cambiar titularidad del mismo compromiso pendiente (exacto o G), **no** hacer `+E` o `+G` sobre unidades ya protegidas. Para pedido **directo**, sí crear compromiso por única vez tras validar disponibilidad.
- **Entrega física real de `q_i` por color:** `S_{c_i} -= q_i` y `E_{c_i} -= q_i` en el mismo evento/operación; `A_m` se mantiene inalterada. Un surtido G necesita identificar los colores físicos antes del retiro; la política comercial sobre confirmar pedido antes de asignar colores sigue abierta, **no forzar un orden supuesto**.
- **Caducidad de reserva sin depósito aplicable:** liberar exclusivamente **E/G pendiente de esa reserva**, `S` intacto, `A` sube según cantidad liberada; conservar auditoría, sin tocar pedidos ya convertidos.
- **Pedidos futuros sin stock apto:** representar solo **demanda futura**, sin aumentar S ni descontar disponibilidad de existencias inexistentes. La asignación manual posterior deberá validar cupo y crear compromiso una única vez.

**Salud del inventario:** en operación normal no aprobar nuevas asignaciones cuando `A_m < q` o `F_c < q`; `S_c≥0` y eventos de salida física requieren saldo físico disponible real. Una merma sobre stock ya prometido **puede producir déficit lógico `A_m<0` o `F_c<0`** sin que eso autorice borrar compromisos; registrar merma y **alerta de sobrecompromiso**, bloquear nuevas asignaciones y enviar a revisión. **No ocultar** anomalía mediante `max(0,A)` en la fuente de verdad: el panel puede mostrar alerta y disponible comercial vendible cero, conservando el déficit auditado.

**Precisión:** unidades enteras, montos Bs decimales exactos. El catálogo asigna talla **solo al modelo**; la variante está determinada por `modelo + color`, no por una tercera talla seleccionable. [17](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).

## 3. Agrupados lógicos propuestos (NO nombres SQL, solo relaciones)

| Componente conceptual | Identidad / relación principal | Reglas estructurales |
| --- | --- | --- |
| **A01 Actor interno** | Operador admin autenticado | Registrar responsable en aprobaciones, entrega, edición y movimientos |
| **A02 Cliente comercial** | Contacto con nombre/WhatsApp, sin login E1 | Datos mínimos, sin confiar en teléfono como secreto de acceso |
| **A03 Catálogo color** | Color global reutilizable | No inventar códigos o colores precargados |
| **A04 Modelo** | Modelo con **una talla**, foto, precio docena propio | Cambiar su precio no reescribe pedidos anteriores |
| **A05 Variante color** | Relación modelo ↔ color ofertado | Apta para stock; color no listado no se puede prometer |
| **A06 Existencia física y bitácora** | Variante, cantidad real S, entradas/salidas/merma | Movimientos auditados, correcciones por reglas aún pendientes |
| **A07 Cupo/compromiso** | Titular reserva o pedido, modelo, opcional color, cantidad pendiente | Exacto E o genérico G; transición de titular sin duplicación |
| **A08 Reserva + líneas** | Cliente, líneas por modelo, creación, fecha F y L, estado | Borrador sin cupo; guardada con cupo; revisión G01 |
| **A09 Pedido + líneas** | Cliente, detalle confirmado, precio snapshot, compromiso de las líneas | Distinto de reserva, no caduca con F/L |
| **A10 Entrega + detalles** | Pedido, cantidades físicamente retiradas/despachadas | Historial real; reduce S y compromiso pendiente |
| **A11 Declaración / evento de pago** | Reserva o pedido, importe, evidencia, estado | Solo APROBADO/RECIBIDO suma saldo; asociación única del depósito |
| **A12 Evidencia + enlace cliente** | Comprobante privado ligado al pedido y credencial revocable | Un enlace permite un pedido; no aprobación ni datos ajenos |
| **A13 Auditoría / operación idempotente** | ID de comando, actor, entidad y resultado | Un comando repetido nunca genera doble cupo/cobro/entrega |

**Cardinalidades de revisión:** 1 modelo → muchos colores permitidos/variantes; 1 cliente → muchas reservas/pedidos; 1 reserva/pedido → muchas líneas y compromisos; 1 pedido → muchas entregas y declaraciones; 1 declaración aprobada → **una sola imputación contable**. No aprobar borrados físicos en cascada: preservar historial y referencias. **No convertir esta matriz en DDL sin revisión.**

## 4. Máquinas de estado conceptuales (no enums SQL)

**Reserva:** `BORRADOR (sin stock) → GUARDADA (con E/G)` y desde GUARDADA: `CONVERTIDA_A_PEDIDO`, `VENCIDA_SIN_DEPÓSITO` en F, o `EN_REVISIÓN` en L si depósito fue recibido/aprobado oportunamente. Reserva con depósito antes de F **no** expira en F. **El destino definitivo de EN REVISIÓN sin respuesta está pendiente**: NO liberar stock automáticamente.

**Pedido:** `CONFIRMADO/ACTIVO → ENTREGAS PARCIALES (si ocurren) → COMPLETADO` solo con **retiro completo registrado + saldo aprobado = 0 + administrador**. Pagado pero sin retirar permanece ACTIVO. Una entrega excepcional con deuda permanece ACTIVA, sin “cierre contable” ficticio. **No** estados de cancelación/devolución G03-B en V1.

**Pago declarado por cliente:** `PENDIENTE_VERIFICACIÓN → {APROBADO_RECIBIDO, EN_OBSERVACIÓN, RECHAZADO}` mediante revisión administrativa. Solo el estado **APROBADO** afecta el saldo y, si corresponde, el plazo de una reserva G01. Rechazos/correcciones/reversiones concretas se definen antes de implementar su política completa: el conjunto mostrado es **modelo candidato de estado**, no orden obligatorio de transiciones.

**Enlace de pedido:** válido durante pedido activo y sin revocación; al marcar COMPLETADO o revocar, **cada petición nueva y cada escritura** se rechaza desde backend. Token revocado nunca revive; emitirse uno nuevo no reactiva el anterior. El enlace no puede usarse para aprobar pagos ni cerrar pedido.

## 5. Operaciones atómicas propuestas y su frontera transaccional

Cada operación debe:
1. Autorizar la **identidad y capacidad** (administrador o enlace solo para envío de declaración).
2. Obtener **clave de idempotencia** estable asociada a actor, tipo y entidad, y descartar/reproducir resultado de peticiones repetidas.
3. Para stock, adquirir exclusión **por modelo** para **todos los modelos afectados, siempre en orden creciente estable**, antes de consultar saldos S/E/G. Si hace falta, fijar también bloqueos a nivel de compromiso/pedido y variantes con un **orden global documentado** para evitar interbloqueos. Definir y probar la jerarquía de bloqueos antes de SQL.
4. Releer estados/fechas/cantidades **dentro de la misma transacción**, validar números y permisos, aplicar cambios de cupo, eventos, estado y auditoría **juntos**, o **ninguno**.
5. Confirmar transacción y devolver resultado. **No realizar WhatsApp ni llamadas externas dentro de transacción**. Las tareas pendientes para contacto se crean en el mismo commit si son necesarias, pero el envío es siempre humano.

| Operación candidata | Comprobación | Resultado atómico necesario |
| --- | --- | --- |
| `guardar_reserva` | Admin, n≥6/modelo, A suficiente, borrador vigente | E/G y estado GUARDADA + F, sin alterar S |
| `reservar_directo/confirmar_pedido` | Admin, pedido propio, stock apto si asigna | Precio histórico + titularidad/cupo una sola vez |
| `asignar_colores_surtido` | Admin, cupo G titular vigente, colores ofertados y F_c suficientes | Reducir G y aumentar E en iguales unidades, ΔA=0 |
| `registrar_entrada_o_merma` | Admin, movimiento físico comprobado, motivo | Ajustar S por movimiento real, auditoría; si déficit, incidencia sin liberar promesas |
| `registrar_entrega` | Admin, cantidad/color asignado y efectivamente retirado | Reducir S/E simultáneamente y saldo pendiente; historial único |
| `caducar_reservas_F` | Reloj confiable, solo reserva GUARDADA sin depósito válido y no convertida | Expirar y liberar E/G una vez; jamás tocar pedidos ni S |
| `marcar_revision_L` | Depósito oportuno aprobado, aún reserva guardada, `now≥L` | EN REVISIÓN + tarea WhatsApp **manual** única, **ΔS=ΔE=ΔG=0** |
| `aprobar_pago` | Admin comprueba recepción real, declaración única, reservar fecha/estado | Aprobar + evento de abono una sola vez; si depósito y reserva aún protegible, transición coherente |
| `completar_pedido` | Admin, pagado/APROBADO 100 %, sin pendientes físicos, no cerrado | COMPLETADO + invalidar acceso cliente en mismo commit; sin crear pagos/entregas |
| `revocar_enlace` | Admin, token del pedido, estado permitido | Invalidar token, auditoría, no cambiar stock/dinero |

**Transacciones de varios modelos:** si un carrito incluye modelo M1 y M2, NO confirmar M1 si M2 ya se agotó. Bloquear en orden determinista, validar ambos y aplicar todas las líneas en una operación o rechazar todo, evitando pedidos a medias.

**Pago y F concurrentes:** evaluación de vencimiento y aprobación administrativa deben leer y bloquear **el mismo estado de reserva y sus referencias de pago en transacción**. Un aviso pendiente no detiene F. Aprobación después de que reserva expiró y E/G se liberó **no revive stock automáticamente**. Si se alega recepción anterior a F pero aprobación posterior, es un **caso comercial sin política automática**; guardarlo como incidencia y no reasignar unilateralmente.

**Cron de vencimientos:** usar tiempo de servidor y calendario **local del negocio** (propuesta `America/La_Paz` a ratificar según [20](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md)); evitar fecha calculada por dispositivo del cliente. No cambiar reglas martes/viernes a “próxima feria” genérica. Ejecutar de manera reentrante y segura incluso tras caída/repetición y atraso del scheduler.

## 6. Bloqueo, concurrencia e idempotencia — argumento de corrección

Con **un cerrojo transaccional por modelo** usado en todas las mutaciones que afectan ese modelo, ninguna operación puede leer S/E/G mientras otra los modifica sin haber completado/abortado. Así, la reserva surtida G y la exacta E evalúan el mismo A y F_c y ninguna puede comprometer por encima del stock apto visible. No basta bloqueo **solo por variante**, porque la reserva G consume disponibilidad **agregada del modelo**; dos colores distintos competirían contra el mismo G.

Los locks se toman **en orden determinista** si la transacción afecta varios modelos; ante deadlock/serialización fallida, retornar error clasificable y reintentar de manera limitada **la operación completa con la misma clave de idempotencia**, no volver a ejecutar efectos parciales. Nunca elevar watchdogs ni eliminar asserts. La DB debe imponer restricciones de integridad y eventos únicos cuando se defina DDL; **comprobar el total E/G bajo lock** sigue siendo necesario incluso con checks individuales.

**Consistencia de cache:** el panel puede leer proyecciones o resúmenes, pero **la autorización final de disponibilidad se hace contra transacción DB**, no contra la tabla visual mostrada ni un contador local. Si hay concurrencia, un mensaje “se agotó el cupo” es un rechazo normal de negocio, no un error de saldo escondido.

## 7. Contratos monetarios acoplados, pero sin crear cobros al confirmar

Precio confirmado `P_total=Σ_m r(P_docena(m) × n_m / 12)`, donde `r(x)` mantiene fracción exacta `.50` y redondea otras fracciones al entero más cercano, **una sola vez por modelo**. Usar decimal/racional exacto y snapshot al confirmar.

Total aprobado = suma de **eventos de pago recibidos y aprobados una sola vez**; saldo = total confirmado − total aprobado (exceso se marca incidencia, no devolución automática). Un depósito registrado en una reserva se **reasocia** al pedido, no se crea nuevo cobro. El cliente puede reportar transferencia y comprobante, pero no autoaprobar.

COMPLETADO exige **pago confirmado real y entrega real**. La decisión de **no implementar cancelación/reembolso G03-B en V1** prevalece; ningún “cierre excepcional” crea movimientos falsos. [26](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md), [27](27_SIMPLIFICACION_CANCELACIONES_V1.md).

## 8. Riesgos y decisiones aún sin cerrar (NO inventar)

| ID | Punto abierto | Tratamiento de diseño seguro hasta resolución |
| --- | --- | --- |
| D0-A | ¿Se permite **confirmar un pedido con G surtido todavía sin color asignado**? | El modelo soporta G y E; confirmar y entregar son eventos distintos. **No fijar regla de confirmación** sin aprobación; exigir asignación de color antes de salida física |
| D0-B | **Encargo futuro**: cuándo pasa de demanda a asignación real y si usa reserva o pedido sin existencias | Mantener demanda futura separada de S/E/G hasta asignación manual; no crear stock |
| D0-C | **Merma/ajuste** de stock apto y saldos desfavorables tras comprometer cupos | Mantener historia y alerta sin sobreventa; qué ajuste administrativo y evidencia exigir aún necesita contrato |
| D0-D | **Pago anunciado antes de F, verificado/aprobado después de F** | No reactivar automáticamente reserva expirada; revisar recepción y stock. Falta política de oportunidad en ese borde |
| D0-E | **Reapertura/cancelación excepcional** de pedido, devoluciones/reembolsos y retención de depósito | Fuera E1 o pendientes; no bypass silencioso |
| D0-F | **Campos exactos** de privacidad, mínimos de comprobantes, retención, QR real y permisos para futuros empleados | Arquitectura server-side, Storage privado; no publicar hasta definiciones y pruebas |
| D0-G | **Hosting, cron, transaction runner y condiciones de aislamiento** | ADR pendiente de ratificación; no desplegar ni elegir un proveedor arbitrario |

**Resultado D0-01:** propuesta de modelo y frontera transaccional suficiente para una revisión técnica de SQL posterior, **todavía NO un esquema implementable aprobado**. Para la seguridad de la vista de cliente, continuar con [D0-02 y QA](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md).
