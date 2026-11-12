-- 20261112_tarifas_por_salida_y_habitaciones.sql
--
-- Objetivo: dos pedidos del dueño (audios del 12/11/2026).
--
--   1) Tarifas por salida. Hoy una tarifa es hotel + mes + año y cada salida
--      toma la de su mes. Pero dentro de un mismo mes hay salidas con precios
--      distintos (#190 BALNEARIO CAMBORIU: el 24 y 31 Ene valen 685, no 720).
--      Ahora una fila de `accommodation_rates` puede ser de UNA salida
--      (`fecha_salida = D`) o del mes (`fecha_salida IS NULL`, como hoy).
--      Regla única de búsqueda (web, panel y bot): la tarifa de la salida D es
--      la fila con fecha_salida = D; si no hay, la del mes/año de D con
--      fecha_salida IS NULL; si tampoco, «a consultar».
--
--   2) Single, quíntuple y menor en la reserva de autogestión. Single (sgl,
--      1 persona) y quíntuple (qpl, 5) son tipos de habitación nuevos. «Menor»
--      NO es un tipo: es un contador por fila de detalle (menores que comparten
--      la habitación pagando tarifa de menor, además de la base). La reserva
--      sigue sin calcular precios: cotiza el agente.
--
-- Cambios:
--   A) accommodation_rates: + fecha_salida, tarifa_sgl, tarifa_qpl. CHECK de
--      que mes/anio son los de fecha_salida. El UNIQUE (accommodation_id, mes,
--      anio) se reemplaza por dos únicos parciales (fila del mes / fila de la
--      salida), para que convivan la fila del mes y las de sus salidas.
--      Las filas existentes no se tocan (quedan como tarifa del mes).
--      OJO: `upsert(..., { onConflict: "accommodation_id,mes,anio" })` deja de
--      funcionar (un único parcial no sirve de árbitro sin WHERE). El código
--      tiene que salir junto con esta migración.
--   B) package_stock: + stock_sgl, stock_qpl (NULL = no se controla cupo de ese
--      tipo; número = se controla igual que dbl/tpl/cpl).
--   C) reservation_details: + menores (0 a 2 por habitación, sólo dbl/tpl/cpl);
--      tipo_habitacion acepta sgl, dbl, tpl, cpl, qpl.
--   D) Funciones (mismas firmas, SECURITY DEFINER, search_path y chequeos de
--      admin que las vivas; mismo momento de descuento/reposición de cupo):
--      create_reservation_atomic, confirm_reservation_atomic,
--      cancel_reservation_atomic, validate_reservation_capacity.
--      create_reservation_atomic además rechaza cantidad <= 0 (antes aceptaba
--      negativos). Un payload viejo (sin `menores`, sólo dbl/tpl/cpl) se
--      comporta igual que antes.
--   E) Vista travel_packages_bot (la lee el bot de WhatsApp): mismas columnas,
--      mismo orden y tipos. Cambia cómo se arma `hoteles_tarifas`:
--        - tarifa 0 = sin tarifa (antes salía «cuádruple USD 0»);
--        - suma single y quíntuple cuando tienen tarifa;
--        - un hotel+mes sin filas por salida queda con la línea de siempre;
--        - un hotel+mes con filas por salida emite la tarifa efectiva de cada
--          salida del paquete, agrupando las que valen lo mismo:
--          «Hotel 3★ (Régimen) — salidas 3, 10 y 17 ene 2027: doble USD 720 · …».
--      `precio_desde` = mínimo de doble sobre las tarifas efectivas.
--   F) Saca el trigger viejo `restore_stock_on_cancel_trigger` de reservations:
--      reponía cupo OTRA VEZ después de cancel_reservation_atomic (doble
--      reposición al cancelar una confirmada, y cupo que nunca se descontó al
--      cancelar una pendiente). La función queda; sólo se borra el trigger.
--   G) notify pgrst para que PostgREST vea las columnas nuevas.
--
-- Re-ejecutable: add column if not exists, drop constraint if exists antes de
-- cada add constraint, create index if not exists, create or replace.
-- Una sola transacción: si algo falla, no queda nada a medias.
--
-- Rollback al final del archivo.

begin;

-- Si otra consulta tiene tomada una de estas tablas, la migración aborta limpia a los 5 s en vez de
-- quedarse en cola con la web y el bot esperando detrás. Se vuelve a correr y listo.
set local lock_timeout = '5s';

-- =====================================================================
-- A) accommodation_rates: tarifas por salida + single / quíntuple
-- =====================================================================

alter table public.accommodation_rates
  add column if not exists fecha_salida date,
  add column if not exists tarifa_sgl numeric,
  add column if not exists tarifa_qpl numeric;

comment on column public.accommodation_rates.fecha_salida is
  'NULL = tarifa del mes (mes/anio). Una fecha = tarifa de esa salida, que '
  'manda sobre la del mes. Sus mes/anio son siempre los de la fecha (CHECK).';
comment on column public.accommodation_rates.tarifa_sgl is
  'Tarifa single. NULL o 0 = sin tarifa.';
comment on column public.accommodation_rates.tarifa_qpl is
  'Tarifa quíntuple. NULL o 0 = sin tarifa.';

alter table public.accommodation_rates
  drop constraint if exists accommodation_rates_fecha_salida_mes_anio_check;
alter table public.accommodation_rates
  add constraint accommodation_rates_fecha_salida_mes_anio_check
  check (
    fecha_salida is null
    or (mes = extract(month from fecha_salida)::int
        and anio = extract(year from fecha_salida)::int)
  );

-- La unicidad pasa a ser por tipo de fila.
alter table public.accommodation_rates
  drop constraint if exists accommodation_rates_accommodation_id_mes_anio_key;

-- Una sola tarifa del mes por hotel y mes/año.
create unique index if not exists accommodation_rates_mes_key
  on public.accommodation_rates (accommodation_id, mes, anio)
  where fecha_salida is null;

-- Una sola tarifa por hotel y salida. También es el índice para buscar por
-- (accommodation_id, fecha_salida): `fecha_salida = D` implica la condición
-- del índice parcial, así que no hace falta otro.
create unique index if not exists accommodation_rates_salida_key
  on public.accommodation_rates (accommodation_id, fecha_salida)
  where fecha_salida is not null;

-- =====================================================================
-- B) package_stock: cupo de single y quíntuple
-- =====================================================================

alter table public.package_stock
  add column if not exists stock_sgl integer,
  add column if not exists stock_qpl integer;

comment on column public.package_stock.stock_sgl is
  'Cupo de singles. NULL = no se controla (se reserva y queda a confirmar).';
comment on column public.package_stock.stock_qpl is
  'Cupo de quíntuples. NULL = no se controla (se reserva y queda a confirmar).';

alter table public.package_stock drop constraint if exists package_stock_stock_sgl_check;
alter table public.package_stock
  add constraint package_stock_stock_sgl_check check (stock_sgl >= 0);

alter table public.package_stock drop constraint if exists package_stock_stock_qpl_check;
alter table public.package_stock
  add constraint package_stock_stock_qpl_check check (stock_qpl >= 0);

-- =====================================================================
-- C) reservation_details: menores + tipos sgl / qpl
-- =====================================================================

alter table public.reservation_details
  add column if not exists menores integer not null default 0;

