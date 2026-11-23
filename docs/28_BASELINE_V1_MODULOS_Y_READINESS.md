# EVALIA — Baseline de V1: módulos, precedencia, QA y readiness

**Corte:** 2026-11-22. **Naturaleza:** auditoría y consolidación de decisiones ya registradas; NO autorización de SQL, aplicación, despliegue o merge. PR #1 sigue en borrador. **No hay código o pruebas de la aplicación** en el repositorio revisado.

## 1. Estado real de GitHub al iniciar
- `main`: `b3168aebdd52b1c1089e96d4a3a1e3cdda362221`.
- `feature/fundamentos-reservas-pedidos`: `6567b4782c86dd2e4510bcd99eccef365b415ef3`, 28 commits por delante y 0 detrás. PR #1 abierto, DRAFT.
- Solo README/AGENTS/CLAUDE y documentación Markdown; sin proyecto Next.js, migraciones Supabase, tests automatizados ni QR real.

## 2. Jerarquía de contratos para resolver históricos contradictorios
**Rige la decisión expresa más reciente por asunto**, no los diagnósticos tempranos de `docs/07`, las preguntas iniciales de `docs/09` o advertencias superadas en otros archivos.
- **Modelo, surtido, inventario:** [17](17_MODELO_TALLA_UNICA_Y_SURTIDO.md), [16](16_DECISION_BLOQUEO_SURTIDO.md), [11](11_CONTRATO_INVENTARIO.md). Una talla por modelo; A=S−E−G.
- **Mayorista y alta ágil:** [18](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md), [19](19_ALTA_RAPIDA_MODELOS_FERIA.md). Cantidades enteras n≥6 por modelo, P_docena×n/12; redondear subtotal por modelo salvo fracción .50 exacta que se conserva; suma de subtotales, sin descuentos V1.
- **G01 reservas y feria:** [20](20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md): domingo/lunes→miércoles 12:00; martes/miércoles/jueves→sábado 12:00; viernes/sábado→miércoles siguiente 12:00; depósito aprobado oportuno amplía F+7 días naturales y a L inicia REVISIÓN + contacto WhatsApp manual sin liberar.
- **Pedidos/pagos/cierre:** [22](22_DEPOSITOS_ABONOS_Y_SALDOS.md), [23](23_VALIDACION_ADMINISTRATIVA_PAGOS.md), [26](26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md): solo pagos comprobados y aprobados por admin cuentan; completar solo con entrega real y saldo 0.
- **Cliente de V1:** [24](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md), [25](25_QR_Y_COMPROBANTES_CLIENTE.md): enlace privado por pedido sin cuenta; QR imagen, carga de captura, estado pago; sin aprobación por cliente ni pasarela.
- **Excepciones:** [27](27_SIMPLIFICACION_CANCELACIONES_V1.md) prevalece para alcance: cancelaciones parciales G03-B [21](21_CANCELACION_SALDO_PENDIENTE_PEDIDOS.md) **diferidas a fase posterior**. No implementar reembolsos/devoluciones de cliente V1.
**No inventar** tarifas de ejemplo, promociones, QR real, porcentaje mínimo depósito, datos de cliente, envíos, impuestos, cuentas/roles cliente o permiso excepcional para falsear stock/pagos.

