# EVALIA — Ciclo operativo V1 implementado: pagos, vencimientos, entregas, acceso cliente y QR

**Fecha:** 23 de noviembre de 2026. **Estado:** candidato de desarrollo, no publicado ni aprobado mediante prueba manual. Rama: feature/evalia-ciclo-cobros-entregas; PR independiente basado en feature/evalia-captura-docenas-colores.

## Cobros y vencimientos (M07 y M10)

- Cada depósito o aviso de pago se registra inicialmente como **PENDIENTE**. No suma dinero, no reduce saldo, no protege reservas hasta su aprobación.
- Solo el administrador puede aprobar dinero efectivamente constatado, o clasificar el aviso como EN OBSERVACIÓN o RECHAZADO. La revisión tiene actor, fecha, texto y protección idempotente frente a reintentos.
- Una reserva que recibe un depósito aprobado antes de F conserva su cupo hasta L=F+7 días naturales, a las 12:00 en America/La_Paz. Al superar L pasa a EN REVISIÓN; el cupo sigue bloqueado y requiere contacto manual por WhatsApp.
- Una reserva sin abono oportuno aprobado vence y libera su cantidad global una sola vez. El stock físico no aumenta. Una reserva ya convertida en pedido nunca vuelve a liberar cupo.
- El cron de Supabase, **evalia-vencimientos-f-l**, se programa cada minuto. Se compara con marcas absolutas de tiempo, sin depender de la zona horaria del servidor.
- Depósitos de reserva se computan en el pedido por referencia a su reserva de origen, sin duplicación. El saldo se deriva solo de montos APROBADOS. El exceso de cobro se señala y no se transforma en descuento ni se liquida automáticamente.

## Entregas y cierre (M08 y M13)

- Registrar retirada física por línea genera evento de entrega auditado; reduce el stock físico y las prendas pendientes exactamente una vez.
- En el flujo ordinario, el retiro solo se registra cuando los pagos aprobados liquidan exactamente el total histórico.
- Solo el administrador marca COMPLETADO después de constatar que las prendas han sido retiradas íntegramente y el saldo aprobado es Bs 0. El cierre no inventa pagos ni entregas.
- Sin módulos de cancelación, devoluciones, reembolso, crédito ni entrega excepcional con deuda, cuyas reglas comerciales no se encuentran completamente definidas.

## Enlace privado y comprobantes (M11 y M12)

- Admin emite, sustituye o revoca el enlace secreto de un solo pedido activo. El token es aleatorio (256 bits) y la BD guarda únicamente su SHA-256. La URL en claro solo se muestra temporalmente para copiar y enviar por WhatsApp manual.
- El backend Next.js canjea el token por una cookie de sesión segura y comprueba el pedido activo, hash y revocación en **cada consulta, carga y descarga**.
- Cliente puede consultar solo su pedido, líneas, precios, saldo, pagos confirmados y avisos; informar importe y subir captura. No puede editar pedido, aprobar dinero, controlar inventario o ver otros pedidos.
- Comprobantes privados: JPG/PNG/WebP reales, máximo técnico de 2 MiB, verificación de firma binaria, límite técnico de 5 avisos por pedido por hora, comprobación de origen, idempotencia y ruta fijada por el servidor. El aviso queda PENDIENTE.
- QR: el administrador carga una imagen bancaria auténtica y constata expresamente que sigue vigente y puede reutilizarse. Hasta entonces, el portal indica ausencia de QR. No se generan cuentas ni códigos bancarios imaginarios. La descarga funciona por proxy que comprueba el token a cada petición.
- Al completar o revocar el pedido, el antiguo enlace deja de funcionar, incluido QR y carga de pruebas. Los comprobantes existentes se conservan para la administración.

## Migraciones y trazabilidad

| Versión GitHub | Finalidad | Estado remoto |
|---|---|---|
| 20261123000100–20261123000500 | Modelo, stock, catálogo, pedidos y colores | Instaladas previamente |
| 20261123000600 | Declaraciones, aprobaciones, F/L, depósitos y protección | Instalada |
| 20261123000700 | Retirada física y cierre contable seguro | Instalada |
| 20261123000800 | Acceso privado, QR y captura de comprobantes | Instalada |
| 20261123000900 | Supabase pg_cron, comprobación F/L cada minuto | Instalada |

Las nueve versiones remotas se normalizaron transaccionalmente para coincidir con sus archivos. No volver a ejecutar estas migraciones sobre el mismo proyecto. Los cambios de código NO están fusionados con el baseline main.

## Prueba privada local

1. En Supabase Authentication → Users crear una cuenta propia, sin enviar su contraseña a ChatGPT. Registrar su UUID real en public.admin_profiles como explica docs/40_INTEGRACION_SUPABASE_REAL.md.
2. En web/.env.local definir tres valores: NEXT_PUBLIC_SUPABASE_URL (URL real de evalia), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (clave pública) y SUPABASE_SECRET_KEY (**clave del servidor, jamás pública ni en Git**).
3. Ejecutar desde web/ los comandos npm install y npm run dev. Entrar en http://localhost:3000.
4. Registrar colores, modelo, precio, stock y cliente ficticio en entorno de pruebas. Verificar captura 0 docenas + 6 colores y 1 docena + 1 color.
5. Probar avisos de pago PENDIENTE, aprobación administrativa, depósito aplicado una vez al confirmar, saldo exacto, recogida real y cierre.
6. Emitir enlace privado de un pedido activo: al abrirlo debe mostrar **solo ese pedido**. Subir captura, revisar que no cambia el saldo hasta aprobación, probar revocación y sustitución.
7. Cargar QR real solo después de comprobar su vigencia. Verificar vista y descarga con token activo y denegación tras revocación/cierre.
8. Probar rechazo de archivo falso, tipo SVG, más de 2 MiB, intentos duplicados, petición desde origen externo, token caducado/revocado, acceso cruzado, exceso de pagos y cierre sin entrega.

**Advertencia:** los valores anteriores son de un Supabase remoto real. Para pruebas con dinero/aprobación ficticia usar una base local aislada; las migraciones pgTAP crean datos sintéticos dentro de una transacción que revierte cambios. No registrar pagos ficticios como recibidos en una base comercial.

## Validación y pendientes

- En CI se aplicaron las migraciones SQL contra PostgreSQL local, verificando RLS, pagos, expiración F/L, entregas y enlaces.
- El usuario debe hacer la prueba de navegador y móvil. No existe todavía un hosting HTTPS ni una cuenta administradora Auth registrada al iniciar este bloque.
- Antes de publicar se requiere revisar restauración de backups, rate-limit de capa web, fallos de red, caducidad bancaria real del QR, permisos y métricas del cron, documentos privados y experiencia de cliente.
- No se debe fusionar el PR ni declarar listo para clientes sin aprobación explícita. No se introducen políticas inventadas para devoluciones, descuentos, cobros tardíos o entrega con deuda.

Fuentes comerciales: docs/20_VENCIMIENTO_FERIAS_Y_DEPOSITOS.md, docs/22_DEPOSITOS_ABONOS_Y_SALDOS.md, docs/23_VALIDACION_ADMINISTRATIVA_PAGOS.md, docs/24_PORTAL_CLIENTE_ENLACE_PRIVADO.md, docs/25_QR_Y_COMPROBANTES_CLIENTE.md, docs/26_CIERRE_PEDIDO_PAGO_Y_RETIRO.md, docs/27_SIMPLIFICACION_CANCELACIONES_V1.md.
