# EVALIA — D1-P: prototipo interactivo de GitHub Pages

**Fecha:** 2026-11-23. **Estado:** demo/prototipo, no versión comercial ni sistema con autenticación. Contratos aprobados en docs/33–35.

## Funciones incluidas en esta rama

- Interfaz responsive administrativa con colores de marca (ciruela #4D3443, marfil #F5F0EA, rosa empolvado #CFAEB6).
- Catálogo: alta de modelos con talla única, precio de docena propio, colores descriptivos y fotografía opcional local; alta de colores reutilizables.
- Inventario conservador agregado por modelo: añadir unidades, ajustar venta presencial, establecer total, prevenir consumo de compromisos; versión e historial de movimientos; declaración de incidencias y bloqueo del modelo.
- Clientes ficticios de prueba; creación de reservas multímodelo y pedidos directos con mínimo de 6 prendas por modelo.
- Conversión reserva→pedido sin doble descuento; precio congelado, fórmula exacta por modelo y excepción de fracción .50.
- Vencimiento según feria G01 en America/La_Paz (domingo/lunes→miércoles; martes/miércoles/jueves→sábado; viernes/sábado→miércoles siguiente, todos a las 12:00).
- Depósitos/abonos *simulados*: aviso no equivale a pago, requiere aprobación manual. Depósito aprobado antes de F protege hasta F+7 días; entrada en revisión genera una tarea manual única, sin liberar stock.
- Entregas reales **simuladas** por modelo después de saldo aprobado cero; cierre solo con entrega total y saldo cero.
- Simulador de reloj, restauración de datos ficticios, guardado local en navegador.
- 33 pruebas unitarias con `node --test`: precios, inventario, concurrencia lógica secuencial, protección de reservas, depósitos, expiración e idempotencia. No sustituyen pruebas SQL sobre PostgreSQL ni seguridad real de usuarios.

## Limitaciones importantes

**GitHub Pages es hosting estático**: no aloja PostgreSQL, Supabase, funciones de backend ni secretos. La demo usa `localStorage`, no tiene seguridad multiusuario, bloqueo transaccional entre dispositivos, autenticación, cuentas de clientes reales, QR válido ni acceso privado. Cada navegador tiene su propia copia independiente; borrar datos del sitio elimina el contenido local. **NO utilizar para gestionar clientes, reservas, inventario o pagos reales.** Las credenciales de Supabase nunca deben incrustarse en el código estático.

Todos los modelos, nombres y precios iniciales son exclusivamente **ficticios de demostración**; no establecen tarifas comerciales ni reglas nuevas. La aplicación no envía WhatsApp ni dinero.

## Ejecución local

No requiere dependencias de Node para la interfaz estática; basta servir `site/` desde un servidor HTTP:

    python -m http.server 8765 --directory site

Abrir `http://localhost:8765/` en un navegador moderno. Para pruebas automatizadas:

    npm run check

## Publicación GitHub Pages

La rama `feature/fundamentos-reservas-pedidos` incluye `.github/workflows/evalia-demo-pages.yml`. Al actualizar la demo se ejecuta `npm run check` y, si pasa, el job Pages publica **solo** `site/`.

**Configuración necesaria del repositorio (una sola vez por el propietario/admin GitHub):** Settings → Pages → Build and deployment → Source: **GitHub Actions**. Después abrir Actions → `EVALIA demo · GitHub Pages` y comprobar que `verify` y `deploy` terminan correctamente. El destino esperado, sujeto a la configuración de GitHub Pages, es `https://axenoban.github.io/evalia/`. **No afirmar que esa URL está activa sin verificación**.

El workflow se activa por cambios del prototipo en la rama feature, sin integrar el PR en `main`. La demo es independiente del baseline de producción. `main` permanece intacta y PR #1 continúa borrador.

## Pruebas manuales recomendadas

1. Catálogo → abrir un modelo de muestra y reducir seis prendas disponibles (ver que se respeta stock reservado).
2. Nueva reserva → elegir cliente ficticio y registrar 12 unidades de un modelo; verificar que S no baja y A sí.
3. Reservas → confirmar pedido; comprobar que R baja y P sube, sin modificar A.
4. Pedidos → registrar aviso por el total exacto; antes de aprobar, la entrega debe rechazarse. Aprobar (simulado), registrar entrega y completar.
5. Simulación → avanzar reloj siete días; una reserva sin depósito debe vencer y liberar únicamente su compromiso.
6. Crear otra reserva y aprobar su depósito antes del vencimiento; avanzar hasta L=F+7 y comprobar «En revisión» y cupo retenido.
7. Crear modelo con 13 colores descriptivos; verificar que solo se administra inventario total, no stock por color.
8. Repetir en móvil y recargar la página para verificar persistencia local.