## 3. Matriz de catorce módulos funcionales V1
| ID | Módulo | Contrato de entrega | Fuentes | Estado |
|---|---|---|---|---|
| M01 | Administración y permisos | Login admin, aislamiento de acciones privilegiadas; sin personal multirol | docs/00, 02, 24 | Base aprobada; arquitectura pendiente |
| M02 | Colores reutilizables | Catálogo maestro de colores antes de crear modelos | docs/14 | Aprobado |
| M03 | Modelos y alta ágil | Foto, talla única, colores propios, precio docena editable, sugerencias reutilizables | docs/17, 19 | Aprobado; detalles UX propuestos |
| M04 | Stock apto por modelo+color | Ingreso inicial manual, movimientos reales, separaciones apto/no apto | docs/11, 14, 15 | Básico aprobado; ajustes/mermas abiertos |
| M05 | Clientes | Captura admin de nombre y WhatsApp, sin cuentas públicas | docs/12, 13 | Aprobado |
| M06 | Borrador y reservas | Carrito mayorista n≥6 por modelo; borrador no bloquea; exacto o surtido | docs/12, 17 | Aprobado |
| M07 | Disponibilidad y vencimientos | A=S−E−G, F por día a 12:00; con depósito L=F+7, revisión WhatsApp manual | docs/11, 16, 20 | Aprobado; transacciones por diseñar |
| M08 | Pedidos y entregas | Confirmación admin, reserva→pedido sin doble conteo; retiro físico auditado | docs/03, 11, 26 | Flujo normal aprobado |
| M09 | Precio mayorista | P_docena×n/12 n≥6; redondeo por modelo salvo .50; snapshot al confirmar | docs/18 | Aprobado |
| M10 | Abonos y validación | Depósito se imputa una vez, múltiples pagos, admin aprueba dinero real, saldo | docs/22, 23 | Aprobado; verificación de casos límite pendiente |
| M11 | Enlace privado por pedido | Un token de un pedido, sin cuenta, revocable, activo hasta COMPLETADO | docs/24 | Aprobado; medidas técnicas pendientes |
| M12 | QR y comprobantes | QR imagen descargable, pago con captura; pendiente/observado/rechazado/aprobado | docs/25 | Aprobado; QR real y límites no entregados |
| M13 | Recogida y cierre | Admin completa solo con pago aprobado total y retirada real; no cobros ficticios | docs/26 | Aprobado |
| M14 | Panel y seguimiento | Stock físico/comprometido/disponible; tareas y contacto WhatsApp manual | docs/10, 20 | Reglas aprobadas; diseño UI propuesto |

**Nota:** listado funcional, no diseño de tablas ni aceptación de arquitectura. Los nombres de estados/descriptores sugeridos requieren modelo lógico posterior. El control de producción/defectos no supone módulo completo de fábrica: stock apto real es obligatorio.

## 4. Flujo de punta a punta aprobado
1. Admin registra colores globales, modelos con foto/talla/precio docena y colores permitidos, y stock apto por variante manualmente.
2. Admin registra cliente y carrito mayorista. **Borrador no compromete**; Guardar reserva compromete E (exactas) o G (surtido del mismo modelo con cantidad conocida). Validar existencias de manera atómica.
3. Reservas no convertidas sin depósito aprobado vencen en F y liberan E/G sin aumentar S físico. Con depósito realmente recibido y aprobado antes de F, L=F+7 días a 12:00; al llegar L, **EN REVISIÓN y WhatsApp manual**, sin liberar stock.
4. Admin confirma pedido directo o convierte reserva, transfiriendo compromiso una sola vez; congela precio mayorista y vincula depósito anterior como el mismo pago.
5. Admin entrega enlace privado de ese pedido por WhatsApp manual. Cliente ve resumen, saldo, QR imagen descargable, declara monto y adjunta captura. Pago **PENDIENTE** no reduce saldo hasta aprobación admin tras constatar ingreso.
6. Admin verifica abonos recibidos y registra retiro real; solo con **saldo 0 aprobado y recogida completa** marca COMPLETADO; enlace se desactiva sin borrar historia.

## 5. Fuera del lanzamiento V1
- **No** devoluciones, cancelaciones solicitadas por cliente, reembolsos, notas de crédito, conciliaciones automáticas por incidencias o módulo G03-B de cancelación parcial. Preservar G03-B para futuro, no test bloqueante.
- **No** checkout público, cuentas/inicio de sesión del cliente, editar/cancelar pedido desde enlace, aprobación de pago por cliente, WhatsApp API, pago con tarjeta/pasarela bancaria, QR dinámico no aprobado.
- **No** motor de descuentos, tarifa minorista inventada, cálculo automático de envío/impuestos/embalaje, permisos de personal multirol ni sistema avanzado de lotes/producción sin decisión. La venta minorista complementaria y producción real se mencionan en documentos históricos; su automatización precisa reglas propias.
- **No** botón de cierre excepcional que falsifique entrega, pagos o libere compromisos sin auditoría; tratar casos raros fuera según [27](27_SIMPLIFICACION_CANCELACIONES_V1.md).

