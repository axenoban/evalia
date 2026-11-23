# Entregas incrementales y criterios de aceptación · propuesta

Estado: **NO APROBADO**; los alcances se replanificarán tras el cuestionario.

| Bloque | Objetivo | Prueba de aceptación |
| --- | --- | --- |
| E0 | Aprobación de requisitos, marca, modelo de datos, permisos y criterios de negocio | Decisiones D01–D18 cerradas; diagrama, prototipo y test plan revisados |
| E1 | Infraestructura, entorno demo, Auth admin, roles/RLS, catálogo y variantes | Acceso no autorizado denegado, CRUD validado y responsive móvil |
| E2 | Inventario por variante y movimientos con trazabilidad | Aumentos/disminuciones consistentes, sin stock negativo involuntario |
| E3 | Reservas, solicitudes y pedidos admin | Dos sesiones concurrentes no reservan la misma unidad; caducidad y reversión comprobadas |
| E4 | Gestión de entregas, pagos externos, reportes y auditoría | Historial consistente, cancelación y cambios no pierden trazabilidad |
| E5 | Experiencia para personal con permisos restringidos | Tests de acceso cruzado y operaciones permitidas/denegadas |
| E6 | Catálogo público y autogestión parcial de clientes | Datos privados aislados, pedidos solo de su propietario |
| E7 | Hardening, copias/restauración, observabilidad y puesta en producción | Prueba de restauración, UAT, logs sin secretos, revisión de seguridad |

## QA mínimo
- Tests unitarios del dominio comercial; pruebas de integración con BD real de pruebas.
- Tests de RLS con administrador, personal, cliente y anónimo.
- Prueba de concurrencia para reserva/compra simultánea.
- Validación de importes y snapshots de precios.
- Responsive móvil/desktop, accesibilidad y rutas.
- Auditoría de operaciones críticas y recuperación ante errores.
- Copias de seguridad y restauración ensayada antes de datos reales.

## Advertencias
GitHub es para código, no base de datos de producción. No integrar fases de negocio sin contrato aprobado. Los servicios gratuitos de base de datos pueden pausarse por inactividad o resultar insuficientes para producción.
