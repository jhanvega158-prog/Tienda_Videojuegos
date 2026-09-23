# Configuración PostgreSQL local

**Este registro describe la etapa anterior a recibir la contraseña. La conexión ya fue autenticada y el esquema inspeccionado: ver [estado actual y SQL exacto](postgresql-verified.md).**

La URI proporcionada corresponde a **Supabase Session Pooler**, puerto 5432, no Direct connection. Se utilizó exactamente ese host y usuario; no se intentó ni se cambió una conexión directa por un supuesto fallo IPv6.

Variables configuradas únicamente en `backend/.env`:

```dotenv
DATABASE_URL=jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres.follkdzcpsjzhproposs
DATABASE_PASSWORD=
```

La contraseña debe completarse localmente, sin comillas ni codificación URI: es una variable separada, no parte de la URL. No usar literalmente `[YOUR-PASSWORD]` ni `MI_PASSWORD`. No se modificaron las variables PayPal. `.env` continúa ignorado por Git y estas variables no están en Angular.

`application.yml` ya lee `${DATABASE_URL}`, `${DATABASE_USERNAME}` y `${DATABASE_PASSWORD}`. `spring.sql.init.mode=never` evita ejecutar SQL automáticamente. `sslmode=require` exige cifrado; para validar también identidad/cadena del servidor se necesita configurar `verify-full` y el certificado raíz correspondiente, como explica la guía general.

Resultados de esta comprobación:

- Conexión TCP al host proporcionado, puerto 5432: correcta.
- Negociación inicial PostgreSQL: servidor admite TLS.
- Ejecución de `start-backend.ps1`: detención explícita por `DATABASE_PASSWORD` vacío. **No se ha validado autenticación PostgreSQL ni una conexión Spring Boot a Supabase.**
- Corregido el separador de `.env` para Windows PowerShell: `-split '=', 2`, conservando signos `=` dentro de los valores.

Para completar la configuración local:

```powershell
cd C:\Users\LENOVO\Desktop\front_bd2
notepad backend\.env
# Completar DATABASE_PASSWORD y guardar, sin cambiar PayPal.
powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\start-backend.ps1
```

Antes de aplicar la migración, el control de esquema del backend impedirá habilitar pagos. Eso es distinto de un error de conexión.

## SQL manual y orden de ejecución

1. **Ahora:** abrir Supabase → SQL Editor → New query y ejecutar el contenido completo de `docs/paypal-inspection.sql`. Solo consulta columnas, restricciones, triggers, funciones y políticas. Compartir esos resultados permite revisar las definiciones reales sin credenciales.
2. **Tras revisar la inspección:** ejecutar el contenido completo de `paypal-migration.sql`, desde `begin;` hasta `commit;`, en una consulta nueva. No ejecutar fragmentos aislados ni quitar sus comprobaciones para forzarlo.
3. Confirmar el resultado antes de continuar con una compra Sandbox. No se ejecutó ninguna migración desde el agente.

Revisión del archivo de migración: añade columnas PayPal y tablas privadas; crea índices únicos; conserva datos históricos; reemplaza la definición del trigger heredado reconocido para excluir PayPal y evitar doble fulfillment; agrega auditoría y bloqueos de escrituras financieras desde el navegador. También modifica permisos y políticas SELECT. Por tanto, no es solamente un conjunto de columnas adicionales. Ante CHECK, enum o trigger no reconocido aborta la transacción. La inspección remota sigue pendiente y no se certifica compatibilidad con cuerpos de triggers aún desconocidos.

Referencia: [conexión directa y Session Pooler en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
