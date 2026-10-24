-- =====================================================
-- Migration: Endurecimiento de seguridad (parte 1: aditiva)
-- Fecha: 2026-10-24
-- Descripción:
--   Antes de esta migración, con la anon key (pública) se podía:
--   - leer/modificar `agencies` (RLS apagado: CUIT, contactos, hashes)
--   - leer todas las consultas de `contact_inquiries`
--   - escribir `site_config` y subir/borrar archivos en `pdfs_expertos`
--   - borrar paquetes y confirmar/cancelar reservas vía RPC
--   Y como el registro de Supabase Auth está abierto, cualquier cuenta
--   nueva era "authenticated" = admin de todo.
--
--   Ahora:
--   1. private.is_admin(): admin = usuario con app_metadata.role = 'admin'
--   2. Todas las escrituras de tablas y Storage exigen is_admin()
--   3. Lecturas públicas solo donde el sitio las necesita
--   4. `agencies` con RLS; registro y login vía RPC (bcrypt + bloqueo
--      por intentos fallidos). Los hashes SHA-256 viejos se migran a
--      bcrypt en el próximo login exitoso.
--   5. RPCs admin_* / confirm / cancel verifican is_admin()
-- =====================================================

-- Parte 1: rol admin, RPCs de agencias, chequeo admin en RPCs.
-- No rompe el código viejo: se puede aplicar antes del deploy.
-- La parte 2 (policies) se aplica DESPUÉS de desplegar el código nuevo.

BEGIN;

-- =====================================================
-- 1. Rol admin
-- =====================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

-- Lee auth.users (no el JWT) para que el cambio de rol aplique al instante
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT (u.raw_app_meta_data ->> 'role') = 'admin'
       FROM auth.users u
      WHERE u.id = auth.uid()),
    false
  )
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;

UPDATE auth.users
   SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
 WHERE email = 'admin@admin.com';

-- =====================================================
-- 6. Agencias: registro y login vía RPC
-- =====================================================

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;

CREATE OR REPLACE FUNCTION public.register_agency(p_data jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id integer;
  v_email text := trim(coalesce(p_data ->> 'email_contacto_1', ''));
  v_password text := coalesce(p_data ->> 'password', '');
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'El email de contacto es obligatorio';
  END IF;
  IF length(v_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres';
  END IF;
  IF EXISTS (SELECT 1 FROM public.agencies WHERE lower(email_contacto_1) = lower(v_email)) THEN
    RAISE EXCEPTION 'Ya existe una agencia registrada con este email';
  END IF;

  INSERT INTO public.agencies (
    razon_social, cuit, numero_legajo, nombre_fantasia,
    telefono_contacto_1, telefono_contacto_2, telefono_contacto_3,
    domicilio, ciudad, provincia, pais,
    email_contacto_1, email_contacto_2, email_administracion,
    password, status, created_at, updated_at
  ) VALUES (
    p_data ->> 'razon_social', p_data ->> 'cuit', p_data ->> 'numero_legajo', p_data ->> 'nombre_fantasia',
    p_data ->> 'telefono_contacto_1', nullif(p_data ->> 'telefono_contacto_2', ''), nullif(p_data ->> 'telefono_contacto_3', ''),
    p_data ->> 'domicilio', p_data ->> 'ciudad', p_data ->> 'provincia', p_data ->> 'pais',
    v_email, nullif(p_data ->> 'email_contacto_2', ''), p_data ->> 'email_administracion',
    extensions.crypt(v_password, extensions.gen_salt('bf')), 'pending', now(), now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Devuelve { success, message?, agency? } (agency sin password)
CREATE OR REPLACE FUNCTION public.agency_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.agencies%ROWTYPE;
  v_ok boolean;
  v_invalid constant text := 'Email o contraseña incorrectos';
BEGIN
  SELECT * INTO v
    FROM public.agencies
   WHERE lower(email_contacto_1) = lower(trim(p_email))
   ORDER BY id DESC
   LIMIT 1;

  IF NOT FOUND OR v.password IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', v_invalid);
  END IF;

  IF v.locked_until IS NOT NULL AND v.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'message',
      'Demasiados intentos fallidos. Intente nuevamente en unos minutos.');
  END IF;

  IF v.password LIKE '$2%' THEN
    v_ok := v.password = extensions.crypt(p_password, v.password);
  ELSE
    -- Hash legado (SHA-256 + sal fija que calculaba el navegador)
    v_ok := v.password = encode(extensions.digest(p_password || 'salt_secret_key', 'sha256'), 'hex');
  END IF;

  IF NOT v_ok THEN
    UPDATE public.agencies
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE WHEN failed_login_attempts + 1 >= 5
                               THEN now() + interval '15 minutes' END
     WHERE id = v.id;
    RETURN jsonb_build_object('success', false, 'message', v_invalid);
  END IF;

  UPDATE public.agencies
     SET failed_login_attempts = 0,
         locked_until = NULL,
         password = CASE WHEN v.password LIKE '$2%' THEN v.password
                         ELSE extensions.crypt(p_password, extensions.gen_salt('bf')) END
   WHERE id = v.id;

  IF v.status = 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message',
      'Su solicitud de registro está siendo revisada por el administrador. Le notificaremos por email cuando sea aprobada.');
  END IF;
  IF v.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'message',
      'Su solicitud de registro fue rechazada. Contacte al administrador para más información.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'agency', to_jsonb(v) - 'password' - 'failed_login_attempts' - 'locked_until'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_agency(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agency_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_agency(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_login(text, text) TO anon, authenticated;

-- =====================================================
-- 7. RPCs administrativas: solo admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_delete_package(package_id integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    result_row travel_packages%ROWTYPE;
    result_json JSON;
BEGIN
    -- Solo el admin (ver private.is_admin)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    -- Verificar que el paquete existe
    SELECT * INTO result_row 
    FROM travel_packages 
    WHERE id = package_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paquete con ID % no encontrado', package_id;
    END IF;
    
    -- Actualizar el paquete (bypass RLS con SECURITY DEFINER)
    UPDATE travel_packages 
    SET 
        is_active = false,
        updated_at = NOW()
    WHERE id = package_id
    RETURNING * INTO result_row;
    
    -- Convertir resultado a JSON
    SELECT row_to_json(result_row) INTO result_json;
    
    -- Log de la operación
    RAISE NOTICE 'Paquete % eliminado exitosamente por función admin', package_id;
    
    RETURN result_json;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_package_status(package_id integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    result_row travel_packages%ROWTYPE;
    result_json JSON;
BEGIN
    -- Solo el admin (ver private.is_admin)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO result_row 
    FROM travel_packages 
    WHERE id = package_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Paquete no encontrado"}'::JSON;
    END IF;
    
    SELECT row_to_json(result_row) INTO result_json;
    RETURN result_json;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_reservation_atomic(p_reservation_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.confirm_reservation_atomic(p_reservation_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_package(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_package_status(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_reservation_atomic(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_reservation_atomic(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_package(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_package_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_reservation_atomic(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation_atomic(integer) TO authenticated;

COMMIT;
