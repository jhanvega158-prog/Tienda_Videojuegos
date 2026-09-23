# JJC GAMING — visitante, cliente y administración

Revisión del 22 de septiembre de 2026. Implementación y pruebas locales contra el proyecto Supabase existente. Esta etapa queda parcialmente bloqueada por lectura administrativa de usuarios/roles y por las verificaciones reales sin datos/cuenta CLIENTE disponibles. No se aplicaron migraciones ni políticas desde el agente.

## 1. Archivos creados

- `src/app/models/admin.models.ts`
- `src/app/core/services/session-access.service.ts`
- `src/app/core/services/admin/admin-api.service.ts`
- `src/app/core/services/admin/admin-dashboard.service.ts`
- `src/app/core/services/admin/admin-productos.service.ts`
- `src/app/core/services/admin/admin-categorias.service.ts`
- `src/app/core/services/admin/admin-usuarios.service.ts`
- `src/app/core/services/admin/admin-ordenes.service.ts`
- `src/app/core/services/admin/admin-pagos.service.ts`
- `src/app/core/services/admin/admin-reportes.service.ts`
- `src/app/admin/admin.routes.ts`
- `src/app/admin/admin-page-state.ts`
- `src/app/admin/admin-confirm.ts`
- `src/app/admin/admin-chart.ts`
- `src/app/admin/pages/dashboard.ts` y `dashboard.html`
- `src/app/admin/pages/productos.ts` y `productos.html`
- `src/app/admin/pages/categorias.ts` y `categorias.html`
- `src/app/admin/pages/usuarios.ts` y `usuarios.html`
- `src/app/admin/pages/ordenes.ts` y `ordenes.html`
- `src/app/admin/pages/pagos.ts` y `pagos.html`
- `src/app/admin/pages/reportes.ts` y `reportes.html`
- `src/app/core/services/session-access.service.spec.ts`
- `src/app/core/services/customer-access.spec.ts`
- `src/app/core/services/compras.service.spec.ts`
- `src/app/core/services/admin/admin-services.spec.ts`
- `src/app/login/login.spec.ts`
- `src/app/testing/storefront.providers.ts`
- `docs/inspeccion-admin.sql`
- `docs/permisos-admin-lectura.sql`
- `docs/administracion.md` (este informe)

## 2. Archivos modificados

Sobre los archivos que ya existían al empezar esta etapa, aunque muchos todavía figuran sin seguimiento en Git:

