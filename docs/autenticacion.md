# Etapa 2: autenticación

Se reutiliza `SupabaseService`. Supabase administra la sesión; `AuthService` verifica el usuario mediante `getUser()` y consulta el perfil de `public.usuarios` por `auth_id`. No se usa el antiguo registro local `jjc-user` para autorizar.

- `/registro`: metadata nombre, apellido y teléfono; sin inserciones manuales de usuario o carrito ni selección de rol.
- `/login`: CLIENTE va a `/`; ADMIN va a `/admin`.
- `/admin`: exige un perfil activo con `id_rol === 1`.
- `/compras` y `/compra/:id`: exigen autenticación. El contenido de compras sigue siendo local.
- Una cuenta inactiva se rechaza y se solicita cerrar su sesión en Supabase.
- Las consultas de perfil fallidas se registran completas en consola. Un resultado vacío puede indicar perfil ausente o filas filtradas por RLS.

## Verificación local

```sh
npm run build
npm test -- --watch=false --include=src/app/core/services/auth.service.spec.ts
npm start
```

Las pruebas unitarias usan dobles de Supabase: verifican autenticación, metadata de registro, confirmación por correo, sesión inmediata, perfil ausente, cuenta inactiva, sesión, logout y guards. No sustituyen la comprobación del trigger en la base real.

## Verificación real pendiente de confirmar el correo

Se envió el registro de `jhanvega@gmail.com` desde la aplicación. Supabase aceptó la solicitud sin sesión y el posterior login devolvió HTTP 400 `Email not confirmed`. No se han verificado todavía el perfil ni el carrito automático, ni el login, logout y recarga con sesión real.

Después de confirmar el correo: iniciar sesión, revisar `public.usuarios` por `auth_id`, comprobar `id_rol = 2` y el carrito automático; recargar, intentar `/admin` como CLIENTE y cerrar sesión.

Para probar el rol administrador, ejecutar desde el editor SQL de Supabase sobre la cuenta de prueba, después de comprobar CLIENTE:

```sql
UPDATE public.usuarios
SET id_rol = (
    SELECT id
    FROM public.roles
    WHERE nombre = 'ADMIN'
)
WHERE correo = 'jhanvega@gmail.com';
```

Luego iniciar sesión de nuevo y comprobar la redirección a `/admin`. Este SQL no se ejecuta desde Angular. Los guards controlan la navegación; las políticas RLS de Supabase deben seguir protegiendo las operaciones de base de datos.

Si falla `public.usuarios SELECT`, revisar la política que permite a un usuario autenticado leer su propio perfil (`auth_id = auth.uid()`). No desactivar RLS ni habilitar acceso público a perfiles o carritos.

Referencia: https://supabase.com/docs/reference/javascript/auth-onauthstatechange

## Resultado de la prueba real con el segundo correo

Cuenta: `jhanvega158@gmail.com`, registrada desde `/registro` y confirmada por correo.

- Login real correcto y redirección al inicio.
- Usuario de Supabase Auth verificado: `1fcdc645-9e8d-4c48-aff8-ca24a6cd07c3`.
- Perfil automático en `public.usuarios`: ID 2, activo, `id_rol = 2` (CLIENTE).
- Carrito automático en `public.carritos`: ID 2, `id_usuario = 2`.
- Sesión conservada al recargar el navegador.
- Acceso CLIENTE a `/admin` bloqueado con redirección al inicio.
- Logout real correcto y actualización del navbar.
- Sin errores de RLS ni de navegador en estas comprobaciones.

Estos resultados completan las verificaciones que quedaron pendientes con el primer correo. La prueba real ADMIN se omite por instrucción expresa del usuario; la cuenta permanece como CLIENTE. El comportamiento ADMIN fue verificado únicamente con pruebas unitarias, no con una cuenta real. No se ejecutó ningún cambio de rol ni de políticas RLS.
