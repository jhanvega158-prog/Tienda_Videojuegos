-- JJC GAMING / PayPal Sandbox. MANUAL: no aplicación automática desde Spring.
-- Leer docs/paypal-sandbox.md y ejecutar primero docs/paypal-inspection.sql.
-- Todo es atómico: un esquema/trigger no reconocido causa rollback completo.
begin;

-- Comprobar tipos: no sustituir enums ni restricciones históricas a ciegas.
do $$
declare r record;
begin
  for r in select table_name,column_name,data_type from information_schema.columns
    where table_schema='public' and (table_name,column_name) in
    (('pagos','proveedor'),('pagos','metodo_pago'),('pagos','estado'),('ordenes','estado'))
  loop
    if r.data_type not in ('text','character varying') then
      raise exception 'Revisar tipo %.% (%) y agregar PAYPAL a su enum manualmente antes de continuar',r.table_name,r.column_name,r.data_type;
    end if;
  end loop;
  if exists(select 1 from public.carritos group by id_usuario having count(*)>1) then
    raise exception 'Hay varios carritos por usuario: consolidar manualmente sin perder sus productos';
  end if;
  if exists(select 1 from public.carrito_detalle group by id_carrito,id_videojuego having count(*)>1) then
    raise exception 'Hay líneas duplicadas de carrito: consolidar manualmente';
  end if;
end $$;

alter table public.pagos add column if not exists paypal_order_id text;
alter table public.pagos add column if not exists paypal_capture_id text;
alter table public.pagos add column if not exists respuesta_proveedor jsonb;
create unique index if not exists pagos_paypal_order_unique on public.pagos(paypal_order_id) where paypal_order_id is not null;
create unique index if not exists pagos_paypal_capture_unique on public.pagos(paypal_capture_id) where paypal_capture_id is not null;
create unique index if not exists carritos_usuario_paypal_unique on public.carritos(id_usuario);
create unique index if not exists carrito_producto_paypal_unique on public.carrito_detalle(id_carrito,id_videojuego);

-- Ampliar exclusivamente el CHECK real inspeccionado, conservando sus cuatro valores históricos.
-- Si su definición cambió, el guard genérico siguiente exige volver a revisarlo.
do $$
begin
 if exists(select 1 from pg_constraint where conrelid='public.pagos'::regclass
   and conname='chk_metodo_pago' and pg_get_constraintdef(oid) in (
   $expected$CHECK (((metodo_pago)::text = ANY ((ARRAY['PAYPHONE'::character varying, 'TARJETA'::character varying, 'TRANSFERENCIA'::character varying, 'SIMULADO'::character varying])::text[])))$expected$,
   -- Forma equivalente al restaurar el mismo CHECK en PostgreSQL 17.
   $expected$CHECK (((metodo_pago)::text = ANY (ARRAY[('PAYPHONE'::character varying)::text, ('TARJETA'::character varying)::text, ('TRANSFERENCIA'::character varying)::text, ('SIMULADO'::character varying)::text])))$expected$)) then
   alter table public.pagos drop constraint chk_metodo_pago;
   alter table public.pagos add constraint chk_metodo_pago
     check(metodo_pago in ('PAYPHONE','TARJETA','TRANSFERENCIA','SIMULADO','PAYPAL'));
 end if;
end $$;

-- Verificar el resto de constraints de proveedor/método sin alterarlos.
-- Si un CHECK excluye PAYPAL, aborta con su nombre para que el operador lo amplíe conservando los valores anteriores.
do $$
declare c record; ok boolean;
begin
 for c in select conname,pg_get_expr(conbin,conrelid) as expr from pg_constraint
   where conrelid='public.pagos'::regclass and contype='c'
 loop
   if c.expr ~ '(proveedor|metodo_pago)' then
     begin
       execute 'select (' || c.expr || ') from (select ''PAYPAL''::text as proveedor,''PAYPAL''::text as metodo_pago) x' into ok;
     exception when others then
       raise exception 'Revisar CHECK %: %; no se modificó automáticamente',c.conname,c.expr;
     end;
     if not coalesce(ok,false) then
       raise exception 'CHECK % no admite PAYPAL. Ampliarlo conservando todos sus valores históricos: %',c.conname,c.expr;
     end if;
   end if;
 end loop;
end $$;

create table if not exists public.paypal_checkouts (
 id uuid primary key,
 id_usuario bigint not null references public.usuarios(id),
 id_orden bigint not null unique references public.ordenes(id),
 id_pago bigint not null unique references public.pagos(id),
 create_request_id uuid not null unique,
 capture_request_id uuid not null unique,
 paypal_order_id text unique,
 status text not null check(status in ('NEW','READY','CAPTURING','PAID','REVIEW','EXPIRED','DECLINED')),
 expires_at timestamptz not null,
 review_reason text,
 created_at timestamptz not null default now()
);
create unique index if not exists paypal_one_active_checkout on public.paypal_checkouts(id_usuario)
 where status in ('NEW','READY','CAPTURING','REVIEW');
create table if not exists public.paypal_checkout_items (
 checkout_id uuid not null references public.paypal_checkouts(id),
 id_videojuego bigint not null references public.videojuegos(id),
 cart_line_id bigint not null, -- snapshot: no FK; el cliente puede borrar/recrear su carrito
 cantidad integer not null check(cantidad>0),
 primary key(checkout_id,id_videojuego)
);
alter table public.paypal_checkouts enable row level security;
alter table public.paypal_checkout_items enable row level security;
create table if not exists public.paypal_cart_imports (
 id_usuario bigint primary key references public.usuarios(id), imported_at timestamptz not null default now()
);
alter table public.paypal_cart_imports enable row level security;
revoke all on public.paypal_cart_imports from public,anon,authenticated;
revoke all on public.paypal_checkouts,public.paypal_checkout_items from public,anon,authenticated;

