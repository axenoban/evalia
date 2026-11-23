# EVALIA — D0-F: reconciliación del modelo lógico V1 simplificado (APROBADO)

**Fecha:** 2026-11-23. **Estado:** aprobado expresamente el 2026-11-23 para comenzar migraciones en rama feature, sin autorizar despliegue o merge. Las migraciones siguen sujetas a pruebas. Se deriva de [D0-C2/D/E aprobados](33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md) y de los contratos comerciales preexistentes. Refina [ADR D0-01](29_D0_MODELO_LOGICO_Y_TRANSACCIONES.md), que hoy todavía describe compromisos `E_c` por color y `G_m` surtido: **en la V1 actual solo hay cupos surtidos por modelo**.

## 1. Principio estructural

**Una talla por modelo; colores son selección de catálogo, no stock.** Separar tres conceptos: (i) modelos/precio/colores visibles, (ii) total publicable y sus movimientos, (iii) compromisos de reserva y de pedido. **No introducir una tabla de existencias por color** ni pedir color por línea de reserva/pedido. El estado del stock es coherente si `A=S-R-P` se calcula con líneas fuente de verdad, no si se duplican contadores modificables de reservas y pedidos sin control.

## 2. Entidades propuestas (agrupación lógica; nombres ilustrativos)

| Grupo | Tablas candidatas | Claves o datos mínimos y relación |
| --- | --- | --- |
| Acceso interno | `admin_profiles` | Operador autenticado por Supabase Auth; autorización en servidor/BD |
| Clientes | `customers` | ID, nombre y WhatsApp; sin login ni fusión automática por número |
| Catálogo | `colors`, `models`, `model_colors` | Color reutilizable; modelo de una talla, foto, precio docena editable; relación N:M de colores ofertados sin cantidades |
| Stock | `model_inventory`, `inventory_events` | Un registro de S en unidades por modelo; entradas, ajustes de conteo, venta física agrupada y eventos de entrega con actor, delta y fecha |
| Reservas | `reservations`, `reservation_lines` | Cliente, F vencimiento, L si aplica, estado; cantidad entera por modelo; borrador sin compromiso |
| Pedidos | `orders`, `order_lines` | Confirmación directa o única reserva de origen; cantidades por modelo y precio de docena/subtotal congelados; entregadas acumuladas como dato derivado de eventos |
| Entrega | `deliveries`, `delivery_lines` | Fecha/admin, pedido y unidades realmente entregadas por línea/modelo; **sin color obligatorio** |
| Pagos | `payment_declarations`, `payment_evidence` | Pago declarado/recibido y evidencia privada; estado de aprobación, importe decimal Bs; reserva y posterior pedido vinculados al **mismo pago** |
| Portal de pedido | `order_access_tokens` | Un token de alta entropía, **solo hash almacenado**, alcance de un pedido y revocación |
| Seguimiento | `contact_tasks` | Pendiente de contacto **manual** de reserva en revisión G01, sin WhatsApp automático |
| Integridad | `audit_events`, `idempotency_commands`, `stock_incidents` | Acciones privilegiadas, reintentos seguros e incidencias de faltante; sin crear flujo comercial de cancelaciones |

**Decisiones de ingeniería a validar en implementación:** convenciones de claves, constraints, índices, vistas, snapshot de precio y cierre, retención de evidencias, límites técnicos de archivo y diseño exacto del aislamiento de transacciones. No agregar marcas/tenants multiempresa ni personal multirol como obligación de V1 sin autorización.

## 3. Fuente de verdad y operaciones

Calcular `R_m` por suma de `reservation_lines.quantity` pertenecientes a reservas GUARDADAS todavía vigentes/protegidas; `P_m` por `order_lines.quantity - SUM(delivery_lines.quantity)` de pedidos confirmados/activos. **La conversión reserva→pedido es una transacción única**, de forma que las mismas unidades nunca aparecen a la vez en R y P; si el sistema necesita estados intermedios, deben permanecer dentro de esa transacción.