comment on column public.reservation_details.menores is
  'Menores que comparten la habitación pagando tarifa de menor, ADEMÁS de la '
  'base. Doble + 1 menor = 3 pasajeros. 0 a 2 por habitación, sólo dbl/tpl/cpl.';

alter table public.reservation_details drop constraint if exists reservation_details_menores_check;
alter table public.reservation_details
  add constraint reservation_details_menores_check check (menores >= 0);

-- Misma regla que valida create_reservation_atomic, por si se edita a mano.
alter table public.reservation_details drop constraint if exists reservation_details_menores_tipo_check;
alter table public.reservation_details
  add constraint reservation_details_menores_tipo_check
  check (
    menores <= 2 * cantidad
    and (menores = 0 or tipo_habitacion in ('dbl', 'tpl', 'cpl'))
  );

alter table public.reservation_details drop constraint if exists reservation_details_tipo_habitacion_check;
alter table public.reservation_details
  add constraint reservation_details_tipo_habitacion_check
  check (tipo_habitacion in ('sgl', 'dbl', 'tpl', 'cpl', 'qpl'));

-- =====================================================================
-- D) Funciones
-- =====================================================================
-- Copiadas de las definiciones vivas de producción (12/11/2026). Sólo cambia
-- lo marcado con «-- [nuevo]». create or replace conserva los GRANT.

