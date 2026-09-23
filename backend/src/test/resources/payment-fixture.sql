-- ONLY for the disposable local jjc_payments_test database. Not a Supabase schema export.
drop schema public cascade;
create schema public;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='authenticator') then create role authenticator; end if;
end $$;
create table usuarios(id bigserial primary key,auth_id uuid unique, id_rol int,activo boolean,nombre text,apellido text,correo text,telefono text);
create table categorias(id bigint primary key,nombre text,activo boolean);
create table videojuegos(id bigint primary key,nombre text,precio numeric(12,2),stock int check(stock>=0),activo boolean,
 id_categoria bigint references categorias,descripcion text,imagen_url text,plataforma text);
create table carritos(id bigserial primary key,id_usuario bigint references usuarios,fecha_creacion timestamptz default now());
create table carrito_detalle(id bigserial primary key,id_carrito bigint references carritos,id_videojuego bigint references videojuegos,cantidad int check(cantidad>0));
create table ordenes(id bigserial primary key,id_usuario bigint references usuarios,numero_orden varchar(80) unique,
 subtotal numeric(12,2),iva numeric(12,2),total numeric(12,2),estado text,fecha timestamptz default now());
create table orden_detalle(id bigserial primary key,id_orden bigint references ordenes,id_videojuego bigint references videojuegos,nombre_videojuego varchar(150) not null,cantidad int,precio_unitario numeric(12,2),subtotal numeric(12,2));
create table pagos(id bigserial primary key,id_orden bigint references ordenes,referencia text,proveedor text,metodo_pago varchar(30),monto numeric(12,2),estado text,fecha_creacion timestamptz default now(),fecha_confirmacion timestamptz);
create table biblioteca(id bigserial primary key,id_usuario bigint references usuarios,id_videojuego bigint references videojuegos,id_orden bigint references ordenes,fecha_adquisicion timestamptz default now(),unique(id_usuario,id_videojuego));
create table auditoria_pagos(id bigserial primary key,id_pago bigint references pagos,estado_anterior text,estado_nuevo text,descripcion text,fecha timestamptz default now());
create function es_admin() returns boolean language sql security definer as $$ select false $$;
create function procesar_pago_aprobado() returns trigger language plpgsql as $$
begin
 -- Deliberately unsafe legacy fulfillment: test must prove this is excluded for PAYPAL.
 update videojuegos v set stock=stock-d.cantidad from orden_detalle d where d.id_orden=NEW.id_orden and d.id_videojuego=v.id;
 return NEW;
end $$;
create trigger legacy_payment after update on pagos for each row when (NEW.estado='PAGADO') execute function procesar_pago_aprobado();

-- Definitions read from Supabase, no user rows or credentials.
create sequence numero_orden_seq;
create sequence referencia_pago_seq;
CREATE OR REPLACE FUNCTION public.generar_numero_orden()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    IF NEW.numero_orden IS NULL
       OR TRIM(NEW.numero_orden) = '' THEN

        NEW.numero_orden :=
            'ORD-' ||
            TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') ||
            '-' ||
            LPAD(
                nextval('numero_orden_seq')::TEXT,
                6,
                '0'
            );

    END IF;

    RETURN NEW;
END;
$function$
;
CREATE TRIGGER trigger_generar_numero_orden BEFORE INSERT ON public.ordenes FOR EACH ROW EXECUTE FUNCTION generar_numero_orden();
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    IF OLD.estado IS DISTINCT FROM NEW.estado THEN

        INSERT INTO auditoria_pagos (
            id_pago,
            estado_anterior,
            estado_nuevo,
            descripcion
        )
        VALUES (
            NEW.id,
            OLD.estado,
            NEW.estado,
            'Cambio de estado del pago'
        );

    END IF;

    RETURN NEW;
END;
$function$
;
CREATE TRIGGER trigger_auditoria_pago AFTER UPDATE OF estado ON public.pagos FOR EACH ROW EXECUTE FUNCTION registrar_cambio_estado_pago();
CREATE OR REPLACE FUNCTION public.generar_referencia_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    IF NEW.referencia IS NULL
       OR TRIM(NEW.referencia) = '' THEN

        NEW.referencia :=
            'PAY-' ||
            TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') ||
            '-' ||
            LPAD(
                nextval('referencia_pago_seq')::TEXT,
                6,
                '0'
            );

    END IF;

    RETURN NEW;
END;
$function$
;
CREATE TRIGGER trigger_generar_referencia_pago BEFORE INSERT ON public.pagos FOR EACH ROW EXECUTE FUNCTION generar_referencia_pago();
alter table pagos add constraint chk_metodo_pago CHECK (((metodo_pago)::text = ANY ((ARRAY['PAYPHONE'::character varying, 'TARJETA'::character varying, 'TRANSFERENCIA'::character varying, 'SIMULADO'::character varying])::text[])));
