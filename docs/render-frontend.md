# Angular en Render Static Site

Crear manualmente un **Static Site** conectado al repositorio con estos valores:

| Campo | Valor |
| --- | --- |
| Name | `jjc-gaming-web` (o un nombre disponible) |
| Branch | `master` |
| Root Directory | Dejar vacío: Angular está en la raíz |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist/front_bd2/browser` |

`.node-version` fija Node 24.19.0, compatible con las dependencias instaladas.
No configurar secretos del backend en el Static Site. Los environments de Angular
se incorporan al JavaScript durante el build; no leen variables de Render en runtime.

En **Redirects/Rewrites**, agregar:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | `Rewrite` |

Esto permite abrir y recargar rutas de Angular, incluidas las rutas de admin.
Render sirve los archivos existentes antes de aplicar el rewrite.
`render.yaml` contiene la misma configuración como referencia declarativa;
crear el sitio manualmente requiere configurar también la regla en el Dashboard.
Este archivo no modifica el Web Service existente.

## Ambientes

- `npm start`: usa `environment.development.ts`, con
  `paymentApiUrl: 'http://localhost:8080/api'` y `production: false`.
- `npm run build`: usa `environment.ts`, con
  `paymentApiUrl: 'https://tienda-videojuegos-8yah.onrender.com/api'` y `production: true`.
- Ambos mantienen la URL y la clave publicable de Supabase. Auth y los guards
  permanecen iguales. Las solicitudes protegidas envían el access token de Supabase.
- PayPal continúa en Sandbox; crear y capturar órdenes pasa por Spring Boot.
- Las peticiones al backend permiten 120 segundos de espera. No hay reintentos
  automáticos de pagos ni solicitudes periódicas para mantener el servicio despierto.

## Después de obtener la URL del Static Site

1. En el Web Service del backend, configurar `FRONTEND_URL` con el origen exacto
   del frontend, por ejemplo `https://NOMBRE.onrender.com`, sin barra final.
   Aplicar el cambio y esperar a que el backend vuelva a estar LIVE.
2. En Supabase, Authentication > URL Configuration, establecer **Site URL** con
   la URL del frontend para las confirmaciones por correo. Revisar las **Redirect URLs**
   permitidas si se usan redirecciones explícitas; conservar las de desarrollo necesarias.
3. Probar registro, confirmación de correo, login, logout, roles, carrito y checkout
   Sandbox; comprobar que los requests protegidos llevan `Authorization: Bearer ...`.
4. Abrir y recargar `/catalogo`, `/login`, `/registro`, `/carrito`, `/checkout`,
   `/compras`, `/biblioteca` y las rutas `/admin`, `/admin/productos`, `/admin/ordenes`,
   `/admin/pagos`. Las rutas protegidas siguen requiriendo la sesión y el rol apropiados.
5. Comprobar imágenes y estilos. Las imágenes externas y las URLs guardadas en
   Supabase también dependen de la disponibilidad de sus servidores.

No se necesita cambiar `PAYPAL_MODE=sandbox` ni ninguna credencial del backend.
El health `/api/health` solo indica que el backend responde; no valida un pago.

Referencias: [Static Sites](https://render.com/docs/static-sites),
[Rewrites](https://render.com/docs/redirects-rewrites),
[Node](https://render.com/docs/node-version),
[Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
