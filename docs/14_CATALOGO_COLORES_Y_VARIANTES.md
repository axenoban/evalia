# EVALIA — Catálogo maestro de colores y variantes por modelo

**Estado:** requerimiento explícito de negocio + propuesta de modelado; sin aprobación formal del PR, sin migraciones ni registros reales. 2026-11-22.

## Necesidad expresada

El propietario desea **registrar los colores antes de los modelos**, reutilizarlos y, al registrar o modificar cada modelo, **seleccionar el conjunto de colores que efectivamente tendrá**. Otro modelo puede tener otros colores, incluso si solo cambia uno. Durante la reserva, después de seleccionar el modelo, los colores disponibles deben poder elegirse; el stock real debe controlarse por modelo y talla, con desglose de color.

## Modelo conceptual recomendado (sin imponer nombres SQL)

| Concepto | Responsabilidad | Observación |
| --- | --- | --- |
| Catálogo de colores | Identidad estable y nombre de cada color reutilizable | No inventar lista inicial ni códigos |
| Modelo de prenda | Diseño/fotografía y datos comerciales propios | Los precios son por modelo/variante según política futura |
| Colores del modelo | Relación explícita entre modelo y los colores que ofrece | Un color global no se ofrece en todos los modelos |
| Variante | Combinación de modelo + color permitido; **talla heredada del modelo** | Cada modelo tiene una sola talla; no hay combinaciones de tallas dentro de ese modelo |
| Inventario por variante | Cantidad física, reservas vigentes, pedidos pendientes y disponibilidad | Disponibilidad nunca negativa; historial de movimientos |
| Historial | Cambios de relación color-modelo, reservas, pedidos y ajustes | No borrar referencias históricas por quitar un color |

**Diferencia crucial:** que un color esté **asignado a un modelo** no significa que **tenga existencias disponibles**. Por eso la selección visual debe mostrar estado de disponibilidad por variante y permitir al administrador evitar las agotadas.

## Alta recomendada (orden explícito)

1. **Colores →** crear color en catálogo común.
2. **Modelos →** crear modelo y asignarle los colores válidos de los ya registrados.
3. **Talla fija del modelo y variantes por color →** definir una única talla al crear el modelo; habilitar solo los colores realmente ofrecidos. No generar combinaciones ficticias de tallas × colores dentro de ese modelo.
4. **Stock inicial →** ingreso manual por variante modelo/color/talla, elegido en R04.
5. **Pedidos y reservas →** escoger únicamente variantes permitidas; validar stock exacto al guardar.

Un color nuevo se registra primero y se asocia después a uno o varios modelos; para retirar un color de la oferta hay que preservar el historial y resolver qué hacer con reservas/pedidos abiertos (pendiente G05/CR-06).

## Ejemplo meramente ilustrativo

- Modelo A permite: Color 1, Color 2, Color 3.
- Modelo B permite: Color 1, Color 3, Color 4.
- Un color puede existir en el catálogo maestro sin asignarse al Modelo A.
- Modelo A, talla M, Color 2 puede estar agotado aun si la talla M del modelo tiene unidades en Color 1.

No son colores, tallas o productos reales de EVALIA.

## UI recomendada

- **Administrar colores:** lista reutilizable, crear/editar, búsqueda de colores, número de modelos asociados (conteo candidato).
- **Editar modelo:** selector múltiple de colores del catálogo; mostrar variantes habilitadas y aviso de colores retirados con historial.
- **Nueva reserva:** tarjeta de modelo que muestra su talla fija, campo cantidad y colores habilitados; indicador de disponible por color. La opción «Surtido» ya fue seleccionada para bloquear cupo agregado, con colores asignables después.
- **Inventario:** tabla modelo+talla expandable por color; físicamente presentes, reservados, pedidos pendientes, disponibles.

## Problema de surtido

Cliente puede pedir «surtido» para cantidades inferiores a una docena y dejar la combinación a EVALIA. El inventario, sin embargo, necesita **variantes concretas** (color+talla) para descontar disponibilidad sin sobreventa.

**Recomendación, no decisión:** permitir marcar «surtido elegido por EVALIA» pero exigir asignación de variantes antes de guardar una reserva con bloqueo. Si no se ha elegido composición, permanecer como solicitud/borrador sin bloqueo. No inventar una distribución automática ni sustituir colores silenciosamente.

## Pendientes explícitos

- Criterio de identificación de colores parecidos (dos tonos próximos); inactivación de color y stock remanente.
- G04-04 una talla por presentación vs suma de M/XL por modelo.
- G04-01 definición de presentación; cálculo y reparto de precios, especialmente 6–11 unidades.
- Política para 12 o más unidades, cambios de color solicitados, sustitución después de confirmar.
- Datos de fotografía por modelo y si existe foto específica de un color: no asumir imágenes existentes.

**No autorizado todavía:** implementar la base de datos, fijar reglas de color por importe, convertir una solicitud de surtido en reserva bloqueante sin variantes asignadas, fusionar a main.

## Actualización de surtido: colores después
La decisión posterior del propietario **descarta elegir obligatoriamente los colores antes del registro inicial de surtido**. La lista maestra de colores y la asignación de colores disponibles a cada modelo permanecen vigentes, pero **los colores efectivamente asignados a una solicitud de surtido podrán completarse después**, según stock apto tras calidad. La recomendación histórica de esta página queda reemplazada **para el momento de captura**, sin decidir si la solicitud inicial bloquea un cupo del modelo/talla. No forzar un «negro doble» si el stock real no lo permite. Ver [detalle de producción](15_PRODUCCION_CALIDAD_SURTIDO.md) y [decisión pendiente](16_DECISION_BLOQUEO_SURTIDO.md).

## Talla única del modelo (decisión posterior)
Al crear modelo, seleccionar **una talla fija** como atributo del modelo (M, XL, 2XL son solo ejemplos aportados). A cada modelo se asignan sus colores y su política de precios; no se crea una matriz de múltiples tallas para el mismo modelo. La **variante** es modelo+color y muestra talla heredada. Si el mismo diseño se comercializa en otra talla, no unirlo como otra talla del mismo modelo sin decisión de identidad/versionado. La reserva surtida bloquea cupo **por modelo**, cantidad obligatoria y color posterior. [Detalle](17_MODELO_TALLA_UNICA_Y_SURTIDO.md).
