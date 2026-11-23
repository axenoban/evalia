# EVALIA — Alta rápida de modelos para feria: fotografía, colores y preferencias reutilizables

**Fecha:** 2026-11-22. **Estado:** operación expresada por el propietario + diseño UX/arquitectura propuesto, pendientes de ratificación del PR. No hay interfaz implementada, fotos ni modelos nuevos en el repositorio.

## Objetivo de operación
EVALIA necesita incorporar **unos seis modelos o más por feria**. El alta individual debe ser rápida aun cuando los modelos cambien de talla, precios, colores y apariencia. No copiar indiscriminadamente las configuraciones de modelos anteriores.

## Requisitos expresos
- **Cada modelo requiere fotografía** para publicar/identificar el diseño.
- **Cada modelo tiene una sola talla**, M, XL o 2XL según ejemplos, sin mezcla dentro de ese modelo.
- Cada modelo tiene **su propio precio comercial** (mayorista para reservas); usar una sugerencia base configurable por talla sin imponer tarifas iguales.
- Los colores se registran **antes del modelo** en catálogo maestro y se vincula a cada modelo solo la selección que realmente tiene.
- El sistema puede **recordar los colores utilizados en el modelo anterior**, con opción de ajustarlos para el nuevo modelo.
- El propietario quiere facilitar el registro mediante preferencias/patrones de modelos y colores habituales **por talla** (M frente a XL), donde las gamas pueden diferir.
- Se preserva que el **stock inicial es manual por modelo+color**, y producción/quality control no crean prendas aptas por suposición (R04).

## Secuencia visual propuesta (wizard compacto, NO aplicación todavía)

1. **Nueva ficha de modelo:** nombre/código, fotografía cargada y guardada de forma segura. Reglas de formato y tamaño de archivo, número de fotos e imagen obligatoria al crear borrador vs publicar están por definir.
2. **Elegir talla única:** M, XL, 2XL u otra registrada. Esta decisión puede cambiar qué sugerencias se muestran, pero no crea inventario ni asigna colores por sí sola.
3. **Sugerir precio mayorista por talla:** mostrar base configurable, **editable para ese modelo**; de ninguna manera actualiza los otros modelos de igual talla. Debe confirmarse su precio final según presentaciones futuras G04.
4. **Colores recomendados:** proponer (a) **repetir selección del modelo anterior** o (b) **cargar plantilla por talla**. Ambas son sugerencias que requieren confirmación y pueden editarse antes de guardar; nunca agregar colores no existentes en el catálogo maestro ni sustituir el stock real.
5. **Revisar resumen**: fotografía, talla fija, precio efectivo del modelo (no solo sugerido), colores seleccionados, estado de inventario inicial y guardar.
6. **Ingresar existencias manualmente** por cada color válido del nuevo modelo; separar lote previsto, aptas, retenidas y mermas según etapa de calidad, sin crear existencias automáticamente al copiar otra ficha.

## Memoria operativa sugerida, no «memoria de IA»
Persistir en **datos de EVALIA** (no depender de historial del chat):
- **Preferencia de última selección de colores**: referencia o copia de la selección del modelo anterior, con opción de origen global o por talla **a decidir**.
- **Plantillas explícitas de colores por talla**: el administrador nombra una plantilla y asigna colores del catálogo maestro; reutilizable, editable, no obligatorio ni exclusivo.
- **Precio base sugerido por talla**: cifra mayorista que el administrador puede cambiar; es solo predeterminado al crear, no precio de catálogo aplicable de manera retroactiva.
- **Modelos anteriores por talla**: lista/buscador para localizar los habituales de M/XL/2XL y utilizar su configuración como **punto de partida**. Copiar configuraciones **no** significa reutilizar el mismo ID, fotografía, existencias, historial ni tarifa de manera silenciosa.
- **Variaciones de paleta**: preferencias basadas en el uso comercial registrado, no etiquetar clientes por edad o asignar automáticamente colores según suposiciones sobre personas mayores.

