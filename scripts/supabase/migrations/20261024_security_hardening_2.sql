-- =====================================================
-- Migration: Endurecimiento de seguridad (parte 2: policies)
-- Fecha: 2026-10-24
-- REQUISITO: parte 1 aplicada y código nuevo desplegado
--   (login/registro de agencias por RPC, contacto sin .select()).
-- =====================================================

BEGIN;

-- =====================================================
-- 2. Limpiar policies existentes
-- =====================================================

DO $clean$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN (
         'accommodation_rates', 'accommodations', 'agencies', 'contact_inquiries',
         'destinations', 'novedades_categories', 'package_stock', 'reservation_details',
         'reservation_passengers', 'reservations', 'site_config', 'travel_packages'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND (coalesce(qual, '') LIKE '%pdfs_expertos%' OR coalesce(with_check, '') LIKE '%pdfs_expertos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END;
$clean$;

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Catálogo público: lectura para todos, escritura solo admin
-- =====================================================

DO $catalog$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accommodation_rates', 'accommodations', 'destinations',
    'novedades_categories', 'site_config', 'travel_packages'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "public_read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()))', t);
    EXECUTE format('CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()))', t);
    EXECUTE format('CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING ((SELECT private.is_admin()))', t);
  END LOOP;
END;
$catalog$;

-- Stock: el público ve solo lo disponible
CREATE POLICY "public_read_available" ON public.package_stock
  FOR SELECT TO anon, authenticated
  USING (is_available = true OR (SELECT private.is_admin()));
CREATE POLICY "admin_insert" ON public.package_stock
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "admin_update" ON public.package_stock
  FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "admin_delete" ON public.package_stock
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- =====================================================
-- 4. Datos privados: solo admin
--    (las reservas públicas entran por create_reservation_atomic)
-- =====================================================

DO $private$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reservations', 'reservation_details', 'reservation_passengers', 'agencies']
  LOOP
    EXECUTE format('CREATE POLICY "admin_all" ON public.%I FOR ALL TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()))', t);
  END LOOP;
END;
$private$;

-- Consultas de contacto: cualquiera puede enviar, solo el admin las lee
CREATE POLICY "public_insert" ON public.contact_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin_select" ON public.contact_inquiries
  FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "admin_update" ON public.contact_inquiries
  FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "admin_delete" ON public.contact_inquiries
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- =====================================================
-- 5. Storage pdfs_expertos
--    Lectura pública (el portal de agencias genera signed URLs con la anon key),
--    escritura solo admin. Upsert necesita INSERT + SELECT + UPDATE.
-- =====================================================

CREATE POLICY "pdfs_expertos_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pdfs_expertos');
CREATE POLICY "pdfs_expertos_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdfs_expertos' AND (SELECT private.is_admin()));
CREATE POLICY "pdfs_expertos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pdfs_expertos' AND (SELECT private.is_admin()))
  WITH CHECK (bucket_id = 'pdfs_expertos' AND (SELECT private.is_admin()));
CREATE POLICY "pdfs_expertos_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pdfs_expertos' AND (SELECT private.is_admin()));

COMMIT;
