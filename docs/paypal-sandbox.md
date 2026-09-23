# PayPal Sandbox — JJC GAMING

## Estado de la entrega

Integración implementada con Angular existente, Spring Boot 4.1.1 / Java 21, PostgreSQL, Supabase Auth, SDK JavaScript **v6** y Orders API **v2**. No contiene un pago simulado en el flujo de compra. El backend permite únicamente `PAYPAL_MODE=sandbox`.

**Todavía no se ha realizado un pago real de Sandbox.** PayPal y PostgreSQL ya están configurados en `backend/.env` (ignorado por Git). OAuth Sandbox respondió HTTP 200. El usuario aplicó la migración y el 23 de septiembre se verificaron sus columnas, índices, triggers, restricciones y permisos directamente en Supabase. Spring Boot arrancó correctamente y sirve la configuración pública en el puerto 8080. [Resultados de la verificación](paypal-migration-verified.md). La compra completa con comprador Sandbox sigue pendiente; las pruebas automatizadas no equivalen a esa compra.

## Inspección y alcance

- El proyecto tenía Angular 22, Supabase Auth y catálogo/admin conectados. No había Spring Boot. Java 21 está instalado; se agregó Maven Wrapper porque `mvn` no estaba en PATH.
- El carrito y compras eran locales; `PagoService.process()` devolvía `PAGADO` mediante un temporizador. Biblioteca era una pantalla pendiente. Se sustituyó ese flujo, conservando catálogo, Auth, roles, favoritos, rutas y estilos.
- Se consultaron **sin filas y sin escrituras** las columnas reales mediante REST `SELECT columna LIMIT 0`. Evidencia: `docs/paypal-schema-observed.json`. Existen `carritos` (plural), `carrito_detalle`, `ordenes`, `orden_detalle`, `pagos`, `biblioteca`. Faltan `paypal_order_id`, `paypal_capture_id` y `respuesta_proveedor`.
- La inspección inicial con clave pública fue limitada. Después de configurar la contraseña PostgreSQL se leyeron directamente columnas, restricciones, triggers y políticas mediante una conexión de solo lectura. Se confirmó `nombre_videojuego NOT NULL` en los detalles, el CHECK que excluía PAYPAL y los cuatro triggers existentes. El backend ya guarda el nombre como snapshot y la migración contempla esas definiciones reales.
- El carrito antiguo se importa una sola vez por cuenta, solo si el carrito persistido está vacío. Se envían únicamente IDs/cantidades y el servidor valida stock. La copia local antigua se conserva. Las compras de demostración antiguas no se convierten en compras pagadas.

## Archivos creados

- `backend/pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`, `.gitignore`, `.gitattributes`, `.env.example`, `start-backend.ps1`.
- `backend/src/main/resources/application.yml`.
- `backend/src/main/java/com/jjcgaming/payments/PaymentsApplication.java`.
- `config/PaymentConfig.java`, `config/PaymentSchemaCheck.java`.
- `security/SecurityConfig.java`, `security/SupabaseTokenIntrospector.java`.
- `controller/PayPalController.java`, `controller/StoreController.java`.
- `service/PayPalGateway.java`, `PaymentService.java`, `CaptureVerifier.java`, `Money.java`, `StoreService.java`.
- `dto/CartLine.java`, `dto/CartImport.java`, `exception/PaymentException.java`, `exception/ApiErrors.java`.
- Tests backend: `PaymentApplicationContextTest`, `PaymentSecurityTest`, `MoneyAndCaptureTest`, `PaymentDatabaseTest`, `PayPalGatewayTest`, y `src/test/resources/payment-fixture.sql`.
- `src/app/core/services/payment-api.service.ts`, su `.spec.ts`, `src/app/pago/pago.spec.ts`.
- `paypal-migration.sql`, `docs/paypal-inspection.sql`, `docs/paypal-schema-observed.json`, este documento.

Las rutas Java abreviadas pertenecen al paquete `backend/src/main/java/com/jjcgaming/payments/`.

## Archivos modificados

- `.gitignore`, `README.md`, ambos `src/environments/environment*.ts` (solo URL pública del backend).
- Servicios `carrito.service.ts`, `compras.service.ts`, `pago.service.ts`; pruebas de compras y acceso de clientes.
- `checkout/checkout.ts` reutiliza el componente PayPal. Se eliminó su HTML anterior sin uso, que ofrecía simulaciones.
- `pago/pago.ts`, `pago/pago.html`, `compras/compras.ts`, `compras/compras.html`, `confirmacion/confirmacion.ts`, `confirmacion/confirmacion.html`, `biblioteca/biblioteca.ts`, `carrito/carrito.html`.
- `app.routes.ts`, `models/store.models.ts`, `models/admin.models.ts`.
- `core/services/admin/admin-pagos.service.ts`, `admin/pages/pagos.html`, `admin/pages/ordenes.html`.
- `shared/game-card.ts`, `detalle-juego/detalle-juego.ts`: muestran errores reales al agregar al carrito.

