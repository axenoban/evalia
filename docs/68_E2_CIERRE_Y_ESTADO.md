# E2 — Cierre del bloque y estado para continuar
**Fecha:** 28-11-2026 (Bolivia). **Decisión del propietario:** E2 aprobado tras prueba física de los candidatos R1/R2 (49f1fff) y de los paquetes A, B y C. Cierre con **B3 mínimo** y alcance documentado (opción elegida por el propietario). **No autoriza publicación en producción.**

## 1. Referencias verificadas
| Elemento | Estado |
|---|---|
| Código aprobado | `1f61d79` (paquete C) sobre `b93e90b` (B) y `d4da07a` (A), base `49f1fff` |
| CI integral | 49f1fff: 46005049883/46005049768 · A: 46087728467/46087728469 · B: 46090596334/46090596365 · C: 46092611211/46092611134 — todas verdes (Node, Next, pgTAP, Auth SDK, recuperación sintética) |
| Supabase evalia-qa | 26 migraciones; incluye `20261127121000_product_catalog_improvements` y `20261127153000_booking_expected_prices`. RPC nuevas con anon denegado y authenticated autorizado |
| Supabase comercial | 20 migraciones (V1). **No** tiene las migraciones de E1 ni E2 |
| Producción Vercel | `main` = `dffbb41`, sin cambios |
| Canal QA | `feature/evalia-e1-estabilidad` = `b93e90b` (A+B); C probado en la Preview de la rama E2 |
| Integración | `dev/evalia-core` por fast-forward hasta el commit que contiene este documento |

## 2. Entregado en E2
- **Lectura y rendimiento:** ensamblado indexado; paginación de pedidos en servidor con conteo exacto, orden estable e hidratación solo de la página; lectura paginada sin topes silenciosos; stock y fotos por lotes de 100; lectura liviana cada minuto y completa cada 5 min / tras escrituras / al volver (B3 mínimo). Conteo por código: 151 → 46 solicitudes por minuto con 10.000 pedidos y 5.000 clientes (−70 %).
- **Productos (docs/67):** ficha integral, sugerencias de talla/precio, paleta, duplicación, historial auditado, archivo/reactivación, snapshots de nombre/talla/color.
- **Pedidos:** captura revisada R1/R2, guardia de precio esperado en la transacción, borrador de sesión, identificación exacta del pedido creado, búsqueda de clientes normalizada, búsqueda de pedidos por cliente en servidor, barra de siguiente paso, confirmaciones integradas.
- **Usabilidad (paquetes A/B/C, docs/66):** textos y avisos, distribución responsive, menú móvil de 5 accesos, filtros plegables, refresco que no cierra confirmaciones ni bloquea Pedidos.
- **Entornos:** el Preview general de Vercel apuntaba a la base comercial; ahora apunta a evalia-qa con clave de servidor marcador. Producción conserva sus variables.

## 3. Fuera del cierre (pendientes explícitos)
- **B2:** agregados SQL de saldo/entrega/stock (la página de pedidos aún usa 2 RPC por pedido, con concurrencia acotada).
- **B5:** benchmark de latencia real con 10.000/5.000 en entorno aislado; las metas de 70 % y <3 s **no** se declaran medidas en tiempo.
- Búsqueda/paginación de clientes y pagos en servidor (hoy locales sobre la lectura completa).
- Riesgo aceptado: entre lecturas completas (≤5 min) un cliente nuevo de otro operador o un aviso resuelto en otra sesión puede tardar en aparecer; el servidor valida cada operación.

## 4. Antes de publicar en producción (requiere autorización específica)
1. Plan de migración comercial: aplicar en orden las migraciones de E1 y E2 que faltan (20 → 26), compatibles hacia atrás, con respaldo previo y verificación de funciones, permisos y conteos. Rollback de app ≠ rollback de SQL.
2. Puertas pendientes de docs/64: recuperación de MFA, flujo de correo/invitación/recuperación, seguridad residual (advisors: RLS sin política, protección de contraseñas filtradas desactivada), portal e impresión con clave de servidor real.
3. Clave de servidor de QA en el canal QA para probar el portal completo.
4. Configurar Vercel para construir solo `main` y el canal QA (evita gastar builds en ramas de trabajo).
5. Fast-forward de `main` solo tras autorización expresa; verificar READY y smoke del dominio de producción.

## 5. Siguiente bloque
E3 (inteligencia comercial) y E4 (PWA/offline) **no se inician** sin confirmar alcance con el propietario. Opciones: publicación V1.1 (E1+E2) siguiendo el punto 4, o definición de alcance de E3.
