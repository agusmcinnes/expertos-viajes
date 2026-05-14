-- Migración: Novedades + Cuotas
-- Fecha: 2026-05-13

-- 1. Tabla de categorías de novedades
CREATE TABLE IF NOT EXISTS public.novedades_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FK en travel_packages para novedades
ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS novedades_category_id INT REFERENCES public.novedades_categories(id) ON DELETE SET NULL;

-- 3. Campo cuotas en travel_packages
ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS cuotas TEXT;

-- 4. Índice para búsqueda por categoría
CREATE INDEX IF NOT EXISTS idx_travel_packages_novedades_category
  ON public.travel_packages(novedades_category_id)
  WHERE novedades_category_id IS NOT NULL;

-- 5. RLS para novedades_categories
ALTER TABLE public.novedades_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novedades_categories_public_read"
  ON public.novedades_categories FOR SELECT
  USING (true);

CREATE POLICY "novedades_categories_auth_insert"
  ON public.novedades_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "novedades_categories_auth_update"
  ON public.novedades_categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "novedades_categories_auth_delete"
  ON public.novedades_categories FOR DELETE
  TO authenticated
  USING (true);
