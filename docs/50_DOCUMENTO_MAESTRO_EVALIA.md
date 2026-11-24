# EVALIA — Documento maestro de producto, arquitectura y colaboración con IA

**Versión documental:** 1.0  
**Fecha de corte y verificación:** 23 de noviembre de 2026  
**Proyecto:** EVALIA — gestión comercial mayorista textil  
**Propiedad de decisiones de negocio:** titular de EVALIA  
**Repositorio:** https://github.com/axenoban/evalia  
**Baseline funcional aprobado auditado:** `dev/evalia-core`, código en `4270da0af6022fb7dd0dbd5a996286fe64b79bc1`  
**Estado:** V1 funcional aprobada en desarrollo. **No equivale a versión publicada desde `main`.**  
**Propósito:** documento de transferencia para ChatGPT Projects, Codex, Claude Code, otros chats de IA, colaboradores técnicos y proyectos paralelos de diseño gráfico, UI/UX, prototipos, mantenimiento y evolución.

> **Cómo usar este documento:** es la puerta de entrada y el mapa de navegación del sistema, no una excusa para omitir el código. Para implementación, consultar siempre el HEAD real de GitHub, las migraciones y pruebas, más los documentos aprobados específicos. Cuando un archivo antiguo diga algo contrario a una decisión posterior aprobada, prevalece la decisión posterior y se registra el conflicto. Las cifras de versiones y QA de este corte se deben actualizar tras futuros cambios.

---

## Actualización de baseline — 23 de noviembre de 2026 (hora Bolivia)

El propietario aprobó la identidad visual (monograma EV, favicon, tema compartido e iconografía) y posteriormente la preparación reversible de pedidos, tras probar el candidato `ead7845c3808a06281d7eec2ea9452788b28eb7f`. El cierre técnico de esta versión toma dicho commit como código auditado; `dev/evalia-core` es la rama estable de desarrollo. Las referencias al corte inicial 4270da0a, 14 migraciones y QA inicial que figuran más abajo son históricas, no el estado vigente.

