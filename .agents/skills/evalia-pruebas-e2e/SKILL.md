---
name: evalia-pruebas-e2e
description: Añadir y ejecutar regresiones automatizadas y pruebas manuales reproducibles de formularios, catálogo, reservas, pedidos, seguridad y responsive.
---
# QA y pruebas de interacción

Leer AGENTS.md, package.json, tests/, site/domain.js, site/app.js, docs/36_DEMO_GITHUB_PAGES.md y supabase/tests/database/.

- Base actual: ejecutar **npm run check** (Node tests + sintaxis). Añadir tests ante cambios de dinero, cupos, estados, vencimientos, pagos y entrega.
- Servir demo local: **python -m http.server 8765 --directory site**. Verificar flujos con navegador; usar Playwright cuando esté realmente disponible, sin afirmar que está instalado. Buscar controles por rol/etiqueta y no por índices frágiles.
- Casos críticos: 5 unidades inválidas, 6 válidas, varios modelos, .50, n>12, S/R/P, stock insuficiente, reserva→pedido, depósito antes/después de F, revisión F+7, cierre con pago+entrega, doble envío y recarga.
- Probar navegadores/viewport 360, 768, 1280, teclado/foco, errores en el formulario y consola. Reiniciar datos de prueba entre escenarios.
- SQL real exige ejecutar migraciones y pgTAP en Supabase local; pasar tests JS **no equivale** a validar RLS/concurrencia real.
- Reportar cada comando ejecutado, conteos reales y bloqueos. Atender el primer error, sin suprimir aserciones ni ampliar watchdogs para ocultarlo.
