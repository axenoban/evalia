---
name: evalia-catalogo
description: Crear, revisar o mejorar catálogo y formularios de alta de modelos, fotos, talla fija, colores y stock conservador EVALIA/Primi.
---
# Catálogo y alta rápida

Leer AGENTS.md, docs/19_ALTA_RAPIDA_MODELOS_FERIA.md, docs/32_D0_C1_STOCK_CONSERVADOR.md, docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md y docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md.

- **Un modelo = una talla fija**; precio de docena propio, foto y selección de colores del maestro. Los colores del catálogo son informativos, **sin stock ni reservas por color**.
- El administrador registra el **total conservador publicable** por modelo. Si hay 6,5 docenas físicas puede publicar 6 docenas. No imponer registro de prendas manchadas ni de cada venta en tienda. Las ventas físicas se descuentan mediante ajuste rápido manual por modelo.
- Mostrar S publicable, R reservado, P pedido pendiente y A=S−R−P. En ajustes normales exigir S nueva >= R+P y conservar las asignaciones; un faltante comprobado que las afecta exige revisión, no consumo silencioso de cupos.
- Alta rápida con foto, talla, precio y colores; sugerencias de modelos anteriores sin copiar su inventario, reservas o ventas. No prometer combinación exacta de colores por docena; solicitudes especiales se negocian fuera de V1.
- Formularios breves, foto ausente con fallback, búsqueda, estados sin datos, errores accionables, teclado y dispositivos móviles. No usar datos privados ni fotografías comerciales reales en repositorio público.

QA: probar 13 colores, cambio de stock, valores inválidos, cero disponible y un modelo con compromisos.