## Problemas y prevención de errores
- Guardar una **copia de la selección de colores** en el nuevo modelo; cambiar la plantilla posteriormente **no altera en bloque** las ofertas pasadas o reservas confirmadas.
- Nunca copiar stock, movimientos, reservas ni pedidos del modelo anterior. El modelo nuevo empieza sin inventario hasta el ingreso real (R04).
- La fotografía se asocia por referencia estable al modelo y no se sustituye por la del modelo previo si no se confirma; en almacenamiento público/privado, URLs y permisos se decidirá al implementar.
- Si el administrador marca un color que no se fabricará finalmente, distinguir **color permitido** de **color apto en stock**.
- Evitar que modificar precio base por talla sobrescriba precios efectivos de modelos, pedidos históricos o tarifas especiales de clientes.
- Surtido: al crear reserva se conoce el modelo/talla y se introduce la cantidad, pero los colores se asignan después. No usar la plantilla de colores para prometer tonos específicos que la producción no garantizó.

## QA candidato de carga repetida de modelos
1. Registrar colores maestro 1–12 y plantilla «Gama M» (nombres ilustrativos, no paleta real).
2. Crear Modelo A talla M; seleccionar plantilla, editar 2 colores, subir foto A, aceptar/sobrescribir precio sugerido y guardar.
3. Crear Modelo B talla M desde selección anterior, cambiar un color y foto B; verificar que Modelo A y sus pedidos no cambien.
4. Crear Modelo C talla XL, mostrar su plantilla recomendada independiente, admitir precio propio distinto al de otros XL y seleccionar colores propios.
5. Confirmar que cada modelo dispone de una sola talla y que ningún modelo nuevo recibe stock heredado.
6. Crear seis modelos o más en secuencia con datos ficticios; comprobar que la operación se puede completar sin registrar repetidamente colores globales ni forzar precios iguales. **No fijar todavía tiempos máximos de UX**.
7. No se persiste foto real, credencial, cliente ni ninguna paleta inventada en repositorio público.

## Por resolver
- Si foto obligatoria al crear el borrador o solo al publicar; número/tamaño de archivos y permisos de visualización.
- Alcance de «modelo anterior»: anterior global o por talla; presentación de plantillas y posibilidad de duplicar foto **solo con acción explícita**.
- Nombres/identidad de modelos habituales por talla; no inventar clasificación comercial, colecciones o público objetivo en el backend.
- Precio sugerido por talla y condiciones de cliente: [doc/18](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).
- Política ante cambio de talla de modelo histórico y gestión de colores fuera de stock.

**La función de plantillas/recordatorios es propuesta técnica fundamentada en el uso descrito; sin implementación todavía.**

## Precio de docena como único dato base de mayorista (nueva decisión)
El administrador da de alta el modelo con **precio mayorista de docena**, usando sugerencia por talla y pudiéndola corregir para ese modelo. Con **ese único dato**, el sistema cotiza automáticamente 6–11 unidades mediante `P_docena × n/12`, evitando tablas por cada cantidad, siempre que se ratifique la política de redondeo para precios no divisibles entre 12. Docena Bs 420 ⇒ precio implícito Bs 35/unidad ⇒ media 210 y 7=245. **No activar descuentos E1** al copiar una ficha o elegir cliente. Las plantillas de color/foto se manejan aparte. [Contrato de precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Precio guardado y redondeo en E1
Al dar de alta modelo se registra **precio de docena mayorista propio**, con base sugerida por talla editable. En pedidos de 6–11, calcular `precio_docena×n/12` y **redondear importe total del modelo al entero Bs más cercano**, no redondear precio unitario o color. P=380 n=7 → Bs 222; P=420 n=7 → Bs 245. No añadir descuentos ni copiar reglas de precio del cliente en E1. **Desempate exacto .50 pendiente**, sin implementación hasta ratificar. [Contrato](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).

## Regla monetaria posterior: conservar exactamente 50 centavos
El precio de docena mayorista se configura individualmente al crear el modelo. Para 6–11 unidades aplicar proporción y entero cercano, **pero si subtotal del modelo termina exactamente en Bs 0,50 conservarlo sin redondear**. Se permiten varios modelos dentro del pedido (12 de A y 6 de B) con importes independientes y **suma directa de subtotales finales**; no copiar precios ni stock desde modelos anteriores. P_B=381 n_B=6 ⇒ **Bs 190,50**; P_A=420 n_A=12 ⇒ **Bs 420**; total Bs 610,50. 13+ del mismo modelo aún sin regla. [Precios](18_PRECIOS_MAYORISTAS_Y_CLIENTES.md).
