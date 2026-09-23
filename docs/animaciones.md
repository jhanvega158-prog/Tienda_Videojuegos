# Parallax y animaciones

Se añadieron tres directivas visuales en `src/app/shared/motion.directive.ts`:

- Parallax: desplaza exclusivamente la capa de imagen, con máximo de 48 px. Utiliza IntersectionObserver para detectar visibilidad y requestAnimationFrame para agrupar las actualizaciones. Los eventos se registran fuera de Angular con Renderer2 y listeners pasivos. No existe un bucle de animación permanente.
- Reveal: entrada única mediante IntersectionObserver. Desplazamiento de 14 px y aparición progresiva de tarjetas, con retraso máximo de 180 ms. Si no existe soporte del navegador, el contenido permanece visible. El foco de teclado también revela el elemento.
- ScrollSurface: cambia la superficie del navbar tras 24 px de scroll; modifica el DOM únicamente al cruzar ese umbral.

Las suscripciones, observadores y frames se limpian al destruir las directivas. No se añadieron dependencias ni se modificaron servicios, rutas, autenticación, guards o base de datos.

Hero y promoción tienen capas separadas de imagen, overlay y contenido. El banner promocional mide al menos 450 px. Las imágenes mantienen `background-size: cover` y cuentan con margen para evitar huecos al moverse.

El parallax se desactiva por debajo de 1024 px, para puntero táctil y con `prefers-reduced-motion: reduce`. Las entradas también respetan esta preferencia, incluso cuando cambia con la página abierta.

## Comprobaciones

- Build correcto; persiste el aviso de tamaño inicial: 662,64 kB frente a 500 kB recomendados.
- Hero: 200 px de scroll desplazaron la imagen 16 px; la posición del título respecto al hero no cambió.
- Promoción: 120 px de scroll desplazaron la imagen aproximadamente 9,6 px.
- Sin huecos en los fondos ni deformación de imágenes.
- Los 19 elementos de entrada se revelaron al recorrer la portada.
- Reducción de movimiento: transform del fondo igual a `none`, contenido visible.
- Móvil de 390 px: fondo estático antes y después del scroll.
- Sin scroll horizontal a 360, 390, 768, 1024, 1440 y 1920 px.
- Navegación a catálogo, login, registro e inicio sin errores de navegador.
