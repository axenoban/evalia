# EVALIA — V1.1: alcance aprobado E1–E4
Fecha de aprobación: 25-11-2026. Baseline verificado: dev/evalia-core y main en dffbb41e21906933078d5585c56b743d7c29d465. Rama inicial: feature/evalia-e1-estabilidad. No equivale a autorización de publicación.

## Decisiones vinculantes del propietario
| ID | Decisión |
|---|---|
| D01 | Mantener el costo adicional en cero inicialmente. |
| D02 | Respaldo diario, con conservación de 30 días. |
| D03 | MFA obligatorio para propietario y opcional para operadores. |
| D04 | Recordar dispositivo personal hasta 30 días y exigir reautenticación en operaciones sensibles. |
| D05 | Registrar un monto global opcional de ventas físicas por feria. |
| D06 | Periodos: feria, día, semana, mes, año y rango personalizado. |
| D07 | Estadísticas y exportaciones: solo propietario. |
| D08 | Clientes duplicados: advertir y permitir continuar bajo confirmación. |
| D09 | Borradores sin conexión durante 24 horas sin nombres ni teléfonos. |
| D10 | Validar e integrar cada bloque a dev; publicar en main con autorización específica. |

## E1 — Estabilidad y protección (autorizado para iniciar)
- E1-01 respaldos cifrados diarios, BD y archivos, almacenamiento externo privado, retención de 30 días; E1-02 ensayo de restauración aislada. Sin costos nuevos ni respaldos reales en repositorio público. Si la cuota gratuita no cubre el contrato, presentar alternativas al propietario sin rebajar retención ni contratar.
- E1-03 auditoría individual de las 31 RPC privilegiadas (autorización, grants, search_path, roles, pruebas adversariales locales).
- E1-04 MFA obligatorio para propietario y opcional para operador; enrolamiento, recuperación segura y política efectiva en servidor/BD, no solo interfaz. E1-05 sesión recordada como máximo 30 días en dispositivo personal y reautenticación sensible. Validar compatibilidad de plan, revocación, AAL y transición sin bloquear propietario; no activar configuración remota en esta rama.
- E1-06 idempotencia, reintentos seguros, aviso de coincidencias de WhatsApp normalizado sin prohibición absoluta; E1-07 distinguir confirmación de escritura de fallo de actualización y resultado incierto. No prometer éxito si servidor no confirmó.
- E1-08 auditoría dependencias, secretos y cabeceras; E1-09 lockfile y CI reproducible; E1-10 documentación vigente, protocolo de mantenimiento y trazabilidad de aceptación.
- Aceptación: restauración comprobada en entorno aislado, permisos y MFA, pruebas de duplicados/concurrencia/reintentos, regresión Node/Next/pgTAP y QA de navegador. Nada de datos ficticios en remoto. No aplicar migraciones de candidato a producción sin autorización específica.

## E2 — Optimización técnica
E2-01 paginación pedidos/archivo; 02 paginación y búsqueda clientes; 03 consultas agrupadas de inventario; 04 agrupación pagos/entregas; 05 carga por sección; 06 actualización selectiva; 07 índices según planes de ejecución; 08 optimizar fotografías; 09 modularizar frontend; 10 pruebas de rendimiento y concurrencia.
Metas propuestas (medir baseline y entorno): reducir solicitudes de dashboard ≥70 %, carga inicial <3 s en condiciones reproducibles, 10.000 pedidos/5.000 clientes sintéticos solo en entorno aislado, no sobreventa ni regresiones conocidas.

## E3 — Inteligencia comercial
E3-01 estadísticas; 02 pedidos/cobros/saldos; 03 modelos solicitados; 04 tallas; 05 ficha/historial cliente; 06 frecuencia de compra; 07 cierre feria con monto físico global opcional; 08 Excel/CSV; 09 historial administrativo; 10 alertas.
Solo propietario para estadísticas/exportaciones, verificar autorización en servidor. Distinguir pedidos por fecha de confirmación, cobros por fecha de aprobación, saldos y ventas físicas no incluidas en pedidos; evitar doble conteo. No afirmar facturación integral ni ganancias sin datos suficientes. Definir límites de feria, métricas y acceso de alertas/auditoría antes de implementarlas si afectan negocio. Zona America/La_Paz.

## E4 — Experiencia avanzada
E4-01 PWA; 02 estado real conexión; 03 borradores; 04 recuperación formularios; 05 reintentos; 06 accesos rápidos; 07 ergonomía táctil; 08 accesibilidad; 09 impresión multidispositivo; 10 QA PC/móvil.
Offline: solo estructura y borradores no confirmados, TTL máximo 24 h, sin nombres ni teléfonos; minimizar otros datos identificables, aislar cuenta y limpiar al salir. Nunca confirmar pedidos, stock, pagos ni entregas offline. No cachear portal privado, QR, comprobantes ni respuestas autenticadas indiscriminadamente.

## Contratos protegidos
Inventario global por modelo, docenas surtidas y colores adicionales distintos, mínimos vigentes, solo pedidos confirmados, precios históricos, pagos manuales, preparación independiente, entrega/cierre, portal revocable, identidad aprobada, seis formatos de impresión con privacidad estricta. No introducir cancelaciones, devoluciones, descuentos automáticos, contabilidad integral, stock por color ni multitenencia.

## Control de ramas y aceptación
Cada bloque se trabaja sobre último dev validado en feature/*, PR a dev, CI aislado y prueba de propietario; integrar solo tras aprobación y verificación de historia. main permanece en versión publicada hasta autorización específica. Una Preview no es producción ni permiso para probar contra datos comerciales. No force push ni secretos o copias de clientes en GitHub. Registrar resultados reales, bloqueos y pendientes; nunca declarar una fase completa solo por documentarla.
