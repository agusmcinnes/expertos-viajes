-- Script para agregar el campo is_featured a la tabla travel_packages
-- Este campo permitirá marcar paquetes como destacados para mostrar en el home

-- Agregar la columna is_featured como booleano, por defecto false
ALTER TABLE travel_packages 
ADD COLUMN is_featured boolean DEFAULT false NOT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN travel_packages.is_featured IS 'Indica si el paquete debe aparecer en la sección de destacados del home';

-- Agregar índice para mejorar performance en consultas de paquetes destacados
CREATE INDEX idx_travel_packages_is_featured ON travel_packages(is_featured) WHERE is_featured = true;

-- Opcional: Marcar algunos paquetes existentes como destacados (ejemplo)
-- UPDATE travel_packages SET is_featured = true WHERE id IN (1, 2, 3);