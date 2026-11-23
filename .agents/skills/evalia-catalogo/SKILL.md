---
name: evalia-catalogo
description: Crear, revisar o mejorar catálogo y formularios de alta de modelos, fotos, talla fija, colores y stock conservador EVALIA/Primi.
---
# Catálogo y alta rápida

Leer docs/39_CAPTURA_DOCENAS_COLORES_INDIVIDUALES.md, AGENTS.md, docs/19_ALTA_RAPIDA_MODELOS_FERIA.md, docs/32_D0_C1_STOCK_CONSERVADOR.md, docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md y docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md.

- **Un modelo = una talla fija**; precio de docena propio, foto y selección de colores del maestro. Los colores del catálogo tienen muestra `hex_code`, **sin stock por color**; D2-B permite guardar colores **solicitados para las 0–11 prendas individuales adicionales**, nunca duplicados y sin promesa de disponibilidad cromática. Las docenas son surtidas.
- El administrador registra el **total conservador publicable** por modelo. Si hay 6,5 docenas físicas puede publicar 6 docenas. No imponer registro de prendas manchadas ni de cada venta en tienda. Las ventas físicas se descuentan mediante ajuste rápido manual por modelo.
- Mostrar S publicable, R reservado, P pedido pendiente y A=S−R−P. En ajustes normales exigir S nueva >= R+P y conservar las asignaciones; un faltante comprobado que las afecta exige revisión, no consumo silencioso de cupos.
- Alta rápida con foto, talla, precio y colores; sugerencias de modelos anteriores sin copiar su inventario, reservas o ventas. No prometer combinación exacta de colores por docena; validar las selecciones individuales D2-B contra la paleta del modelo y la cantidad global A, sin inventar inventario por color.
- Formularios breves, foto ausente con fallback, búsqueda, estados sin datos, errores accionables, teclado y dispositivos móviles. No usar datos privados ni fotografías comerciales reales en repositorio público.

QA: probar 13 colores, cambio de stock, valores inválidos, cero disponible y un modelo con compromisos.
