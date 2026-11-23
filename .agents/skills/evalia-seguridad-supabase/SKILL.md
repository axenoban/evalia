---
name: evalia-seguridad-supabase
description: Revisar migraciones Supabase, PostgreSQL, RLS, auth, acceso privado y operaciones transaccionales al evolucionar el prototipo EVALIA hacia una aplicación real.
---
# Integración y seguridad

Antes de actuar, leer AGENTS.md, docs/08_ENTORNO_Y_AGENTES.md, docs/30_D0_SEGURIDAD_Y_QA_TRANSACCIONES.md, docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md, docs/35_D1_A_SUPABASE_PRIMER_BLOQUE.md y .agents/skills/supabase-postgres-best-practices/SKILL.md (incluidas referencias pertinentes).

- **El prototipo actual usa localStorage**, no es un sistema multiusuario seguro. No habilitar clientes, reservas ni pagos reales en él.
- Next.js + Supabase son tecnologías indicadas para la evolución; hosting, despliegue y arquitectura definitiva dependen de la fase aprobada. No realizar migración silenciosa.
- Autenticar/autorización real en servidor/BD con RLS y pruebas de aislamiento; mostrar/ocultar botones no es seguridad. No enviar service role ni secretos al navegador o al repositorio.
- Operaciones de stock/reservas/pedidos/entregas atómicas con locks ordenados por modelo, idempotencia y auditoría. Invariante A=S−R−P, sin contabilización doble en reserva→pedido.
- Evidencias privadas en storage controlado; enlace por token revocable con hash almacenado. No autenticar a clientes por WhatsApp ni exponer datos por ID secuencial.
- Antes de integrar: migraciones y pgTAP en instancia aislada, RLS cruzada, concurrencia, backup/restore, logs y manejo de errores; no declarar QA de BD si no se ejecutó.