CREATE OR REPLACE FUNCTION public.create_reservation_atomic(p_package_id integer, p_accommodation_id integer, p_fecha_salida date, p_cliente_nombre text, p_cliente_email text, p_cliente_telefono text, p_comentarios text, p_details jsonb, p_passengers jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_reservation_id INTEGER;
  v_stock_id INTEGER;
  v_stock_sgl INTEGER;  -- [nuevo] NULL = no se controla
  v_stock_dbl INTEGER;
  v_stock_tpl INTEGER;
  v_stock_cpl INTEGER;
  v_stock_qpl INTEGER;  -- [nuevo] NULL = no se controla
  v_is_unlimited BOOLEAN;
  v_detail JSONB;
  v_passenger JSONB;
  v_total_capacity INTEGER := 0;
  v_passenger_count INTEGER;
  v_has_titular BOOLEAN := FALSE;
  v_tipo TEXT;
  v_cantidad INTEGER;
  v_menores INTEGER;     -- [nuevo]
  v_req_sgl INTEGER := 0; -- [nuevo]
  v_req_dbl INTEGER := 0;
  v_req_tpl INTEGER := 0;
  v_req_cpl INTEGER := 0;
  v_req_qpl INTEGER := 0; -- [nuevo]
BEGIN
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
    IF v_passenger->>'tipo_pasajero' = 'titular' THEN
      v_has_titular := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_has_titular THEN
    RAISE EXCEPTION 'Debe incluir al menos un pasajero titular';
  END IF;

  FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details) LOOP
    v_tipo := v_detail->>'tipo_habitacion';
    v_cantidad := (v_detail->>'cantidad')::INTEGER;
    -- [nuevo] menores ausente o vacío = 0
    v_menores := COALESCE(NULLIF(v_detail->>'menores', '')::INTEGER, 0);

    IF v_tipo = 'sgl' THEN  -- [nuevo]
      v_req_sgl := v_req_sgl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 1;
    ELSIF v_tipo = 'dbl' THEN
      v_req_dbl := v_req_dbl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 2;
    ELSIF v_tipo = 'tpl' THEN
      v_req_tpl := v_req_tpl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 3;
    ELSIF v_tipo = 'cpl' THEN
      v_req_cpl := v_req_cpl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 4;
    ELSIF v_tipo = 'qpl' THEN  -- [nuevo]
      v_req_qpl := v_req_qpl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 5;
    ELSE
      RAISE EXCEPTION 'Tipo de habitacion no soportado: %', v_tipo;
    END IF;

    -- [nuevo] cantidad tiene que ser positiva (antes se aceptaban negativos)
    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad de habitaciones inválida (%) para el tipo %', v_cantidad, v_tipo;
    END IF;

    -- [nuevo] menores: 0 a 2 por habitación, sólo en dbl/tpl/cpl
    IF v_menores < 0 THEN
      RAISE EXCEPTION 'Cantidad de menores inválida (%)', v_menores;
    END IF;
    IF v_menores > 0 AND v_tipo NOT IN ('dbl', 'tpl', 'cpl') THEN
      RAISE EXCEPTION 'No se pueden agregar menores a una habitación %', v_tipo;
    END IF;
    IF v_menores > 2 * v_cantidad THEN
      RAISE EXCEPTION 'Máximo 2 menores por habitación (pedidos: % en % habitación/es %)', v_menores, v_cantidad, v_tipo;
    END IF;
    v_total_capacity := v_total_capacity + v_menores;
  END LOOP;

  v_passenger_count := jsonb_array_length(p_passengers);
  IF v_passenger_count > v_total_capacity THEN
    RAISE EXCEPTION 'Pasajeros (%) excede capacidad (%)', v_passenger_count, v_total_capacity;
  END IF;

  -- Buscar stock: fecha especifica primero
  SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited, ps.stock_sgl, ps.stock_qpl
    INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited, v_stock_sgl, v_stock_qpl
  FROM public.package_stock ps
  WHERE ps.package_id = p_package_id
    AND ps.accommodation_id = p_accommodation_id
    AND ps.is_available = TRUE
    AND ps.fecha_salida = p_fecha_salida
  LIMIT 1;

  IF v_stock_id IS NULL THEN
    SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited, ps.stock_sgl, ps.stock_qpl
      INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited, v_stock_sgl, v_stock_qpl
    FROM public.package_stock ps
    WHERE ps.package_id = p_package_id
      AND ps.accommodation_id = p_accommodation_id
      AND ps.is_available = TRUE
      AND ps.flexible_dates = TRUE
    LIMIT 1;
  END IF;

  IF v_stock_id IS NULL THEN
    RAISE EXCEPTION 'No hay stock disponible para esta fecha y alojamiento';
  END IF;

  -- Solo validar cupo si NO es ilimitado
  IF NOT COALESCE(v_is_unlimited, FALSE) THEN
    IF v_stock_dbl < v_req_dbl OR v_stock_tpl < v_req_tpl OR v_stock_cpl < v_req_cpl THEN
      RAISE EXCEPTION 'Stock insuficiente. Solicitado dbl=%, tpl=%, cpl=%. Disponible dbl=%, tpl=%, cpl=%',
        v_req_dbl, v_req_tpl, v_req_cpl, v_stock_dbl, v_stock_tpl, v_stock_cpl;
    END IF;

    -- [nuevo] single / quíntuple: sólo si su cupo está cargado (NULL = no se controla)
    IF (v_stock_sgl IS NOT NULL AND v_stock_sgl < v_req_sgl)
       OR (v_stock_qpl IS NOT NULL AND v_stock_qpl < v_req_qpl) THEN
      RAISE EXCEPTION 'Stock insuficiente. Solicitado sgl=%, qpl=%. Disponible sgl=%, qpl=%',
        v_req_sgl, v_req_qpl, v_stock_sgl, v_stock_qpl;
    END IF;
  END IF;

  INSERT INTO public.reservations (
    package_id, accommodation_id, fecha_salida,
    cliente_nombre, cliente_email, cliente_telefono,
    comentarios, estado
  ) VALUES (
    p_package_id, p_accommodation_id, p_fecha_salida,
    p_cliente_nombre, p_cliente_email, p_cliente_telefono,
    NULLIF(p_comentarios, ''), 'pendiente'
  )
  RETURNING id INTO v_reservation_id;

  FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details) LOOP
    INSERT INTO public.reservation_details (
      reservation_id, tipo_habitacion, cantidad, subtipo_habitacion, menores
    ) VALUES (
      v_reservation_id,
      v_detail->>'tipo_habitacion',
      (v_detail->>'cantidad')::INTEGER,
      NULLIF(v_detail->>'subtipo_habitacion', ''),
      COALESCE(NULLIF(v_detail->>'menores', '')::INTEGER, 0)  -- [nuevo]
    );
  END LOOP;

  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
    INSERT INTO public.reservation_passengers (
      reservation_id, tipo_pasajero, nombre, apellido, fecha_nacimiento,
      dni, email, telefono, edad_al_viajar, datos_pendientes
    ) VALUES (
      v_reservation_id,
      v_passenger->>'tipo_pasajero',
      v_passenger->>'nombre',
      v_passenger->>'apellido',
      (v_passenger->>'fecha_nacimiento')::DATE,
      NULLIF(v_passenger->>'dni', ''),
      NULLIF(v_passenger->>'email', ''),
      NULLIF(v_passenger->>'telefono', ''),
      NULLIF(v_passenger->>'edad_al_viajar', '')::INTEGER,
      COALESCE((v_passenger->>'datos_pendientes')::BOOLEAN, FALSE)
    );
  END LOOP;

  RETURN v_reservation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_reservation_atomic(p_reservation_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado TEXT;
  v_package_id INTEGER;
  v_accommodation_id INTEGER;
  v_fecha_salida DATE;
  v_stock_id INTEGER;
  v_stock_sgl INTEGER;  -- [nuevo]
  v_stock_dbl INTEGER;
  v_stock_tpl INTEGER;
  v_stock_cpl INTEGER;
  v_stock_qpl INTEGER;  -- [nuevo]
  v_is_unlimited BOOLEAN;
  v_req_sgl INTEGER := 0; -- [nuevo]
  v_req_dbl INTEGER := 0;
  v_req_tpl INTEGER := 0;
  v_req_cpl INTEGER := 0;
  v_req_qpl INTEGER := 0; -- [nuevo]
BEGIN
    -- Solo el admin (ver private.is_admin)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

  SELECT r.estado, r.package_id, r.accommodation_id, r.fecha_salida
    INTO v_estado, v_package_id, v_accommodation_id, v_fecha_salida
  FROM public.reservations r
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Reserva % no encontrada', p_reservation_id;
  END IF;

  IF v_estado = 'confirmada' THEN
    RETURN;
  END IF;

  IF v_estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Solo se puede confirmar una reserva pendiente (estado actual: %)', v_estado;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'dbl' THEN rd.cantidad ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'tpl' THEN rd.cantidad ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'sgl' THEN rd.cantidad ELSE 0 END), 0),  -- [nuevo]
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'qpl' THEN rd.cantidad ELSE 0 END), 0)   -- [nuevo]
    INTO v_req_dbl, v_req_tpl, v_req_cpl, v_req_sgl, v_req_qpl
  FROM public.reservation_details rd
  WHERE rd.reservation_id = p_reservation_id;

  SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited, ps.stock_sgl, ps.stock_qpl
    INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited, v_stock_sgl, v_stock_qpl
  FROM public.package_stock ps
  WHERE ps.package_id = v_package_id
    AND ps.accommodation_id = v_accommodation_id
    AND ps.is_available = TRUE
    AND ps.fecha_salida = v_fecha_salida
  LIMIT 1
  FOR UPDATE;

  IF v_stock_id IS NULL THEN
    SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited, ps.stock_sgl, ps.stock_qpl
      INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited, v_stock_sgl, v_stock_qpl
    FROM public.package_stock ps
    WHERE ps.package_id = v_package_id
      AND ps.accommodation_id = v_accommodation_id
      AND ps.is_available = TRUE
      AND ps.flexible_dates = TRUE
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_stock_id IS NULL THEN
    RAISE EXCEPTION 'No hay stock para esta reserva. Cargar stock antes de confirmar.';
  END IF;

  -- Solo validar y decrementar si NO es ilimitado
  IF NOT COALESCE(v_is_unlimited, FALSE) THEN
    IF v_stock_dbl < v_req_dbl OR v_stock_tpl < v_req_tpl OR v_stock_cpl < v_req_cpl THEN
      RAISE EXCEPTION 'Stock insuficiente al confirmar. Solicitado dbl=%, tpl=%, cpl=%. Disponible dbl=%, tpl=%, cpl=%',
        v_req_dbl, v_req_tpl, v_req_cpl, v_stock_dbl, v_stock_tpl, v_stock_cpl;
    END IF;

    -- [nuevo] single / quíntuple: sólo si su cupo está cargado (NULL = no se controla)
    IF (v_stock_sgl IS NOT NULL AND v_stock_sgl < v_req_sgl)
       OR (v_stock_qpl IS NOT NULL AND v_stock_qpl < v_req_qpl) THEN
      RAISE EXCEPTION 'Stock insuficiente al confirmar. Solicitado sgl=%, qpl=%. Disponible sgl=%, qpl=%',
        v_req_sgl, v_req_qpl, v_stock_sgl, v_stock_qpl;
    END IF;

    -- [nuevo] stock_sgl / stock_qpl: NULL - n = NULL, así que un cupo sin
    -- controlar sigue sin controlar.
    UPDATE public.package_stock
       SET stock_dbl = stock_dbl - v_req_dbl,
           stock_tpl = stock_tpl - v_req_tpl,
           stock_cpl = stock_cpl - v_req_cpl,
           stock_sgl = stock_sgl - v_req_sgl,
           stock_qpl = stock_qpl - v_req_qpl,
           updated_at = NOW()
     WHERE id = v_stock_id;
  END IF;

  UPDATE public.reservations
     SET estado = 'confirmada',
         updated_at = NOW()
   WHERE id = p_reservation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_reservation_atomic(p_reservation_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado TEXT;
  v_package_id INTEGER;
  v_accommodation_id INTEGER;
  v_fecha_salida DATE;
  v_stock_id INTEGER;
  v_is_unlimited BOOLEAN;
  v_repone_sgl INTEGER := 0; -- [nuevo]
  v_repone_dbl INTEGER := 0;
  v_repone_tpl INTEGER := 0;
  v_repone_cpl INTEGER := 0;
  v_repone_qpl INTEGER := 0; -- [nuevo]
BEGIN
    -- Solo el admin (ver private.is_admin)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

  SELECT r.estado, r.package_id, r.accommodation_id, r.fecha_salida
    INTO v_estado, v_package_id, v_accommodation_id, v_fecha_salida
  FROM public.reservations r
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Reserva % no encontrada', p_reservation_id;
  END IF;

  IF v_estado = 'cancelada' THEN
    RETURN;
  END IF;

  IF v_estado = 'confirmada' THEN
    SELECT
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'dbl' THEN rd.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'tpl' THEN rd.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'sgl' THEN rd.cantidad ELSE 0 END), 0),  -- [nuevo]
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'qpl' THEN rd.cantidad ELSE 0 END), 0)   -- [nuevo]
      INTO v_repone_dbl, v_repone_tpl, v_repone_cpl, v_repone_sgl, v_repone_qpl
    FROM public.reservation_details rd
    WHERE rd.reservation_id = p_reservation_id;

    SELECT ps.id, ps.is_unlimited INTO v_stock_id, v_is_unlimited
    FROM public.package_stock ps
    WHERE ps.package_id = v_package_id
      AND ps.accommodation_id = v_accommodation_id
      AND ps.is_available = TRUE
      AND ps.fecha_salida = v_fecha_salida
    LIMIT 1
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
      SELECT ps.id, ps.is_unlimited INTO v_stock_id, v_is_unlimited
      FROM public.package_stock ps
      WHERE ps.package_id = v_package_id
        AND ps.accommodation_id = v_accommodation_id
        AND ps.is_available = TRUE
        AND ps.flexible_dates = TRUE
      LIMIT 1
      FOR UPDATE;
    END IF;

    -- Solo reponer si NO es ilimitado (si fue ilimitado al confirmar, nunca se decrementó)
    -- [nuevo] stock_sgl / stock_qpl: NULL + n = NULL (un cupo sin controlar sigue así).
    IF v_stock_id IS NOT NULL AND NOT COALESCE(v_is_unlimited, FALSE) THEN
      UPDATE public.package_stock
         SET stock_dbl = stock_dbl + v_repone_dbl,
             stock_tpl = stock_tpl + v_repone_tpl,
             stock_cpl = stock_cpl + v_repone_cpl,
             stock_sgl = stock_sgl + v_repone_sgl,
             stock_qpl = stock_qpl + v_repone_qpl,
             updated_at = NOW()
       WHERE id = v_stock_id;
    END IF;
  END IF;

  UPDATE public.reservations
     SET estado = 'cancelada',
         updated_at = NOW()
   WHERE id = p_reservation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_reservation_capacity(reservation_id_param integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_capacity INTEGER;
  passenger_count INTEGER;
BEGIN
  -- Calcular capacidad total según habitaciones reservadas
  -- [nuevo] sgl = 1, qpl = 5, y se suman los menores de cada fila
  SELECT
    SUM(
      CASE
        WHEN tipo_habitacion = 'sgl' THEN cantidad * 1
        WHEN tipo_habitacion = 'dbl' THEN cantidad * 2
        WHEN tipo_habitacion = 'tpl' THEN cantidad * 3
        WHEN tipo_habitacion = 'cpl' THEN cantidad * 4
        WHEN tipo_habitacion = 'qpl' THEN cantidad * 5
        ELSE 0
      END
      + COALESCE(menores, 0)
    )
  INTO total_capacity
  FROM public.reservation_details
  WHERE reservation_id = reservation_id_param;

  -- Contar pasajeros
  SELECT COUNT(*)
  INTO passenger_count
  FROM public.reservation_passengers
  WHERE reservation_id = reservation_id_param;

  -- Validar que no exceda la capacidad
  RETURN passenger_count <= COALESCE(total_capacity, 0);
END;
$function$;

-- =====================================================================
-- E) Vista del bot: tarifa efectiva por salida
-- =====================================================================
-- Mismas columnas, mismo orden y mismos tipos que la vista viva. Las columnas
-- de travel_packages van explícitas (no tp.*): la tabla ya tiene columnas que
-- la vista no expone (p. ej. price_label) y create or replace no admite
-- columnas nuevas en el medio.
--
-- Cómo se arma hoteles_tarifas:
--   tarifas        filas con 0 → NULL (0 = sin tarifa) y moneda por defecto.
--   pkg_salidas    salidas legibles del paquete (available_dates).
--   filas_salida   filas con fecha_salida que cuentan: coinciden con una
--                  salida del paquete, o el paquete no tiene salidas legibles.
--                  Las huérfanas se ignoran del todo (como si no existieran).
--   meses_salida   hotel + mes/año que pasan a «modo salida».
--   salidas_hotel  salidas a mostrar en esos meses: las del paquete en ese
--                  mes/año + las fechas de sus filas.
--   efectivas      regla única: fila de la salida, si no la del mes; una
--                  salida sin ninguna de las dos no genera línea.
--   tramos         filas del mes que siguen en modo mes + salidas agrupadas
--                  por tarifas idénticas (una línea por grupo).

