# EVALIA — G06-CLIENTE: QR como imagen, comprobante y aprobación manual (v0.1)

**Aprobado:** 2026-11-22. El propietario confirmó el flujo propuesto «cliente ve QR, agrega pago con captura y administrador verifica» y la modalidad de **enlace privado por pedido** sin cuenta de cliente. **No se aprueban pasarelas de pago ni tarjetas, QR dinámico generado por un banco, API bancaria ni validación automática.** Documentación para E1, sin SQL ni aplicación.

## Política comercial y alcance

**Cliente por enlace privado de UN pedido (D13-E1):**
1. Consulta resumen de ese pedido, **precio histórico confirmado**, total **abonado aprobado**, saldo pendiente y estado de sus declaraciones. No ve información de otras operaciones.
2. Visualiza **un QR de pago como imagen** proporcionada/administrada por EVALIA. Puede **descargar la misma imagen** o hacerle una captura. La aplicación **no procesa el pago**, no lo genera mediante pasarela y no confirma transacciones bancarias.
3. Paga fuera de EVALIA utilizando la aplicación de su entidad financiera. Vuelve a su pedido y elige **Agregar pago**.
4. Informa **monto abonado en Bs**, adjunta **captura del comprobante** del pago y puede proporcionar fecha y nota/referencia adicionales. La captura es parte obligatoria de este canal de autoservicio aprobado; si aún no tiene comprobante, no debe registrar un pago como recibido.
5. Al enviar, la declaración queda **PENDIENTE DE VERIFICACIÓN**; puede consultar su estado. **No disminuye el saldo, no confirma depósito ni protege por sí sola una reserva.**

**Administrador:**
6. Recibe en su bandeja una declaración relacionada con ese pedido y consulta **captura original, monto declarado e historial** (sin URLs públicas). Compara contra **ingreso realmente recibido** por EVALIA; la imagen o el mensaje solo son evidencia declarada, no prueba infalible.
7. Puede marcar **APROBADO/RECIBIDO** solo al constatar el dinero, **EN OBSERVACIÓN** si necesita verificar/corregir y **RECHAZADO** si no corresponde. En observación/rechazado **no es abono**; conservar declaración, motivo/observación y auditoría. No sustituir aprobación por revisión de OCR ni automatización.
8. Al aprobar, se registra **un solo abono** que reduce el saldo del pedido y queda ligado a la declaración original. Un mismo comprobante/identificador bancario reportado más de una vez no puede contabilizarse dos veces sin revisión.
9. El cliente puede consultar el resultado y **hacer una nueva declaración** con comprobante corregido si le corresponde; conservar evidencia histórica y no sobreescribir/eliminar aprobaciones. El detalle de reversión de pagos previamente aprobados sigue pendiente de política.

## QR: implementación funcional aprobada y límites

- **QR único inicial para EVALIA**, tratado como **imagen administrada** (no generado automáticamente desde importe o pedido), con visualización y acción **Descargar QR**. La captura de pantalla debe seguir siendo posible.
- **El administrador proporciona/actualiza la imagen** legítima. No inventar datos bancarios, nombres de titulares, QR real, identificadores de cuenta ni enlaces de pago. Datos informativos de banco/titular, solo cuando se faciliten/aprueben.
- Evitar mostrar una imagen antigua o reemplazada sin control de versión. **No asumir que cualquier QR bancario es permanentemente reutilizable:** verificar con la entidad financiera si el QR entregado es reutilizable o vence; no implementar QR vencido como estático.
- La descarga es **del QR de EVALIA**, no del comprobante privado de otro cliente. El QR es instrucción visual de pago externo, no una confirmación de dinero recibido.
- Sin tarjetas, Stripe, billeteras integradas, links de checkout bancario ni pasarela en E1. No inferir tarifas de transacción, impuestos o tipo de cambio.

## Evidencia y controles técnicos mínimos

| Riesgo | Control necesario |
| --- | --- |
| Cliente agrega captura ajena o monto falso | Pago sigue PENDIENTE; solo administrador verifica ingreso y aprueba |
| Captura duplicada o mismo cobro reportado varias veces | Identificador de declaración, comprobación administrativa, protección de doble abono, auditoría |
| Cliente accede al comprobante de otro | Almacén privado, autorización por **pedido del enlace**, lectura limitada; prohibir buckets públicos |
| Carga de archivo malicioso, excesivo o SVG | Validar tamaño, tipo real y extensión, aceptar **imágenes raster** permitidas (p. ej. JPEG/PNG/WEBP), sanitizar nombre, imponer límites; tipos/MB exactos y antimalware sujetos a validación técnica |
| Archivo subido a pedido equivocado | Backend extrae identidad de pedido del enlace seguro, no de IDs editables del navegador |
| Usuario cliente manipula estados o saldo | Aprobación/admin únicamente en backend y RLS; frontend no concede permisos |
| URL de imagen publicada con token persistente | URL privada firmada temporal y acceso restringido; no publicar comprobantes en repo ni CDN abierta |
| Enlace de pedido filtrado | Revocación/regeneración, token no predecible y autorización limitada |
| Pago mayor que saldo | No crédito ni devolución automática; señalar discrepancia/conciliación G06 |
| Comprobante rechazado/en observación | No abono; conservar trazabilidad; permitir nuevo reporte sin destruir historial |

