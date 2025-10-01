-- Script para migrar de PDF único + Google Drive a 3 PDFs por paquete
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar nuevos campos para los 3 tipos de PDF
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS tarifario_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS flyer_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS piezas_redes_pdf_url TEXT;

-- 2. Migrar datos existentes (opcional - mover pdf_url a tarifario_pdf_url)
-- UPDATE travel_packages 
-- SET tarifario_pdf_url = pdf_url 
-- WHERE pdf_url IS NOT NULL AND pdf_url != '';

-- 3. Eliminar campos obsoletos
ALTER TABLE travel_packages 
DROP COLUMN IF EXISTS pdf_url,
DROP COLUMN IF EXISTS drive_folder_url;

-- 4. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_travel_packages_tarifario_pdf ON travel_packages(tarifario_pdf_url) WHERE tarifario_pdf_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_packages_flyer_pdf ON travel_packages(flyer_pdf_url) WHERE flyer_pdf_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_packages_piezas_redes_pdf ON travel_packages(piezas_redes_pdf_url) WHERE piezas_redes_pdf_url IS NOT NULL;

-- 5. Agregar comentarios para documentación
COMMENT ON COLUMN travel_packages.tarifario_pdf_url IS 'URL del PDF con tarifario del paquete para agencias';
COMMENT ON COLUMN travel_packages.flyer_pdf_url IS 'URL del PDF con flyer promocional del paquete para agencias';
COMMENT ON COLUMN travel_packages.piezas_redes_pdf_url IS 'URL del PDF con piezas para redes sociales del paquete para agencias';

-- 6. Verificar estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
  AND column_name LIKE '%pdf%'
ORDER BY column_name;