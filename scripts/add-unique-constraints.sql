-- Script para agregar constraints únicos después de actualizar datos temporales
-- Ejecutar SOLO después de haber actualizado manualmente los CUIT y legajos temporales

-- Verificar que no hay valores temporales antes de agregar constraints
SELECT 
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE cuit LIKE '00-00000000-%') as cuit_temporales,
  COUNT(*) FILTER (WHERE numero_legajo LIKE 'LEG-%') as legajos_temporales
FROM agencies;

-- Si la consulta anterior muestra 0 valores temporales, proceder con los constraints:

-- Agregar constraint único para CUIT
ALTER TABLE agencies ADD CONSTRAINT unique_cuit UNIQUE (cuit);

-- Agregar constraint único para número de legajo
ALTER TABLE agencies ADD CONSTRAINT unique_numero_legajo UNIQUE (numero_legajo);

-- Verificar que los constraints se agregaron correctamente
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'agencies'::regclass 
AND contype = 'u';  -- 'u' = unique constraints