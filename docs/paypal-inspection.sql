-- Solo lectura. Ejecutar en Supabase SQL Editor antes de paypal-migration.sql.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns where table_schema='public'
and table_name in ('usuarios','carritos','carrito_detalle','ordenes','orden_detalle','pagos','biblioteca','auditoria_pagos')
order by table_name,ordinal_position;

select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as definicion
from pg_constraint where connamespace='public'::regnamespace order by 1,2;

select t.tgrelid::regclass as tabla, t.tgname, pg_get_triggerdef(t.oid) as trigger,
  p.oid::regprocedure as funcion, pg_get_functiondef(p.oid) as cuerpo
from pg_trigger t join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and t.tgrelid in
 ('public.pagos'::regclass,'public.ordenes'::regclass,'public.orden_detalle'::regclass,
  'public.videojuegos'::regclass,'public.biblioteca'::regclass,'public.carrito_detalle'::regclass)
order by 1,2;

select * from pg_policies where schemaname='public';
select routine_name, grantee, privilege_type from information_schema.routine_privileges
where routine_schema='public' and grantee in ('anon','authenticated','PUBLIC');
