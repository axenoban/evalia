# EVALIA · Dashboard de modelos, stock y pedidos (propuesta para validación)

**Rama:** `feature/evalia-dashboard-catalogo-responsive`  
**Base:** `dev/evalia-core @ 053baa2e1b206ac1c6031be54579fbde0e6503a5`  
**Estado:** implementación visual candidata. No integrar a `dev/evalia-core` sin prueba y aceptación del propietario.

## Alcance autorizado

- Se mantiene el tablero administrativo y los cuatro indicadores existentes.
- Se prioriza **Modelos y stock disponible**: fotografía actual del modelo, nombre, **disponibilidad libre** expresada en docenas completas y unidades remanentes, y precio por docena obtenido del modelo.
- No se muestran colores en tarjetas del dashboard; siguen disponibles en el catálogo y en el flujo de pedido.
- En escritorio, las tarjetas se desplazan en carrusel horizontal con botones y scroll natural/teclado. En móvil hasta 740 px se muestran siempre dos columnas sin carrusel horizontal.
- A continuación aparecen pedidos **activos** y avisos de pagos **pendientes/en observación**. Se destacan con distintas superficies (rosa catálogo, cálido pedidos, lila pagos).
- Aumentan tamaño y contraste de títulos, datos y navegación; **Resumen** es accesible también en la barra inferior móvil.
- No se agrega un umbral nuevo para "stock bajo": solo se indican sin existencias (0) y bloqueos ya suministrados por el backend.

## Correspondencia de datos (sin cambios de reglas)

| Etiqueta visual | Origen real | Regla |
|---|---|---|
| Stock disponible | `data.stock[model.id].available` | Cantidad libre calculada por servidor; nunca sustituir por `on_hand` |
| Docenas / unidades | Presentación de `available` | `Math.floor(available/12)` docenas y `available%12` unidades |
| Precio | `model.price_dozen_bs` | Precio actual del modelo, no recalcular ni alterar históricos |
| Modelo / foto | `model.name` / `model.imageUrl` | Placeholder original cuando falta foto |
| Pedidos pendientes | `order.status === 'active'` | No inventa subestados de preparación |
| Entrega | `deliveryLabel(order.fulfillment_method)` | Conserva clasificación real pickup/shipping/legacy |
| Pagos | `pending` / `observed` | Informados, no aprobados automáticamente |

**Protección:** no se cambian RPC, SQL, autenticación, facturación, inventario, entregas, esquema ni flujo de registro. Los ajustes se realizan exclusivamente en los módulos vigentes.

## QA antes de aprobar

1. Ejecutar `npm run check` desde la raíz.
2. Ejecutar `cd web && npm install && npm run build`.
3. Iniciar vista administrativa de prueba con datos reales solo de lectura (no modificar registros en Supabase remoto).
4. En PC a 1280 px: confirmar carrusel, flechas, scroll y teclado. Probar muchas fichas y ausencia de fotos.
5. En 360 px y 390 px: confirmar **dos tarjetas por fila**, legibilidad de cantidades como `5 doc. y 6 unidades`, precios y menú inferior con Resumen.
6. En 768 px: confirmar fluidez y ausencia de desbordamiento. Comprobar nombres muy largos.
7. Comprobar casos: 0, 6, 12, 66, 72 prendas libres, modelo bloqueado, 0 pedidos, 0 pagos y registros históricos.
8. Navegar a Productos, Nuevo pedido, Pedidos y Pagos para comprobar que las pantallas aprobadas conservan comportamiento. No aprobar hasta prueba física del usuario.

**Nota:** el diseño es un candidato UI, no un despliegue a `main` ni una modificación de la base comercial.
