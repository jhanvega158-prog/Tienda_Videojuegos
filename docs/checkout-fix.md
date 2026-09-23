# Corrección de carga del checkout

El checkout fallaba al consultar `/api/paypal/orders/current`: `PaymentService` leía directamente el campo `db` de `StoreService`, que Spring envuelve en un proxy transaccional. Ese campo era nulo en el proxy. Ahora `JdbcTemplate` se inyecta directamente por constructor y el campo de `StoreService` es privado.

Se reprodujo el fallo con una prueba del contexto completo de Spring y PostgreSQL local. Tras la corrección pasaron las 33 pruebas del backend, sin omisiones, incluyendo idempotencia y fulfillment. Las pruebas de pagos usan un proveedor simulado y una base local desechable; no representan una compra real en Sandbox.

La consulta de solo lectura a Supabase no encontró registros en `paypal_checkouts` durante el diagnóstico. No se ejecutaron migraciones ni modificaciones a los pedidos del usuario. El backend local se reinició con la corrección. Sigue pendiente completar una compra desde el navegador con una cuenta compradora Sandbox.
