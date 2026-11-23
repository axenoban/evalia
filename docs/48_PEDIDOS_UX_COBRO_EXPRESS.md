# EVALIA — D7, selector de productos y cierre de venta express

**Estado:** candidato para validación, rama `feature/evalia-selector-cobro-express`, basada en el último PR visual `feature/evalia-ux-cierre-y-whatsapp @ 8899c11d`. Sin merge a `dev/evalia-core` o `main` hasta prueba del propietario.

## 1. Primer error real y corrección

La aplicación fallaba al pulsar `Agregar` dentro de `BookingPanel.addModel`: `const stock=stock[model.id]||{}` hacía sombra a la variable padre y producía un **ReferenceError por zona muerta temporal (TDZ)**. No era un problema de Supabase ni del stock. El selector ahora usa `modelStock`, extrae una función pura `initialModelPortion` y permite tocar **toda la tarjeta** del modelo; después muestra su editor de docenas y colores en el pedido.

Requisitos canónicos preservados: 1 docena surtida son 12 prendas; 0 docenas exige 6–11 prendas con colores individuales distintos; con 1+ docenas, 0–11 extras; no inventar stock por color; bloquear selección si inventario insuficiente o bloqueado.

## 2. Jerarquía UX

El formulario presenta tres fases diferenciadas con bordes y fondos contrastados y estado legible:
1. **Elegir comprador**: buscar/crear cliente.
2. **Seleccionar productos**: tarjeta táctil, talla y precio visibles, stock real, composición con subtotal. 
3. **Revisar y confirmar**: total y botón principal; el botón se habilita solo cuando hay cliente y composición válida.

El editor seleccionado desplaza la vista a su tarjeta sin perder la búsqueda ni el formulario. La interfaz usa colores de la identidad EVALIA existente, no introduce un cambio de marca. Estados se identifican por **texto + icono + contraste**, no solo por color. Estilos responsive para móvil.

## 3. Cobros/entregas: prioridad al caso cotidiano

El panel Pedidos ofrece un módulo `Finalizar pedido rápidamente` antes de la sección de operaciones parciales.

- **Registrar pago total recibido:** el administrador confirma fuera del sistema que recibió el saldo restante. La RPC crea declaración y aprobación auditada del importe **exacto pendiente**. El pedido queda **activo**, sin modificar entregas ni stock físico, para el caso de pago anticipado.
- **Entregar todo y completar:** solo si el saldo ya está aprobado íntegramente; registra todas las unidades físicamente pendientes, descuenta stock físico una sola vez y marca COMPLETADO.
- **Cobrar saldo y entregar todo:** con ambas confirmaciones explícitas registra pago del saldo, entrega de todos los modelos y cierre en **una sola transacción PostgreSQL**, no tres llamadas separadas.
- **Abonos o retiradas parciales:** siguen disponibles en `Abonos, comprobantes y entregas parciales`; el flujo del cliente y la revisión de evidencias bancarias siguen sin cambios.
- Si existen avisos `pending/observed` para ese pedido, el cobro rápido se **bloquea** hasta revisar esas evidencias, previniendo contar dos veces dinero.
- Si falla el stock o cualquier paso, PostgreSQL revierte **toda** la operación de cobro y entrega (no deja un pago ficticio aprobado).
- Cada intento tiene `request_id` idempotente en `order_quick_actions`, con actor, confirmaciones, importe, cantidad y referencias de auditoría. `anon` no tiene permiso y solo admin autorizado ejecuta la RPC.

**Importante:** estas acciones confirman hechos reales que el administrador verificó (dinero recibido, prendas físicamente entregadas). No hay conexión a un banco ni confirmación automática de transferencia. El clic abre un diálogo explícito para prevenir cierres accidentales.

## 4. Pruebas de aceptación de EVALIA completa

1. Abrir la URL de Preview de **esta rama** en Vercel (no una URL de otra feature ni Pages); iniciar sesión con Supabase Auth.
2. En Productos: comprobar tallas, colores y stock real, dar de alta un producto solo si es genuino. En Clientes: comprobar datos y edición.
3. En Nuevo pedido: elegir cliente, pulsar **cualquier punto de una tarjeta** de producto, observar el editor de cantidades; agregar un segundo modelo y elegir colores adicionales. Revisar que total y stock son correctos; confirmar **solo una compra real**.
4. En Pedidos: comprobar enlace privado, mensaje WhatsApp y portal cliente sin cuenta Vercel, QR real, comprobante, pago pendiente y revisión.
5. Con dinero efectivamente recibido y sin retirada, usar **Registrar pago total recibido**. Comprobar que saldo=0 y pedido aún activo.
6. Tras entregar todas las prendas, usar **Entregar todo y completar**. Comprobar estado COMPLETADO e inventario físico correctamente reducido.
7. En otro pedido realmente cobrado y entregado en el mismo momento, probar **Cobrar saldo y entregar todo**.
8. En pagos parciales, expandir sección avanzada, informar abonos y aprobar únicamente los constatados. Comprobar que el atajo liquida solo el saldo faltante.
9. Revisar en móvil que las tres fases están claramente diferenciadas, tarjetas de producto tienen área táctil suficiente, formularios y botones están visibles.
10. Comprobar que no se puede crear una reserva comercial nueva; registros antiguos solo en historial administrativo.

Para probar cobros ficticios, **usar una base de datos de prueba separada o pgTAP**: los botones del entorno remoto utilizan información comercial real.

### Regresiones automáticas
- `npm run check`: dominio, selector, UI contractual y utilidades.
- `cd web && npm run build`: Next.js completo.
- `supabase start && supabase test db`: pgTAP para cobro adelantado, cobro y retirada simultáneos, abono previo, reintentos, pending bloqueado, rollback por faltante físico y permisos.

**No se ha autorizado**: descuentos, devoluciones, pedidos sin compra confirmada, liberación de compromisos antiguos o entregas con deuda. No debilitar el guard de saldo=0 ni aprobar por defecto un aviso no verificado.
