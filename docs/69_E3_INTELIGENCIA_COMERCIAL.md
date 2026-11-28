# E3 — Inteligencia comercial (contrato e incremento 1)
**Fecha:** 28-11-2026. **Base:** `dev/evalia-core` = `main` = `9d7be4d` (V1.1 publicada). **Rama:** `feature/evalia-e3-inteligencia`. Autorización del propietario para trabajar etapas pendientes en el entorno de prueba. No autoriza publicación.

## Definiciones vinculantes (docs/59, D05–D07)
- **Acceso:** estadísticas y exportación solo para el propietario con MFA; verificado en el servidor con `is_evalia_owner()` en cada función. Operadores y anónimos reciben 42501.
- **Pedidos:** se cuentan por **fecha de confirmación**; estados `active` y `completed` (incluidos archivados completados). Los **anulados** no cuentan. Montos = suma de subtotales congelados por línea, sin redondeo nuevo.
- **Cobros:** solo pagos **aprobados**, por **fecha de aprobación**. Avisos pendientes, observados o rechazados nunca suman.
- **Saldo por cobrar:** foto actual (no depende del periodo) de pedidos activos no archivados; misma fórmula que `get_evalia_order_finance` (incluye abonos de registros anteriores).
- **Periodos (D06):** hoy, últimos 7 días, mes, año y rango personalizado (máx. 5 años), en días de America/La_Paz, convertidos a límites UTC semiabiertos. Serie diaria hasta 62 días; mensual en periodos mayores.
- **No incluye** ventas físicas fuera de pedidos ni ganancias/costos; la interfaz lo declara.

## Incremento 1 (esta rama)
| ID | Entregado |
|---|---|
| E3-01 | Panel «Estadísticas» del propietario: pedidos, monto, prendas, compradores, cobros aprobados, saldo actual, clientes nuevos |
| E3-02 | Serie de ventas confirmadas y cobros por día/mes con tabla accesible |
| E3-03 | Diez modelos más pedidos (nombre/talla históricos) por prendas y monto |
| E3-04 | Distribución por talla |
| E3-08 | Exportación CSV para Excel (BOM UTF-8, `;`, coma decimal, hora de Bolivia, protección contra inyección de fórmulas; máx. 20.000 líneas) |
Migración `20261128100000_e3_owner_stats.sql`: dos funciones de solo lectura (`get_evalia_owner_stats`, `export_evalia_orders`), sin tablas ni escrituras. pgTAP `096_e3_owner_stats.sql` (16 aserciones: permisos, exclusión de anulados, fecha de aprobación, saldo, ranking, serie, exportación). Ensayo en evalia-qa dentro de transacción revertida: resultados idénticos a lo esperado, sin datos persistidos.

## Pendiente de decisión del propietario (no implementado)
- **E3-07 cierre de feria con monto físico global opcional (D05):** definir qué es una feria (día/rango con nombre), quién la abre/cierra, si el monto es editable y cómo se muestra separado de los pedidos.
- **E3-05/06 ficha e historial del cliente y frecuencia de compra:** acordar métricas (última compra, compras por mes, ticket promedio) y si las ven los operadores.
- **E3-09 historial administrativo** y **E3-10 alertas:** definir eventos, destinatarios y umbrales (p. ej. stock bajo, pagos sin revisar >48 h).

## Registro de publicación V1.1 (28-11-2026)
Autorización expresa del propietario. Respaldo interno `evalia_respaldo_20261128` (31 tablas + índice de Storage) en la base comercial; 6 migraciones E1/E2 aplicadas (20 → 26); 0 diferencias en conteos de 31 tablas; huella de funciones idéntica a evalia-qa; `main` fast-forward `dffbb41 → 9d7be4d`; Vercel producción READY en evalia-nine.vercel.app; ingreso del propietario con MFA confirmado. Pendiente del propietario: protección de contraseñas filtradas y URL de recuperación en Supabase; decidir cuándo eliminar el respaldo interno.

## Registro de publicación V1.2 (28-11-2026)
Autorización expresa del propietario. Candidato `8378482` revisado: no había pasado por la CI completa (subido directo a `dev`); se ejecutó en PR #32 (6/6, incluido pgTAP) junto con `fflate` 0.8.2 → 0.8.3 (aviso moderado GHSA-px8p-9vwx-vf98) y lockfile con `integrity`. Ensayo completo en producción dentro de una transacción revertida; respaldo interno `evalia_respaldo_20261128_v12` (32 tablas + índice de Storage, 769 filas); 4 migraciones E3/R1/R2/límites-Excel aplicadas (26 → 30); huella de funciones idéntica a evalia-qa (`62d5e569…`); 56 funciones privilegiadas y 0 ejecutables por anon; 0 diferencias en conteos de 33 tablas; roles intactos. `main` fast-forward `9d7be4d → cd2fda3`; Vercel producción READY; `/catalogo` con datos comerciales, precios y solo Disponible/Agotado. Pendiente del propietario: ingreso con MFA, informe Excel y enlace de cliente real; protección de contraseñas filtradas, URL de recuperación y eliminación de los respaldos internos cuando lo decida.
