# EVALIA — G06-VALIDACIÓN: aprobación administrativa de pagos comunicados por clientes (v0.1)

**Fecha:** 2026-11-22. **Estado:** decisión expresamente aprobada y registrada en rama feature. No hay SQL, aplicación, autenticación de clientes ni integración bancaria. PR #1 continúa en borrador, sin merge.

## Declaración literal

> esta bien, el administrdor debe aprobar el pago si el cliente agrega un pago

**Contexto de aprobación:** el propietario aceptó que un pago informado se registre **pendiente de verificación**, y que **solo el administrador pueda aprobarlo tras comprobar la recepción**. La aprobación afecta depósitos de reservas y pagos parciales de pedidos.

## Reglas confirmadas

1. **Cliente informa/agrega pago:** se registra una **declaración PENDIENTE DE VERIFICACIÓN**, asociada a cliente y reserva o pedido. No representa dinero recibido, no suma abonos, no reduce saldo, no protege del vencimiento de feria G01 y no confirma pedido.
2. **Administrador comprueba y aprueba:** únicamente un administrador autorizado puede marcar ese pago como **APROBADO / RECIBIDO** tras verificar que el dinero realmente ingresó. **Entonces**, y no antes, el importe se suma **una sola vez** al acumulado recibido y reduce el saldo del pedido. El cliente **no puede aprobar su propio pago**.
3. **Varios pagos:** cada declaración y aprobación se identifica y audita por separado. El total abonado del pedido solo contiene **pagos aprobados**, incluido el depósito de la reserva vinculado a su pedido confirmado, sin duplicarlo.
4. **Validación administrativa de un depósito de reserva:** solo un ingreso **aprobado y efectivamente recibido antes del vencimiento ordinario F** puede proteger la reserva según G01; en ese caso el límite ampliado sigue **L=F+7 días naturales, 12:00**, contados desde F y no desde el pago. Los avisos pendientes no extienden F.
5. **Reintentos y simultaneidad:** aprobar la misma declaración diez veces o transferir su referencia de reserva a pedido repetidamente debe generar **un solo abono**. No contabilizar dos veces una transferencia que el cliente vuelva a notificar. Propuesta técnica: identificador estable de declaración y evento único de aprobación, operación atómica y auditoría.
6. **No aprobar por captura o mensaje:** una foto de comprobante, WhatsApp o declaración del cliente **no demuestra por sí sola que EVALIA recibió el dinero**. El administrador debe constatarlo. Medio, evidencia y criterios específicos de comprobación siguen pendientes.
7. **No alterar G03-B ni G06 económico:** cancelar prendas pendientes no modifica automáticamente pagos aprobados ni declara devolución, retención, descuento o crédito. Declaraciones pendientes continúan visibles; ajustes por cancelación, exceso y anulaciones se concilian según política aún abierta.
8. **Límites de alcance D01/R01/R11/R12 y D13:** la primera versión es administrativa, con WhatsApp manual y **sin solicitudes públicas ni cuentas de cliente aprobadas**. La frase «si el cliente agrega un pago» confirma que el **aviso puede originarse en el cliente y necesita aprobación**, pero NO decide aún qué interfaz utilizará para agregarlo directamente: en E1 el administrador puede registrar manualmente como pendiente un aviso recibido por WhatsApp. **Un portal autenticado para el cliente, formulario público, subida de comprobante o API de pagos requieren decisión de producto/seguridad separada.** No habilitar escrituras públicas por inferencia.
9. **Estado de rechazo, anulación o corrección:** procedimiento exacto aún sin aprobar; no borrar silenciosamente declaraciones. Puede permanecer pendiente hasta revisión, sin efecto monetario.

## Máquina de estados conceptual

```text
CLIENTE INFORMA PAGO (fuera del sistema o futuro canal autorizado)
                  |
                  v
         PENDIENTE DE VERIFICACIÓN
            (no suma dinero)
                  |
                  v
      ADMINISTRADOR COMPRUEBA RECEPCIÓN
                  |
                  v
          APROBADO / RECIBIDO
           (un solo abono)
                  |
                  v
      ACTUALIZAR SALDO y G01 SI APLICA
```

El paso de pendiente a recibido **no es automático**. La aprobación y su autor deben conservarse en el historial.

## Ejemplo monetario

Pedido histórico: **Bs 840**.

