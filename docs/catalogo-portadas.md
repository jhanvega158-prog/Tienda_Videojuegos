# Catálogo de 30 juegos y portadas

Actualización: 22/09/2026.

- Supabase: 30 videojuegos activos. Se conservaron los 8 existentes y se agregaron 22.
- Solo se modificó `imagen_url` de los 8 existentes; se conservaron nombres, precios, stock y relaciones.
- Portadas locales en `public/images/games/`: 30 archivos, aproximadamente 1,45 MB en total. Las rutas `/images/games/<steamAppId>.jpg` están guardadas en Supabase. Debe publicarse esta carpeta junto con Angular.
- Las imágenes y las fichas se obtuvieron de las páginas oficiales de cada juego en Steam. Fuentes individuales en [catalogo-juegos.json](catalogo-juegos.json), campos `source` e `imageSource`.
- Los precios de los nuevos juegos son referencias USD del precio base devuelto por Steam (`cc=us`, `price_overview.initial`), consultados durante esta carga. No hay sincronización automática ni se presentan como descuentos. Los títulos gratuitos tienen precio 0.
- Los 22 juegos nuevos tienen stock 0: no se inventaron existencias. Sus precios y existencias pueden ajustarse en `/admin/productos`.
- Categorías asignadas a las categorías activas existentes. No se cambiaron tablas ni políticas.

## Archivos y trazabilidad

- `src/app/shared/game-image.ts`: imagen de respaldo si falla una portada.
- `public/images/game-placeholder.svg`: respaldo gráfico local.
- `src/app/shared/game-card.ts`: portadas con carga diferida y decodificación asíncrona.
- `src/app/detalle-juego/detalle-juego.ts` y `.html`: respaldo en detalle.
- `src/app/admin/pages/productos.ts` y `.html`: vista previa y edición de rutas locales `/images/...`, además de URLs HTTP/HTTPS.
- [catalogo-antes-portadas.json](catalogo-antes-portadas.json): copia de los 8 productos antes del cambio.
- [catalogo-carga-resultado.json](catalogo-carga-resultado.json): IDs y valores devueltos por Supabase después de guardar. Nuevos IDs 11–32; los huecos de IDs anteriores son de pruebas ya eliminadas.
- `scripts/prepare-catalog.cjs`: descarga de metadatos y portadas, reutilizando los archivos existentes.
- `scripts/populate-catalog.py`: carga con sesión real ADMIN mediante Selenium. Solicita contraseña sin guardarla. Evita repetir los juegos por nombre; no se ejecuta al iniciar la aplicación ni durante el build.

## Verificación

`npm run build` correcto. Persiste la advertencia de presupuesto inicial: 675,05 kB frente al límite de 500 kB. Las portadas son archivos estáticos y no forman parte del JavaScript inicial.

Verificación en Chrome: 30 tarjetas y 30 portadas originales cargadas; búsqueda de Cyberpunk correcta; portadas visibles en inicio y detalle; administrador con 30 filas, vista previa correcta y formulario válido con ruta local. Sin errores de consola ni desbordamiento en móvil de 390 px. Las 30 pruebas automáticas pasan. Se verificó que precios y stock de los ocho productos anteriores no cambiaron.