create or replace view public.travel_packages_bot
with (security_invoker = true) as
with mes(num, abbr) as (
  values (1,'ene'),(2,'feb'),(3,'mar'),(4,'abr'),(5,'may'),(6,'jun'),
         (7,'jul'),(8,'ago'),(9,'sep'),(10,'oct'),(11,'nov'),(12,'dic')
),
tarifas as (
  select
    r.id,
    r.accommodation_id,
    r.mes,
    r.anio,
    r.fecha_salida,
    nullif(r.tarifa_sgl, 0)   as sgl,
    nullif(r.tarifa_dbl, 0)   as dbl,
    nullif(r.tarifa_tpl, 0)   as tpl,
    nullif(r.tarifa_cpl, 0)   as cpl,
    nullif(r.tarifa_qpl, 0)   as qpl,
    nullif(r.tarifa_menor, 0) as menor,
    coalesce(r.currency, 'USD') as currency
  from public.accommodation_rates r
),
pkg_salidas as (
  select distinct s.paquete_id, s.fecha
  from (
    select tp.id as paquete_id, public.parse_departure_date(d.d) as fecha
    from public.travel_packages tp
    cross join lateral unnest(coalesce(tp.available_dates, array[]::text[])) as d(d)
  ) s
  where s.fecha is not null
),
filas_salida as (
  select t.*
  from tarifas t
  join public.accommodations a on a.id = t.accommodation_id
  where t.fecha_salida is not null
    and (
      exists (select 1 from pkg_salidas s
              where s.paquete_id = a.paquete_id and s.fecha = t.fecha_salida)
      or not exists (select 1 from pkg_salidas s where s.paquete_id = a.paquete_id)
    )
),
meses_salida as (
  select distinct accommodation_id, mes, anio
  from filas_salida
),
salidas_hotel as (
  select ms.accommodation_id, s.fecha
  from meses_salida ms
  join public.accommodations a on a.id = ms.accommodation_id
  join pkg_salidas s
    on s.paquete_id = a.paquete_id
   and extract(month from s.fecha)::int = ms.mes
   and extract(year from s.fecha)::int = ms.anio
  union
  select fs.accommodation_id, fs.fecha_salida
  from filas_salida fs
),
efectivas as (
  select
    sh.accommodation_id,
    sh.fecha,
    extract(month from sh.fecha)::int as mes,
    extract(year from sh.fecha)::int  as anio,
    case when fs.id is not null then fs.sgl      else fm.sgl      end as sgl,
    case when fs.id is not null then fs.dbl      else fm.dbl      end as dbl,
    case when fs.id is not null then fs.tpl      else fm.tpl      end as tpl,
    case when fs.id is not null then fs.cpl      else fm.cpl      end as cpl,
    case when fs.id is not null then fs.qpl      else fm.qpl      end as qpl,
    case when fs.id is not null then fs.menor    else fm.menor    end as menor,
    case when fs.id is not null then fs.currency else fm.currency end as currency
  from salidas_hotel sh
  left join filas_salida fs
    on fs.accommodation_id = sh.accommodation_id
   and fs.fecha_salida = sh.fecha
  left join tarifas fm
    on fm.accommodation_id = sh.accommodation_id
   and fm.fecha_salida is null
   and fm.mes  = extract(month from sh.fecha)::int
   and fm.anio = extract(year from sh.fecha)::int
  where fs.id is not null or fm.id is not null
),
tramos as (
  select t.accommodation_id, t.mes, t.anio, null::int[] as dias,
         t.sgl, t.dbl, t.tpl, t.cpl, t.qpl, t.menor, t.currency
  from tarifas t
  where t.fecha_salida is null
    and not exists (select 1 from meses_salida ms
                    where ms.accommodation_id = t.accommodation_id
                      and ms.mes = t.mes and ms.anio = t.anio)
  union all
  select e.accommodation_id, e.mes, e.anio,
         array_agg(extract(day from e.fecha)::int order by e.fecha) as dias,
         e.sgl, e.dbl, e.tpl, e.cpl, e.qpl, e.menor, e.currency
  from efectivas e
  group by e.accommodation_id, e.mes, e.anio,
           e.sgl, e.dbl, e.tpl, e.cpl, e.qpl, e.menor, e.currency
),
rate_lines as (
  select
    a.paquete_id,
    a.regimen,
    t.dbl as tarifa_dbl,
    t.currency,
    format(
      '%s %s★%s — %s%s %s: %s%s',
      a.name,
      a.stars,
      case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
      x.salidas,
      coalesce(m.abbr, t.mes::text),
      t.anio,
      coalesce(nullif(x.cuerpo, ''), 'consultar asesor'),
      case when x.cuerpo <> '' and x.faltan <> ''
           then '. ' || x.faltan || ': consultar asesor'
           else ''
      end
    ) as linea,
    -- Orden: el de siempre (alfabético por línea) para las líneas del mes; las
    -- de salida se ordenan por hotel, mes y primer día de la salida.
    case
      when t.dias is null then null
      else format('%s %s★%s — %s %s %s',
             a.name,
             a.stars,
             case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
             coalesce(m.abbr, t.mes::text),
             t.anio,
             lpad(t.dias[1]::text, 2, '0'))
    end as orden_salida
  from tramos t
  join public.accommodations a on a.id = t.accommodation_id
  left join mes m on m.num = t.mes
  cross join lateral (
    select
      case
        when t.dias is null then ''
        when cardinality(t.dias) = 1 then 'salida ' || t.dias[1]::text || ' '
        else 'salidas '
             || array_to_string(t.dias[1:cardinality(t.dias) - 1], ', ')
             || ' y ' || t.dias[cardinality(t.dias)]::text || ' '
      end as salidas,
      -- Orden canónico: single, doble, triple, cuádruple, quíntuple, menor.
      concat_ws(' · ',
        case when t.sgl   is not null then 'single '    || t.currency || ' ' || trunc(t.sgl)::text   end,
        case when t.dbl   is not null then 'doble '     || t.currency || ' ' || trunc(t.dbl)::text   end,
        case when t.tpl   is not null then 'triple '    || t.currency || ' ' || trunc(t.tpl)::text   end,
        case when t.cpl   is not null then 'cuádruple ' || t.currency || ' ' || trunc(t.cpl)::text   end,
        case when t.qpl   is not null then 'quíntuple ' || t.currency || ' ' || trunc(t.qpl)::text   end,
        case when t.menor is not null then 'menor '     || t.currency || ' ' || trunc(t.menor)::text end
      ) as cuerpo,
      -- Bases faltantes: sólo las de siempre. Single y quíntuple casi nunca
      -- tienen tarifa; nombrarlas ensuciaría todas las líneas.
      concat_ws('/',
        case when t.dbl   is null then 'doble'     end,
        case when t.tpl   is null then 'triple'    end,
        case when t.cpl   is null then 'cuádruple' end,
        case when t.menor is null then 'menor'     end
      ) as faltan
  ) x
),
agg as (
  select
    paquete_id,
    array_agg(linea order by coalesce(orden_salida, linea), linea) as hoteles_tarifas,
    array_agg(distinct regimen) filter (where coalesce(regimen, '') <> '') as regimenes,
    min(tarifa_dbl) filter (where tarifa_dbl is not null) as min_dbl,
    (array_agg(currency order by tarifa_dbl))[1] as min_currency
  from rate_lines
  group by paquete_id
),
meses_pkg as (
  select tp_1.id as paquete_id,
    array_agg(ml.label order by ml.ord) as meses
  from public.travel_packages tp_1
  cross join (values
    ('enero','%ene%',1),('febrero','%feb%',2),('marzo','%mar%',3),('abril','%abr%',4),
    ('mayo','%may%',5),('junio','%jun%',6),('julio','%jul%',7),('agosto','%ago%',8),
    ('septiembre','%sep%',9),('octubre','%oct%',10),('noviembre','%nov%',11),('diciembre','%dic%',12)
  ) as ml(label, pat, ord)
  where exists (
    select 1 from unnest(coalesce(tp_1.available_dates, array[]::text[])) d_1(d)
    where lower(d_1.d) like ml.pat
  )
  group by tp_1.id
)
select
  tp.id,
  tp.name,
  tp.description,
  tp.price,
  tp.destination_id,
  tp.duration,
  tp.image_url,
  tp.available_dates,
  tp.max_capacity,
  tp.is_active,
  tp.created_at,
  tp.updated_at,
  tp.transport_type,
  tp.is_special,
  tp.servicios_incluidos,
  tp.servicios_adicionales,
  tp.max_group_size,
  tp.tarifario_pdf_url,
  tp.flyer_pdf_url,
  tp.piezas_redes_pdf_url,
  tp.is_featured,
  tp.priority_order,
  tp.url,
  tp.ciudades,
  tp.is_grupal,
  tp.available_dates_enriched,
  tp.novedades_category_id,
  tp.cuotas,
  tp.first_departure_date,
  tp.last_departure_date,
  d.name as destination_name,
  agg.regimenes,
  agg.hoteles_tarifas,
  mp.meses,
  case
    when agg.min_dbl is not null
    then coalesce(agg.min_currency, 'USD') || ' ' || trunc(agg.min_dbl)::text
    else null
  end as precio_desde,
  (tp.last_departure_date is null
   or tp.last_departure_date >= current_date) as vigente