| Suceso | Abonado aprobado acumulado | Saldo |
| --- | ---: | ---: |
| El cliente informa Bs 200; **pendiente** | **Bs 0** | **Bs 840** |
| El administrador aprueba Bs 200 | **Bs 200** | **Bs 640** |
| El cliente informa otros Bs 300; **pendiente** | **Bs 200** | **Bs 640** |
| El administrador aprueba Bs 300 | **Bs 500** | **Bs 340** |
| Informa Bs 340; **pendiente** | **Bs 500** | **Bs 340** |
| El administrador aprueba Bs 340 | **Bs 840** | **Bs 0** |

Pedido confirmado **Bs 610,50** con avisos Bs 200 y Bs 110,50: solo los importes aprobados cuentan. Si ambos se aprueban, suma **Bs 310,50** y quedan **Bs 300**; no redondear nuevamente pagos o saldo.

## Riesgo de pago informado antes de F pero aprobado después

Si un cliente informó una transferencia antes de F pero la recepción se verifica **después** de que la reserva expiró y su stock fue liberado, **NO reactivar ni volver a bloquear stock automáticamente**. Conservar fecha del aviso, fecha efectiva de recepción cuando sea comprobable, fecha/hora de aprobación y abrir revisión administrativa de cronología e inventario. **No se ha fijado una política para pagos tardíamente acreditados**; no asignar una regla inventada de retroactividad ni cambiar F.

## QA de aceptación — documental, no ejecutable aún

| Escenario | Resultado esperado |
| --- | --- |
| Cliente informa Bs 200 de pedido Bs 840 | PENDIENTE; abonado 0, saldo 840 |
| Admin comprueba y aprueba Bs 200 | APROBADO/RECIBIDO; abonado 200, saldo 640 |
| Cliente informa Bs 300 adicionales y queda pendiente | Abonado sigue 200 y saldo 640 |
| Admin aprueba los Bs 300 | Abonado 500, saldo 340 |
| Ejecutar 10 veces aprobación de mismo evento Bs 300 | Un abono de 300, no 3000 |
| Pedido Bs 610,50, aviso 110,50 pendiente | Aviso NO altera saldo; tras aprobación suma 110,50 exactos |
| Cliente intenta autoaprobar su pago | Rechazado por autorización; solo admin puede aprobar |
| Reserva tiene aviso pendiente de depósito al llegar F | Aviso por sí solo NO extiende la reserva |
| Pago informado antes de F y aprobado después de caducidad y liberación | NO reactivar automáticamente stock; incidencia administrativa |
| Depósito oportuno aprobado pasa de reserva a pedido | Se imputa una vez, no crea segundo cobro |
| Cancelación de 7 prendas pendientes con pagos aprobados | Se libera stock según G03-B, no se reembolsa ni retiene dinero automáticamente |
| Cualquier acceso público a datos de pago de otros clientes | No autorizado; no publicar portal sin definición D13/G02 |

## Estado y siguiente decisión

**G06-VALIDACIÓN resuelto:** un pago informado/agregado por cliente debe ser **aprobado exclusivamente por administrador** para contar como recibido, disminuir saldo o servir de depósito protector. No se aprobó envío automático, validación por captura ni autoaprobación.

**G06/D13 pendiente:** cómo podrá **agregar directamente el pago el cliente** (seguir con WhatsApp y captura del administrador en E1 o autorizar más adelante un portal autenticado); criterios de comprobante, rechazo/reversas, pagos acreditados después de F, créditos/devoluciones, importes mínimos y exceso. El mecanismo de clientes **no se implementa sin un contrato de autenticación y permisos aprobado**.

**PR #1 permanece DRAFT, sin SQL, sin merge ni cambios en main.**

## Decisión D13-E1 posterior: el cliente SÍ declara pago mediante enlace por pedido
La aprobación posterior del propietario **autoriza una vista mínima por enlace privado único de pedido** sin cuenta. En esa vista el cliente **puede subir la captura del comprobante e informar monto**, y ver estado; esto supera la antigua limitación de «solo administrador captura avisos» **solo para ese pedido**. Se mantiene el contrato principal de validación: declaración **PENDIENTE**, y **solo administrador verifica y aprueba**, mientras observaciones/rechazos no abonan. Enlace secreto/revocable, captura privada, ACL servidor, sin pasarela ni login cliente. Sigue fuera de alcance que el cliente cree/confirme/cancele pedidos o acceda a otros. [Acceso](24_PORTAL_CLIENTE_ENLACE_PRIVADO.md) · [QR/comprobante](25_QR_Y_COMPROBANTES_CLIENTE.md).
