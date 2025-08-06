-- Script SQL para implementar los cambios en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- 1. Agregar nuevos campos a la tabla travel_packages
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS servicios_incluidos TEXT[],
ADD COLUMN IF NOT EXISTS servicios_adicionales TEXT[];

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN travel_packages.servicios_incluidos IS 'Array de servicios incluidos en el paquete';
COMMENT ON COLUMN travel_packages.servicios_adicionales IS 'Array de servicios adicionales disponibles';

-- 2. Crear tabla de alojamientos
CREATE TABLE IF NOT EXISTS accommodations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    enlace_web VARCHAR(500),
    paquete_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (paquete_id) REFERENCES travel_packages(id) ON DELETE CASCADE
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_accommodations_paquete_id ON accommodations(paquete_id);

-- Comentarios
COMMENT ON TABLE accommodations IS 'Tabla de alojamientos asociados a paquetes de viaje';
COMMENT ON COLUMN accommodations.stars IS 'Cantidad de estrellas del alojamiento (1-5)';
COMMENT ON COLUMN accommodations.enlace_web IS 'URL opcional del sitio web del alojamiento';

-- 3. Crear tabla de tarifas de alojamientos
CREATE TABLE IF NOT EXISTS accommodation_rates (
    id SERIAL PRIMARY KEY,
    accommodation_id INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INTEGER NOT NULL CHECK (anio >= 2024),
    tarifa_dbl DECIMAL(10,2) NOT NULL DEFAULT 0,
    tarifa_tpl DECIMAL(10,2) NOT NULL DEFAULT 0,
    tarifa_cpl DECIMAL(10,2) NOT NULL DEFAULT 0,
    tarifa_menor DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    UNIQUE(accommodation_id, mes, anio)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_accommodation_rates_accommodation_id ON accommodation_rates(accommodation_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rates_mes_anio ON accommodation_rates(mes, anio);

-- Comentarios
COMMENT ON TABLE accommodation_rates IS 'Tarifas mensuales por tipo de habitación para cada alojamiento';
COMMENT ON COLUMN accommodation_rates.mes IS 'Mes del año (1-12)';
COMMENT ON COLUMN accommodation_rates.anio IS 'Año de la tarifa';
COMMENT ON COLUMN accommodation_rates.tarifa_dbl IS 'Tarifa para habitación doble';
COMMENT ON COLUMN accommodation_rates.tarifa_tpl IS 'Tarifa para habitación triple';
COMMENT ON COLUMN accommodation_rates.tarifa_cpl IS 'Tarifa para habitación cuádruple';
COMMENT ON COLUMN accommodation_rates.tarifa_menor IS 'Tarifa para menor de edad';

-- 4. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Triggers para las nuevas tablas
DROP TRIGGER IF EXISTS update_accommodations_updated_at ON accommodations;
CREATE TRIGGER update_accommodations_updated_at 
    BEFORE UPDATE ON accommodations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accommodation_rates_updated_at ON accommodation_rates;
CREATE TRIGGER update_accommodation_rates_updated_at 
    BEFORE UPDATE ON accommodation_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Configurar Row Level Security (RLS) para las nuevas tablas
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_rates ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de seguridad (RLS)
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "accommodations_select_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodation_rates_select_policy" ON accommodation_rates;
DROP POLICY IF EXISTS "accommodations_all_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodation_rates_all_policy" ON accommodation_rates;

-- Crear políticas permisivas para permitir todas las operaciones
CREATE POLICY "Allow all operations on accommodations" ON accommodations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on accommodation_rates" ON accommodation_rates
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Datos de ejemplo (opcional)
-- Descomentar si quieres insertar datos de prueba

/*
-- Insertar alojamiento de ejemplo (necesitas un paquete existente)
INSERT INTO accommodations (name, stars, enlace_web, paquete_id) 
VALUES 
    ('Hotel Paradise', 4, 'https://hotelparadise.com', 1),
    ('Boutique Resort', 5, 'https://boutiqueresort.com', 1);

-- Insertar tarifas de ejemplo
INSERT INTO accommodation_rates (accommodation_id, mes, anio, tarifa_dbl, tarifa_tpl, tarifa_cpl, tarifa_menor)
VALUES 
    (1, 1, 2025, 150.00, 120.00, 100.00, 75.00),
    (1, 2, 2025, 160.00, 130.00, 110.00, 80.00),
    (2, 1, 2025, 200.00, 170.00, 150.00, 100.00);
*/

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('accommodations', 'accommodation_rates')
ORDER BY table_name;
