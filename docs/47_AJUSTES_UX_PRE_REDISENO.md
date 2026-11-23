# EVALIA · Ajustes previos al rediseño visual (D6.1)

**Estado:** candidata de prueba, rama `feature/evalia-ux-cierre-y-whatsapp`, nacida del baseline D6 aprobado `dev/evalia-core @ 523aa7fb`.

## Problema visual constatado
La V1 ya rechazaba reservas y retiró el botón de alta, pero quedaron textos históricos en `ClientPanel` («N reservas»), `ModelEditor` («reservas y pedidos futuros») y en el metadato HTML. Además, las URLs de antiguas Previews de Vercel permanecen accesibles con el código anterior, por lo que navegar con un enlace antiguo puede mostrar la versión previa.

## Ajuste
- Menú actual: `Nuevo pedido`, `Pedidos`, `Clientes`, `Productos`, `Pagos`, sin pestaña «Reservas» ni selector de tipo.
- Fichas de clientes: pedidos; si tienen registros históricos se informa «registros anteriores», sin presentarlos como una operación disponible.
- Actualización del precio: se informa expresamente que solo afecta **nuevos pedidos**, no reservas.
- Los compromisos antiguos que bloquean stock no se borran ni se ocultan a la administración: se muestran como **Registros anteriores pendientes** dentro de Pedidos. La única acción posible es convertirlos tras compra confirmada mientras sean válidos, sin nuevo apartado.
- Los estados históricos se renombran visualmente (sin alterar los códigos PostgreSQL).
- La rama incluye tests contra la reaparición de la pestaña o selector de reserva.

## WhatsApp — confirmación de pedido
Tras pulsar **Crear enlace privado** en un pedido activo, el panel genera un **borrador editable** para copiar y enviar manualmente a WhatsApp. Incluye el cliente si se conoce, referencia del pedido, cada modelo, talla, docenas surtidas, cantidad y colores extra, subtotal, total, abonos aprobados y saldo pendiente (solo si los datos financieros se cargaron), y el enlace privado recién creado.
- No se inventan descuentos, envíos, fechas de entrega ni políticas de reserva.
- La declaración de pago no implica ingreso; el mensaje distingue pagos **aprobados** y declara que un comprobante pasa por revisión.
- El mensaje se construye solamente para pedidos activos y con enlace /p/[token] válido.
- Copiar es una acción del usuario; **el sistema no envía mensajes automáticos** ni almacena el token en base de datos.
- El enlace sigue siendo secreto; al salir de la pantalla puede ser necesario generar uno nuevo.
- Las pruebas de Node comprueban pedidos multímodelo, colores, centavos, saldos, mensajes sin datos financieros y rechazo de URL insegura o pedido cerrado.

## Criterios de aceptación
1. Abrir la **URL nueva de Vercel**, no alguna Preview antigua guardada. Cerrar pestañas viejas o refrescar si hiciera falta.
2. Confirmar que no existe sección u opción comercial para crear reservas.
3. Verificar que Productos/Clientes y Pedidos no presentan reservas como alternativa.
4. En un pedido activo, pulsar Crear/Reemplazar enlace. Comprobar borrador, editar texto y copiar mensaje completo para WhatsApp. Pegar en chat de prueba, sin enviar datos privados a un destinatario incorrecto.
5. Abrir el enlace privado desde navegador distinto: únicamente muestra ese pedido.
6. Comprobar que inventario, pagos, entregas y cierre no presentan regresiones.
7. Validar la candidata antes de fast-forward a `dev/evalia-core` y antes de abrir fase de rediseño global.

**La publicación en GitHub Pages es una vista administrativa estática.** La prueba integral de enlaces y comprobantes debe realizarse en Vercel.
