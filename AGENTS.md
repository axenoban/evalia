# Reglas de desarrollo — EVALIA

Obligatorias para Codex, Claude Code u otros agentes.

## Fuente de verdad
1. Identidad de marca documentada y requisitos aprobados formalmente.
2. D01–D18 en docs/04_REGISTRO_DE_DECISIONES.md: **selecciones registradas, NO ratificadas como especificación definitiva**.
3. Modelo conceptual y preguntas G01–G09, diferenciando hechos de propuestas.
4. Código probado y migraciones versionadas cuando existan.

**No inventar:** precios, plazos, descuentos, mezclas de colores, tallas válidas, estados de pedidos, anticipos, condiciones de envío, permisos de personal o reglas de cancelación.

## Git
Verificar rama, HEAD, historia, archivos y CI. main = publicable, dev/evalia-core = último baseline validado cuando exista, feature/* = pendiente de prueba. No force push, reescritura o merge ciego. Mantener PR #1 como borrador hasta aprobación. Cambios medianos, con QA.

## Entorno
VS Code + Codex, sustituible por Claude Code sin alterar stack ni requisitos. Next.js + Supabase son tecnologías indicadas; D16 deja la arquitectura y el hosting pendientes hasta después del modelo de datos.

## Seguridad
La autorización debe verificarse en BD/API; esconder botones no protege. Supabase: RLS y tests de acceso cruzado. Solo claves publicables en navegador conforme a RLS; nunca exponer secret key ni datos sensibles. Reservas, inventario y confirmaciones deben ser atómicos, auditables e idempotentes. No desplegar datos de negocio reales sin políticas, backups y restauración probada.

No construir SQL definitivo ni imponer defaults comerciales donde existan preguntas abiertas. Distinguir siempre HECHO / REGISTRADO / PROPUESTA / PENDIENTE / APROBADO.

## Segunda ronda comercial — bloqueo documental
Antes de generar modelos/migraciones, leer [G03/G04 registrados](docs/09_G03_G04_SELECCIONES.md). **Reservas solo mayoristas con mínimo de 6 unidades por modelo**; presentaciones exactas pendientes, precio variable según modelo/variante y tarifa configurada. Nunca deducir Bs 380/12 × 7. La elección de descontar inventario físico al confirmar **no** autoriza asumir que la mercancía salió de la tienda ni modificar la elección para ocultar la tensión con entregas parciales. Tampoco resolver por cuenta propia una talla por presentación frente al mínimo de seis que puede contar M/XL; pedir decisión al propietario. Mantener PR en borrador.