**Los límites de tamaño, MIME definitivo y duración de imágenes firmadas deben fijarse y probarse técnicamente antes de publicar**, sin inventar una cifra canónica. En Supabase, se propone almacenamiento privado de comprobantes con políticas de acceso y rutas de servidor; no pasar claves privilegiadas al navegador.

## Estados visibles

| Estado | Vista del cliente | Efecto sobre saldo |
| --- | --- | --- |
| **PENDIENTE DE VERIFICACIÓN** | «Comprobante recibido. Pendiente de revisión» | **Sin cambio** |
| **EN OBSERVACIÓN** | «Se necesita revisar información del pago» (observación permitida) | **Sin cambio** |
| **RECHAZADO** | «El pago informado no fue validado» (motivo visible si apropiado) | **Sin cambio** |
| **APROBADO / RECIBIDO** | «Pago confirmado» | **Reduce saldo una sola vez** |

**Recomendación de UX:** mostrar claramente saldo calculado solo con abonos aprobados y, por separado, la lista de comprobantes no aprobados; no anticipar falsamente descuentos en saldo.

## Flujo de ejemplo con estados

Pedido: **Bs 840**; QR visible en pantalla. Cliente declara pago Bs 200 y sube imagen.

- **Al enviar**: abonos aprobados Bs 0, saldo Bs 840, comprobante **PENDIENTE**.
- **El administrador revisa y aprueba Bs 200** tras verificar recepción: abonos Bs 200, saldo Bs 640.
- **Cliente informa Bs 300 con otra captura**: primer abono 200 permanece, segundo **PENDIENTE**, saldo Bs 640.
- **Administrador aprueba segundo comprobante**: abonos Bs 500, saldo **Bs 340**.
- Si la declaración de Bs 300 termina **EN OBSERVACIÓN o RECHAZADA**, abonos continúan **Bs 200**, saldo **Bs 640**.
- Pedido con importe Bs 610,50, pago aprobado Bs 110,50: usar centavos exactos, **no redondear pagos**.

## QA funcional documentada (sin código)

1. La imagen QR se **visualiza y descarga** correctamente en móvil/PC; no altera estado de pedido ni crea pago.
2. Un cliente con enlace del pedido A **no accede** a QR privado de otra organización, pedido B, comprobante de B ni panel del administrador.
3. El formulario Agregar pago **requiere importe y captura de imagen**; mostrar error seguro para tipo/tamaño inválido o fallo de carga. Fecha/nota adicionales no verifican recepción.
4. Tras cargar una captura, el pago figura **PENDIENTE**, saldo sin cambio; el archivo permanece privado.
5. Admin marca **EN OBSERVACIÓN**: saldo intacto, historial no perdido; no confundir con cobro confirmado.
6. Admin marca **RECHAZADO**: saldo intacto, historial conservado; cliente puede reportar corrección como nuevo evento sin borrar original.
7. Solo aprobación admin de importe constatado ⇒ **un solo abono**; reintento de aprobación 10x ⇒ una imputación.
8. Cliente intenta modificar estado a aprobado mediante URL/JSON, cambia ID de pedido o consulta comprobantes ajenos ⇒ **denegado en backend**.
9. Dos declaraciones con mismo comprobante/referencia se señalan para revisar, no autoaprobar ambas ni crear doble cobro.
10. Un depósito aprobado de una reserva y trasladado a pedido **no duplica evento**; una declaración pendiente **no protege reserva F**.
11. Cancelación parcial de prendas pendientes G03-B preserva pagos e historial sin reembolsos automáticos.
12. QR sustituido por admin ⇒ versión vigente mostrada; no usar QR bancario ya vencido; no se inventa contenido de QR.
13. No se registra ningún dato real de pagos, cuentas, tokens, QR ni comprobantes en GitHub público.
14. Copiar/enviar el enlace manualmente no autoriza enviar WhatsApp por API ni concede acceso a otros pedidos.

## Decisiones abiertas (no implementar supuestos)

- **Vigencia/rotación del enlace**, revocación ante extravío y tratamiento del enlace una vez pedido finalizado.
- **Comprobante**: máximos de tamaño, tipos aceptados definitivos, retención y manejo de imágenes ilegibles.
- **QR real**: imagen proporcionada por propietario, entidad bancaria y si es reutilizable; no generar cuenta/QR ficticio.
- **Monto informado**: procedimiento exacto si hay discrepancia, pagos superiores, duplicados, rechazo y reversión de aprobado.
- **Entrega de link**: WhatsApp manual aprobado; notificaciones automáticas fuera de alcance.
- **Reserva antes de pedido**: envío de depósito por WhatsApp/admin hasta autorizar enlace de reserva; vínculo al pedido una vez confirmado sin doble cobro.
- **Impuestos, gastos de envío, devolución de pagos, cancelación y reembolsos** siguen políticas separadas.

**Prevalencia:** estas decisiones posteriores **amplían E1 exclusivamente para consultar UN pedido y subir un comprobante mediante su enlace privado**. Sustituyen frases históricas «no interacción directa de cliente» en ese alcance; el resto de controles de reserva/admin/autorización sigue vigente. [Acceso privado](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md). PR #1 DRAFT, no SQL ni merge.
