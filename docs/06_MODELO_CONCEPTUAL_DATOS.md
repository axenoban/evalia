# EVALIA — Modelo conceptual de datos v0.1

**Estado: PROPUESTA, NO MIGRACIÓN SQL.** Se redacta antes de cerrar arquitectura en cumplimiento de D16.

| Dominio | Entidades candidatas | Relación/propósito |
|---|---|---|
| Identidad | usuarios internos, asignación de roles/permisos | Admin inicial, personal posterior |
| Clientes | contactos, clasificación comercial | Mayoristas/minoristas, sin cuenta inicialmente |
| Catálogo | productos, variantes, imágenes | Una variante por combinación de modelo/color/talla que el negocio confirme |
| Precios | listas, reglas de aplicación, precios por presentación | Tarifas por cliente/presentación, sin montos supuestos |
| Inventario | saldos físicos, movimientos, motivos | Exactitud por variante y correcciones auditables |
| Reservas | reserva física, líneas, caducidad | Bloqueo temporal de unidades existentes |
| Pedidos | pedido, líneas, clase/origen | Pedido actual o encargo futuro; vínculo opcional a reserva |
| Pagos externos | registros manuales | Constancia de pago fuera del sistema |
| Entregas | modalidad, seguimiento | Retiro feria/envío nacional |
| Comunicación | plantilla, evento de comunicación | WhatsApp manual |
| Auditoría | evento, actor, referencia | Historial de operaciones sensibles |

## Separación de cantidades (regla de consistencia técnica)
Stock físico no es lo mismo que disponibilidad ni que reserva vigente ni que pedido futuro. Las reservas vigentes deben reducir unidades reservables (D03). **La fórmula final y la transición reserva → pedido esperan G03:** no contabilizar reserva y pedido dos veces. Un pedido futuro no representa unidades fabricadas ni físicas.

## Relaciones candidatas
Producto 1:N variantes; variante 1:N movimientos y líneas; cliente 1:N pedidos y reservas; pedido 1:N líneas; reserva 1:N líneas. Referencia de pedido a reserva, solo si G03 define cuándo y cómo se consume el compromiso. No definir todavía cardinalidades de pagos, entregas o prórrogas como regla.

## Invariantes técnicas sugeridas
ID estable por línea/variante; operación de inventario y reserva atómica en PostgreSQL; trazabilidad y seguridad RLS; snapshot de precio acordado por línea; idempotencia ante solicitudes repetidas. Su implementación necesita detalles de negocio ratificados.

## Antes de convertir a SQL
Cerrar G03/G04 (transiciones, presentaciones), G01/G05 (caducidad y stock), G07/G08 (accesos y privacidad). Luego definir claves, constraints, estados, índices, políticas RLS, contratos SQL y tests. D16 se ratifica después del modelo lógico validado.

**No hay migraciones ejecutadas ni conexión Supabase realizada.**

## Adenda de modelo por respuestas G03/G04 (NO SQL definitivo)
- **Reserva mayorista:** asociada a grupo/segmento de cliente y líneas de variantes; validar **cantidad acumulada por modelo ≥6** para una reserva mayorista, sin suponer que unidades de modelos distintos se suman para cumplirlo.
- **Pedido:** asignaciones por línea; reserva convertida mantiene su compromiso, pedido directo crea compromiso. Entrega parcial requiere cantidades entregadas y pendientes por línea. Pedido futuro se asigna a stock por intervención manual.
- **Inventario:** G03-02 descuenta «inventario físico» al confirmar, con mercancía potencialmente todavía no entregada. **No escoger esquema de saldo físico** sin C-G03-A: se requieren dimensiones para comprometido, confirmado, disponible, efectivamente presente y entregado, evitando contabilidad doble y restauraciones ficticias.
- **Presentaciones:** quedan **indefinidas** por G04-01. Necesario modelar líneas separadas por variante (talla/color) para conocer precios distintos; G04-04 de una talla por presentación choca con composición del mínimo combinando M/XL. No fijar restricciones SQL de composición hasta aclarar.
- **Precio:** atributos de segmento/presentación, excepciones por cliente, tarifa efectiva al confirmar y snapshot histórico; editar importe solo admin auditado. Sin tarifas numéricas, fórmula de prorrateo, impuestos ni redondeo.

Revisar [selecciones literales y casos](09_G03_G04_SELECCIONES.md) antes de migraciones o diagrama lógico final.
