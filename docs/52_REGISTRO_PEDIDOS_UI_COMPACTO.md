# EVALIA · Registro de pedido compacto y progresivo — candidata UI

**Rama:** `feature/evalia-registro-compacto`  
**Base:** `feature/evalia-dashboard-catalogo-responsive @ 5d1134e18cc58226adfe0c4f39335f7c8fb93be4` (PR #14 todavía pendiente de aprobación).  
**Estado:** candidata pendiente de prueba del propietario. No integrar a `dev/evalia-core` sin validar el bloque anterior.

## Cambios de presentación

1. Barra de progreso horizontal con tres estaciones (Cliente, Modelos, Confirmación), sin tarjetas grandes de progreso repetidas.
2. Selector de clientes con búsqueda integrada por nombre o WhatsApp, listado tipo tarjeta (iniciales, nombre, teléfono y modalidad habitual) y selección con teclado. Limita resultados a ocho visibles mientras permite seguir buscando.
3. Modelos elegibles en lista vertical con fotografía, talla, precio actual, stock libre y acción de agregar. Conserva bloqueo si el inventario o los colores no permiten el mínimo mayorista.
4. Modelo agregado: el control de docenas aparece inmediatamente, mientras el selector de unidades individuales queda plegado salvo elección expresa o `dozens=0` (sin docena necesita de 6 a 11 colores distintos). El plegado no borra colores existentes.
5. Resumen, validación de modalidad de retiro/envío, destino obligatorio, petición idempotente y guardado siguen ejecutándose exactamente desde los controladores existentes.
6. Tipografía, contraste y estados se mejoran mediante `web/app/booking.css` aislado por `.ev-booking`, sin retoque de los demás módulos.

## Reglas canónicas no modificadas

- Cada docena suma doce prendas surtidas, sin elegir colores.
- Cada unidad adicional corresponde a exactamente un color activo distinto (máximo 11).
- Para cero docenas, el mínimo de seis unidades exige seis colores distintos (media docena por colores, no surtido automático).
- El mínimo mayorista rige por modelo y se preserva con `checkedPortions`.
- El stock libre se toma de `data.stock[model.id].available`; no se descuenta en la UI ni se modifica la BD al añadir al borrador.
- Los precios y subtotales siguen las funciones comerciales actuales.
- Se mantiene el comportamiento de cliente nuevo, identificación, entrega `pickup/shipping` y destino por pedido.
- No se crean reservas, nuevas RPC, cambios de SQL ni permisos.

## Verificación

- `npm run check` en raíz (todos los tests, incluidos `tests/registro-compacto.test.mjs`).
- `cd web && npm install --no-audit --no-fund && npm run build`.
- QA manual en móvil 360 y 390 px y escritorio 1280 px: teclado, apertura/cierre del selector, clientes sin clasificación, cliente con envío, creación de cliente, 0/1/2 docenas, 6 colores únicos sin docena, 11 extras, stock agotado, botón deshabilitado, repetición de colores, 2 modelos y envío con destino.
- Confirmar que el subtotal y el botón de registro son correctos y que la creación de pedido real sigue pasando por la RPC vigente.
- Probar las demás secciones aprobadas y mantener el PR como borrador hasta autorización.

**Este PR se basa en el dashboard candidato; su validación debe incluir ambos bloques antes de promover a `dev/evalia-core`.**
