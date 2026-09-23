# Validación de la integración PayPal Sandbox

**23 de septiembre de 2026:** migración manual comprobada en Supabase, backend arrancado, configuración pública HTTP 200 y creación sin sesión HTTP 401. Detalle: [migración verificada](paypal-migration-verified.md). Compra Sandbox completa todavía pendiente.

**Actualización más reciente:** Spring Boot ya autenticó una conexión PostgreSQL real a Supabase y se inspeccionó el esquema remoto con SELECT. El arranque se detuvo por la migración pendiente, no por conexión. Se corrigieron el snapshot obligatorio de nombre, el CHECK y la compatibilidad con los triggers observados. Ver [conexión verificada y SQL pendiente](postgresql-verified.md). Los párrafos siguientes conservan el historial de validaciones anteriores.

Actualización PostgreSQL posterior: URL JDBC y usuario Session Pooler configurados; TCP 5432 y soporte TLS comprobados. Falta la contraseña local, por lo que no se ha autenticado Spring Boot en Supabase. Detalles y orden del SQL manual: [estado PostgreSQL](postgresql-setup-status.md).

Actualización de configuración: Client ID y Secret guardados únicamente en `backend/.env`, excluido de Git. Se verificó OAuth contra `https://api-m.sandbox.paypal.com/v1/oauth2/token`: **HTTP 200, autenticación correcta**. No se imprimió ni persistió el token OAuth. Esto valida las credenciales Sandbox, no una captura de pago. Aún faltan `DATABASE_URL`, `DATABASE_PASSWORD` y la migración manual en Supabase.

Verificación local terminada el 22 de septiembre de 2026 (America/Guayaquil).

| Comando / comprobación | Resultado |
|---|---|
| `npm run build` | Correcto; `dist/front_bd2` |
| Presupuesto Angular | Advertencia: bundle inicial **678.73 kB**, límite de advertencia **500 kB**; no es error de build |
| `npm test -- --watch=false` | **39 pruebas correctas**, 16 archivos |
| `mvnw.cmd test` | Correcto en la ejecución independiente; también se ejecutó la suite final completa en la fase test del empaquetado |
| `mvnw.cmd -q clean package` | **Correcto, salida 0**; **26 pruebas correctas, 0 omitidas**, incluyendo PostgreSQL local |
| Artefacto Spring Boot | `backend/target/payments-0.0.1-SNAPSHOT.jar` |
| `start-backend.ps1` | Sintaxis PowerShell validada; no se inició contra Supabase sin credenciales |
| Exclusión de secretos/build/test DB | `.env`, `backend/target` y `backend/.local` ignorados por Git |

Suite final backend:

- `PaymentDatabaseTest`: **14** pruebas con PostgreSQL 17 real, base descartable `jjc_payments_test` en `127.0.0.1:55432`.
- `PaymentSecurityTest`: **6** pruebas HTTP/seguridad, incluidos 401, CORS, webhook sin firma e ignorar precio/identidad enviados.
- `MoneyAndCaptureTest`: **3** pruebas de importes, validación de captura y ownership.
- `PayPalGatewayTest`: **2** pruebas del contrato de verificación oficial de firma y encabezados.
- `PaymentApplicationContextTest`: **1** prueba del contexto Spring completo contra PostgreSQL migrado local.

Los informes detallados generados por Maven están en `backend/target/surefire-reports/`. La base local se inicializó dentro de `backend/.local/pg-test`; su servidor se detuvo al terminar. No se reutilizó ni modificó una base PostgreSQL existente del usuario.

Las pruebas PostgreSQL demostraron: Create idempotente, cálculo desde precios de BD, doble captura secuencial y concurrente, webhook repetido, una reserva para la última unidad, ownership 403, detección de importe incorrecto, reservas conservadas ante cortes de red, rollback ante error de biblioteca, conservación de nuevas cantidades y filas del carrito, rechazo por stock, pago rechazado sin entrega, reaplicación de migración sin perder datos, bloqueo de triggers desconocidos y bloqueo de escritura fraudulenta mediante SECURITY DEFINER.

**Límite de estas pruebas:** PayPal y Supabase Auth se sustituyen por dobles controlados dentro de los tests. El schema de la base local es un fixture documentado, no una copia certificada de Supabase. No se realizó Create/Capture contra PayPal Sandbox con credenciales reales, no hubo comprador conectado, no se registró un webhook público y no se ejecutó la migración en Supabase. Los resultados reales de pago, stock, biblioteca, carrito y admin remotos siguen pendientes de los pasos de [la guía](paypal-sandbox.md).

Se conservó un aviso de whitespace previo ajeno a esta integración en `src/app/app.spec.ts`; no se revirtió ni editó ese cambio del usuario.
