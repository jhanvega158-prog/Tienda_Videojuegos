# Conexión PostgreSQL verificada y SQL pendiente

**Actualización:** el usuario ejecutó la migración y su aplicación ya fue comprobada en Supabase. Spring Boot arrancó correctamente. Ver [resultado de verificación](paypal-migration-verified.md). El resto del documento conserva la revisión previa a esa ejecución.

Estado actual: contraseña configurada localmente en `backend/.env`, excluido de Git. Las credenciales PayPal no se modificaron.

Se ejecutó el arranque real mediante `start-backend.ps1`. Hikari confirmó una conexión PostgreSQL al Session Pooler de Supabase. No hubo error de autenticación, tenant, red ni TLS. Spring se detuvo después por `PaymentSchemaCheck`, porque todavía no existe la versión de esquema PayPal. Esta detención es intencional y no es un fallo de contraseña.

La URL exige `sslmode=require` para el tramo cliente → pooler. La vista `pg_stat_ssl` consultada a través del pooler describe su conexión interna a PostgreSQL, no sirve para medir el TLS del cliente al pooler.

## Inspección real de solo lectura

Se consultaron columnas, defaults, CHECK, claves, políticas y cuerpos completos de triggers. No se ejecutaron INSERT, UPDATE, DELETE ni DDL en Supabase.

Hallazgos incorporados en los archivos locales:

- `orden_detalle.nombre_videojuego` es obligatorio. Spring lo guarda y lo utiliza como snapshot del título comprado.
- `chk_metodo_pago` no admitía PAYPAL. La migración amplía exactamente la definición inspeccionada, preservando todos los métodos históricos.
- `generar_numero_orden()` y `generar_referencia_pago()` respetan las referencias explícitas. Se conservan; la migración verifica las huellas de sus cuerpos.
- `registrar_cambio_estado_pago()` ya crea auditoría. Se excluye PAYPAL de ese trigger para que la auditoría nueva no duplique transiciones.
- `procesar_pago_aprobado()` ya descuenta stock y vacía todo el carrito. Se excluye PAYPAL de su trigger, conservando el comportamiento histórico para otros proveedores. Spring será el único responsable del fulfillment PayPal.

## Paso manual siguiente

1. Abrir **Supabase → SQL Editor → New query**.
2. Copiar **todo el archivo actualizado `paypal-migration.sql`**, desde `begin;` hasta `commit;`.
3. Ejecutarlo una sola vez como transacción completa. No quitar sus comprobaciones si aparece un error.
4. Confirmar que terminó correctamente, o compartir únicamente el mensaje de error. No enviar credenciales.

El SQL no borra compras ni datos históricos. Agrega campos/tablas/índices, amplía el CHECK conocido, adapta las condiciones de los triggers mencionados y restringe escrituras financieras desde el navegador. RLS permanece habilitado. Si una definición desconocida o un dato incompatible aparece, la transacción se revierte.

No se ejecutó esa migración en Supabase. No se realizaron Create Order, Capture Order ni una compra Sandbox. Se espera la confirmación del usuario antes de continuar.

Validación de los ajustes: `mvnw.cmd -q package` terminó con salida 0 y 26 pruebas aprobadas. El fixture local ahora incluye el nombre obligatorio, el CHECK real y las definiciones inspeccionadas de generadores/auditoría. Las pruebas comprueban también reaplicación del SQL y una única auditoría/entrega. El servidor PostgreSQL local de pruebas se detuvo al terminar.