from public.travel_packages tp
left join public.destinations d on d.id = tp.destination_id
left join agg on agg.paquete_id = tp.id
left join meses_pkg mp on mp.paquete_id = tp.id;

-- =====================================================================
-- F) Trigger viejo que reponía cupo de más
-- =====================================================================
-- `restore_stock_on_cancel` (AFTER UPDATE en reservations) suma dbl/tpl/cpl
-- cada vez que una reserva pasa a 'cancelada', venga de donde venga. Pero
-- cancel_reservation_atomic ya repone (sólo si estaba confirmada) y después
-- hace el UPDATE de estado, así que el trigger repone otra vez: una confirmada
-- que se cancela repone doble y una pendiente que se cancela repone cupo que
-- nunca se descontó. Evidencia: reserva 18 (1 tpl, cancelada el 19/05/2026)
-- dejó su fila de cupo en 10/11/10 ese mismo día. El cupo lo manejan sólo las
-- RPC (descuenta confirm_reservation_atomic, repone cancel_reservation_atomic).
-- La función public.restore_stock_on_cancel() no se borra.
--
-- `reduce_stock_on_reservation` (AFTER INSERT ... WHEN estado = 'confirmada')
-- se deja: dispara al insertar la reserva, antes de que existan sus detalles
-- (FK), así que su loop siempre está vacío y no toca cupo, tampoco con
-- sgl/qpl, is_unlimited o cupo NULL.
drop trigger if exists restore_stock_on_cancel_trigger on public.reservations;