- `src/app/app.routes.ts`
- `src/app/admin/admin.ts`, `admin.html`, `admin.css`
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/services/catalog.service.ts`
- `src/app/core/services/carrito.service.ts`
- `src/app/core/services/favoritos-local.service.ts`
- `src/app/core/services/compras.service.ts`
- `src/app/models/store.models.ts`
- `src/app/shared/game-card.ts`
- `src/app/header/header.html`
- `src/app/home/home.ts`, `home.html`
- `src/app/catalogo/catalogo.ts`, `catalogo.html`
- `src/app/detalle-juego/detalle-juego.ts`, `detalle-juego.html`
- `src/app/login/login.ts`
- `src/app/checkout/checkout.ts`
- `src/app/pago/pago.ts`
- `src/app/confirmacion/confirmacion.ts`
- Pruebas existentes: `src/app/app.spec.ts`, `core/services/auth.service.spec.ts`, `home/home.spec.ts`, `catalogo/catalogo.spec.ts`, `header/header.spec.ts`, `footer/footer.spec.ts`, `nosotros/nosotros.spec.ts`, `compras/compras.spec.ts`.

Se reutilizaron la autenticación, el cliente Supabase y el diseño. No se cambiaron URL ni claves. No se añadieron dependencias para gráficos.

## 3. Servicios administrativos

Los ocho servicios administrativos enumerados arriba separan autorización, RPC, consultas, formularios y reportes. `AdminApi` comprueba la sesión y el perfil ADMIN antes de operar, pagina SELECT en lotes de 500 y exige una fila devuelta para confirmar INSERT/UPDATE. Las consultas continúan sujetas a RLS en Supabase.

## 4. Rutas protegidas

- Sesión real: `/carrito`, `/checkout`, `/pago`, `/confirmacion`, `/compras`, `/compra/:id`, `/biblioteca`, `/favoritos`.
- Sesión real y perfil `id_rol = 1`: `/admin` y sus hijos `productos`, `categorias`, `usuarios`, `ordenes`, `pagos`, `reportes`, mediante `canActivate` y `canActivateChild`.
- El guard valida Auth y el perfil; no utiliza un rol guardado manualmente en localStorage.
- `returnUrl` conserva destinos internos permitidos. ADMIN sigue entrando a `/admin`.

## 5. Visitante

Inicio, catálogo, búsqueda, categorías, precios, disponibilidad y detalle públicos. Catálogo y categorías proceden ahora de Supabase; no se usan los seis juegos locales anteriores. Solo se muestran juegos activos de categorías activas.

En navegador: 8 juegos reales; búsqueda de Red Dead y filtro RPG correctos; sin botones de añadir/favoritos ni enlaces privados del navbar; rutas privadas redirigen al login. Invocar directamente el servicio del carrito sin sesión devuelve false, mantiene contador 0 y no escribe almacenamiento. Detalle ofrece login con returnUrl.

## 6. CLIENTE y operaciones de tienda

La sesión validada permite carrito, favoritos y rutas privadas. Carrito/favoritos se conservan localmente por UUID real de cuenta; las compras simuladas se filtran por propietario y checkout/última compra usan claves por cuenta. No se usa ese almacenamiento para autenticar ni autorizar.

**Límite explícito:** no se migró el flujo de compra a órdenes/pagos reales. Carrito, favoritos y compras de demostración siguen almacenándose en el navegador. Biblioteca conserva su pantalla pendiente de la etapa anterior. Las operaciones de pago continúan etiquetadas como demostración sin cobro. Estos datos no alimentan el dashboard real.

En navegador, con la sesión real disponible, se comprobó añadir al carrito y favoritos, conservar ambos tras recargar, acceder a las cinco rutas privadas de tienda y ocultar el carrito al cerrar sesión. También se comprobó que login ADMIN ignora el returnUrl de juego y abre el dashboard. No hubo errores de consola en esa verificación final. Los registros locales de prueba se quitaron antes del logout. La denegación de ADMIN para CLIENTE y la redirección CLIENTE con returnUrl tienen pruebas unitarias. No se completó una prueba end-to-end con una cuenta real cuyo perfil sea CLIENTE: la cuenta disponible actualmente devuelve rol 1 desde Supabase. No se cambió su rol ni se crearon nuevas cuentas para esta prueba.

## 7. ADMIN

Se reutilizó el contenedor del panel con navegación real, cierre de sesión y menú colapsable. Siete páginas con carga, errores y estados vacíos; feedback de escritura y diálogos de confirmación. Tablas con desplazamiento horizontal dentro de su contenedor. Pruebas de escritorio y viewport móvil de 390 px sin desbordamiento de página; apertura/cierre del menú correctos.

## 8. Dashboard

Se consultaron las cinco RPC existentes: `dashboard_resumen`, `ventas_por_mes`, `videojuegos_mas_vendidos`, `metodos_pago_dashboard`, `estados_ordenes_dashboard`.

Resultado real al comprobar: ventas 0; órdenes 0; pagos pendientes 0; juegos vendidos 0; videojuegos activos 8. Las cuatro RPC de gráficos devuelven listas vacías y se muestra “Sin datos registrados”, sin inventar series. Los gráficos de barras tienen tabla de datos accesible y muestran los valores devueltos cuando existan.

El RPC informa 2 usuarios, pero SELECT solo deja leer 1. Por eso **usuarios activos aparece como No disponible con explicación**, en vez de presentar un conteo parcial como total global. No se sustituyó por una cifra manual.

Consultas RPC anónimas: las cinco devolvieron [] y `es_admin()` devolvió false. Con la sesión ADMIN, `es_admin()` devolvió true. Esto no equivale a una auditoría completa de todas las políticas.

## 9. Productos

Listar, crear, editar, activar/desactivar, filtrar y actualizar conectados a `public.videojuegos`. Formulario con todos los campos solicitados, categoría real, nombre obligatorio, precio no negativo, stock entero no negativo y URL de imagen con previsualización.

Prueba real desde formularios y confirmación mediante SELECT: crear, editar nombre, desactivar, reactivar y desactivar otra vez. El producto inactivo desapareció del catálogo y su detalle devolvió “Juego no encontrado”.

Registros exclusivos de prueba: IDs 9 y 10, nombre `JJC PRUEBA ADMIN 20260922` / `JJC PRUEBA ADMIN 20260922 EDITADO`. Ambos se eliminaron después de comprobar 0 referencias en orden_detalle, biblioteca, favoritos y carrito_detalle. DELETE devolvió los IDs eliminados. No se tocaron los ocho productos existentes. La interfaz utiliza desactivación, no ofrece borrado físico de productos reales.

## 10. Categorías

Listado real, crear/editar/activar/desactivar, búsqueda y confirmación. Categoría inactiva deja de aparecer en el escaparate y sus videojuegos quedan excluidos mediante el filtro de relación activa.

Prueba real de creación, edición, desactivación y reactivación correcta. IDs temporales 8 y 9 con el mismo prefijo de prueba. Eliminados tras SELECT que comprobó 0 videojuegos asociados; DELETE devolvió ambos IDs. No quedaron categorías de prueba. No existe un botón que borre categorías con relaciones.

## 11. Usuarios

SELECT de campos de perfil y relación roles, búsqueda y filtros implementados. No se consultan contraseñas, no se edita auth_id, no hay cambio de rol y el servicio impide activar/desactivar la cuenta actual.

Bloqueo observado: SELECT muestra únicamente el perfil actual y roles devuelve []. La página avisa que la lista es parcial y muestra el ID de rol real cuando su nombre no es legible. Activación/desactivación de otra cuenta queda **sin prueba real** hasta que se resuelva la lectura; no se cambió el estado de ninguna cuenta.

## 12. Órdenes

Consultas conectadas a ordenes, usuarios, orden_detalle y pagos. Campos de fecha reales: `ordenes.fecha`. Búsqueda, filtro por estado y rango de fechas. Detalle implementado con cliente, artículos, cantidades, precios, total y pagos asociados.

La consulta real devolvió 0 órdenes sin error. No se insertaron órdenes falsas para completar la demostración. Detalle con una orden real y visibilidad entre clientes quedan pendientes de registros/permisos disponibles.

## 13. Pagos y auditoría

SELECT explícito de referencia, orden, proveedor, metodo_pago, monto, estado, fecha_creacion, fecha_confirmacion y las tres referencias PayPhone existentes. Detalle con SELECT de auditoria_pagos: estado_anterior, estado_nuevo, descripcion, fecha.

Lista real vacía sin error. No se leen campos de tarjeta ni CVV; no hay captura de esos datos. Detalle/auditoría con datos reales no pudo comprobarse porque no existen pagos accesibles. No se integró la API PayPhone.

## 14. Reportes

Rango inicial/final validado, límite final inclusivo por día. SELECT paginado de órdenes en el período. Número de órdenes incluye todos los estados; ventas suman total de órdenes PAGADAS; unidades suman cantidades de sus detalles, consultados por lotes. La descripción visible explica esa definición.

Período real probado: 01/09/2026–22/09/2026, resultado 0 órdenes, 0 ventas, 0 unidades. Pruebas unitarias adicionales verifican que PENDIENTE/CANCELADA no cuenten como ventas y que las fechas invertidas no lancen consultas.

## 15. Restricciones RLS observadas

No hubo errores 42501 en productos/categorías. Sus INSERT, UPDATE y limpieza DELETE tuvieron éxito real.

En usuarios y roles la restricción es silenciosa: HTTP 200 con conjunto parcial/vacío, pese a `es_admin() = true`. Eso es compatible con falta de políticas SELECT administrativas. No se pudo leer el catálogo interno de políticas con la publishable key; no se afirma conocer el nombre de una política existente ni descartar una RESTRICTIVE.

UPDATE de otras cuentas y alcance administrativo de tablas sin filas no están certificados. No se desactivó RLS ni se usó service_role.

## 16. SQL manual pendiente

Archivo: [permisos-admin-lectura.sql](permisos-admin-lectura.sql).

Pasos:
1. Abrir el proyecto en Supabase.
2. Entrar en **SQL Editor** y pulsar **New query**.
3. Copiar el contenido completo del archivo y pulsar **Run**.
4. Volver a la tienda y actualizar `/admin/usuarios` y `/admin`.

El script añade únicamente políticas SELECT para authenticated condicionadas por la función existente `public.es_admin()`. Comprueba antes que sea SECURITY DEFINER para no introducir recursión al consultar usuarios. Si esa condición falla, aborta; habrá que revisar la función, sin sustituirla automáticamente. Si hay políticas restrictivas que sigan ocultando filas, inspeccionarlas con `inspeccion-admin.sql`.

No incluye política UPDATE adicional porque no se ha demostrado que falte. No modifica roles, credenciales, tablas ni relaciones. El agente no lo ejecutó, de acuerdo con la instrucción de efectuar esos cambios manualmente.

Referencia técnica: [documentación oficial de RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 17. Build y pruebas

- `npm run build`: correcto, salida `dist/front_bd2`. Bundle inicial 674.65 kB; advertencia de presupuesto 500 kB. No se elevó artificialmente el límite. Páginas ADMIN cargadas de forma diferida.
- `npm test -- --watch=false`: 30 pruebas correctas en 13 archivos.
- Chrome real mediante Selenium: acceso anónimo, rutas, catálogo, búsqueda/filtro, login ADMIN, dashboard, siete páginas, CRUD de producto/categoría con verificación en Supabase y limpieza, ocultación del producto inactivo, menú móvil, formularios y ausencia de desbordamiento.
- No se consideraron equivalentes las pruebas con dobles de Auth y una sesión real CLIENTE.

## 18. Pendientes y límites

1. Aplicar manualmente el SQL SELECT y volver a comprobar todos los usuarios/roles y el conteo activo.
2. Probar activar/desactivar otra cuenta de prueba cuando sea visible; si UPDATE es denegado, diagnosticar esa política sin desactivar RLS.
3. Completar prueba en navegador con una cuenta real CLIENTE, incluidos rechazos del servidor a CRUD administrativo.
4. Probar detalle de orden, pago y auditoría cuando existan registros reales y confirmar su visibilidad administrativa.
5. Los flujos privados preexistentes de compra siguen siendo demostración local; biblioteca todavía pendiente. No presentarlos como órdenes/pagos reales de Supabase.
6. Optimización adicional del bundle si se exige el presupuesto de 500 kB.
7. PayPhone real queda para una etapa separada, como se solicitó.

No se publicaron cambios ni se avanzó a la integración de pagos.