- **Guardar reserva:** validar cantidad entera `n ≥ 6` por modelo, disponibilidad A suficiente y estados, escribir reserva/líneas; las demás líneas del carrito se confirman o rechazan conjuntamente. Borrador no reserva.
- **Confirmar desde reserva:** transferir la titularidad de todos los modelos sin cambiar S ni A; mantener vinculados los pagos/depositos ya existentes sin duplicar.
- **Confirmar pedido directo:** comprobar A y agregar P solo una vez.
- **Entrega parcial/total real:** registrar evento de entrega; por modelo `S -= d`, `P -= d`, `A` invariable; guardar historial, sin obligar a informar cantidades por color. La composición física se revisa fuera del sistema para garantizar prendas aptas del modelo correcto.
- **Venta física publicable / añadir / establecer:** operación en S por modelo, con cálculo de A bajo el mismo lock y validación `S_nueva ≥ R+P` en flujo normal. No registrar cada venta física individual. Las prendas no publicadas no alteran S.
- **Faltante comprobado que afecta compromisos:** no ejecutarlo como ajuste ordinario que falsea S o consume reservas. Levantar incidente con cantidad real y déficit, frenar nuevas promesas; la decisión comercial de resolución permanece pendiente. El diseño final deberá mantener integridad de la evidencia y no aparentar que el cupo sigue disponible.
- **Vencimiento:** domingo/lunes→miércoles 12:00; martes/miércoles/jueves→sábado 12:00; viernes/sábado→miércoles siguiente 12:00, en `America/La_Paz`. Sin depósito aprobado oportunamente en F: liberar R una vez; con depósito aprobado oportunamente: L=F+7 días naturales, a las 12:00 pasar a EN_REVISIÓN con tarea de contacto manual, **sin liberar R**. No reactivar automáticamente una reserva vencida por aprobación tardía.
- **Pago:** múltiple abonos por QR/transferencia declarada y captura privada; solo ADMIN APRUEBA dinero efectivamente recibido; monto aprobado resta de saldo y nunca modifica S/R/P. Abono de reserva sigue siendo la misma entidad al confirmar pedido.
- **Cierre:** solo con total cobrado/aprobado y todas las unidades efectivamente retiradas, por admin; revocar enlace privado. Sin devoluciones/cancelaciones solicitadas por cliente V1 ni cierre excepcional falso.

## 4. Precios como contrato separado

Por **cada modelo** `n≥6`: `subtotal_exacto = precio_docena × n / 12`. Redondear una sola vez el total de ese modelo al Bs entero más cercano, **excepto si la fracción es exactamente .50: conservar .50**. Sumar subtotales finales por modelo sin redondear otra vez el pedido. Usar decimal/racional exacto; no `float` JavaScript como verdad monetaria. Congelar precio y subtotal al confirmar. E1 **sin descuentos**.

## 5. Transacciones y seguridad (no SQL todavía)

- Todas las mutaciones de reserva/stock/pedido/entrega deben serializarse **por identificador de modelo**, ordenando locks de modelos en carritos multímodelo para evitar deadlocks.
- Autorizar cada petición admin por backend/DB; clientes sin cuenta solo pueden ver su pedido y declarar pagos mediante **enlace único revocable**. El token no es ID ni WhatsApp y su hash no debe exponerse. RLS y límites de permisos verificados mediante QA de acceso cruzado.
- Evidencias en Storage **privado**; endpoint validado cuando se requiera revocación efectiva en peticiones futuras. No publicar comprobantes ni credenciales en GitHub.
- Reintentos atómicos con clave de idempotencia en guardar, confirmar, vencer, ajustar, entregar, aprobar abono y completar. Mantener auditoría persistente y no ejecutar WhatsApp externo dentro de transacción.
- Migraciones, NEXT.js, cron, instancias Supabase, hosting y SQL **no autorizados por esta propuesta**.

## 6. QA P0 a incorporar cuando haya código

| ID | Prueba | Invariante |
| --- | --- | --- |
| F01 | Dos reservas concurrentes de 6 sobre S6 | Solo una, A0 |
| F02 | Reserva R12→pedido P12 | S constante, A constante, ningún doble compromiso |
| F03 | Pedido con 2 modelos, segundo sin capacidad | Rechazo total |
| F04 | Pedido P12, entrega 5 | S−5, P−5, A constante; todavía no COMPLETADO |
| F05 | Venta física/ajuste concurrente con reserva | No prometer ni descontar dos veces las mismas unidades |
| F06 | Conteo normal debajo de compromisos | Rechazo y alerta; escasez real se registra aparte |
| F07 | Reserva con abono aprobado, llega L | Revisión + una tarea manual; R intacto |
| F08 | Reintentos de pago/entrega/ajuste | Efecto único |
| F09 | Pedido pagado y no recogido; pedido recogido con saldo | En ambos casos cierre rechazado |
| F10 | Token A consulta comprobante del pedido B | Denegado por backend y Storage |
| F11 | Modelo con 13 colores y S72 | No hay cantidades ni reservas exactas por color |
| F12 | Precio Bs381 ×6 + Bs420 ×12 | Total Bs610,50 exacto |

**D0-F APROBADO el 2026-11-23:** el propietario ratificó esta arquitectura lógica para comenzar la base de datos. D1-A queda documentado en [35](35_D1_A_SUPABASE_PRIMER_BLOQUE.md); no autoriza integración en main ni despliegue sin QA.
