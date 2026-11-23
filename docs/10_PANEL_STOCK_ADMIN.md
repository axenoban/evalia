# EVALIA — Panel administrativo de disponibilidad por modelo y talla

**Estado: requerimiento visual confirmado por el propietario, especificación funcional candidata; no existe aún implementación.** Fecha: 2026-11-22. Relacionado con D07, D08, G03-01/02/03/04/07 y C-G03-A.

## Problema que resuelve
El administrador no quiere calcular manualmente cuántas prendas tiene libres sumando reservas y revisando pedidos uno por uno. Cada reserva o pedido confirmado debe reflejarse inmediatamente en un total **disponible** que no permita ofrecer más unidades que las existentes.

## Jerarquía de navegación recomendada
- **Inventario y reservas**: vista principal del administrador, accesible desde menú lateral.
- Filtros de **modelo**, **talla** y **color** (colores opcionales hasta filtrar). Filtro adicional estado/reservas puede diseñarse.
- Fila de **modelo+talla** con totales derivados de sus colores; expandir para ver **modelo+talla+color**, que es la unidad real de validación de stock por D07.
- Desde cada fila, acción para consultar reservas/pedidos que ocupan unidades (con acceso autorizado); no obliga al usuario a reconstruir totales leyendo cada operación.
- Responsive: tabla en escritorio; tarjetas expandibles/filtrables en móvil.

## Indicadores mínimos
1. **Existencias físicas (F):** unidades todavía bajo custodia de EVALIA, incluidas las ya asignadas aún no entregadas.
2. **Reservadas (R):** unidades en reservas activas no convertidas en pedido; mostrar además **número de reservas activas** como dato distinto del número de prendas.
3. **En pedidos pendientes de entrega (P):** unidades confirmadas y asignadas, pero aún no retiradas/despachadas; las entregas parciales mantienen asignado solo el saldo pendiente.
4. **Disponibles (A):** unidades libres para nuevas reservas o pedidos = F − R − P por variante.
5. **Encargos futuros:** cantidad de demanda futura **separada**, que no suma existencias físicas ni se resta automáticamente del disponible (D10, G03-06).

Recomendación UX: destacar **Disponibles** y alertar ante cero/unidades insuficientes; no fijar umbrales de «stock bajo» sin decisión. Indicar fecha/hora de actualización y canal del pedido solo cuando ayude a la gestión. Una actualización visual no sustituye la validación transaccional de la BD.

## Boceto de tabla (solo números ficticios)

| Modelo | Talla | Físico | Reservado | Pendiente de entrega | Disponible | Reservas activas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Modelo A | M | 20 | 6 | 4 | 10 | 2 |
| Modelo A | XL | 12 | 0 | 8 | 4 | 0 |
| **Modelo A · total** | — | **32** | **6** | **12** | **14** | **2** |

El subtotal se suma desde las variantes de color. Que el total del modelo sea 14 **no significa que un color agotado pueda venderse**. Si una misma reserva incluye varios colores/tallas, contar su **ID una sola vez** en «reservas activas», aun cuando tenga múltiples líneas.

## Acciones a diseñar sin asumir permisos finales
- Ver disponibilidad y desglose de reservas/pedidos por variante.
- Registrar movimiento físico con motivo (reglas de ajuste y permisos pendientes G05/G07).
- Iniciar reserva mayorista, con validación de **≥6 unidades por modelo** y existencia suficiente en cada variante; las mezclas de presentación pendientes G04 no deben forzarse.
- Registrar pedido directo con validación atómica de disponibilidad.
- Consultar saldos por entregar y eventos de reserva vencida.
- Visualizar y filtrar encargos futuros independientemente.

## Reglas de interfaz vs backend
Al hacer una operación, el frontend puede mostrar disponibilidad instantánea y refrescarse; pero el servidor/SQL debe validar que la asignación no sobrepase A. No realizar bloqueo de stock con varias lecturas/escrituras de JavaScript client-side. En dos sesiones simultáneas solo una puede tomar la última unidad de la misma variante.

## No aprobado aún
Diseño visual exacto, alertas de umbral, reglas de ajustes, permisos de personal, estados definitivos de pedidos, reglas de G04, comportamiento de cancelaciones tras entrega parcial ni sincronización sin Internet. El sistema no está publicado.