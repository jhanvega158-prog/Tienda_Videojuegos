# Migración verificada en Supabase

Verificación realizada el 23 de septiembre de 2026, después de que el usuario confirmó la ejecución manual del SQL.

Se consultó PostgreSQL en modo de solo lectura. Se comprobó:

- Existencia de las tres columnas PayPal en `pagos`.
- CHECK `chk_metodo_pago` con PAYPAL y todos los métodos históricos.
- Cinco índices únicos previstos, incluidos Order ID, Capture ID y un intento activo por cliente.
- Las cuatro tablas privadas tienen RLS habilitado y no permiten SELECT a `anon` ni `authenticated`.
- Los ocho triggers `jjc_backend_only` están habilitados.
- Los triggers históricos de fulfillment y auditoría excluyen explícitamente el proveedor PAYPAL; los generadores de referencias se conservan.
- Auditoría PayPal instalada y habilitada.
- Escrituras financieras desde `authenticated` revocadas y políticas SELECT administrativas presentes.
- Spring Boot aceptó la versión del esquema y completó el arranque conectado a Supabase.

Pruebas HTTP sobre el backend local:

| Solicitud | Resultado |
|---|---|
| `GET http://localhost:8080/api/paypal/config` | 200; Sandbox, USD, Client ID configurado; únicamente tres campos públicos |
| `POST /api/paypal/orders` sin token | 401; no se creó una orden |

El backend quedó ejecutándose en el puerto 8080. No se volvieron a aplicar migraciones ni se escribieron registros comerciales durante la verificación. No se realizó una compra ni captura PayPal. El siguiente paso es la compra de aceptación con una sesión CLIENTE y comprador Personal Sandbox; LIVE permanece deshabilitado.
