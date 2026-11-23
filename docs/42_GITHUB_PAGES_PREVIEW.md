# EVALIA — Vista de prueba en GitHub Pages

Fuente: rama feature/evalia-publicacion-pages, creada desde feature/evalia-ciclo-cobros-entregas. No se ha integrado a main.

La publicación mediante GitHub Actions está dirigida a https://axenoban.github.io/evalia/. Verificar que el job "Publicar en Pages" termine correctamente y el enlace responda antes de considerarla operativa.

## Qué se puede probar

Desde el navegador, sin descargar ni editar archivos: iniciar sesión con la cuenta administradora registrada en Supabase y navegar por el catálogo, colores, fotografías, inventario conservador, reservas, pedidos multímodelo, avisos y aprobación de cobros, entregas y cierre administrativo. Se conecta a la base **real**: evitar aprobar ingresos y registrar retiros ficticios.

## Qué se excluye por limitación de GitHub Pages

GitHub Pages aloja archivos HTML/CSS/JS estáticos, pero no ejecuta el servidor Next.js. Por eso la compilación de Pages omite temporalmente las rutas de servidor /p/[token], /pedido y /api/*; **no las elimina del repositorio**. La emisión de enlaces de cliente está bloqueada en la vista de Pages para impedir enlaces que no funcionarían. Para probar ese flujo y los comprobantes se requiere una publicación completa de Next.js en Vercel o equivalente.

## Seguridad

La página incluye solamente la URL de Supabase y la clave *publishable* (públicas por diseño). Los datos están protegidos por Supabase Auth, RLS y comprobación de privilegios de administración. No hay service_role, sb_secret_ ni contraseñas en el artefacto estático. Un visitante no autorizado solo verá el formulario de acceso.

La publicación en Pages no equivale a un merge ni a una autorización para usuarios finales. No publicar enlace privado de cliente hasta desplegar backend con secretos exclusivamente en el servidor.