-- Una única fuente de fulfillment: PaymentService transaccional.
-- Conservar función y trigger anteriores para proveedores históricos, excluyendo SOLO PAYPAL.
-- Cualquier otro trigger de negocio requiere inspección, no se ignora ni se deshabilita.
do $$
declare t record; ddl text;
begin
 for t in select tr.*,p.proname,p.prosrc,md5(replace(pg_get_functiondef(p.oid),chr(13),'')) as body_hash,pg_get_triggerdef(tr.oid) as definition
   from pg_trigger tr join pg_proc p on p.oid=tr.tgfoid
   where not tr.tgisinternal and tr.tgrelid in
    ('public.pagos'::regclass,'public.ordenes'::regclass,'public.orden_detalle'::regclass,
     'public.videojuegos'::regclass,'public.biblioteca'::regclass,'public.carrito_detalle'::regclass)
 loop
   if t.proname in ('jjc_backend_only','jjc_paypal_audit') then continue; end if;
   -- Generadores leídos en la BD real: respetan las referencias explícitas y no hacen fulfillment.
   if (t.proname='generar_numero_orden' and t.tgrelid='public.ordenes'::regclass and t.body_hash='4b62307cd92fe12a48216eec84d84123')
     or (t.proname='generar_referencia_pago' and t.tgrelid='public.pagos'::regclass and t.body_hash='ee28ac1fa53824b4fd68b2aaaf30e469') then continue; end if;
   -- La auditoría histórica también excluye PAYPAL: jjc_paypal_audit registra una sola transición.
   if (t.proname='procesar_pago_aprobado' or
       (t.proname='registrar_cambio_estado_pago' and t.body_hash='824d80977f14abab7b55c0396a4331f2'))
     and t.tgrelid='public.pagos'::regclass and (t.tgtype & 1)=1 then
     if t.definition like '%IS DISTINCT FROM ''PAYPAL''%' then continue; end if;
     if t.definition like '% WHEN (%' then
       ddl := regexp_replace(t.definition,' WHEN \((.*)\) EXECUTE FUNCTION ',
         ' WHEN ((\1) AND (NEW.proveedor IS DISTINCT FROM ''PAYPAL'')) EXECUTE FUNCTION ');
     else
       ddl := replace(t.definition,' EXECUTE FUNCTION ', ' WHEN (NEW.proveedor IS DISTINCT FROM ''PAYPAL'') EXECUTE FUNCTION ');
     end if;
     if ddl=t.definition then raise exception 'No se pudo adaptar el trigger %',t.tgname; end if;
     execute format('drop trigger %I on public.pagos',t.tgname);
     execute ddl;
   else
     raise exception 'Trigger no revisado: % en %, función %. Revisar con docs/paypal-inspection.sql antes de adaptar esta migración.',
       t.tgname,t.tgrelid::regclass,t.proname;
   end if;
 end loop;
end $$;

-- Impedir que un JWT, incluso mediante RPC SECURITY DEFINER heredada, pueda falsificar una compra.
-- session_user sigue siendo authenticator en PostgREST; current_user NO sería suficiente.
create or replace function public.jjc_backend_only() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
 if session_user not in ('postgres','jjc_payments') then
   raise exception 'Operación reservada al backend de pagos' using errcode='42501';
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function public.jjc_backend_only() from public,anon,authenticated;
do $$
declare name text;
begin
 foreach name in array array['ordenes','orden_detalle','pagos','biblioteca','auditoria_pagos','paypal_checkouts','paypal_checkout_items','paypal_cart_imports'] loop
   execute format('revoke insert,update,delete,truncate on public.%I from anon,authenticated',name);
   execute format('drop trigger if exists jjc_backend_only on public.%I',name);
   execute format('create trigger jjc_backend_only before insert or update or delete on public.%I for each row execute function public.jjc_backend_only()',name);
 end loop;
end $$;

create or replace function public.jjc_paypal_audit() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
 if NEW.proveedor='PAYPAL' and (TG_OP='INSERT' or NEW.estado is distinct from OLD.estado) then
   insert into public.auditoria_pagos(id_pago,estado_anterior,estado_nuevo,descripcion)
   values(NEW.id,case when TG_OP='INSERT' then null else OLD.estado end,NEW.estado,'PayPal Sandbox: transición verificada por backend');
 end if;
 return NEW;
end $$;
revoke all on function public.jjc_paypal_audit() from public,anon,authenticated;
drop trigger if exists jjc_paypal_audit on public.pagos;
create trigger jjc_paypal_audit after insert or update on public.pagos for each row execute function public.jjc_paypal_audit();

-- SELECT permanece sujeto a RLS existente. Políticas aditivas para admin; no desactivar RLS.
do $$
declare name text;
begin
 if not exists(select 1 from pg_proc where oid='public.es_admin()'::regprocedure and prosecdef) then
   raise exception 'Revisar es_admin(): debe ser SECURITY DEFINER para las políticas SELECT existentes';
 end if;
 foreach name in array array['pagos','ordenes','orden_detalle','auditoria_pagos'] loop
   if not exists(select 1 from pg_policies where schemaname='public' and tablename=name and policyname='jjc_paypal_admin_read') then
     execute format('create policy jjc_paypal_admin_read on public.%I for select to authenticated using (public.es_admin())',name);
   end if;
 end loop;
end $$;
create table if not exists public.paypal_schema_version (
 version integer primary key, applied_at timestamptz not null default now()
);
alter table public.paypal_schema_version enable row level security;
revoke all on public.paypal_schema_version from public,anon,authenticated;
insert into public.paypal_schema_version(version) values(1) on conflict do nothing;
notify pgrst,'reload schema';
commit;
