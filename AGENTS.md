# Reglas de desarrollo · EVALIA

Estas instrucciones son compatibles con ChatGPT, Claude Code y otros agentes. Leer `docs/` antes de proponer o implementar funcionalidades.

## Fuente de verdad
1. Contenido de marca confirmado y documentación aprobada.
2. Decisiones aprobadas en `docs/04_REGISTRO_DE_DECISIONES.md`.
3. Código, migraciones y tests validados.
4. Preguntar ante contradicciones: **no inventar** precios, reservas, tallas, tiempos, políticas o permisos de negocio.

## Ramas y cambios
- `main` publicable; `dev/evalia-core` baseline validado; `feature/*` pendiente de aprobación.
- Revisar HEAD, ramas, diff y CI antes de trabajar.
- No force-push, no reescribir historia, no merge ciego; preferir fast-forward si es posible.
- No alterar funcionalidades aprobadas sin necesidad demostrable y regresiones.
- Bloques medianos con pruebas y criterio de aceptación.

## Seguridad obligatoria
- Datos operativos y credenciales **nunca** en repositorio público.
- Los roles deben protegerse en base de datos/API, no solo ocultando botones.
- En Supabase habilitar RLS y probar con usuarios diferentes; usar publishable key pública, jamás secret/service-role en navegador.
- Operaciones de inventario y reservas atómicas; proteger concurrencia, idempotencia y auditoría.
- No declarar un sistema listo para producción sin backups, revisión de seguridad, pruebas móviles y restauración validada.

## Modo de trabajo
- Diferenciar `HECHO`, `PROPUESTA` y `POR DECIDIR`.
- Diagnosticar el primer error real, no silenciar fallas.
- Documentar migraciones y ejecutar tests automatizados.
- No iniciar implementación de políticas comerciales sin aprobación del propietario.