Había muchos cambios previos sin commit en el workspace. Se conservaron; no se creó un commit, no se hizo push y no se desplegó.

## Dependencias

Sin dependencias npm nuevas. El SDK oficial v6 se carga una vez desde `https://www.sandbox.paypal.com/web-sdk/v6/core` al abrir el checkout.

Backend: starters Spring Web MVC, Security, OAuth2 Resource Server, Validation, JDBC, driver PostgreSQL y starters de pruebas. Jackson y Mockito provienen de Spring Boot. HTTP usa `java.net.http.HttpClient`; dinero usa `BigDecimal`. No se agregó un SDK PayPal antiguo.

## Endpoints

| Método / ruta | Acceso y función |
|---|---|
| `GET /api/paypal/config` | Público: `clientId`, `currency=USD`, `environment=sandbox` |
| `POST /api/paypal/orders` | CLIENTE: carrito persistido, snapshot, reserva, Create Order |
| `GET /api/paypal/orders/current` | CLIENTE: recuperar su intento pendiente tras recargar |
| `POST /api/paypal/orders/{id}/capture` | CLIENTE propietario: GET/captura/verificación/fulfillment |
| `POST /api/paypal/webhook` | Firma PayPal obligatoria; consulta nuevamente Orders API |
| `GET /api/cart` | CLIENTE: carrito propio con precios actuales |
| `PUT /api/cart/items` | CLIENTE: `{gameId, quantity}`; cero elimina |
| `DELETE /api/cart` | CLIENTE: vaciado explícito solicitado desde carrito |
| `POST /api/cart/import` | CLIENTE: importar IDs/cantidades del carrito local una sola vez |
| `GET /api/purchases` | CLIENTE: hasta 200 órdenes propias recientes |
| `GET /api/purchases/{numeroOrden}` | CLIENTE propietario: confirmación/detalle persistido |
| `GET /api/library` | CLIENTE: biblioteca de órdenes PAGADAS propias |

Las operaciones de cliente envían `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`. El servidor pide a **Supabase Auth `/auth/v1/user`** validar ese JWT y obtiene el UUID validado; esto también admite proyectos con firmas HS256 heredadas sin copiar su secreto JWT. Luego busca `usuarios.auth_id`, exige `activo=true` y `id_rol=2`. Un `usuarioId`, rol o total del navegador nunca constituye autorización.

El endpoint público nunca entrega Client Secret ni token OAuth. CORS acepta un solo origen, `FRONTEND_URL`, sin comodines.

## SQL manual obligatorio

1. Abrir **Supabase → SQL Editor → New query**.
2. Ejecutar `docs/paypal-inspection.sql` (solo lectura). Revisar especialmente triggers, CHECK de `proveedor/metodo_pago`, tamaños de referencias, defaults de fechas/IDs y campos obligatorios sin default.
3. Revisar y ejecutar **`paypal-migration.sql`**. No se ejecutó automáticamente.

La migración:

- Agrega referencias PayPal y respuesta **reducida sin PII**; no reutiliza columnas PayPhone.
- Agrega unicidad de PayPal Order/Capture IDs, carrito por usuario y línea por videojuego. Si existen duplicados, aborta para evitar perder datos al consolidarlos.
- Crea tablas privadas de intentos, snapshots/reservas, importación y versión del esquema, con RLS habilitado y sin acceso frontend.
- Conserva datos históricos y campos PayPhone. No borra órdenes, pagos ni biblioteca.
- Si encuentra un trigger de fila basado en `procesar_pago_aprobado()` sobre `pagos`, conserva su definición y función, pero añade a su condición `NEW.proveedor IS DISTINCT FROM 'PAYPAL'`. Así sigue atendiendo proveedores antiguos y **no duplica** el fulfillment nuevo.
- Conserva los generadores de número de orden y referencia de pago inspeccionados. Compara la huella de sus cuerpos para no aceptar modificaciones futuras sin revisión. Excluye PAYPAL de la auditoría histórica inspeccionada para evitar duplicarla con `jjc_paypal_audit`. **Aborta ante cualquier otro trigger no revisado.**
- Amplía el CHECK real `chk_metodo_pago` para incluir PAYPAL, preservando PAYPHONE, TARJETA, TRANSFERENCIA y SIMULADO. Solo lo modifica si coincide con la definición leída; no elimina datos ni restricciones de otros campos.
- Agrega auditoría específica PayPal y bloquea escrituras frontend a órdenes, detalles, pagos, biblioteca y auditoría. El guard usa `session_user`, también contra RPC heredadas `SECURITY DEFINER`; exige conexión PostgreSQL de backend `postgres` o `jjc_payments`.
- Mantiene RLS y permisos de catálogo, Auth, perfiles y carrito. No restringe la creación de carritos desde posibles triggers de registro.
- Agrega SELECT administrativo condicionado por la función existente `es_admin()`; una política RESTRICTIVE previa puede seguir limitando resultados.

