# EVALIA — Cuestionario interactivo R01–R12: registros, reserva y aplicación

**Estado: PENDIENTE DE RESPUESTAS, NO APROBADO.** Cada opción «recomendada» sigue siendo recomendación y no decisión. El usuario responderá mediante cuestionario de selección en ChatGPT; actualizar el registro solo tras recepción.

## Etapa A · Registros
| ID | Pregunta | Recomendación inicial |
| --- | --- | --- |
| R01 | ¿Quién registra las reservas en la primera fase? | Solo administrador, personal se habilita después |
| R02 | ¿Qué contacto es indispensable para reservar? | Nombre y número de WhatsApp; otros datos al concretar entrega |
| R03 | ¿Cómo identificar clientes existentes? | Buscar por teléfono; sugerir, no fusionar automáticamente |
| R04 | ¿Cómo cargar existencias iniciales? | Por modelo/color/talla, con formulario e importación validada opcional |

## Etapa B · Captura y stock
| ID | Pregunta | Recomendación inicial |
| --- | --- | --- |
| R05 | ¿Desde qué interfaz armar reservas? | Catálogo visual con búsqueda y carrito multilínea |
| R06 | ¿Cuándo bloquear stock? | Borrador sin bloqueo; al confirmar Guardar reserva |
| R07 | ¿Qué pasa si una variante no alcanza? | Rechazar asignación, mostrar saldo real y permitir corregir |
| R08 | ¿Cómo editar una reserva vigente? | Edición controlada con recálculo transaccional y auditoría |

## Etapa C · Seguimiento y canales
| ID | Pregunta | Recomendación inicial |
| --- | --- | --- |
| R09 | ¿Cómo se decide el vencimiento? | Plazo configurable; duración inicial **sin fijar** hasta G01 |
| R10 | ¿Cómo confirmar reserva como pedido? | Acción explícita del administrador, sin esperar pago automático |
| R11 | ¿Cómo comunicar la reserva? | Copiar mensaje de WhatsApp con código/estado, envío manual |
| R12 | ¿Qué función tiene la web para clientes al inicio? | Solo administración; catálogo/solicitudes públicas, fase posterior |

## Cruces con requisitos
- D02/D03/D08 + R06/R07: bloqueo real al guardar, nunca solo por ver carrito.
- D13/D18 + R02/R03: contacto interno sin login, datos mínimos y protección por permisos.
- G03-01/G03-02 + R10: confirmar conserva compromiso, no descuenta dos veces.
- D04 + R09: vencimiento automático configurable; **no elegir 24/48 h sin respuesta**.
- D15 + R11: WhatsApp manual, no API.
- G04: presentar cantidades por variante y subtotal por modelo; **no asumir todavía** presentación ni precio mayorista de 7 prendas.

## Decisiones adicionales no cubiertas
- Datos de contacto válidos, compartición de teléfonos, privacidad/consentimiento.
- Quién puede liberar y cancelar luego de una entrega parcial (G03-B).
- Diferencia comercial entre solicitud, reserva y pedido, política de anticipo si existe.
- Tarifas, mezclas de tallas y presentaciones (G04).
- Inicio efectivo de canal público, permisos del personal y forma de actualización de stock.

**No convertir automáticamente estas recomendaciones en normas ni fusionar PR #1.**
