-- =====================================================
-- Migration: Endurecer RLS e índices de performance
-- Fecha: 2026-04-20
-- Descripción:
--   - Dropear TODAS las policies existentes de las 3 tablas
--     de reservas (sin importar el nombre) y reemplazarlas
--     por policies que exigen rol 'authenticated'.
--   - Los clientes anónimos solo pueden crear reservas vía la
--     RPC create_reservation_atomic (SECURITY DEFINER), ya
--     creada en 20260420_atomic_reservations.sql.
--   - Admin ('authenticated') mantiene acceso completo.
--   - Índices sobre campos usados en filtros y joins.
--
-- REQUISITO PREVIO:
--   Correr 20260420_atomic_reservations.sql ANTES. Sin la RPC,
--   esta migración deja a los clientes sin forma de crear reservas.
-- =====================================================

-- =====================================================
-- 1. Dropear todas las policies existentes en las 3 tablas
-- =====================================================

DO $clean$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('reservations', 'reservation_details', 'reservation_passengers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$clean$;

-- =====================================================
-- 2. Asegurar RLS habilitado
-- =====================================================

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_passengers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Crear policies estrictas: solo 'authenticated'
--    anon solo via RPC (SECURITY DEFINER bypasea RLS).
-- =====================================================

-- reservations
CREATE POLICY "auth_select_reservations"
  ON public.reservations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_reservations"
  ON public.reservations FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_reservations"
  ON public.reservations FOR DELETE
  USING (auth.role() = 'authenticated');

-- reservation_details
CREATE POLICY "auth_select_details"
  ON public.reservation_details FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_details"
  ON public.reservation_details FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_details"
  ON public.reservation_details FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_details"
  ON public.reservation_details FOR DELETE
  USING (auth.role() = 'authenticated');

-- reservation_passengers
CREATE POLICY "auth_select_passengers"
  ON public.reservation_passengers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_passengers"
  ON public.reservation_passengers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_passengers"
  ON public.reservation_passengers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_passengers"
  ON public.reservation_passengers FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. Índices de performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reservation_details_reservation_id
  ON public.reservation_details(reservation_id);

-- Nota: idx_reservation_passengers_reservation_id ya existe (migración 20251030)
CREATE INDEX IF NOT EXISTS idx_reservation_passengers_reservation_id
  ON public.reservation_passengers(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservations_estado
  ON public.reservations(estado);

CREATE INDEX IF NOT EXISTS idx_reservations_fecha_salida
  ON public.reservations(fecha_salida);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at
  ON public.reservations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_stock_lookup
  ON public.package_stock(package_id, accommodation_id, fecha_salida);

-- =====================================================
-- VERIFICACIÓN POST-DEPLOY
-- =====================================================
/*
-- Listar policies que quedaron activas en las 3 tablas:
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reservations', 'reservation_details', 'reservation_passengers')
ORDER BY tablename, cmd;

-- Debería mostrar solo las 12 'auth_*' policies, ninguna con USING (true).

-- Probar que el flujo de cliente sigue funcionando:
--   1. Cargar el sitio y crear una reserva desde la UI → debe funcionar.
--   2. En la admin, confirmar/cancelar → debe funcionar.

-- Si algo rompe, rollback:
--   DO $rollback$
--   DECLARE
--     pol RECORD;
--   BEGIN
--     FOR pol IN SELECT policyname, tablename FROM pg_policies
--       WHERE schemaname = 'public'
--         AND tablename IN ('reservations','reservation_details','reservation_passengers')
--         AND policyname LIKE 'auth_%'
--     LOOP
--       EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
--     END LOOP;
--   END;
--   $rollback$;
--
--   Luego recrear las policies permisivas originales de 20251106_fix_rls_policies.sql.
*/