- Regresión del candidato: 141/141 pruebas Node y 401/401 pruebas pgTAP (18 archivos SQL), compilación Next.js y Vercel Preview READY. CI: [45308499275](https://github.com/axenoban/evalia/actions/runs/45308499275), [45308499314](https://github.com/axenoban/evalia/actions/runs/45308499314).
- Supabase remoto: 20 migraciones registradas; última `20261124015349_pedido_preparacion_operativa`. No volver a aplicarlas ni ejecutar datos de prueba contra remoto.
- Incluye V1 consolidada, pedidos en acordeón, edición segura, D9 acceso/gestión privada de cuentas, corrección de alta de clientes, archivo de modelos/pedidos y las mejoras visuales y de preparación. El flujo real de invitación y recuperación por correo debe conservar su QA operativa específica según docs/56; CI no garantiza entrega SMTP.
- **Identidad:** ver docs/51. Monograma EV, ciruela y negro, SVG, favicon; no sustituir ni inventar el wordmark V–A definitivo.
- **Preparación:** ver docs/52. En preparación (amarillo), Preparado (azul), Completado (verde). El metadato de preparación no cambia `orders.status`, pagos, stock, entrega o cierre. Todos los admins activos pueden cambiarlo; auditar y revertir. La edición de composición invalida la preparación. No exigir preparación como condición del cierre.
- `main` no se modifica. No promover a producción sin autorización de publicación. Los siguientes cambios funcionales deben partir del HEAD real de `dev/evalia-core`.

---

## 1. Qué es EVALIA y qué problema resuelve

EVALIA es una aplicación web de **administración de catálogo, disponibilidad, clientes, pedidos confirmados, cobros externos y entregas** para una operación textil de Bolivia. Su prioridad es la venta mayorista de prendas por modelos, docenas surtidas y cantidades adicionales. El registro de compradores se hace administrativamente; la comunicación comercial puede ocurrir por WhatsApp, feria o contacto directo.

No es actualmente una tienda pública con carrito de autoservicio, pasarela bancaria, facturación tributaria, contabilidad integral o ERP de producción. La aplicación está diseñada para simplificar trabajo real con pocos operadores: se registra lo comercialmente necesario y se evita obligar a registrar prendas defectuosas, cada venta física o cantidades detalladas por color.

La marca EVALIA apunta a una identidad **femenina, moderna, delicada, segura y cercana**. Frase documentada: **«Destaca en cada detalle»**. La fuente de marca es `docs/01_MARCA_Y_OPERACION.md`; no confundir un ejemplo de producto con un límite de identidad de marca. La aplicación y la marca comercial no deben reducirse solo a blusas con brillos.

### Objetivos de producto validados
- Controlar qué mercadería publicada está **libre** y cuál ya está comprometida por pedidos confirmados.
- Registrar un pedido mayorista de **uno o varios modelos**, con talla fija por modelo y precio histórico.
- Reducir errores al registrar pagos externos, saldos, retiradas y cierres.
- Ofrecer al comprador acceso **privado y limitado a su propio pedido**, sin obligarlo a crear cuenta.
- Gestionar compradores habituales de **retiro local o envío**, con destino persistente.
- Imprimir un **comprobante detallado para retiro** y una **etiqueta de envío sin divulgar contenido ni valor**.
- Permitir futuras mejoras visuales sin debilitar las reglas ni la seguridad validadas.

---

## 2. Estado real del sistema a este corte

| Elemento | Estado verificado |
| --- | --- |
| Repositorio | `axenoban/evalia`, GitHub |
| Código funcional aprobado | `4270da0af6022fb7dd0dbd5a996286fe64b79bc1` |
| Rama aprobada de desarrollo | `dev/evalia-core` |
| Rama publicable | `main`; conservaba `b3168aebdd52b1c1089e96d4a3a1e3cdda362221`, sin promover aún la V1 |
| Módulos de catálogo, clientes, pedidos, pagos y entregas | Implementados, validados por el propietario |
| Envíos e impresiones D8 | Implementados y aprobados por el propietario; PR #12 integrado por fast-forward |
| Última migración de BD aplicada | `20261123001400_entrega_envios_impresion.sql`; 14 migraciones acumuladas |
| Última batería completa comprobada | 102 pruebas Node y 282 pruebas PostgreSQL pgTAP, compilación Next.js 16 y acceso público de Preview |
| Hosting de aplicación integral | Vercel Preview, **no** promoción a `main` |
| Alternativa estática | GitHub Pages; panel administrativo de prueba, **sin** backend completo del portal privado |
| Estado visual | Interfaz funcional con mejoras puntuales de UX; rediseño integral moderno/dinámico **aún por definir y aprobar** |

**Advertencia temporal:** los archivos `README.md` y `AGENTS.md` arrastran bloques escritos cuando D6–D8 todavía estaban en PR. Desde la aprobación e integración de PR #12, esas frases de “pendiente de merge” son **históricas**. Este documento refleja el baseline comprobado a 23/11/2026. Los PR #7–#12 figuran cerrados/merged; algunos PR tempranos #1–#6 permanecen abiertos en sus cadenas históricas y no constituyen instrucciones para rehacer módulos existentes.

### Enlaces de referencia
- **GitHub:** https://github.com/axenoban/evalia
- **Rama funcional:** https://github.com/axenoban/evalia/tree/dev/evalia-core
- **Vercel Preview funcional D8, comprobada en su rama:** https://evalia-git-feature-evalia-envios-impresion-galaxian131-9858.vercel.app
- **GitHub Pages (solo exportación estática):** https://axenoban.github.io/evalia/
- **Supabase público del proyecto:** https://vbedfbijoqcqpzjzawrh.supabase.co

Una URL Preview vieja puede mostrar una interfaz antigua. Para una nueva fase, localizar primero el despliegue del **HEAD de la rama activa**. No presentar la URL estática de Pages como prueba del portal completo. La aplicación de administración exige credenciales de EVALIA (Supabase Auth), **no** una cuenta de Vercel para el comprador.

---

## 3. Organización del código y del conocimiento

~~~text
axenoban/evalia/
├── web/                         Aplicación operativa Next.js 16 y React 19
│   ├── app/page.jsx             Panel administrativo y componentes de interacción
│   ├── app/globals.css          Estilos actuales del panel
│   ├── app/p/[token]/route.js   Canje de enlace privado del cliente
│   ├── app/pedido/              Portal del pedido privado
│   ├── app/api/                 APIs del QR, comprobantes y estado de portal
│   ├── lib/api.js               Acceso a Supabase, CRUD y RPC administrativas
│   ├── lib/domain.js            Precios y validación de cantidades (BigInt)
│   ├── lib/order-selection.js   Selector de modelos, capacidad y composición
│   ├── lib/order-whatsapp.js    Mensaje editable para compartir por WhatsApp
│   ├── lib/delivery.js          Modalidad y validación de destinos
│   ├── lib/order-print.js       Comprobante A4 o etiqueta privada A6
│   ├── lib/server-private.js    Supabase del lado servidor y validación de tokens
│   ├── lib/portal-*.js          Cookies, media y token del portal
│   ├── next.config.mjs          Cabeceras de privacidad del portal
│   └── scripts/prepare-pages.mjs Exportación especial SIN backend para Pages
├── supabase/
│   ├── migrations/              14 migraciones SQL versionadas
│   ├── tests/database/          12 suites pgTAP transaccionales
│   └── config.toml
├── tests/                       Pruebas Node de dominio, selector, UI y privacidad
├── .github/workflows/           CI operativa, verificación pública y Pages
├── .agents/skills/              Guías de trabajo especializadas para IA
├── .claude/skills/              Guías equivalentes para Claude Code
├── site/                        Demo HTML/CSS/JS histórica; NO es producción
├── docs/                        Decisiones, contratos y planes de prueba
├── AGENTS.md                    Convenciones para agentes de desarrollo
├── CLAUDE.md                    Convenciones para Claude Code
└── README.md                    Historia y enlaces, con pasajes desactualizados
~~~

**Regla:** los cambios funcionales se hacen en `web/` y, cuando corresponda, en migraciones/RPC de `supabase/`. `site/` contiene una demo histórica y no sustituye `web/`. Los prototipos de UI pueden ser independientes, pero no se consideran cambios integrados hasta implementar los componentes reales, pasar CI y aprobarlos.

---

## 4. Tecnologías, entorno y cómo se desarrolló realmente

| Capa | Implementación confirmada |
| --- | --- |
| Aplicación web | **Next.js 16**, App Router, componentes React **19**, archivos JavaScript/JSX |
| Runtime de CI/despliegue | **Node.js 22** en GitHub Actions y configuración de Vercel; el `package.json` permite mínimos distintos, por lo que verificar cada entorno |
| Persistencia | Supabase **PostgreSQL**, tablas relacionales, constraints, triggers, funciones SQL/PLpgSQL y RPC |
| Sesión de administración | **Supabase Auth** con perfil autorizado en `admin_profiles` |
| Autorización | RLS, grants por rol, RPC `SECURITY DEFINER` con comprobación de administrador |
| Archivos | Supabase Storage privado para fotos, QR auténtico y comprobantes |
| Alojamiento completo | **Vercel**, proyecto `evalia`, directorio raíz de despliegue `web` |
| Vista estática alternativa | **GitHub Pages**, exportada mediante `web/scripts/prepare-pages.mjs` |
| Repositorio y automatización | GitHub, ramas, Pull Requests, GitHub Actions |
| Pruebas | `node --test`, validación de sintaxis, compilación `next build` y PostgreSQL **pgTAP** mediante Supabase CLI |
| Edición/agentes previstos | VS Code + **Codex**; alternativamente Claude Code u otros agentes que respeten el mismo contrato |

**Precisión sobre el desarrollo conjunto:** el propietario aportó reglas, información operativa, decisiones y resultados de pruebas reales. ChatGPT/IA preparó propuestas, analizó restricciones, escribió código y documentos, utilizó integraciones disponibles de GitHub/Supabase/Vercel, construyó pruebas y diagnosticó errores. La implementación no depende de que el propietario haya escrito manualmente cada archivo en VS Code. Las herramientas de IA se pueden cambiar; el código, migraciones, reglas, historial y pruebas **son independientes del chat**.

### Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: credencial publicable prevista para frontend, sujeta a RLS.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: compatibilidad con clave pública anterior, si se usa.
- `SUPABASE_SECRET_KEY`: **solo servidor Next.js**, acceso al portal y medios privados; nunca anteponer `NEXT_PUBLIC_`.
- Compatibilidad técnica interna de servidor: `SUPABASE_SERVICE_ROLE_KEY`, si la configuración existente la usa. Preferir convención vigente y secretos administrados desde la plataforma.

**Nunca** incluir contraseñas de base de datos, tokens de clientes, secret keys, comprobantes, números de contacto reales ni información privada en repositorios públicos o en este documento maestro. Las claves se administran en Supabase/Vercel y se rotan si fueron divulgadas.

### Ejecución y verificación reproducible
~~~bash
# Repositorio raíz: contrato de dominio, sintaxis y pruebas Node
npm run check

# Aplicación Next.js operativa
cd web
npm install --no-audit --no-fund
npm run dev
npm run build

# Desde la raíz, con Docker y Supabase CLI configurados
supabase start
supabase test db
supabase stop --no-backup
~~~

Para desarrollo local se necesitan las variables del ejemplo `web/.env.example` y un entorno Supabase **aislado** si se van a crear pedidos ficticios. La base remota comercial **contiene datos reales**: no usarla para pruebas que simulen cobros, entregas, alteraciones de stock o cierres.

---

## 5. Modelo comercial vigente y restricciones obligatorias

### 5.1. Solo pedidos confirmados (D6)
No existe alta de reservas nuevas ni apartados temporales para clientes indecisos. El comprador **confirma la compra** antes de comprometer prendas en EVALIA. El formulario del panel solo registra **Nuevo pedido**. La API revocó los permisos de crear/revisar reservas nuevas (`migración 012`).

**Historial:** siguen existiendo tablas y registros de reservas anteriores, eventualmente con depósito, conversión o vencimiento. No borrarlos, no liberar cupo arbitrariamente ni romper sus referencias contables. El cron histórico de ferias sigue para resolver los casos anteriores; su presencia **no** autoriza a reintroducir reservas en la UI.

### 5.2. Modelos, tallas y colores
- Un **modelo** tiene una **talla fija**, precio propio por docena, fotografía y colores ofertados. Diferentes tallas requieren modelos distintos.
- Catálogo global de colores; los modelos eligen sus colores disponibles.
- El stock vendible se registra **globalmente por modelo**, no por color.
- Las docenas son **surtidas**; no se garantiza composición cromática fija ni todos los colores del catálogo en cada docena.
- Para prendas extra se guarda un color solicitado **por unidad**, sin repetir colores dentro de esas extras de una misma línea. Esto **no** crea stock inventariable por color ni implica disponibilidad garantizada de cada tono.
- No se registra cada defecto/mancha; las prendas no aptas se descartan fuera de la venta. No prometer inventario físicamente inviable.

### 5.3. Cantidades admitidas (D2-B)
Para cada modelo de un pedido:

`cantidad = 12 × docenas_surtidas + cantidad_de_colores_extra`

- Si **docenas = 0**, se requieren **6 a 11** prendas adicionales con colores distintos.
- Si hay **una o más docenas**, se pueden añadir **0 a 11** prendas adicionales por colores distintos.
- Mínimo **6 prendas por modelo**. No se permite sumar 3 de un modelo y 3 de otro para cumplir el mínimo.
- Se admiten **varios modelos** en un pedido y docenas múltiples.
- El registro del carrito no bloquea inventario mientras se está editando; el compromiso ocurre al confirmar en transacción.

### 5.4. Precios mayoristas
Sea `P` el precio de docena del modelo y `n` la cantidad total de prendas de ese modelo, con `n ≥ 6`:

`subtotal_exacto = P × n / 12`.

Se aplica **una vez por modelo** la regla de redondeo EVALIA: parte fraccionaria **menor a 0,50 → entero inferior**; **exactamente 0,50 → conservar ,50**; **mayor a 0,50 → entero superior**. El total del pedido es la **suma de subtotales ya calculados**, sin segundo redondeo. Ejemplos documentados: docena Bs 380 × 7/12 → **Bs 222**; docena Bs 381 × 6/12 → **Bs 190,50**.

Los precios se guardan como **snapshot al confirmar el pedido**: cambiar el precio de un modelo no recalcula los pedidos existentes. Sin descuentos automáticos en V1. Cálculos frontend con centavos y `BigInt` en `web/lib/domain.js`; las RPC aplican controles monetarios en PostgreSQL.

### 5.5. Stock físico, compromiso y ventas en feria
La disponibilidad operativa se calcula por modelo, conceptualmente:

`disponible = existencias_publicadas − pedidos_pendientes_de_entregar − compromisos_históricos_activos`.

El stock publicado puede ser **conservador**. Ejemplo aprobado: de 6,5 docenas físicas aptas se pueden publicar solo 6, manteniendo margen externo para contingencias. Es una decisión manual, **no** una obligación automática de restar seis unidades.

La venta física fuera del flujo de pedido se refleja con **ajuste manual rápido** del stock, sin registrar cada comprador o defecto. La operación **no puede consumir prendas comprometidas**. La retirada física real reduce el stock físico y la cantidad pendiente exactamente una vez. No descontar dos veces al confirmar, cobrar o entregar.

### 5.6. Clientes y entregas D8
- El administrador crea clientes con **nombre** y **WhatsApp**.
- Categoría habitual obligatoria para clientes nuevos: `pickup` (retiro local) o `shipping` (envío nacional/interdepartamental).
- Cliente de envío: `shipping_destination` obligatorio (2–200 caracteres). Retiro local: destino nulo.
- La categoría del cliente es una **preferencia**: un pedido concreto puede elegir otro método.
- Al confirmar pedido se guardan **método, destino, nombre y número de destinatario** propios del pedido. Cambios posteriores en la ficha del cliente **no reescriben** ese snapshot.
- Pedidos anteriores a D8 quedan como `legacy` y clientes anteriores como `unclassified` hasta clasificación explícita. No inventar destinos ni asumir retiro local.
- Cambios de modalidad/destino de pedido activo y edición de ficha cliente pasan por RPC auditadas (`migración 014`).

### 5.7. Dos impresiones, privacidad estricta
**Retiro local:** comprobante **A4** con cliente, modelos, tallas, cantidades/composición y **total histórico**.

**Envío:** etiqueta **A6** que contiene **únicamente destino, nombre de destinatario y teléfono**. Quedan estrictamente excluidos modelo, artículos, cantidades, precio, subtotal, total, QR bancario y token del pedido. `web/lib/order-print.js` construye HTML independiente por modalidad, no se limita a ocultar datos con CSS. El navegador abre el diálogo de impresión; no se genera una etiqueta descargable pública ni se presume una empresa transportadora concreta.

### 5.8. Pagos externos, adelantos y retiro
- El cliente puede informar un pago y subir comprobante; queda **PENDIENTE** y **no** disminuye el saldo hasta la verificación administrativa.
- El administrador puede aprobar, observar o rechazar tras constatar el ingreso real. El dinero declarado no implica ingreso confirmado.
- Los abonos parciales persisten.
- Flujo **express D7** cuando corresponde:
  1. **Registrar pago total recibido:** confirma el saldo pendiente real, pero deja el pedido abierto si aún no retiraron.
  2. **Entregar todo y completar:** exige saldo aprobado cero, registra retirada total física y cierra.
  3. **Cobrar saldo y entregar todo:** cobra lo que falta y registra todas las prendas entregadas en **una sola transacción**, con confirmaciones expresas del administrador.
- Si hay comprobantes pendientes/en observación, el cierre de cobro rápido se bloquea para evitar contarlos dos veces. Reintentos idempotentes con actor e historial. Un fallo de stock o entrega revierte la transacción completa.
- **COMPLETADO** requiere saldo aprobado exactamente **cero** y entrega íntegra. No se cierra una venta no cobrada ni se inventa una entrega.

### 5.9. Lo que NO forma parte de V1
No existen reglas aprobadas para devoluciones, reembolsos, cancelaciones de cliente, bonificaciones automáticas, venta a crédito habitual, entrega excepcional con deuda, tarifas de transporte, seguimiento por guía, impuestos/facturación automática, pasarela de pagos ni cuentas públicas de clientes. No implementarlos deduciendo reglas: presentar decisión comercial y pedir aprobación.

---

## 6. Flujos visibles en la aplicación

| Sección del panel | Función principal | Restricción o protección |
| --- | --- | --- |
| Resumen | Indicadores de disponible, prendas pendientes, pedidos activos y pagos por verificar | No confundir existencia física con cantidad vendible |
| Productos | Colores, modelos, una talla por modelo, fotografía, precio docena, stock y ajustes manuales | No crear stock por color ni editar precios históricos |
| Clientes | Alta, búsqueda, edición, categoría habitual de entrega, destino y WhatsApp | No fusionar fichas automáticamente por número |
| Nuevo pedido | Tres pasos: cliente → modelos/docenas/colores → confirmación y modalidad de entrega | No existe nueva reserva; validar cupo y destino en la BD |
| Pedidos | Seguimiento, acciones express, operaciones parciales, enlace cliente y modo de impresión | No acreditar dinero no verificado ni retirar sin pago aprobado |
| Pagos | Comprobantes, avisos y verificación administrativa, QR auténtico | No generar QR bancario imaginario ni aprobar por cuenta del cliente |
| Portal del cliente | Pedido propio, saldo, QR autorizado, envío de captura | Un pedido por enlace secreto; no hay cuenta de comprador |
| Históricos legados | Compromisos de reservas previas al cambio D6 | No son una operación nueva; no modificar ni liberar sin reglas |

El formulario de nuevo pedido tiene **jerarquía de tres pasos**, selector donde toda la tarjeta de producto es clicable, selección y revisión de composición. El bloqueo por cupo ocurre al guardar en BD, no con un simple botón del navegador.

El mensaje para WhatsApp se genera desde un pedido activo tras emitir un enlace privado. Es un **borrador editable y copiable manualmente** con información del pedido, importes aprobados cuando existan y el enlace; no envía mensajes de forma autónoma.

---

## 7. Arquitectura técnica y datos

### Cliente React y dominio
`web/app/page.jsx` implementa el panel y sus interacciones. `web/lib/api.js` encapsula Supabase JS client y RPC. `web/lib/domain.js` y `web/lib/order-selection.js` contienen validaciones y cálculos reutilizables. `web/lib/delivery.js` valida los métodos. `web/lib/order-whatsapp.js` y `web/lib/order-print.js` construyen salidas para comprador y operador.

**Regla de arquitectura:** validación de frontend mejora UX, pero **la autoridad final** para precios, stock, saldos, roles y movimientos es el servidor/SQL, nunca una variable de React. Evitar duplicar reglas entre pantallas; añadir pruebas cuando cambian los contratos.

### Almacenamiento y SQL
El esquema nació con las tablas de catálogo, clientes, inventario y pedidos; se amplió con pagos, evidencias, entregas, enlaces, auditorías y entregas D8. Las migraciones versionadas son parte del sistema; los datos históricos no se “limpian” borrando relaciones.

| Versión de migración | Contenido principal |
| --- | --- |
| 001 `core_schema` | Tablas iniciales, roles y RLS |
| 002 `inventory_api` | Stock, ajustes e incidencias |
| 003 `catalog_real` | Catálogo operativo, fotografías, colores y Storage |
| 004 `reservas_pedidos_rpc` | Operaciones transaccionales originales, conservadas por historial |
| 005 `docenas_colores_extra` | Docenas surtidas, extras por color y persistencia |
| 006 `pagos_y_vencimientos` | Avisos, aprobación y depósitos históricos |
| 007 `entregas_cierre` | Retiro físico y condición de COMPLETADO |
| 008 `enlace_cliente_qr` | Tokens por pedido, QR y evidencias privadas |
| 009 `cron_reservas` | Vencimientos de **reservas históricas** |
| 010 `service_portal_grants` | Permisos mínimos del rol de backend privado |
| 011 `mantenimiento_catalogo_clientes` | Ediciones auditadas y bloqueo optimista |
| 012 `solo_pedidos` | Revocación de nuevas reservas |
| 013 `cobro_entrega_express` | Cobro/retiro total atómico, idempotente y auditado |
| 014 `entrega_envios_impresion` | Categoría de cliente, destino/snapshot por pedido e historial de cambios |

Ruta real: `supabase/migrations/20261123*.sql`. No reejecutar una migración ya instalada en el proyecto remoto. Antes de migrar, comparar historial remoto con archivos y revisar dependencias/grants.

### Seguridad de acceso
- Solo el usuario autenticado con perfil administrativo puede administrar datos y ejecutar RPC sensibles; RLS y `is_evalia_admin()` complementan permisos SQL.
- Los documentos y evidencias se guardan en buckets privados, no en rutas públicas de GitHub.
- Token de cliente aleatorio de alta entropía y **hash SHA-256 en BD**, revocable y limitado a un pedido activo.
- Backend canjea enlace por cookie `HttpOnly`, `Secure` bajo HTTPS y `SameSite=Lax` para enlaces abiertos desde WhatsApp. POST exige verificación de origen.
- Solicitudes, fotos/comprobantes y QR pasan por verificación de permisos. Comprobantes admitidos: JPG/PNG/WebP, hasta 2 MiB según contrato implementado; evitar filtraciones de datos entre pedidos.
- Los documentos de envío son privados por diseño: no renderizar detalles comerciales y esconderlos luego; nunca generarlos en la estructura HTML del envío.
- Se conservaron controles de idempotencia, auditoría y transacciones. No suprimir tests para lograr CI verde.

---

## 8. Ambientes, ramas y publicación

**Git obligatorio:**
- `main` = versiones publicables; **todavía no se promovió aquí esta V1**.
- `dev/evalia-core` = última versión completa aprobada por el propietario.
- `feature/*` = trabajo aislado, pendiente de revisión y prueba.

Flujo comprobado:
1. Revisar branch, HEAD, árbol, historia, PR y CI reales.
2. Crear rama `feature/tema` desde el HEAD de `dev/evalia-core`.
3. Cambiar código y documentación vinculada, agregar/regresar pruebas.
4. Revisar migraciones en un Supabase local de pruebas; **sin datos ficticios en producción**.
5. Construir y publicar **Preview Vercel** desde esa rama; comprobar su URL exacta, no suponerla.
6. El propietario realiza prueba web/móvil/impresión y confirma si es correcta o señala fallas.
7. Solo con aprobación, integrar mediante **fast-forward** si la historia lo permite; verificar nuevo HEAD de `dev/evalia-core`.
8. Proteger `main` hasta decisión de lanzamiento productivo explícita.
9. Iniciar otra fase solo cuando el usuario la autorice. No convertir una idea visual en regla comercial.

**Vercel:** el proyecto existente se creó/importó desde GitHub. La configuración verificada usa `web` como Root Directory, Next.js, Node.js 22 y variables públicas/privadas separadas. Las Previews del proyecto fueron configuradas para que el cliente no necesite iniciar sesión en Vercel; el acceso a datos sigue protegido por Auth/token propio.

**GitHub Pages:** exportación estática de la aplicación administrativa de prueba; el script `prepare-pages.mjs` retira las rutas que necesitan Node. No probar allí el portal privado ni copiar ese modo de exportación a Vercel.

**Supabase:** referencia de proyecto `vbedfbijoqcqpzjzawrh`, API pública `https://vbedfbijoqcqpzjzawrh.supabase.co`. Las 14 migraciones aplicadas coinciden con el historial versionado. El proyecto comercial almacena datos reales. Una revisión nueva debe comprobar su estado sin asumir que los registros/credenciales permanecen iguales al corte.

### QA mínimo por cambio
- Ejecutar `npm run check`.
- Ejecutar `cd web && npm run build`.
- Para cambios de datos, dinero, inventario, autenticación o pagos: `supabase start && supabase test db`.
- Para nuevo acceso público: smoke externo sin cookies/login Vercel; el login admin sigue protegido.
- Para UI: validar 360, 768 y 1280 px; teclado, focus visible, estados inválidos, scroll, textos largos y móvil real.
- Para impresión: verificar salida física/A4/A6, impresión en blanco y negro y privacidad del envío.
- No confundir **build READY** con validación humana completa.

---

## 9. Cómo se construyó en colaboración propietario + ChatGPT

EVALIA se desarrolló **iterativamente**, con decisiones comerciales tomadas por el propietario y trabajo técnico ejecutado por asistentes IA mediante código, herramientas conectadas, documentación y validación.

### Roles y autoridad
**Propietario:** explica el negocio real, costos operativos de registrar información, categorías de clientes, presentaciones, precios, prioridades y excepciones; aprueba o descarta propuestas; prueba desde navegador/móvil y decide cuándo un bloque está correcto.

**Asistente IA (ChatGPT/Codex u otro):** consulta código y fuentes, señala incoherencias, propone soluciones y riesgos, implementa en rama feature, diseña migraciones, detecta primer error real, corrige junto con sus regresiones, ejecuta CI, despliega la Preview, documenta y presenta la prueba reproducible. **No** decide descuentos, políticas de retiro, devolución o exposición de datos por su cuenta.

**GitHub:** registro persistente de código y decisiones; un chat por sí solo no prueba el HEAD real. **Supabase** alberga datos y operaciones; **Vercel** expone la aplicación. El contexto de conversación es auxiliar, no reemplaza estas fuentes.

### Hitos documentados (todos en noviembre de 2026)
1. Descubrimiento inicial: perfil textil y reglas D01–D18; planificación y arquitectura posible en Markdown.
2. Simplificación de inventario: talla fija por modelo, stock global conservador, colores informativos y ventas físicas con ajuste manual.
3. Carrito de docenas surtidas y extras por colores, pedidos multímodelo y precio mayorista exacto.
4. Instalación de Supabase, seguridad, migraciones, control de pagos/depósitos, entregas, QR auténtico y portal privado.
5. Publicación administrativa en GitHub Pages y luego **aplicación completa en Vercel**; se solucionaron permisos del backend y protección de Vercel que obligaba al comprador a iniciar sesión.
6. Decisión D6: **eliminar la creación de reservas**, porque apartaban stock sin compra clara; preservar solamente el historial legado.
7. Mejora de comunicación por WhatsApp y resolución de fallo real del selector de productos; jerarquía de pasos y cobro/entrega express D7.
8. Decisión D8: categorías de clientes, destino por pedido e impresión diferenciada con privacidad de envíos.
9. Cada bloque pasó pruebas automatizadas y prueba funcional del propietario; PR #12 cerró el último bloque, con baseline de código `4270da0a`.

**Patrón de aprobación empleado:** el propietario señala “prueba correcta/aprobada” → la IA verifica CI/HEAD y dependencias → integra al baseline sin forzar ni reescribir → confirma commit y prueba → respeta instrucciones sobre comenzar o **esperar**. Esta dinámica debe mantenerse si se diversifica el trabajo entre chats.

---

## 10. Desarrollo visual, ilustraciones y prototipos: frontera correcta

### Identidad existente (referencia aprobada)
Valores documentados en `docs/01_MARCA_Y_OPERACION.md`:
- Ciruela `#4D3443`.
- Marfil `#F5F0EA`.
- Carbón `#222024`.
- Rosa empolvado `#CFAEB6`.
- Plata suave `#C7C3C6`.

La marca tiene referencias de wordmark/monograma y una variante Champagne Gold; **no inventar un archivo oficial de logotipo** ni sustituirlo por una fuente cualquiera. El repositorio no garantiza disponer del vector oficial. La frase “Destaca en cada detalle” es editorial, no una obligación tipográfica permanente.

### Estado de diseño a este corte
La app opera con CSS y componentes funcionales existentes. Hay mejoras de contraste, selector táctil y pasos visibles, pero **no hay una biblioteca definitiva de diseño ni un rediseño integral aprobado**. Deben distinguirse tres entregables:
1. **Conceptos/ilustraciones**: propuestas visuales en imágenes, sin modificar negocio ni producción.
2. **Prototipos de interfaz**: pantallas, estados y componentes; para aprobar visualmente. Pueden desarrollarse en Figma o HTML aislado si el usuario lo pide.
3. **Implementación real**: integración de componentes en `web/`, con estados de datos, accesibilidad, QA y Preview verificable.

### Inventario visual recomendado para una fase futura (propuesta, no implementado)
Cabecera y navegación; dashboard y KPI; tarjetas de producto e imágenes; paleta de colores; formularios con tres pasos y errores; selector multímodelo; totales y resumen; ficha de cliente y envío; listado de pedidos; acciones express; historial de abonos; comprobantes; QR; portal del comprador; etiquetas A4/A6; estados vacíos, carga, advertencias, confirmaciones, tamaños táctiles y versión móvil. El diseño debe resolver la legibilidad comercial sin añadir clics ni campos que el negocio no necesita.

**Criterios técnicos:** componentes reutilizables, diseño responsive real, contraste, navegación teclado, labels/focus, mensajes de error legibles, no saturación gráfica, rendimiento y pruebas. No dejar imágenes sueltas sin estado hover/disabled/focus/loading, exportaciones ni especificación de integración.

**Protección absoluta:** rediseñar el aspecto de una tarjeta **no** autoriza cambiar precio, cupo, aprobación de pagos, privacidad de envío ni modalidad de entrega.

---

## 11. Organizar ChatGPT Projects y separar conversaciones

**Propuesta organizativa**, no una modificación del software:

| Hilo o área de trabajo | Qué puede producir | Qué NO debe cambiar sin autorización |
| --- | --- | --- |
| **EVALIA — Coordinación y decisiones** | backlog, prioridades, contratos, alcance, revisión de PR | Reglas no aprobadas y promoción a `main` |
| **EVALIA — Desarrollo backend/BD** | migraciones, RPC, seguridad, auditoría, CI | Modelo comercial y datos reales sin respaldo |
| **EVALIA — UX/UI Web** | flujos, componentes, pantallas, estados, responsive, PRs visuales | Precios, cupos, pagos, permisos |
| **EVALIA — Identidad e ilustraciones** | moodboards, paletas, iconos, ilustraciones, assets | Logos “oficiales” no proporcionados, contenido comercial |
| **EVALIA — Prototipos** | diseños alternativos, wireframes, pruebas de interacción | Marcar una imagen como interfaz implementada |
| **EVALIA — QA y publicación** | pruebas, regresiones, verificaciones móviles, previews, release | Cerrar falsamente pedidos o usar base real como sandbox |
| **EVALIA — Evolución comercial** | análisis de nuevas funcionalidades, requisitos y alternativas | Implementar una decisión ambigua sin el propietario |

### Contexto mínimo que debe recibir cada nuevo chat
1. Este documento maestro **y su versión**.
2. El repositorio `axenoban/evalia`, la rama y el HEAD **actualizados**.
3. Para trabajo funcional, los contratos pertinentes en `docs/`, la migración actual y `AGENTS.md`.
4. Encargo específico: pantalla/componente, problema real, aceptación, límites y materiales aprobados.
5. Una regla fija: **no alterar lo estable ni integrar sin prueba y aprobación**.

**Cuidado:** subir este archivo a un Proyecto de ChatGPT no crea por sí solo acceso al repositorio, a Supabase, Vercel o las imágenes del usuario. Cada chat debe verificar su propio acceso a las herramientas y volver a consultar las fuentes actuales. El documento no almacena contraseñas ni tokens.

---

## 12. Plantilla para iniciar nuevos chats de EVALIA

Copiar el siguiente texto y completar las variables del trabajo:

> **Proyecto: EVALIA.** Utiliza como documento base `docs/50_DOCUMENTO_MAESTRO_EVALIA.md` del repositorio `axenoban/evalia`. Antes de tocar código verifica el HEAD y la CI de `dev/evalia-core`, las reglas de `AGENTS.md` y el contrato vigente. La V1 comercial acepta **solo pedidos confirmados**; inventario global conservador por modelo; docenas surtidas con hasta 11 extras por colores distintos; precios históricos y dinero solo tras validación; entrega y cierre transaccionales; clientes de retiro/envío; etiqueta de envío con **solo destino, nombre y teléfono**.  
> **Área de este chat:** [UX / código / QA / ilustración / prototipo / despliegue / análisis].  
> **Tarea concreta:** [describir].  
> **Archivos o pantallas relevantes:** [enlaces].  
> **Qué no se debe alterar:** [reglas/partes].  
> **Criterio de aprobación:** [qué voy a revisar].  
> **Salida esperada:** [propuesta, prototipo, archivo gráfico, PR, Preview, documento].  
> Trabaja en `feature/*`, prueba cambios, presenta evidencia y **espera mi aprobación** antes de integrar. No inventes reglas ni datos.

### Formato breve de cierre de desarrollo
**HECHO** — Qué quedó realmente implementado.  
**COMMIT / RAMA** — HEAD, rama y PR verificados.  
**PRUEBA LOCAL** — Instrucciones específicas de validación.  
**RESULTADO ESPERADO** — Resultado comprobable.  
**SIGUIENTE PASO** — Solo si fue autorizado.

---

## 13. Pendientes y riesgos que no deben confundirse con funcionalidades existentes

- **Rediseño visual moderno y dinámico:** trabajo posterior, aún sin dirección visual final aprobada. Requiere separar propuesta → aprobación → integración técnica.
- **Producción en `main` y dominio final:** no asumir publicación definitiva mientras la rama publicable no se promueva formalmente.
- **Respaldo, monitoreo, acceso y rotación de claves:** verificar al preparar salida a producción; no suponer que los servicios/credenciales quedan asegurados para siempre.
- **Páginas y documentos históricos:** `README.md` y otras guías mezclan estados anteriores. Aplicar prioridad D6/D7/D8 y comprobar implementación, no “revertir” por una frase de 2026-11-22.
- **Inventario físico de colores:** no hay existencias por color; un futuro control más preciso exige análisis operativo y aprobación.
- **Etiquetado de transporte:** la etiqueta expone solo los tres campos definidos; no agregar automáticamente contenido, precio, número de pedido, código QR, logo de operador o datos bancarios.
- **Cobro express:** es declaración administrativa de un pago externo **verificado por la persona**, no certificación automática bancaria.
- **Reservas legadas:** existen por trazabilidad SQL; no deben reaparecer como formulario para ventas nuevas.
- **Reglas comerciales adicionales:** descuentos, devoluciones, reembolsos, entregas con deuda, transporte tarifado, facturación o cuentas de compradores requieren decisión del propietario.
- **Diseño gráfico:** no afirmar que el logo vectorial oficial, un kit de componentes completo o las ilustraciones de productos ya están disponibles en el repo si no se verificaron.

---

## 14. Índice de fuentes y mantenimiento del documento

**Fuentes prioritarias del contrato vigente:**
- `docs/49_ENTREGAS_ENVIOS_IMPRESION.md` — D8, clasificación, snapshot, impresión privada.
- `docs/48_PEDIDOS_UX_COBRO_EXPRESS.md` — D7, selector, pasos y cobro/retiro express.
- `docs/47_AJUSTES_UX_PRE_REDISENO.md` — WhatsApp y limpieza de opciones de reserva.
- `docs/46_DECISION_SOLO_PEDIDOS.md` — D6: no crear nuevas reservas.
- `docs/39_CAPTURA_DOCENAS_COLORES_INDIVIDUALES.md` — docenas + extras, mínimo por modelo.
- `docs/33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md` y `docs/32_D0_C1_STOCK_CONSERVADOR.md` — stock global y prudencia física.
- `docs/18_PRECIOS_MAYORISTAS_Y_CLIENTES.md` — fórmula y redondeo.
- `docs/41_CICLO_OPERATIVO_PAGOS_PORTAL.md` — cobros, entregas, QR y acceso privado.
- `docs/01_MARCA_Y_OPERACION.md` — identidad de marca.
- `AGENTS.md`, `web/`, `supabase/migrations/`, `tests/` y workflows — implementación verificable.

**Regla de actualización de este documento fuente:**
1. Al aprobar un nuevo bloque, verificar HEAD real y pruebas.
2. Registrar en `docs/50_DOCUMENTO_MAESTRO_EVALIA.md` el cambio de contrato/estado y enlace a su archivo de detalle.
3. No eliminar los documentos anteriores; etiquetar decisiones superadas o referenciar el contrato vigente.
4. Mantener un changelog corto: **fecha · cambio · rama/commit · aprobación · pruebas**.
5. Si el código contradice el documento, no inventar una explicación: detener cambios de alto riesgo y resolver la discrepancia con el propietario.

### Registro de versión documental
| Versión | Fecha | Motivo |
| --- | --- | --- |
| 1.0 | 23-11-2026 | Consolidación tras aprobación de D8 / PR #12. Fuente de transferencia para nuevos chats y líneas de trabajo. |

**Fin del documento.**