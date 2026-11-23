# EVALIA — D2-B: docenas surtidas, prendas extra por color y carrito multímodelo

**Decisión del propietario:** 2026-11-23. **Estado:** código en rama feature, **pendiente de QA SQL real y aprobación visual**. Prevalece sobre la prohibición de registrar colores por pedido de D0-C2 **solo para las prendas adicionales individuales**, sin transformar el inventario global a inventario por color.

## 1. Contrato vigente de captura por modelo

Una línea de pedido/reserva contiene:
- \`dozens\`: entero 0 o mayor, docenas **completas surtidas**. Cada docena agrega 12 unidades al compromiso de ese modelo.
- \`extraColorIds\`: lista de **colores distintos de ese mismo modelo**; cada color seleccionado representa **exactamente una prenda**. Máximo 11.
- \`quantity = dozens × 12 + extraColorIds.length\`.

| Docenas | Prendas por color | Resultado | Permitido |
|---:|---:|---:|---|
| 0 | 0–5 | Menos del mínimo mayorista | No |
| 0 | 6 | Media docena con 6 colores distintos | Sí |
| 0 | 11 | Once prendas con 11 colores distintos | Sí |
| 0 | 12 | Excede límite de adicionales | No |
| 1 | 0 | Docena surtida | Sí |
| 1 | 1 | Docena surtida + 1 color individual | Sí |
| 1 | 11 | 23 prendas: docena surtida + 11 adicionales | Sí |
| 1 | 12 | 24 prendas mal expresadas como extras | No: elegir 2 docenas |
| 2 | 0 | 24 prendas surtidas | Sí |
| 2 | 11 | 35 prendas | Sí |
| 0 | 6, de dos modelos mezclados (3+3) | Ningún modelo alcanza 6 | No |

**Regla crucial:** el mínimo de 6 se verifica **en cada modelo**, no por el carrito completo. Se pueden incluir varios modelos de diferentes tallas y precios; cada uno se valida y calcula por separado.

## 2. Colores y disponibilidad — límite explícito

- Cada modelo mantiene sus **colores ofertados** en la paleta global, con muestras \`hex_code\` y fotografía independiente.
- En la captura de **prendas adicionales** los colores se seleccionan visualmente; un mismo color no puede repetirse dentro del desglose de adicionales de una línea de modelo.
- Las **docenas siguen siendo surtidas**; su composición cromática no se determina en el formulario.
- La elección individual queda **registrada como color solicitado**, no como stock por color ni garantía física de disponibilidad. **El sistema solo valida existencia global del modelo**. Si se desea prometer un color físicamente, será imprescindible decidir un control por color, o un protocolo de confirmación tras verificar el surtido real. No se deduce que haya una prenda de cada color por el solo hecho de estar ofertado.
- No se obliga a registrar prendas manchadas o defectuosas, ni se crea conteo por color. El margen conservador D0-C1/D0-D permanece.
- La selección queda archivada con el pedido o la reserva, y **se traslada sin cambio al confirmar reserva→pedido**, sin doble contabilización.

## 3. Persistencia y autorizaciones

La nueva migración \`20261123000500_docenas_colores_extra.sql\` incorpora \`dozen_count\`, \`extra_units\` y las tablas \`reservation_extra_colors\` / \`order_extra_colors\`, cuyas claves exigen que cada color pertenezca al modelo y no se repita. RLS administrativa, sin escritura directa de clientes.

Las RPC \`create_evalia_reservation\`, \`create_evalia_order\` y \`confirm_evalia_reservation\` guardan atómicamente líneas y colores. Se mantienen locks ordenados de inventario para impedir sobreventa y claves de idempotencia de reintento. El precio sigue siendo \`precio_docena × quantity / 12\`; redondea **una vez por modelo** al boliviano más próximo, conservando exactamente \`,50\`. El total suma subtotales ya redondeados.

Se permite editar una reserva **guardada y vigente**: \`revise_evalia_reservation\` valida y guarda el nuevo carrito en una transacción, reutiliza el cupo original para la comparación de capacidad y escribe una fila en \`reservation_revisions\` con antes/después, actor, fecha y solicitud. No se crean cancelaciones ni reembolsos de pedidos. Los registros legados sin desglose quedan intactos y se identifican como tales en la pantalla.

## 4. Formulario

En \`web/app/page.jsx\`:
1. Selección/búsqueda de cliente por nombre o WhatsApp, sin fusionarlo automáticamente.
2. Buscador visual de productos con foto, talla, precio docena y **A global** visible.
3. Añadir uno o más modelos al carrito y editarlos individualmente.
4. Control de docenas \`− / número / +\`, más selector de colores en mosaico con hasta 11 muestras marcadas sin repetición. Si \`dozens=0\`, se exige de 6 a 11 colores.
5. Resumen por línea, subtotal y total. Borrador de React no compromete stock.
6. Guardar reserva, pedido directo, confirmar reserva, editar reserva vigente con historial.
7. Vista posterior con descomposición, colores elegidos, referencia completa y texto de reserva para copiar y enviar **manualmente** por WhatsApp.

## 5. Trazabilidad de los cuestionarios anteriores

El pedido actual solicita implementar lo inicialmente definido. Estado del programa E1 **sin considerar completos los módulos que todavía requieren infraestructura/QA**:

| ID | Módulo | Estado de código |
|---|---|---|
| M01 | Autenticación y autorización admin | Implementado; sin usuario/proyecto real configurado |
| M02 | Paleta global de colores | Implementado con muestras |
| M03 | Alta de modelos, talla, foto, precio | Alta implementada; edición avanzada y plantillas pendientes |
| M04 | Stock conservador, ajustes S/R/P/A | Implementado; validación PostgreSQL pendiente |
| M05 | Clientes y WhatsApp | Registro y búsqueda implementados |
| M06 | Carrito, reserva y edición R08 | Implementado en rama feature; QA SQL pendiente |
| M07 | Vencimiento F/L y depósitos | F calculado; caducidad programada y protección por depósito pendientes |
| M08 | Pedido directo, reserva→pedido, entrega | Registro y conversión implementados; entrega pendiente |
| M09 | Precio mayorista por modelo | Implementado, redondeo exacto y snapshot |
| M10 | Avisos de pago, aprobaciones y abonos | Pendiente |
| M11 | Enlace privado, revocable y por pedido | Pendiente |
| M12 | QR propio y comprobantes privados | Pendiente; QR real no facilitado |
| M13 | Retiro físico y cierre pagado | Pendiente |
| M14 | Panel y seguimiento | Panel S/R/P/A implementado; tareas G01 pendientes |

No implementar cancelaciones/devoluciones del cliente en E1, ni inventar QR, tarifas, porcentajes de depósito o integración automática de WhatsApp.

## 6. QA y verificación

**Validación automatizada confirmada:** GitHub Actions ejecutó `npm run check` (**70/70 pruebas Node**), compilación de Next.js 16 (**correcta**) y Supabase CLI v3 con PostgreSQL local (**migraciones 001–005 aplicadas, 4 archivos pgTAP, 83/83 comprobaciones superadas**). Incluye transacciones efectivas de reserva, edición auditada, pedido directo, reintento, transferencia reserva→pedido, stock e intentos inválidos como admin/no admin. Esto **no sustituye la prueba de navegador ni la infraestructura real**.


- \`npm run check\`: regresiones Node, incluidas 20 pruebas nuevas de docenas, colores únicos, rechazo 5/12 adicionales, varios modelos, stock agotado y redondeo.
- \`cd web && npm install && npm run build\`: compilación Next.js.
- \`supabase start && supabase test db\`: aplicar todas las migraciones y pgTAP. La nueva validación y la revisión concurrente requieren además pruebas funcionales con credenciales de admin real en entorno aislado.
- Manual: comprobar móvil 360 px, escritorio 1280 px, teclado, búsqueda cliente por WhatsApp, foto y muestras, una docena+11, cero docenas+6, varios modelos, stock insuficiente, modificación de reserva y copia de texto.

**Bloqueador de publicación:** no consta proyecto Supabase creado/conectado para EVALIA. Una base local o CI no equivale a un servidor de producción ni a despliegue. PR en borrador, sin merge hasta aprobar.
