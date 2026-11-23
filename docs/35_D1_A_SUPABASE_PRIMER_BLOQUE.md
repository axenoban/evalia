# EVALIA — D1-A: esquema inicial Supabase, seguridad e inventario

**Fecha:** 2026-11-23. **Estado:** candidato implementado en rama feature; pendiente de prueba local. **Contratos:** [D0-F aprobado](34_D0_F_MODELO_LOGICO_SIMPLIFICADO_PROPUESTA.md), [D0-C2/D/E aprobados](33_D0_C2_D_E_INVENTARIO_SIMPLE_APROBADO.md).

## Implementado

- **14 tablas** base en PostgreSQL: administradores, clientes, colores globales, modelos de talla única, colores ofrecidos por modelo, inventario agregado por modelo, movimientos técnicos, reservas y líneas, pedidos y líneas, entregas y líneas, incidencias de faltante.
- **Sin inventario por color**; los surtidos garantizan cantidad por modelo, sin distribución por tonalidad.
- Tablas de reservas, pedidos y entregas solo **estructurales**, todavía sin funciones de guardado, confirmación, retiro ni caducidad; no concederles INSERT/UPDATE/DELETE al navegador.
- **Supabase Auth + RLS**: administrador explícito, sin autoasignación al registrarse. Los datos privados no son legibles por usuario anónimo. Las funciones de inventario verifican que el usuario autenticado pertenezca a admin_profiles.
- API administrativa de inventario: get_model_stock (S/R/P/A), adjust_model_inventory (add, physical_sale, set_total) y flag_stock_shortage (incidencia real). Ajustes bajo bloqueo por fila de model_inventory, versión de lectura e idempotencia por UUID; historial automático.
- Un ajuste ordinario no puede dejar S menor que R+P. Un faltante real se registra y bloquea el modelo, **sin modificar cupos, inventario declarado, dinero ni pedidos**. La conciliación comercial y el desbloqueo están pendientes; no improvisarlos.

## Invariantes obligatorios de D1-B

1. Cualquier futura operación que cree o transfiera compromisos debe bloquear la MISMA fila de model_inventory por modelo, usando orden estable al operar varios modelos. No activar reservas hasta implementar y probar este control.
2. R es suma de líneas de reservas guardadas o en revisión; P es suma de prendas de pedidos aún no entregadas. Convertir R→P no duplica cupo. Al entregar, disminuir S y P exactamente una vez.
3. La cantidad de prendas es entera; el precio docena es NUMERIC exacto. Mínimo mayorista por modelo: seis; sin descuentos V1.
4. Para completar pedidos deben existir operaciones verificadas de pagos/entregas; este bloque no habilita cobros, QR ni enlaces privados.
5. No se preconfiguran colores, tallas válidas, importes ni datos personales.
6. Los modelos existentes tienen talla fija. Se niega UPDATE directo de la columna size_label al rol autenticado.
7. Modelos bloqueados por incidencias NO deben aceptar nuevas reservas; D1-B deberá comprobar blocked en cada transacción.

## Prueba local

Requiere Docker y Supabase CLI. En la raíz del repositorio, ejecutar sucesivamente:

    supabase start
    supabase db reset
    supabase test db
    supabase db lint --schema public

**Nunca ejecutar supabase db reset --remote contra un proyecto real**: podría restablecer destructivamente la base remota.

El test supabase/tests/database/001_core_security.test.sql incorpora **20 comprobaciones pgTAP** de tablas, RLS y privilegios. **Las pruebas no se han ejecutado aquí:** el entorno disponible carece de Docker, PostgreSQL y CLI de Supabase. Las carreras, la autorización con cuentas reales y las operaciones de negocio tendrán más tests antes de validar el bloque.

## Dar de alta al primer administrador (solo entorno de desarrollo)

Crear primero un usuario auténtico en Supabase Auth. Como operador privilegiado en un entorno local/aislado, insertar manualmente su UUID real en admin_profiles, sin guardar credenciales o identificadores personales en GitHub. Ejemplo de instrucción, sustituyendo el marcador:

    insert into public.admin_profiles(user_id)
    values ('<UUID_REAL_DEL_ADMINISTRADOR>');

Una cuenta Auth sin fila en admin_profiles **NO** debe administrar datos ni ejecutar inventario.

## Pendientes fuera de D1-A

No existe app Next.js, despliegue, instancia Supabase vinculada, QR real, pagos, Storage, enlaces, cron o reservas operativas. El PR permanece en borrador. **Siguiente bloque D1-B:** operaciones transaccionales de reserva/confirmación/entrega y calendario G01, con idempotencia y tests de concurrencia. Después: abonos, acceso privado, QR y cierre.