**Si el script informa un CHECK, enum o trigger desconocido, toda la transacción se revierte.** No quites la comprobación para forzarlo. Amplía el CHECK conservando sus valores anteriores o adapta el trigger tras inspeccionar su cuerpo. El SQL no inventa nombres de restricciones reales ni reemplaza sus expresiones a ciegas. La integración no estará habilitada hasta resolver esas diferencias del esquema. Spring comprueba la versión aplicada al arrancar y no aplica migraciones.

La migración cambia deliberadamente quién puede escribir datos financieros: cualquier integración antigua que escribiera esos datos desde el navegador debe pasar por servidor. La lectura histórica administrativa se conserva.

## Consistencia y recuperación

El servidor calcula subtotal e IVA (15%, lógica existente), redondeando a dos decimales con `HALF_UP`. Create Order guarda primero un snapshot y claves idempotentes, luego usa OAuth y `PayPal-Request-Id` persistido. Una orden activa por cliente evita duplicados entre pestañas. Un nuevo clic reutiliza el snapshot pendiente; los cambios posteriores del carrito no cambian una orden ya presentada a PayPal.

Las reservas de stock se comprueban bajo bloqueos de filas, por orden de videojuego. Las reservas sin captura expiran después de tres horas. Al entrar en `CAPTURING`, la reserva se conserva sin expirar hasta reconciliar; esto evita liberar stock de un pago que pudo haberse cobrado durante un corte de red.

La captura consulta primero PayPal. Si ya está COMPLETED no vuelve a capturar. Verifica ID, intent, estado del order y capture, referencia y `custom_id`, una sola unidad/captura, `final_capture`, monto exacto y USD. Solo entonces, una transacción JDBC bloquea y comprueba stock, lo descuenta una vez, agrega biblioteca, modifica orden/pago y limpia cantidades de las filas incluidas en el snapshot.

Una línea eliminada y agregada de nuevo tiene otro ID y se conserva; las cantidades adicionales y otros videojuegos se conservan. No se llama al vaciado total del carrito desde la captura.

Si se perdió una respuesta, recargar checkout recupera el intento; también se puede abrir Mis compras → detalle → **Confirmar pago aprobado en PayPal**. No se debe crear otro pago para resolver una captura incierta. Una discrepancia de monto/moneda/referencia queda `REVIEW`, sin fulfillment. Consultar `paypal_checkouts.review_reason` desde SQL Editor y revisar PayPal antes de decidir reintento o reembolso. No hay reembolsos automáticos ni resolución automática de casos REVIEW.

## Variables y ejecución exacta en Windows

Desde PowerShell, en la raíz del workspace:

```powershell
cd C:\Users\LENOVO\Desktop\front_bd2
if (!(Test-Path -LiteralPath backend\.env)) {
    Copy-Item backend\.env.example backend\.env
}
notepad backend\.env
```

El `.env.example` contiene **solo** las tres variables PayPal solicitadas. En el archivo **local** `.env`, completa Client ID y Secret de la aplicación **Sandbox** y agrega estas variables (sin comillas alrededor de los valores):

```dotenv
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
FRONTEND_URL=http://localhost:4200
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=
PAYPAL_WEBHOOK_ID=
```

- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: los valores públicos ya presentes en `src/environments/environment.ts`.
- `DATABASE_URL`: URL **JDBC**, obtenida de Supabase **Connect**, conexión directa o pooler en modo **session**. Forma: `jdbc:postgresql://HOST:PUERTO/postgres?sslmode=verify-full&sslrootcert=C:/ruta/al/certificado.crt`. Sustituye HOST/PUERTO y descarga el certificado SSL indicado por Supabase. No incluyas usuario ni contraseña en la URL. En pooler, usa el nombre de usuario que muestra Connect, habitualmente `postgres.<project-ref>`; `session_user` dentro de PostgreSQL debe ser `postgres`.
- `DATABASE_PASSWORD`: contraseña PostgreSQL; **no** es la publishable key ni service_role.
- `PAYPAL_WEBHOOK_ID`: opcional al probar checkout local; requerido para aceptar webhooks.
- `PORT`: opcional, por defecto 8080.

