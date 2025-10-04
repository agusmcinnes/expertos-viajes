-- Script para agregar el campo priority_order a la tabla travel_packages
-- Este campo permitirá ordenar los paquetes según la prioridad establecida por el admin

-- Agregar la columna priority_order como entero, por defecto 0
ALTER TABLE travel_packages 
ADD COLUMN priority_order integer DEFAULT 0 NOT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN travel_packages.priority_order IS 'Orden de prioridad para mostrar los paquetes. Mayor número = mayor prioridad (se muestra primero)';

-- Agregar índice para mejorar performance en consultas ordenadas por prioridad
CREATE INDEX idx_travel_packages_priority_order ON travel_packages(priority_order DESC);

-- Opcional: Establecer prioridades iniciales para algunos paquetes existentes (ejemplo)
-- UPDATE travel_packages SET priority_order = 100 WHERE destination_id = 1; -- Argentina
-- UPDATE travel_packages SET priority_order = 90 WHERE destination_id = 2;  -- Brasil
-- UPDATE travel_packages SET priority_order = 80 WHERE destination_id = 3;  -- Europa