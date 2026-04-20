-- =====================================================
-- Migration: Crear reservas atómicamente (anti-overbooking)
-- Fecha: 2026-04-20
-- Descripción:
--   Crea dos RPC transaccionales:
--   - create_reservation_atomic
--   - cancel_reservation_atomic
--
-- Schema verificado (public.package_stock):
--   id, package_id, accommodation_id, fecha_salida,
--   stock_dbl, stock_tpl, stock_cpl, is_available,
--   flexible_dates, created_at, updated_at
--   (NO existe stock_qpl)
--
-- Nota: usamos dollar-quoting nombrado ($func$) para evitar
-- que el SQL Editor de Supabase se confunda con el parseo.
-- =====================================================

-- =====================================================
-- 1. create_reservation_atomic
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
  -- 1. Validar titular
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
    IF v_passenger->>'tipo_pasajero' = 'titular' THEN
      v_has_titular := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_has_titular THEN
    RAISE EXCEPTION 'Debe incluir al menos un pasajero titular';
  END IF;

  -- 2. Capacidad y cantidades solicitadas por tipo
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

  -- 3. Lockear stock: primero fecha especifica
  SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl
    INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl
  FROM public.package_stock ps
  WHERE ps.package_id = p_package_id
    AND ps.accommodation_id = p_accommodation_id
    AND ps.is_available = TRUE
    AND ps.fecha_salida = p_fecha_salida
  LIMIT 1
  FOR UPDATE;

  -- Si no hay, usar stock flexible
  IF v_stock_id IS NULL THEN
    SELECT ps.id, ps.stock_dbl, ps.stock_tpl, ps.stock_cpl
      INTO v_stock_id, v_stock_dbl, v_stock_tpl, v_stock_cpl
    FROM public.package_stock ps
    WHERE ps.package_id = p_package_id
      AND ps.accommodation_id = p_accommodation_id
      AND ps.is_available = TRUE
      AND ps.flexible_dates = TRUE
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_stock_id IS NULL THEN
    RAISE EXCEPTION 'No hay stock disponible para esta fecha y alojamiento';
  END IF;

  -- 4. Validar cupos
  IF v_stock_dbl < v_req_dbl OR v_stock_tpl < v_req_tpl OR v_stock_cpl < v_req_cpl THEN
    RAISE EXCEPTION 'Stock insuficiente. Solicitado dbl=%, tpl=%, cpl=%. Disponible dbl=%, tpl=%, cpl=%',
      v_req_dbl, v_req_tpl, v_req_cpl, v_stock_dbl, v_stock_tpl, v_stock_cpl;
  END IF;

  -- 5. Decrementar stock
  UPDATE public.package_stock
     SET stock_dbl = stock_dbl - v_req_dbl,
         stock_tpl = stock_tpl - v_req_tpl,
         stock_cpl = stock_cpl - v_req_cpl,
         updated_at = NOW()
   WHERE id = v_stock_id;

  -- 6. Crear reserva
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

  -- 7. Detalles
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

  -- 8. Pasajeros
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
  'Crea una reserva + detalles + pasajeros en una sola transaccion con lock sobre package_stock. Decrementa stock al crear.';

-- =====================================================
-- 2. cancel_reservation_atomic (idempotente)
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

  -- Idempotente
  IF v_estado = 'cancelada' THEN
    RETURN;
  END IF;

  IF v_estado IN ('pendiente', 'confirmada') THEN
    SELECT
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'dbl' THEN rd.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'tpl' THEN rd.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN rd.tipo_habitacion = 'cpl' THEN rd.cantidad ELSE 0 END), 0)
      INTO v_repone_dbl, v_repone_tpl, v_repone_cpl
    FROM public.reservation_details rd
    WHERE rd.reservation_id = p_reservation_id;

    SELECT ps.id INTO v_stock_id
    FROM public.package_stock ps
    WHERE ps.package_id = v_package_id
      AND ps.accommodation_id = v_accommodation_id
      AND ps.is_available = TRUE
      AND ps.fecha_salida = v_fecha_salida
    LIMIT 1
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
      SELECT ps.id INTO v_stock_id
      FROM public.package_stock ps
      WHERE ps.package_id = v_package_id
        AND ps.accommodation_id = v_accommodation_id
        AND ps.is_available = TRUE
        AND ps.flexible_dates = TRUE
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_stock_id IS NOT NULL THEN
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
  'Cancela reserva y repone stock si estaba pendiente/confirmada. Idempotente.';

-- =====================================================
-- 3. Permisos
-- =====================================================

GRANT EXECUTE ON FUNCTION public.create_reservation_atomic(
  INTEGER, INTEGER, DATE, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_reservation_atomic(INTEGER)
  TO authenticated;