Los valores permanecen en `backend/.env`, ignorado por Git. `start-backend.ps1` carga literalmente las variables en el proceso, sin imprimirlas ni ejecutar expresiones de shell. Spring no lee `.env` por sí solo. No pongas secretos en environments Angular. No se necesita service_role.

**Terminal 1 — Spring Boot**, después de aplicar SQL:

```powershell
cd C:\Users\LENOVO\Desktop\front_bd2
powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\start-backend.ps1
```

La política Bypass solo afecta a ese proceso, no cambia la configuración del sistema. Si tu organización impide ese parámetro, importa las variables por su mecanismo autorizado y ejecuta `backend\mvnw.cmd spring-boot:run` desde `backend`.

En esta máquina Java necesitó usar el almacén de certificados de Windows para Maven. Si aparece `PKIX path building failed`, antes del comando anterior:

```powershell
$env:MAVEN_OPTS='-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
```

No se deshabilitó TLS ni se modificó el truststore global. Para conexiones HTTPS de la aplicación, las mismas opciones pueden pasarse al JVM con `JAVA_TOOL_OPTIONS`; no incluyas secretos en esas opciones.

**Terminal 2 — Angular**:

```powershell
cd C:\Users\LENOVO\Desktop\front_bd2
npm install
npm start -- --host localhost --port 4200
```

Abrir **http://localhost:4200**. No usar `127.0.0.1:4200` con `FRONTEND_URL=http://localhost:4200`, porque son orígenes distintos. El build de producción Angular utiliza `/api`; desplegarlo requiere un proxy hacia Spring. Esto no activa PayPal LIVE.

## Comprador Sandbox y compra de prueba

