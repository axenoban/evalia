# Registro de decisiones del producto

**Todas las opciones están PENDIENTES.** Las recomendaciones en el cuestionario no son decisiones aprobadas. Actualizar aquí con fecha, decisión, responsable, motivo y efectos antes de implementar.

| ID | Tema | Pregunta principal | Recomendación técnica |
| --- | --- | --- | --- |
| D01 | Alcance inicial | ¿Qué debe hacer el primer administrador? | Catálogo + pedidos + reservas, luego otras perspectivas |
| D02 | Reserva | ¿Stock real, producción futura o citas? | Separar reserva de stock de pedido futuro |
| D03 | Disponibilidad | ¿Reservar descuenta de disponible? | Sí, con operación atómica |
| D04 | Vencimiento | ¿Cuándo y cómo expira una reserva? | Vigencia configurable, alertas y liberación trazable |
| D05 | Canales | ¿Feria, WhatsApp y web? | Registrar origen de cada operación |
| D06 | Segmentos | ¿Mayorista/minorista o ambos? | Ambos con B2B prioritario |
| D07 | Variantes | ¿SKU por modelo-color-talla? | Sí, sin inventar tallas |
| D08 | Stock | ¿Existencias por variante o disponibilidad aproximada? | Existencia física y movimientos |
| D09 | Precio | ¿Listas por formato/cantidad y cliente? | Configuración + snapshot al confirmar |
| D10 | Producción | ¿Pedidos futuros sin stock actual? | Módulo separado, inicialmente simple |
| D11 | Pagos | ¿Manual externo o integración online? | Registro manual inicial |
| D12 | Entrega | ¿Feria, envío nacional o ambos? | Ambos |
| D13 | Clientes | ¿Sin login al inicio o cuenta desde la fase uno? | Contactos internos primero |
| D14 | Personal | ¿Permisos de lectura, preparación y edición? | Roles mínimos y auditoría |
| D15 | Notificaciones | ¿WhatsApp manual o automatizado? | Plantillas manuales al inicio |
| D16 | Infraestructura | ¿Supabase/Postgres + Cloudflare? | Preferida; validar costos y operación |
| D17 | Conectividad | ¿Se exige operación offline? | Web online al inicio, sin prometer offline |
| D18 | Datos personales | ¿Qué datos almacenar y por cuánto tiempo? | Mínimos necesarios, política explícita |

### Formato de aprobación
`Dxx | APROBADA | YYYY-MM-DD | opción exacta | justificación | impacto`

### No escribir como norma hasta su aprobación
Estados de pedido, horas de vencimiento, montos, impuestos, descuentos, reglas de paquetes, rol del personal, permisos de cliente y canales de pago.
