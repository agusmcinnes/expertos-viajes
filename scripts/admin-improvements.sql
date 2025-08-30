-- Scripts para mejorar el panel de administración
-- Ejecutar en el SQL Editor de Supabase en orden

-- 1. Agregar campo regimen a la tabla accommodations
ALTER TABLE accommodations 
ADD COLUMN IF NOT EXISTS regimen TEXT;

-- Comentario para el campo regimen
COMMENT ON COLUMN accommodations.regimen IS 'Régimen del hotel (ej: Desayuno incluido, Media pensión, Pensión completa, Todo incluido, etc.)';

-- 2. Agregar campo max_group_size a la tabla travel_packages
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS max_group_size INTEGER DEFAULT NULL;

-- Comentario para el campo max_group_size  
COMMENT ON COLUMN travel_packages.max_group_size IS 'Máximo de personas permitidas en el grupo. Si es NULL = sin máximo';

-- 3. Verificar que los campos necesarios existen en accommodations para edición
-- Los campos name, stars ya deberían existir, pero verificamos que estén bien definidos

-- Actualizar la estructura de accommodations para asegurar que los campos sean editables
ALTER TABLE accommodations 
ALTER COLUMN name TYPE VARCHAR(255),
ALTER COLUMN stars TYPE INTEGER;

-- 4. Crear índices para mejorar performance de consultas del admin
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_active ON travel_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_travel_packages_destination_id ON travel_packages(destination_id);
CREATE INDEX IF NOT EXISTS idx_travel_packages_transport_type ON travel_packages(transport_type);
CREATE INDEX IF NOT EXISTS idx_accommodations_paquete_id ON accommodations(paquete_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rates_accommodation_id ON accommodation_rates(accommodation_id);

-- 5. Verificar que las tablas tienen los campos necesarios para el panel
-- Esta consulta te permitirá ver la estructura actual de las tablas:

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('travel_packages', 'accommodations', 'accommodation_rates')
ORDER BY table_name, ordinal_position;

-- 6. Agregar constraints para mantener la integridad de los datos
-- Nota: Primero eliminamos si existe, luego lo creamos

-- Constraint para estrellas (1-5)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_stars_range' AND table_name = 'accommodations'
    ) THEN
        ALTER TABLE accommodations ADD CONSTRAINT chk_stars_range CHECK (stars >= 1 AND stars <= 5);
    END IF;
END $$;

-- Constraint para max_group_size (positivo o NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_max_group_size_positive' AND table_name = 'travel_packages'
    ) THEN
        ALTER TABLE travel_packages ADD CONSTRAINT chk_max_group_size_positive CHECK (max_group_size IS NULL OR max_group_size > 0);
    END IF;
END $$;

-- 7. Actualizar la función de trigger si existe para incluir updated_at en accommodations
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para accommodations si no existe
DROP TRIGGER IF EXISTS trigger_accommodations_updated_at ON accommodations;
CREATE TRIGGER trigger_accommodations_updated_at
    BEFORE UPDATE ON accommodations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
