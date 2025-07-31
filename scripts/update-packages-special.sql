-- Actualizar tabla travel_packages para incluir campo is_special
ALTER TABLE travel_packages 
ADD COLUMN is_special BOOLEAN DEFAULT false;

-- Actualizar algunos paquetes existentes como especiales (los más caros)
UPDATE travel_packages 
SET is_special = true 
WHERE price >= 2000;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_travel_packages_special ON travel_packages(is_special);

-- Comentarios para documentación
COMMENT ON COLUMN travel_packages.is_special IS 'Indica si el paquete pertenece a la sección especial';