## 6. Dependencias y bloqueos reales
| ID | Falta o incertidumbre | Consecuencia |
|---|---|---|
| B01 | Modelo lógico y transacciones para S/E/G, reserva→pedido, entregas, idempotencia | **BLOQUEA SQL** |
| B02 | Token secreto de un pedido, RLS/ACL server-side, Storage privado y controles upload | **BLOQUEA acceso público** |
| B03 | QR bancario real facilitado y comprobado reutilizable/no vencido | **BLOQUEA pagos QR en producción** |
| B04 | Verificación de transferencias acreditadas tarde, corrección/rechazo y evidencias | **RIESGO de pagos/G01; no inferir retroactividad** |
| B05 | Hosting, cron con zona horaria de negocio, secretos, backups/restauración | **BLOQUEA publicación** |
| B06 | Movimientos auditados por ajustes/mermas en stock apto | **BLOQUEA stock fiable en producción** |
| B07 | Retención/privacidad, límites de archivos, recuperación de token | **BLOQUEA publicación segura** |
| B08 | Presentación/embalaje G04-01; tarifas envíos/minoristas/impuestos | **NO inventar reglas; decidir si son esenciales V1** |
| B09 | Cierre excepcional de cancelación con saldo/unidades sin conciliar | **FUERA del flujo normal V1; no bypass** |

**D16:** VS Code + Codex/Claude Code, Next.js y Supabase fueron indicados, **pero no hay arquitectura final, modelo de datos, hosting o instancia configurada**. La documentación permite diseñar, no lanzar migraciones arbitrarias. **B08** no impide calcular mayorista ya aprobado, pero tampoco autoriza inventar presentación, envío, precio minorista ni impuestos. Diferenciar bloqueos de código, publicación y extras opcionales.

## 7. Fases futuras sugeridas, todavía sin autorización para implementar
| Bloque | Entrega | Dependencia |
|---|---|---|
| D0 | Diseño de arquitectura, modelo lógico, seguridad admin/token y transacciones | B01/B02/B06 |
| D1 | M01–M04: colores, modelos, stock apto y base panel | D0 |
| D2 | M05–M07 + M09: clientes, reserva E/G, calendario F/L y precio | D1 |
| D3 | M08/M10/M13: pedido, pago aprobado, retiro y cierre | D2 |
| D4 | M11/M12/M14: enlace cliente, QR, comprobantes y revisión | D3/B02/B03 |
| D5 | Pruebas integrales, seguridad, backups y publicación | D4/B05/B07 |

**Prioridad técnica:** evitar sobreventa/stock negativo, pagos duplicados, filtración de tokens o comprobantes, y cierres falsos. Estos son paquetes de desarrollo propuestos, no autorización de crear código/SQL ni de integrar a main.

## 8. Matriz de QA de aceptación futura
| Test | Nivel | Validación |
|---|---|---|
| T01 | P0 | Modelo talla única y stock apto por variante, sin números negativos |
| T02 | P0 | Dos reservas simultáneas del último cupo: una sola asignación exitosa |
| T03 | P0 | Borrador no bloquea; guardar E/G sí, una vez |
| T04 | P0 | Transformar surtido G→colores E y reserva→pedido sin doble descontar |
| T05 | P0 | F semanal completo: domingo/lunes→miércoles; martes/miércoles/jueves→sábado; viernes/sábado→miércoles, 12:00 local |
| T06 | P0 | Sin depósito aprobado, al F liberar una sola vez sin alterar físico S ni pedido confirmado |
| T07 | P0 | Con depósito oportuno, L=F+7 días 12:00; en L EN REVISIÓN, WhatsApp manual y G/E conservados |
| T08 | P0 | Precio n≥6, subtotal por modelo, .50 conservado, total sin segundo redondeo |
| T09 | P0 | Precio histórico del pedido no cambia por editar catálogo |
| T10 | P0 | Depósito reserva→pedido mantiene un mismo cobro; pagos parciales aprobados sin duplicación |
| T11 | P0 | Comprobante pendiente/observado/rechazado no reduce saldo ni activa protección G01 |
| T12 | P0 | Enlace token A no permite leer B, cambiar pedido, aprobar cobro ni archivos ajenos |
| T13 | P0 | Revocación/cierre de pedido invalida lectura, QR, uploads y URL antigua |
| T14 | P0 | COMPLETADO exige pago aprobado y retirada real; no fabrica cobro ni entrega |
| T15 | P0 | Reintentar aprobaciones/cierre/cron 10 veces sin duplicar operaciones |
| T16 | P0 | Ficheros privados, backend ACL, antiabuso, sanitización de uploads y sin exposición de secretos |
| T17 | P1 | Alta de al menos seis modelos con fotos/colores reutilizables sin copiar stock ficticio |
| T18 | P1 | Dashboard separa stock apto S, asignaciones E, surtido G, disponible A y pendientes |
| T19 | P1 | QR real en imagen puede verse/descargarse sin ser cobro, contacto WhatsApp manual |
| T20 | FUTURO | Cancelación 7 no entregadas con 5 retiradas G03-B: test conservado, NO gate de V1 |

