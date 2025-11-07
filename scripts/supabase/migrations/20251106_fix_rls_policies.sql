-- =====================================================
-- Migration: Corregir políticas RLS para reservas públicas
-- Fecha: 2025-11-06
-- Descripción:
--   - Permitir acceso anónimo (anon) a las tablas de reservas
--   - Necesario para que usuarios no autenticados puedan crear reservas
-- =====================================================

-- =====================================================
-- ELIMINAR POLÍTICAS ANTIGUAS
-- =====================================================

-- Eliminar políticas antiguas de reservation_passengers
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.reservation_passengers;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.reservation_passengers;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.reservation_passengers;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.reservation_passengers;

-- =====================================================
-- CREAR NUEVAS POLÍTICAS QUE PERMITEN ACCESO ANÓNIMO
-- =====================================================

-- Política para lectura (permitir a usuarios autenticados y anónimos)
CREATE POLICY "Allow public read access"
  ON public.reservation_passengers
  FOR SELECT
  USING (true);  -- Permitir a todos

-- Política para inserción (permitir a usuarios autenticados y anónimos)
CREATE POLICY "Allow public insert access"
  ON public.reservation_passengers
  FOR INSERT
  WITH CHECK (true);  -- Permitir a todos

-- Política para actualización (solo usuarios autenticados - para el admin)
CREATE POLICY "Allow authenticated update access"
  ON public.reservation_passengers
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Política para eliminación (solo usuarios autenticados - para el admin)
CREATE POLICY "Allow authenticated delete access"
  ON public.reservation_passengers
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFICAR POLÍTICAS EN OTRAS TABLAS RELACIONADAS
-- =====================================================

-- Asegurarse de que reservations también permite acceso público
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.reservations;
DROP POLICY IF EXISTS "Allow public insert" ON public.reservations;

CREATE POLICY "Allow public insert reservations"
  ON public.reservations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read reservations"
  ON public.reservations
  FOR SELECT
  USING (true);

-- Asegurarse de que reservation_details también permite acceso público
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.reservation_details;
DROP POLICY IF EXISTS "Allow public insert" ON public.reservation_details;

CREATE POLICY "Allow public insert reservation_details"
  ON public.reservation_details
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read reservation_details"
  ON public.reservation_details
  FOR SELECT
  USING (true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Para verificar que las políticas se aplicaron correctamente:
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('reservation_passengers', 'reservations', 'reservation_details');