-- =====================================================================
-- G) PostgREST: recargar el esquema (columnas nuevas)
-- =====================================================================
-- Se entrega al hacer commit.
notify pgrst, 'reload schema';

commit;

-- =====================================================================
-- Verificación (correr a mano después de aplicar)
-- =====================================================================
-- -- Las 472 filas viejas siguen siendo tarifas del mes:
-- select count(*) filter (where fecha_salida is null) as del_mes,
--        count(*) filter (where fecha_salida is not null) as por_salida
-- from public.accommodation_rates;
--
-- -- Lo que ve el bot del #190:
-- select unnest(hoteles_tarifas), precio_desde
-- from public.travel_packages_bot where id = 190;

-- =====================================================================
-- Rollback
-- =====================================================================
-- Antes: borrar (o pasar a mano a filas del mes) las tarifas por salida y
-- revisar que no haya reservas con single/quíntuple o con menores, porque los
-- CHECK viejos las rechazarían:
--   select count(*) from public.accommodation_rates where fecha_salida is not null;
--   select count(*) from public.reservation_details
--    where tipo_habitacion in ('sgl','qpl') or menores > 0;
--
-- Después correr, en el editor SQL, este bloque (quitando los «-- »). Las
-- funciones, la vista y el trigger quedan como estaban en producción el
-- 12/11/2026.
--
-- begin;
--
-- -- Vista y funciones primero: dependen de las columnas que se borran.
-- create or replace view public.travel_packages_bot
-- with (security_invoker = true) as
-- with mes(num, abbr) as (
--   values (1,'ene'),(2,'feb'),(3,'mar'),(4,'abr'),(5,'may'),(6,'jun'),
--          (7,'jul'),(8,'ago'),(9,'sep'),(10,'oct'),(11,'nov'),(12,'dic')
-- ),
-- rate_lines as (
--   select
--     a.paquete_id,
--     a.regimen,
--     r.tarifa_dbl,
--     coalesce(r.currency, 'USD') as currency,
--     format(
--       '%s %s★%s — %s %s: %s%s',
--       a.name,
--       a.stars,
--       case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
--       coalesce(m.abbr, r.mes::text),
--       r.anio,
--       coalesce(nullif(concat_ws(' · ',
--         case when r.tarifa_dbl   is not null then 'doble '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_dbl)::text   end,
--         case when r.tarifa_tpl   is not null then 'triple '    || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_tpl)::text   end,
--         case when r.tarifa_cpl   is not null then 'cuádruple ' || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_cpl)::text   end,
--         case when r.tarifa_menor is not null then 'menor '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_menor)::text end
--       ), ''), 'consultar asesor'),
--       case
--         when concat_ws('', case when r.tarifa_dbl is not null then 'x' end,
--                             case when r.tarifa_tpl is not null then 'x' end,
--                             case when r.tarifa_cpl is not null then 'x' end,
--                             case when r.tarifa_menor is not null then 'x' end) <> ''
--          and concat_ws('/', case when r.tarifa_dbl is null then 'doble' end,
--                             case when r.tarifa_tpl is null then 'triple' end,
--                             case when r.tarifa_cpl is null then 'cuádruple' end,
--                             case when r.tarifa_menor is null then 'menor' end) <> ''
--         then '. ' || concat_ws('/', case when r.tarifa_dbl is null then 'doble' end,
--                                     case when r.tarifa_tpl is null then 'triple' end,
--                                     case when r.tarifa_cpl is null then 'cuádruple' end,
--                                     case when r.tarifa_menor is null then 'menor' end)
--                   || ': consultar asesor'
--         else ''
--       end
--     ) as linea
--   from public.accommodations a
--   join public.accommodation_rates r on r.accommodation_id = a.id
--   left join mes m on m.num = r.mes
-- ),
-- agg as (
--   select
--     paquete_id,
--     array_agg(linea order by linea) as hoteles_tarifas,
--     array_agg(distinct regimen) filter (where coalesce(regimen,'') <> '') as regimenes,
--     min(tarifa_dbl) filter (where tarifa_dbl is not null) as min_dbl,
--     (array_agg(currency order by tarifa_dbl))[1] as min_currency
--   from rate_lines
--   group by paquete_id
-- ),
-- meses_pkg as (
--   select tp_1.id as paquete_id,
--     array_agg(ml.label order by ml.ord) as meses
--   from public.travel_packages tp_1
--   cross join (values
--     ('enero','%ene%',1),('febrero','%feb%',2),('marzo','%mar%',3),('abril','%abr%',4),
--     ('mayo','%may%',5),('junio','%jun%',6),('julio','%jul%',7),('agosto','%ago%',8),
--     ('septiembre','%sep%',9),('octubre','%oct%',10),('noviembre','%nov%',11),('diciembre','%dic%',12)
--   ) as ml(label, pat, ord)
--   where exists (
--     select 1 from unnest(coalesce(tp_1.available_dates, array[]::text[])) d_1(d)
--     where lower(d_1.d) like ml.pat
--   )
--   group by tp_1.id
-- )
-- select
--   tp.id, tp.name, tp.description, tp.price, tp.destination_id, tp.duration,
--   tp.image_url, tp.available_dates, tp.max_capacity, tp.is_active,
--   tp.created_at, tp.updated_at, tp.transport_type, tp.is_special,
--   tp.servicios_incluidos, tp.servicios_adicionales, tp.max_group_size,
--   tp.tarifario_pdf_url, tp.flyer_pdf_url, tp.piezas_redes_pdf_url,
--   tp.is_featured, tp.priority_order, tp.url, tp.ciudades, tp.is_grupal,
--   tp.available_dates_enriched, tp.novedades_category_id, tp.cuotas,
--   tp.first_departure_date, tp.last_departure_date,
--   d.name as destination_name,
--   agg.regimenes,
--   agg.hoteles_tarifas,
--   mp.meses,
--   case
--     when agg.min_dbl is not null
--     then coalesce(agg.min_currency, 'USD') || ' ' || trunc(agg.min_dbl)::text
--     else null
--   end as precio_desde,
--   (tp.last_departure_date is null
--    or tp.last_departure_date >= current_date) as vigente
-- from public.travel_packages tp
-- left join public.destinations d on d.id = tp.destination_id
-- left join agg on agg.paquete_id = tp.id
-- left join meses_pkg mp on mp.paquete_id = tp.id;
--
-- CREATE OR REPLACE FUNCTION public.create_reservation_atomic(p_package_id integer, p_accommodation_id integer, p_fecha_salida date, p_cliente_nombre text, p_cliente_email text, p_cliente_telefono text, p_comentarios text, p_details jsonb, p_passengers jsonb)
--  RETURNS integer
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
-- DECLARE
--   v_reservation_id INTEGER;
--   v_stock_id INTEGER;
--   v_stock_dbl INTEGER;
--   v_stock_tpl INTEGER;
--   v_stock_cpl INTEGER;
--   v_is_unlimited BOOLEAN;
--   v_detail JSONB;
--   v_passenger JSONB;
--   v_total_capacity INTEGER := 0;
--   v_passenger_count INTEGER;
--   v_has_titular BOOLEAN := FALSE;
--   v_tipo TEXT;
--   v_cantidad INTEGER;
--   v_req_dbl INTEGER := 0;
--   v_req_tpl INTEGER := 0;
--   v_req_cpl INTEGER := 0;
-- BEGIN
--   FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
--     IF v_passenger->>'tipo_pasajero' = 'titular' THEN
--       v_has_titular := TRUE;
--       EXIT;
--     END IF;
--   END LOOP;
--
--   IF NOT v_has_titular THEN
--     RAISE EXCEPTION 'Debe incluir al menos un pasajero titular';
--   END IF;
--
--   FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details) LOOP
--     v_tipo := v_detail->>'tipo_habitacion';
--     v_cantidad := (v_detail->>'cantidad')::INTEGER;
--
--     IF v_tipo = 'dbl' THEN
--       v_req_dbl := v_req_dbl + v_cantidad;
--       v_total_capacity := v_total_capacity + v_cantidad * 2;
--     ELSIF v_tipo = 'tpl' THEN
--       v_req_tpl := v_req_tpl + v_cantidad;
--       v_total_capacity := v_total_capacity + v_cantidad * 3;
--     ELSIF v_tipo = 'cpl' THEN
--       v_req_cpl := v_req_cpl + v_cantidad;
--       v_total_capacity := v_total_capacity + v_cantidad * 4;
--     ELSE
--       RAISE EXCEPTION 'Tipo de habitacion no soportado: %', v_tipo;
--     END IF;
--   END LOOP;
--
--   v_passenger_count := jsonb_array_length(p_passengers);
--   IF v_passenger_count > v_total_capacity THEN
--     RAISE EXCEPTION 'Pasajeros (%) excede capacidad (%)', v_passenger_count, v_total_capacity;
--   END IF;
--
--   -- Buscar stock: fecha especifica primero
--   SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
--     INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
--   FROM public.package_stock ps
--   WHERE ps.package_id = p_package_id
--     AND ps.accommodation_id = p_accommodation_id
--     AND ps.is_available = TRUE
--     AND ps.fecha_salida = p_fecha_salida
--   LIMIT 1;
--
--   IF v_stock_id IS NULL THEN
--     SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
--       INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
--     FROM public.package_stock ps
--     WHERE ps.package_id = p_package_id
--       AND ps.accommodation_id = p_accommodation_id
--       AND ps.is_available = TRUE
--       AND ps.flexible_dates = TRUE
--     LIMIT 1;
--   END IF;
--
--   IF v_stock_id IS NULL THEN
--     RAISE EXCEPTION 'No hay stock disponible para esta fecha y alojamiento';
--   END IF;
--
--   -- Solo validar cupo si NO es ilimitado
--   IF NOT COALESCE(v_is_unlimited, FALSE) THEN
--     IF v_stock_dbl < v_req_dbl OR v_stock_tpl < v_req_tpl OR v_stock_cpl < v_req_cpl THEN
--       RAISE EXCEPTION 'Stock insuficiente. Solicitado dbl=%, tpl=%, cpl=%. Disponible dbl=%, tpl=%, cpl=%',
--         v_req_dbl, v_req_tpl, v_req_cpl, v_stock_dbl, v_stock_tpl, v_stock_cpl;
--     END IF;
--   END IF;
--
--   INSERT INTO public.reservations (
--     package_id, accommodation_id, fecha_salida,
--     cliente_nombre, cliente_email, cliente_telefono,
--     comentarios, estado
--   ) VALUES (
--     p_package_id, p_accommodation_id, p_fecha_salida,
--     p_cliente_nombre, p_cliente_email, p_cliente_telefono,
--     NULLIF(p_comentarios, ''), 'pendiente'
--   )
--   RETURNING id INTO v_reservation_id;
--
--   FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details) LOOP
--     INSERT INTO public.reservation_details (
--       reservation_id, tipo_habitacion, cantidad, subtipo_habitacion
--     ) VALUES (
--       v_reservation_id,
--       v_detail->>'tipo_habitacion',
--       (v_detail->>'cantidad')::INTEGER,
--       NULLIF(v_detail->>'subtipo_habitacion', '')
--     );
--   END LOOP;
--
--   FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
--     INSERT INTO public.reservation_passengers (
--       reservation_id, tipo_pasajero, nombre, apellido, fecha_nacimiento,
--       dni, email, telefono, edad_al_viajar, datos_pendientes
--     ) VALUES (
--       v_reservation_id,
--       v_passenger->>'tipo_pasajero',
--       v_passenger->>'nombre',
--       v_passenger->>'apellido',
--       (v_passenger->>'fecha_nacimiento')::DATE,
--       NULLIF(v_passenger->>'dni', ''),
--       NULLIF(v_passenger->>'email', ''),
--       NULLIF(v_passenger->>'telefono', ''),
--       NULLIF(v_passenger->>'edad_al_viajar', '')::INTEGER,
--       COALESCE((v_passenger->>'datos_pendientes')::BOOLEAN, FALSE)
--     );
--   END LOOP;
--
--   RETURN v_reservation_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.confirm_reservation_atomic(p_reservation_id integer)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_estado TEXT;
--   v_package_id INTEGER;
--   v_accommodation_id INTEGER;
--   v_fecha_salida DATE;
--   v_stock_id INTEGER;
--   v_stock_dbl INTEGER;
--   v_stock_tpl INTEGER;
--   v_stock_cpl INTEGER;
--   v_is_unlimited BOOLEAN;
--   v_req_dbl INTEGER := 0;
--   v_req_tpl INTEGER := 0;
--   v_req_cpl INTEGER := 0;
-- BEGIN
--     -- Solo el admin (ver private.is_admin)
--     IF NOT private.is_admin() THEN
--         RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
--     END IF;
--
--   SELECT r.estado, r.package_id, r.accommodation_id, r.fecha_salida
--     INTO v_estado, v_package_id, v_accommodation_id, v_fecha_salida
--   FROM public.reservations r
--   WHERE r.id = p_reservation_id
--   FOR UPDATE;
--
--   IF v_estado IS NULL THEN
--     RAISE EXCEPTION 'Reserva % no encontrada', p_reservation_id;
--   END IF;
--
--   IF v_estado = 'confirmada' THEN
--     RETURN;
--   END IF;
--
--   IF v_estado <> 'pendiente' THEN
--     RAISE EXCEPTION 'Solo se puede confirmar una reserva pendiente (estado actual: %)', v_estado;
--   END IF;
--
--   SELECT
--     COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'dbl' THEN rd.cantidad ELSE 0 END), 0),
--     COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'tpl' THEN rd.cantidad ELSE 0 END), 0),
--     COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0)
--     INTO v_req_dbl, v_req_tpl, v_req_cpl
--   FROM public.reservation_details rd
--   WHERE rd.reservation_id = p_reservation_id;
--
--   SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
--     INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
--   FROM public.package_stock ps
--   WHERE ps.package_id = v_package_id
--     AND ps.accommodation_id = v_accommodation_id
--     AND ps.is_available = TRUE
--     AND ps.fecha_salida = v_fecha_salida
--   LIMIT 1
--   FOR UPDATE;
--
--   IF v_stock_id IS NULL THEN
--     SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
--       INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
--     FROM public.package_stock ps
--     WHERE ps.package_id = v_package_id
--       AND ps.accommodation_id = v_accommodation_id
--       AND ps.is_available = TRUE
--       AND ps.flexible_dates = TRUE
--     LIMIT 1
--     FOR UPDATE;
--   END IF;
--
--   IF v_stock_id IS NULL THEN
--     RAISE EXCEPTION 'No hay stock para esta reserva. Cargar stock antes de confirmar.';
--   END IF;
--
--   -- Solo validar y decrementar si NO es ilimitado
--   IF NOT COALESCE(v_is_unlimited, FALSE) THEN
--     IF v_stock_dbl < v_req_dbl OR v_stock_tpl < v_req_tpl OR v_stock_cpl < v_req_cpl THEN
--       RAISE EXCEPTION 'Stock insuficiente al confirmar. Solicitado dbl=%, tpl=%, cpl=%. Disponible dbl=%, tpl=%, cpl=%',
--         v_req_dbl, v_req_tpl, v_req_cpl, v_stock_dbl, v_stock_tpl, v_stock_cpl;
--     END IF;
--
--     UPDATE public.package_stock
--        SET stock_dbl = stock_dbl - v_req_dbl,
--            stock_tpl = stock_tpl - v_req_tpl,
--            stock_cpl = stock_cpl - v_req_cpl,
--            updated_at = NOW()
--      WHERE id = v_stock_id;
--   END IF;
--
--   UPDATE public.reservations
--      SET estado = 'confirmada',
--          updated_at = NOW()
--    WHERE id = p_reservation_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.cancel_reservation_atomic(p_reservation_id integer)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_estado TEXT;
--   v_package_id INTEGER;
--   v_accommodation_id INTEGER;
--   v_fecha_salida DATE;
--   v_stock_id INTEGER;
--   v_is_unlimited BOOLEAN;
--   v_repone_dbl INTEGER := 0;
--   v_repone_tpl INTEGER := 0;
--   v_repone_cpl INTEGER := 0;
-- BEGIN
--     -- Solo el admin (ver private.is_admin)
--     IF NOT private.is_admin() THEN
--         RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
--     END IF;
--
--   SELECT r.estado, r.package_id, r.accommodation_id, r.fecha_salida
--     INTO v_estado, v_package_id, v_accommodation_id, v_fecha_salida
--   FROM public.reservations r
--   WHERE r.id = p_reservation_id
--   FOR UPDATE;
--
--   IF v_estado IS NULL THEN
--     RAISE EXCEPTION 'Reserva % no encontrada', p_reservation_id;
--   END IF;
--
--   IF v_estado = 'cancelada' THEN
--     RETURN;
--   END IF;
--
--   IF v_estado = 'confirmada' THEN
--     SELECT
--       COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'dbl' THEN rd.cantidad ELSE 0 END), 0),
--       COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'tpl' THEN rd.cantidad ELSE 0 END), 0),
--       COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0)
--       INTO v_repone_dbl, v_repone_tpl, v_repone_cpl
--     FROM public.reservation_details rd
--     WHERE rd.reservation_id = p_reservation_id;
--
--     SELECT ps.id, ps.is_unlimited INTO v_stock_id, v_is_unlimited
--     FROM public.package_stock ps
--     WHERE ps.package_id = v_package_id
--       AND ps.accommodation_id = v_accommodation_id
--       AND ps.is_available = TRUE
--       AND ps.fecha_salida = v_fecha_salida
--     LIMIT 1
--     FOR UPDATE;
--
--     IF v_stock_id IS NULL THEN
--       SELECT ps.id, ps.is_unlimited INTO v_stock_id, v_is_unlimited
--       FROM public.package_stock ps
--       WHERE ps.package_id = v_package_id
--         AND ps.accommodation_id = v_accommodation_id
--         AND ps.is_available = TRUE
--         AND ps.flexible_dates = TRUE
--       LIMIT 1
--       FOR UPDATE;
--     END IF;
--
--     -- Solo reponer si NO es ilimitado (si fue ilimitado al confirmar, nunca se decrementó)
--     IF v_stock_id IS NOT NULL AND NOT COALESCE(v_is_unlimited, FALSE) THEN
--       UPDATE public.package_stock
--          SET stock_dbl = stock_dbl + v_repone_dbl,
--              stock_tpl = stock_tpl + v_repone_tpl,
--              stock_cpl = stock_cpl + v_repone_cpl,
--              updated_at = NOW()
--        WHERE id = v_stock_id;
--     END IF;
--   END IF;
--
--   UPDATE public.reservations
--      SET estado = 'cancelada',
--          updated_at = NOW()
--    WHERE id = p_reservation_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.validate_reservation_capacity(reservation_id_param integer)
--  RETURNS boolean
--  LANGUAGE plpgsql
-- AS $function$
-- DECLARE
--   total_capacity INTEGER;
--   passenger_count INTEGER;
-- BEGIN
--   -- Calcular capacidad total según habitaciones reservadas
--   SELECT
--     SUM(
--       CASE
--         WHEN tipo_habitacion = 'dbl' THEN cantidad * 2
--         WHEN tipo_habitacion = 'tpl' THEN cantidad * 3
--         WHEN tipo_habitacion = 'cpl' THEN cantidad * 4
--         ELSE 0
--       END
--     )
--   INTO total_capacity
--   FROM public.reservation_details
--   WHERE reservation_id = reservation_id_param;
--
--   -- Contar pasajeros
--   SELECT COUNT(*)
--   INTO passenger_count
--   FROM public.reservation_passengers
--   WHERE reservation_id = reservation_id_param;
--
--   -- Validar que no exceda la capacidad
--   RETURN passenger_count <= COALESCE(total_capacity, 0);
-- END;
-- $function$;
--
-- -- Trigger viejo, tal cual estaba (vuelve la doble reposición al cancelar).
-- drop trigger if exists restore_stock_on_cancel_trigger on public.reservations;
-- create trigger restore_stock_on_cancel_trigger
--   after update on public.reservations
--   for each row execute function public.restore_stock_on_cancel();
--
-- -- reservation_details
-- alter table public.reservation_details drop constraint if exists reservation_details_tipo_habitacion_check;
-- alter table public.reservation_details
--   add constraint reservation_details_tipo_habitacion_check
--   check (tipo_habitacion in ('dbl', 'tpl', 'cpl'));
-- alter table public.reservation_details drop constraint if exists reservation_details_menores_tipo_check;
-- alter table public.reservation_details drop constraint if exists reservation_details_menores_check;
-- alter table public.reservation_details drop column if exists menores;
--
-- -- package_stock
-- alter table public.package_stock
--   drop column if exists stock_sgl,
--   drop column if exists stock_qpl;
--
-- -- accommodation_rates
-- drop index if exists public.accommodation_rates_salida_key;
-- drop index if exists public.accommodation_rates_mes_key;
-- alter table public.accommodation_rates
--   add constraint accommodation_rates_accommodation_id_mes_anio_key
--   unique (accommodation_id, mes, anio);
-- alter table public.accommodation_rates
--   drop constraint if exists accommodation_rates_fecha_salida_mes_anio_check;
-- alter table public.accommodation_rates
--   drop column if exists fecha_salida,
--   drop column if exists tarifa_sgl,
--   drop column if exists tarifa_qpl;
--
-- notify pgrst, 'reload schema';
--
-- commit;