**Los 20 casos están documentados, NO ejecutados.** No afirmar CI verde ni software funcionando. T20 corresponde a backlog futuro, no gate de V1.

## 9. Checklist de readiness
- [x] Ramas, PR DRAFT, HEAD e historial de GitHub inspeccionados.
- [x] Contratos de mayorista, modelo/talla, E/G, reserva F/L, pagos, QR, cliente limitado y cierre normal identificados.
- [x] G03-B cancelación, devoluciones/reembolsos excluidos de V1 por decisión del propietario.
- [x] Lista de 14 módulos, dependencias y 20 tests de aceptación documentales elaborada.
- [ ] Ratificación del propietario del baseline de alcance y de si **minorista y envíos tarifados** son indispensables para V1; actualmente sus reglas no están definidas.
- [ ] D0: propuesta de modelo lógico, transacciones, estados, seguridad y acceso a imágenes, con revisión técnica.
- [ ] Contrato mínimo auditado para ajustes/mermas físicos antes de stock real en producción.
- [ ] QR real válido y reusable y criterios de verificación de dinero antes de aceptar pagos reales.
- [ ] Hosting, backup/restauración, cron, seguridad/privacidad y almacenamiento privado antes de publicar.
- [ ] Autorización explícita separada antes de crear SQL/app, merge o despliegue.

**Conclusión:** comercialmente E1 puede pasar a **diseño técnico D0 propuesto**. **No está listo para publicar ni crear SQL/infraestructura** sin aprobación y contratos de seguridad/datos. El siguiente bloque lógico es una propuesta de arquitectura/modelo lógico, no un cambio ejecutable.

## D0 documental en curso — diseño lógico y matriz de amenazas
[29: ADR-D0-01](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md) y [30: D0-02](30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md) desarrollan **modelo lógico propuesto** (13 agrupados), límites atómicos S/E/G, bloqueo por modelo, máquinas de estado candidatas, contrato cron/admin y seguridad/30 QA. **No se ejecutó código ni SQL; no aprobar DDL por este índice.** Prioridad de negocio por decidir D0-A: si se puede CONFIRMAR pedido con G surtido sin colores ya fijados; D0-C: déficit por mermas; D0-D: acreditación tardía. Mantener G03-B FUERA de V1.

## D0-A — confirmación de pedidos surtidos con G sin colores: APROBADO
**Decisión comercial posterior:** confirmar pedido surtido **sin asignar colores** está permitido si G corresponde a cantidad real de stock apto garantizada. Transferir compromiso desde reserva sin contar dos veces; pedido directo con G requiere validar y apartar una sola vez. Antes de la entrega, asignar variantes reales mediante G→E; entrega reduce S/E, no confirmación. Este requisito ahora integra el alcance M07/M08 de V1 y tiene QA de aceptación documental A01–A14 en [D0-A](31_D0_A_CONFIRMACION_SURTIDO_SIN_COLORES.md). **D0-C mermas/defectos sobre cupos garantizados queda como la próxima política pendiente**. No autoriza SQL ni aplicación.

## D0-C1 — decisión posterior de inventario conservador (2026-11-23)
D0-C1 actualiza M04 de V1: stock surtido **conservador por modelo**, sin registro individual de defectos ni módulo de merma; 78 fabricadas→72 aptas publicadas, seis excluidas. Si faltan buenas, menor cupo real; ajuste agregado/incidencia solo cuando afecta unidades prometidas. **B06 no exige QC pieza por pieza**. D0-C2 debe resolver saldo por color exacto antes de diseñar SQL. [Canon](32_D0_C1_STOCK_CONSERVADOR.md).