1. En [PayPal Developer](https://developer.paypal.com/dashboard/), seleccionar **Sandbox** en Apps & Credentials. Crear/usar una aplicación REST de una cuenta Business Sandbox y copiar sus credenciales solo al `.env` local.
2. En Testing Tools / Sandbox Accounts, crear/usar una cuenta **Personal Sandbox** distinta del vendedor. Consultar sus credenciales en los detalles de esa cuenta. [Documentación de cuentas Sandbox](https://developer.paypal.com/tools/sandbox/accounts/).
3. Entrar a JJC GAMING con una cuenta Supabase **CLIENTE**, no ADMIN. Agregar un videojuego con stock.
4. Abrir checkout y revisar subtotal, IVA y total. Pulsar el botón oficial PayPal.
5. En la ventana **Sandbox de PayPal**, usar el correo y contraseña del comprador Personal Sandbox. No usar la cuenta PayPal real para comprar.
6. Aprobar. La aplicación solo muestra éxito cuando Spring devuelve `PAGADA` tras verificar PayPal y confirmar la transacción local.
7. Revisar `/pago-confirmado`, Mis compras, biblioteca y carrito. Entrar como ADMIN en `/admin/pagos` y `/admin/ordenes`; comprobar las referencias PayPal.

La tarjeta, si PayPal la ofrece para la cuenta/comprador, se introduce únicamente en la interfaz PayPal. No hay inputs propios de número, CVV ni vencimiento.

## Webhooks

Implementado `POST /api/paypal/webhook`: usa la API oficial `verify-webhook-signature`, exige `SUCCESS` y después consulta Orders API con credenciales del comercio. Reutiliza la transacción/idempotencia de captura. Un JSON COMPLETED sin firma no entrega juegos.

Para recibirlos debes publicar un endpoint **HTTPS** accesible, registrar esa URL en la misma aplicación **Sandbox**, suscribirte a `PAYMENT.CAPTURE.COMPLETED`, guardar el Webhook ID en `PAYPAL_WEBHOOK_ID` y reiniciar Spring. El endpoint no requiere un JWT Supabase porque su autenticación es la firma del proveedor. Los reintentos reciben éxito después de una compra ya procesada sin volver a descontar stock.

No se abrió un túnel ni se configuró ngrok. Sin URL pública y Webhook ID no se ha probado entrega real de webhooks. En localhost se recupera mediante la misma captura idempotente desde checkout/detalle. No hay un reconciliador periódico en segundo plano; los casos pendientes dependen del webhook configurado o de esa consulta explícita.

## Pruebas y resultados

| Comprobación solicitada | Resultado observado |
|---|---|
| Create Order real PayPal | Pendiente de credenciales y SQL Supabase; la implementación llama Orders API Sandbox |
| Capture Order real PayPal | Pendiente de aprobación del comprador Sandbox |
| Pago/orden en Supabase | No se escribieron datos; migración manual pendiente |
| Stock/biblioteca/carrito en Supabase | No comprobados mediante una transacción PayPal real |
| Mis compras/admin en Supabase con pago PayPal | Interfaces implementadas; pendiente del primer pago y verificación de RLS real |
| Create idempotente / precios de BD | Verificado en PostgreSQL local con gateway PayPal controlado |
| Doble captura secuencial/concurrente + webhook repetido | Verificado localmente: una entrega y un descuento |
| Cancelación del SDK | Prueba Angular: no captura ni navegación a éxito; orden local sin cobro permanece pendiente |
| Manipulación total/identidad | Pruebas HTTP ignoran datos enviados y usan principal; cálculo de BD probado |
| Captura de otro cliente | 403 antes de contactar PayPal, probado |
| Sin sesión / token inválido | 401, probado |
| Última unidad concurrente / stock alterado | Solo una reserva; no captura/entrega con stock insuficiente, probado |
| Monto/moneda/referencia/estado incorrectos | Rechazados sin fulfillment, probado |
| Error DB durante fulfillment | Rollback de stock, biblioteca, carrito y orden, probado |
| Corte de red al capturar | Misma clave persistida en reintentos; reserva conservada, probado |
| Escritura fraudulenta vía SECURITY DEFINER | Bloqueada en PostgreSQL local, probado |
| Firma de webhook / encabezados | Pruebas sin red de endpoint oficial, firma ausente y variantes de mayúsculas |

Resultados finales de comandos y cantidades de pruebas: `docs/paypal-validation.md`.

Pruebas estándar sin credenciales:

```powershell
npm test -- --watch=false
npm run build
cd backend
.\mvnw.cmd test
.\mvnw.cmd package
```

Las pruebas PostgreSQL y arranque completo se omiten explícitamente cuando no existe `JJC_TEST_DATABASE_URL`. Durante esta entrega **sí se ejecutaron** sobre un clúster local exclusivo, con URL estricta `jdbc:postgresql://127.0.0.1:55432/jjc_payments_test`. Los fixtures recrean solo esa base de prueba, nunca Supabase. Para reproducirlas, crear una base descartable con ese nombre/puerto y usuario `postgres`, configurar esa variable y ejecutar los mismos comandos Maven. No apuntar fixtures a una base con datos útiles.

## Pasos pendientes y límites

1. Revisar definiciones reales con el SQL de inspección, adaptar únicamente diferencias verificadas y aplicar la migración manual. El guard de triggers puede requerir adaptación antes de aceptarla.
2. Configurar credenciales/SSL de PostgreSQL y PayPal Sandbox en `.env` local.
3. Ejecutar los siete escenarios de aceptación contra Sandbox con CLIENTE y luego ADMIN. Verificar políticas SELECT reales: las pruebas locales no certifican RLS del proyecto remoto.
4. Configurar HTTPS/Webhook ID para reconciliación automática fuera de localhost.
5. Casos REVIEW requieren intervención del operador; no liberar su reserva ni marcar PAGADO manualmente sin revisar PayPal.
6. Existe la advertencia previa del bundle inicial Angular >500 kB; no se aumentó el presupuesto artificialmente.

**No pasar a LIVE en esta etapa.** El host REST está fijado a Sandbox y `PAYPAL_MODE=live` impide iniciar el cliente HTTP.

## Referencias oficiales consultadas

### Inicio local en Windows y autenticación

`backend/start-backend.ps1` configura el almacén de certificados `Windows-ROOT` tanto en Maven como en la JVM de Spring Boot. Esto permite validar HTTPS con Supabase usando los certificados confiables del sistema, sin desactivar TLS. Configurar únicamente `MAVEN_OPTS` no alcanza al proceso de aplicación que inicia `spring-boot:run`.

Una interrupción de Supabase Auth o un fallo HTTPS devuelve 503 con un mensaje para reintentar; un token rechazado devuelve 401. El carrito no muestra el estado vacío mientras carga o presenta un error. Estas comprobaciones no sustituyen la prueba de compra completa con una cuenta compradora Sandbox.

- [SDK JavaScript v6 y autenticación mediante Client ID](https://developer.paypal.com/sdk/js/set-up/).
- [Sesiones, callbacks y presentación del SDK v6](https://developer.paypal.com/sdk/js/reference/).
- [Orders API v2](https://developer.paypal.com/api/orders/v2).
- [Verificación oficial de webhooks](https://developer.paypal.com/api/webhooks/v1).
- [Requisitos de Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html).
