# V1 consolidada — cierre de avances 23-11-2026
Alcance autorizado: reunir las mejoras implementadas y aprobadas, sin comenzar funcionalidades nuevas. El propietario confirma el guardado de contraseña de D9-A y detecta que el candidato anterior no contenía el último desglose de pedidos.

## Fuentes exactas
- Baseline aprobado: dev/evalia-core @ 868144f0c7eecbab4dd715882b07f25b8578f356 (D0–D8, dashboard responsive, registro compacto).
- PR #16 / 6745e9f4144b298f6d5176f12e98bcc62f25c53c: acordeón de pedidos, sin entregas parciales visibles.
- PR #17 / ff84d2c514f2bf87a5e0a4741d1bc3cc540f15de: incluye #16, tallas, avisos, edición controlada y migración 20261123204135. Validación funcional final pendiente.
- PR #18 / d82d18b724e49fb70143d5fac51f0ad841c2d0fd: acceso D9-A, autocompletado aprobado. Resto de D9 no implementado.

## Integración y control
Rama feature/evalia-v1-consolidada parte de #17 y conserva su historial; se incorporan exclusivamente las secciones de autenticación de #18 en page.jsx y api.js, cabeceras, documentación y regresiones D9-A. No sustituir page.jsx completo de una rama antigua. No alterar reglas ni reaplicar migraciones existentes. PR históricos no constituyen versiones alternativas recomendadas.
CI integral: npm run check, Next.js build y supabase test db en instancia local aislada. Sin crear operaciones ficticias en remoto. Verificar los 15 cambios de esquema existentes y permisos sin mutaciones. Mantener main/dev protegidas hasta regresiones correctas y aprobación de la versión conjunta conforme AGENTS.md.
QA funcional: login y autocompletado; dashboard y stock; modelos/colores/fotos; cliente pickup/shipping; pedido multidocena/colores y tallas; acordeón compacto, pagos y cierre express; edición solo sin compromisos incompatibles; impresión de envío estrictamente destino/nombre/teléfono y retiro local con detalle; enlace y portal privado; actualización, cierre de sesión y navegación móvil. D9-B/C/D (roles, MFA, passkeys, auditoría exhaustiva) quedan fuera de este cierre.
