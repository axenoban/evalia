# EVALIA — Panel administrativo operativo conectado a Supabase (candidato)

Fecha: 2026-11-23. Rama: `feature/evalia-panel-operativo`. Estado: **implementado en código, sin despliegue ni verificación contra una base real**.

## Resultado implementado

Se añade `web/`, aplicación Next.js (App Router, React) independiente de la demo `site/`. No usa `localStorage` para persistir productos o pedidos. Accede a Supabase mediante la **clave pública** y la sesión de Auth. La autorización efectiva reside en RLS y funciones SQL `security definer` que exigen `admin_profiles`.

1. Acceso administrativo con correo y contraseña; nadie se registra por sí mismo como administrador.
2. Catálogo con foto opcional almacenada en bucket privado, colores con hex editable y selección visual de muestras del modelo; una talla y precio de docena por modelo.
3. Alta atómica de modelo + colores informativos + docenas enteras publicables. Ajustes manuales por unidades usando RPC de inventario, sin consumir compromisos.
4. Clientes con nombre y WhatsApp; listado identificable y buscable, sin fusión automática por número.
5. Formulario de reserva/pedido multímodelo, con cantidad editable, atajos 6/12/18/24, desglose `docena + media docena + prendas`, subtotales exactos por modelo y total antes de guardar.
6. Reservas y pedidos directos con RPC transaccional, locks ordenados e idempotencia por solicitud; reserva→pedido sin doble compromiso.
7. Consulta de reservas, pedidos y resumen S/R/P/A desde la base. Los pedidos muestran precio congelado por modelo.

### Contrato comercial de colores: atención

La decisión D0-C2/D0-F **solo autoriza escoger colores ofertados en el catálogo y exhibirlos**. No hay stock por color, por lo que la aplicación **NO asigna combinaciones de colores a reservas ni pedidos**. La solicitud de seleccionar cantidades por color al comprar cambia una regla previa; necesita decisión expresa sobre garantía de color y control de inventario antes de implementarse. Las muestras visuales por color del modelo **sí** funcionan.

### Alcance pendiente para un sistema completo

- No se ha ejecutado PostgreSQL ni pgTAP en una instancia real en esta sesión. Las migraciones 001–004 necesitan ejecutarse y pasar pruebas.
- No se ha configurado proyecto Supabase, usuario administrador, variables de entorno, SMTP ni hosting. **No usar datos comerciales reales hasta las validaciones de seguridad/backup**.
- La aprobación de depósitos, el cierre por pago+retiro, evidencias privadas, portal de cliente, vencimientos programados y resolución de incidencias aún requieren integración de sus RPC, UI y QA. La pantalla de pedidos es de **registro y consulta**, no de cobro/entrega.
- En particular, la reserva guardada cuyo vencimiento ya pasó no se convierte desde la interfaz, pero la liberación automática sigue pendiente del módulo de depósitos/vencimientos; el cupo sigue reservado conservadoramente.
- No se promete que GitHub Pages pueda ejecutar Next.js con Supabase y Auth; la demo anterior sigue separada. No se modifica `main` ni los PR #1/#2.

## Pasos técnicos para probar en entorno seguro

1. Configurar Supabase CLI y PostgreSQL local. Ejecutar migraciones versionadas y `supabase test db`. Registrar primer error real; el test pgTAP nuevo prueba estructura/precios/privilegios, todavía faltan escenarios de concurrencia reales.
2. Crear usuario administrador de prueba en Supabase Auth y, mediante consola SQL segura y controlada, registrar su UUID en `public.admin_profiles`. Nunca poner UUID, contraseñas ni claves privadas en GitHub.
3. Copiar `web/.env.example` a `web/.env.local` y añadir únicamente URL y **clave publicable/anon** del proyecto de prueba. No usar `service_role` en el navegador.
4. `cd web && npm install && npm run dev`; abrir `http://localhost:3000`. El entorno real requerirá Node >=20.9.
5. Probar: crear color con selector cromático, registrar modelo con foto, 6 docenas publicadas, crear cliente, reservar 6/7/12/19 unidades, verificar resumen y A=S-R-P, convertir reserva, registrar pedido directo y ajustar stock por venta física sin poder consumir cupos.
6. En otra terminal desde raíz: `npm run check`. CI compila también la aplicación en GitHub Actions.

## Seguridad

Bucket privado `evalia-models`: JPG/PNG/WebP hasta 5 MB, firma temporal de 1 h, lectura/escritura admin. RLS no permite acceso anónimo a tablas. Los colores guardados en `colors.hex_code` son referencias elegidas por el administrador, **no equivalencias físicas garantizadas**. No colocar fotografías de clientes ni comprobantes en un repositorio público.

## Desarrollo siguiente sugerido

Primero asegurar que migraciones SQL y formularios sean reproducibles en un proyecto Supabase de pruebas. Después realizar QA de navegador en móvil/escritorio, implementar aprobación de depósitos y vencimientos protegidos, y completar la entrega/cierre. La decisión del detalle por color condiciona la arquitectura de esa parte y **no debe suponerse aprobada**.
