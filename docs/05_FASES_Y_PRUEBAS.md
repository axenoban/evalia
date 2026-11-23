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
- G04: 7 unidades con docena ejemplo Bs 380 no implican Bs 380/12 × 7; el importe depende de tarifa fijada por modelo/variante. Mezcla de modelos requiere cálculo por sus líneas y mínimos independientes. Una talla por presentación y mezcla M/XL en mínimo por modelo requiere decisión explícita.
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
