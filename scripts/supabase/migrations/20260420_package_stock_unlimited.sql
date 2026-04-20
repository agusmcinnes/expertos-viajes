-- =====================================================
-- Migration: Stock ilimitado por paquete
-- Fecha: 2026-04-20
-- Descripción:
--   - Agrega columna package_stock.is_unlimited.
--   - Actualiza RPCs create_reservation_atomic y
--     confirm_reservation_atomic para saltar validación y
--     decremento cuando el row de stock es ilimitado.
-- =====================================================

-- =====================================================
-- 1. Nueva columna
-- =====================================================

ALTER TABLE public.package_stock
  ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.package_stock.is_unlimited IS
  'Si TRUE, este registro representa stock ilimitado. La RPC confirm_reservation_atomic no valida ni decrementa los stock_xxx.';

CREATE INDEX IF NOT EXISTS idx_package_stock_unlimited
  ON public.package_stock(package_id) WHERE is_unlimited = TRUE;

-- =====================================================
-- 2. create_reservation_atomic (respeta is_unlimited)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_reservation_atomic(
  INTEGER, INTEGER, DATE, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB
);

CREATE FUNCTION public.create_reservation_atomic(
  p_package_id INTEGER,
  p_accommodation_id INTEGER,
  p_fecha_salida DATE,
  p_cliente_nombre TEXT,
  p_cliente_email TEXT,
  p_cliente_telefono TEXT,
  p_comentarios TEXT,
  p_details JSONB,
  p_passengers JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_reservation_id INTEGER;
  v_stock_id INTEGER;
  v_stock_dbl INTEGER;
  v_stock_tpl INTEGER;
  v_stock_cpl INTEGER;
  v_is_unlimited BOOLEAN;
  v_detail JSONB;
  v_passenger JSONB;
  v_total_capacity INTEGER := 0;
  v_passenger_count INTEGER;
  v_has_titular BOOLEAN := FALSE;
  v_tipo TEXT;
  v_cantidad INTEGER;
  v_req_dbl INTEGER := 0;
  v_req_tpl INTEGER := 0;
  v_req_cpl INTEGER := 0;
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

    IF v_tipo = 'dbl' THEN
      v_req_dbl := v_req_dbl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 2;
    ELSIF v_tipo = 'tpl' THEN
      v_req_tpl := v_req_tpl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 3;
    ELSIF v_tipo = 'cpl' THEN
      v_req_cpl := v_req_cpl + v_cantidad;
      v_total_capacity := v_total_capacity + v_cantidad * 4;
    ELSE
      RAISE EXCEPTION 'Tipo de habitacion no soportado: %', v_tipo;
    END IF;
  END LOOP;

  v_passenger_count := jsonb_array_length(p_passengers);
  IF v_passenger_count > v_total_capacity THEN
    RAISE EXCEPTION 'Pasajeros (%) excede capacidad (%)', v_passenger_count, v_total_capacity;
  END IF;

  -- Buscar stock: fecha especifica primero
  SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
    INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
  FROM public.package_stock ps
  WHERE ps.package_id = p_package_id
    AND ps.accommodation_id = p_accommodation_id
    AND ps.is_available = TRUE
    AND ps.fecha_salida = p_fecha_salida
  LIMIT 1;

  IF v_stock_id IS NULL THEN
    SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
      INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
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
      reservation_id, tipo_habitacion, cantidad, subtipo_habitacion
    ) VALUES (
      v_reservation_id,
      v_detail->>'tipo_habitacion',
      (v_detail->>'cantidad')::INTEGER,
      NULLIF(v_detail->>'subtipo_habitacion', '')
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
$func$;

COMMENT ON FUNCTION public.create_reservation_atomic IS
  'Crea reserva + detalles + pasajeros en una transaccion. Valida stock pero no decrementa. Si el row es is_unlimited, saltea la validacion de cupo.';

-- =====================================================
-- 3. confirm_reservation_atomic (respeta is_unlimited)
-- =====================================================

DROP FUNCTION IF EXISTS public.confirm_reservation_atomic(INTEGER);

CREATE FUNCTION public.confirm_reservation_atomic(
  p_reservation_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_estado TEXT;
  v_package_id INTEGER;
  v_accommodation_id INTEGER;
  v_fecha_salida DATE;
  v_stock_id INTEGER;
  v_stock_dbl INTEGER;
  v_stock_tpl INTEGER;
  v_stock_cpl INTEGER;
  v_is_unlimited BOOLEAN;
  v_req_dbl INTEGER := 0;
  v_req_tpl INTEGER := 0;
  v_req_cpl INTEGER := 0;
BEGIN
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
    COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0)
    INTO v_req_dbl, v_req_tpl, v_req_cpl
  FROM public.reservation_details rd
  WHERE rd.reservation_id = p_reservation_id;

  SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
    INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
  FROM public.package_stock ps
  WHERE ps.package_id = v_package_id
    AND ps.accommodation_id = v_accommodation_id
    AND ps.is_available = TRUE
    AND ps.fecha_salida = v_fecha_salida
  LIMIT 1
  FOR UPDATE;

  IF v_stock_id IS NULL THEN
    SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl, ps.is_unlimited
      INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl, v_is_unlimited
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

    UPDATE public.package_stock
       SET stock_dbl = stock_dbl - v_req_dbl,
           stock_tpl = stock_tpl - v_req_tpl,
           stock_cpl = stock_cpl - v_req_cpl,
           updated_at = NOW()
     WHERE id = v_stock_id;
  END IF;

  UPDATE public.reservations
     SET estado = 'confirmada',
         updated_at = NOW()
   WHERE id = p_reservation_id;
END;
$func$;

COMMENT ON FUNCTION public.confirm_reservation_atomic IS
  'Confirma una reserva pendiente. Si el stock es ilimitado (is_unlimited), no valida ni decrementa. Si no, lockea, valida y decrementa.';

GRANT EXECUTE ON FUNCTION public.confirm_reservation_atomic(INTEGER) TO authenticated;

-- =====================================================
-- 4. cancel_reservation_atomic también respeta is_unlimited
-- =====================================================

DROP FUNCTION IF EXISTS public.cancel_reservation_atomic(INTEGER);

CREATE FUNCTION public.cancel_reservation_atomic(
  p_reservation_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_estado TEXT;
  v_package_id INTEGER;
  v_accommodation_id INTEGER;
  v_fecha_salida DATE;
  v_stock_id INTEGER;
  v_is_unlimited BOOLEAN;
  v_repone_dbl INTEGER := 0;
  v_repone_tpl INTEGER := 0;
  v_repone_cpl INTEGER := 0;
BEGIN
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
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0)
      INTO v_repone_dbl, v_repone_tpl, v_repone_cpl
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
    IF v_stock_id IS NOT NULL AND NOT COALESCE(v_is_unlimited, FALSE) THEN
      UPDATE public.package_stock
         SET stock_dbl = stock_dbl + v_repone_dbl,
             stock_tpl = stock_tpl + v_repone_tpl,
             stock_cpl = stock_cpl + v_repone_cpl,
             updated_at = NOW()
       WHERE id = v_stock_id;
    END IF;
  END IF;

  UPDATE public.reservations
     SET estado = 'cancelada',
         updated_at = NOW()
   WHERE id = p_reservation_id;
END;
$func$;

COMMENT ON FUNCTION public.cancel_reservation_atomic IS
  'Cancela una reserva. Repone stock solo si estaba confirmada y no era ilimitada. Idempotente.';

GRANT EXECUTE ON FUNCTION public.cancel_reservation_atomic(INTEGER) TO authenticated;
