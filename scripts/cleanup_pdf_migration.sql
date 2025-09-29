-- Script para limpiar datos obsoletos después de la migración a 3 PDFs
-- Ejecutar en Supabase SQL Editor DESPUÉS de ejecutar migrate_to_3_pdfs.sql

-- 1. Verificar datos antes de la limpieza
SELECT 
    id, 
    name,
    CASE WHEN tarifario_pdf_url IS NOT NULL THEN '✓' ELSE '✗' END as tarifario,
    CASE WHEN flyer_pdf_url IS NOT NULL THEN '✓' ELSE '✗' END as flyer,
    CASE WHEN piezas_redes_pdf_url IS NOT NULL THEN '✓' ELSE '✗' END as piezas_redes
FROM travel_packages 
ORDER BY id;

-- 2. Mostrar resumen de migración
SELECT 
    COUNT(*) as total_packages,
    COUNT(tarifario_pdf_url) as packages_with_tarifario,
    COUNT(flyer_pdf_url) as packages_with_flyer,
    COUNT(piezas_redes_pdf_url) as packages_with_piezas_redes,
    COUNT(CASE WHEN tarifario_pdf_url IS NOT NULL OR flyer_pdf_url IS NOT NULL OR piezas_redes_pdf_url IS NOT NULL THEN 1 END) as packages_with_any_pdf
FROM travel_packages;

-- 3. Verificar que no queden campos obsoletos
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
  AND (column_name = 'pdf_url' OR column_name = 'drive_folder_url');

-- Si el query anterior devuelve filas, significa que los campos obsoletos aún existen
-- En ese caso, ejecutar nuevamente:
-- ALTER TABLE travel_packages 
-- DROP COLUMN IF EXISTS pdf_url,
-- DROP COLUMN IF EXISTS drive_folder_url;

-- 4. Verificar estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
  AND column_name LIKE '%pdf%'
ORDER BY column_name;