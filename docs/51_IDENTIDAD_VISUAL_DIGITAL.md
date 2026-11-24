# EVALIA — Identidad visual digital (aprobado)

Base: a762580d6120ddb3a70284dad3c2c703b3a87c99, rama feature/evalia-d9-admin-cuentas. No cambia reglas, RPC, migraciones, permisos, inventario, pedidos, pagos ni impresión. Se preserva el layout responsive aprobado y los estados semánticos.

## Activos
- El propietario aportó dos referencias circulares EV, blanco sobre ciruela y blanco sobre negro. Se reproduce la silueta de la referencia mediante trazado vectorial, con fondo exterior transparente. Identidad visual aprobada por el propietario en el candidato ead7845c.
- `web/app/icon.svg`: icono de pestaña por convención App Router; evita enlaces absolutos frágiles al exportar Pages.
- `web/public/brand/evalia-monogram-color.svg` y `evalia-monogram-black.svg`: variantes reutilizables.
- `web/app/brand.jsx`: monograma React accesible y familia SVG de iconos de navegación/indicadores; no usa red ni tipografías de símbolos para estos iconos.
- El texto EVALIA es etiqueta funcional junto al monograma, no una reconstrucción del wordmark oficial V–A. El arte final del wordmark sigue pendiente de recibir; no inventarlo.

## Tokens
Ciruela institucional #4D3443, marfil #F5F0EA, carbón #222024, rosa empolvado #CFAEB6, plata #C7C3C6. El círculo de referencia utiliza una aproximación cromática #451E3B, distinta del token institucional. Negro #000000. Manrope para interfaz; no reinterpretar el lettering. Acentos técnicos de contraste y estados verde/ámbar/rojo no sustituyen la paleta institucional.

## Cobertura y validación
Acceso, recuperación, configuración, sidebar, cabecera móvil, fotos ausentes, dashboard, productos, registro, pedidos, clientes, pagos y portal privado: tema común, con iconos y acentos coherentes. No agregar elementos decorativos a la etiqueta A6 ni modificar comprobantes. Cierre: aprobación visual del propietario y CI del candidato ead7845c: 141 Node, 401 pgTAP, compilación y Preview correctas. Mantener revisión visual en futuros cambios.
