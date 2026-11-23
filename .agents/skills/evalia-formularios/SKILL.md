---
name: evalia-formularios
description: Implementar o mejorar formularios funcionales, accesibles e interactivos para catálogo, clientes, inventario, reservas, pedidos y pagos de EVALIA.
---
# Formularios funcionales EVALIA

Leer AGENTS.md, docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md, docs/34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md y el documento específico del formulario. Inspeccionar site/app.js, site/domain.js y site/styles.css antes de editar. **La demo actual usa HTML, CSS y JavaScript sin React ni backend**.

## Ejecución
1. Identificar tarea, usuario, campos, origen, errores, estados, acción de guardar y validaciones de dominio; reducir escritura administrativa innecesaria.
2. Utilizar controles HTML semánticos, etiquetas vinculadas, name estable, autocomplete adecuado, tipo/inputmode correctos, aria-describedby y foco visible. No depender solo de placeholders.
3. Validar al enviar y al corregir, sin impedir escribir valores intermedios; mostrar errores junto a cada campo y enfocar el primero. Mantener datos escritos tras un error de stock, red o autorización.
4. Mostrar subtotales, cantidad y cupo actualizado antes de confirmar, pero **no comprometer stock durante el borrador**. Moneda exacta en centavos/racional, no flotantes como verdad comercial.
5. Evitar doble envío y operaciones duplicadas con idempotencia en dominio/BD, no solo deshabilitando botones. Informar carga, éxito, errores y reintentos; evitar rerender que borra foco o selección.
6. Probar teclado (Tab, Enter, Escape cuando aplique), móvil 360px, tablet 768px, escritorio 1280px, zoom, textos largos, listas vacías, stock agotado y errores. Mantener demo con datos ficticios.
7. Si se aprueba Next.js en fase posterior, evaluar componentes React y validación compartida; no introducir React Hook Form ni Zod como dependencias obligatorias ahora.

Cerrar con comandos de prueba y resultados reales. No inventar precios, estados ni permisos.
