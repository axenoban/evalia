# EVALIA · Gestión comercial y catálogo

Proyecto para gestionar catálogo, solicitudes, reservas de stock y pedidos de EVALIA, con una **primera interfaz administrativa** y evolución prevista hacia accesos para personal y clientes.

> **Estado: descubrimiento y diseño; NO hay sistema operativo, base de datos creada ni sitio comercial publicado.** Las decisiones técnicas incluidas en `docs/` son recomendaciones hasta que el propietario las apruebe.

## Documentación
- [Visión y límites](docs/00_VISION_Y_ALCANCE.md)
- [Marca y operación conocida](docs/01_MARCA_Y_OPERACION.md)
- [Arquitectura propuesta](docs/02_ARQUITECTURA_PROPUESTA.md)
- [Flujos propuestos](docs/03_FLUJOS_Y_MODELO.md)
- [Decisiones pendientes](docs/04_REGISTRO_DE_DECISIONES.md)
- [Plan y aceptación](docs/05_FASES_Y_PRUEBAS.md)
- [Reglas para agentes](AGENTS.md)

## Git y entornos
- `main`: versiones publicables aprobadas.
- `dev/evalia-core`: último baseline completo validado (se creará cuando exista).
- `feature/*`: trabajo en revisión. **Este borrador está en `feature/fundamentos-reservas-pedidos`; no se ha integrado en main.**

No almacenar aquí claves, datos personales de clientes, ventas reales ni información sensible. El repositorio es público.
