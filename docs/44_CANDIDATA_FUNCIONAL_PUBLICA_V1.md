# EVALIA — Candidata funcional pública de V1

**Fecha:** 23-11-2026. **Rama:** `feature/evalia-release-candidate`. **Destino tras validación:** `dev/evalia-core`; luego `main` como versión publicable. El trabajo se prueba sin merge previo.

## 1. Acceso desde navegador

- En Vercel, el proyecto `evalia` ya no solicita iniciar sesión en Vercel: se desactivó su protección de despliegue para permitir el enlace privado de los clientes.
- La página de inicio de administración **sigue siendo pública como formulario**, pero **ningún dato** de EVALIA se carga sin sesión Supabase Auth + permiso `admin_profiles`. No implementar registro público.
- El cliente **no tiene login**: el administrador emite un enlace de un solo pedido activo, aleatorio de 256 bits y revocable. La BD almacena el digest SHA-256, nunca el secreto.
- Tras abrir un enlace desde WhatsApp, el backend verifica token y pedido y crea cookie `httpOnly; Secure` (en HTTPS) y `SameSite=Lax`. Lax es importante: Strict podía bloquear la cookie en la redirección desde otra aplicación. Las escrituras POST exigen Origin mismo sitio. Al cerrar o revocar se invalidan las consultas posteriores.
- Enlace de prueba estable de rama, **verificar estado de Vercel**: `https://evalia-git-feature-evalia-release-candidate-galaxian131-9858.vercel.app`.
- La Preview es pública sin autenticación de Vercel; **no** se ha promovido a producción `main` ni integrado a `dev/evalia-core`.
- Se añadieron cabeceras `X-Robots-Tag: noindex, nofollow, noarchive` para evitar indexación de rutas de capacidad.
- El workflow `evalia-public-smoke.yml` usa un `curl` anónimo externo (sin tokens/cookies) y verifica HTTP 200 del sitio y del backend y HTTP 404 de enlace/QR no autorizados.

## 2. Funcionalidad V1 lista para aceptación

**Administración:** login Supabase; paleta; alta de modelos con precio por docena, talla única, foto privada y colores disponibles; inventario conservador, ajuste manual y protección de cupos; clientes; carrito multímodelo con docenas surtidas y colores adicionales únicos; guardar/editar reservas, confirmar pedidos y conservar precios históricos.

**Vencimientos:** cron cada minuto, feria miércoles/sábado a mediodía según matriz aprobada; sin depósito aprobado en F libera cupo; con depósito oportuno pasa a revisión en L=F+7 sin liberar cupo.

**Cobros y entregas:** declaraciones pendientes hasta aprobación real; abonos múltiples sin doble cómputo; saldo de pedido, entregas por línea y cierre explícito solo con pago total aprobado + recogida completa; historial de acciones.

**Portal:** enlace de pedido sin cuenta, consulta solo ese pedido, QR real reutilizable proporcionado por EVALIA, importe y captura privada JPG/PNG/WEBP hasta 2 MiB. Comprobante pendiente, revisión administrativa y estado al cliente; revocación o COMPLETADO corta acceso. No se genera QR bancario ni se integra pasarela.

**Correcciones de datos:** RPC auditadas con idempotencia y bloqueo optimista; permiten corregir precio/fotografía del modelo para operaciones futuras y nombre/WhatsApp de ficha cliente. El precio del pedido confirmado sigue congelado. No se modifican los colores ya comprometidos ni la talla, ni se fusionan fichas automáticamente.

**Última validación automatizada:** GitHub Actions completó correctamente **83/83 pruebas Node**, **194/194 pruebas pgTAP** en PostgreSQL local y compilación Next.js 16. El workflow público independiente verificó HTTP 200 de web/backend sin credenciales Vercel y HTTP 404 de token/QR inválidos. Supabase remoto guarda las migraciones 001–011 con versiones iguales a los archivos; el esquema no contiene datos QA sintéticos.

## 3. Pruebas para pasar a baseline

### Automatizadas
- `npm run check`: precios, cantidades, enlace y cookies de redirección.
- `cd web && npm run build`: Next.js completo.
- `supabase start && supabase test db`: PostgreSQL local con transacciones pgTAP y rollback. Pruebas de token A/B, aviso de pago con comprobante, pendiente no abonado, aprobación admin, reintento idempotente, revocación, precios congelados y ediciones.
- `evalia-public-smoke.yml`: acceso **sin Vercel** desde un runner remoto independiente y denegación de QR/token no autorizado.

### Prueba manual en navegador y móvil
1. Abrir la URL candidata desde una ventana privada **sin sesión de Vercel**: aparece el login de EVALIA, nunca el de Vercel.
2. Iniciar sesión como administrador Supabase; comprobar modelo, precio, foto, colores, stock conservador y clientes.
3. Crear un pedido de ensayo de un modelo (6–11 prendas por colores distintos) y después un pedido multímodelo con 1 docena + unidades extra. **Para ensayos de cobros ficticios utilizar Supabase local/aislado, no la base comercial real**.
4. Actualizar el precio de un modelo y comprobar que **no cambia** el precio histórico del pedido existente. Corregir WhatsApp de una ficha, sin fusionarla.
5. Emitir enlace para pedido activo y copiarlo; abrirlo en móvil/otro navegador sin Vercel, desde WhatsApp si es posible. Verificar que solo aparece ese pedido y saldo.
6. Subir comprobante JPG/PNG/WEBP con pago declarado; debe figurar PENDIENTE sin reducir saldo. En administrador comprobar imagen privada y aprobar **solo si el dinero realmente ingresó**; el estado cambia y el saldo se actualiza.
7. Ver QR auténtico cargado por administrador (si está verificado como reutilizable), descargarlo y comprobar que sea la misma imagen.
8. Revocar enlace: debe fallar vista y descarga del QR. Generar enlace nuevo; el anterior sigue inválido.
9. Registrar pagos realmente recibidos hasta saldo cero, retirada física y COMPLETADO. El enlace debe quedar inactivo; no permitir duplicar retirada ni aprobación.
10. Probar una reserva en la próxima feria, vencimiento F/L y revisión usando fixtures locales, **sin mover fechas de operaciones comerciales reales**.
11. En móvil, revisar que botones y campos se ven, se pueden pulsar, no superponen campos y no producen scroll horizontal de la aplicación.

## 4. Fuera de alcance deliberadamente

No hay política aprobada para devoluciones, cancelaciones del cliente, pérdidas de depósito, reembolsos, créditos, descuentos o entregas excepcionales con deuda. Tampoco se garantiza la existencia de cada color individual porque el inventario se lleva por total global de modelo y las docenas son surtidas. Los precios minoristas, envíos tarifados y generación automática de QR bancario no se han definido.

**No declarar versión final publicada hasta prueba integral del propietario y aprobación.** Esta es una candidata funcional para comprobar el ciclo completo; después los cambios visuales deben constituir una rama separada.
