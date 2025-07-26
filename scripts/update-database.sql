-- First, check if the column exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_packages' 
        AND column_name = 'transport_type'
    ) THEN
        -- Add column for transport type
        ALTER TABLE travel_packages 
        ADD COLUMN transport_type VARCHAR(10) DEFAULT 'aereo' CHECK (transport_type IN ('aereo', 'bus'));
        
        -- Update existing packages as aereo by default
        UPDATE travel_packages SET transport_type = 'aereo' WHERE transport_type IS NULL;
    END IF;
END $$;

-- Create some bus packages examples (only if they don't exist)
INSERT INTO travel_packages (name, description, price, destination_id, duration, image_url, available_dates, transport_type) 
SELECT * FROM (VALUES
    ('Buenos Aires Express en Bus', 'Conocé la capital argentina de manera económica y cómoda. Viaje en bus con todas las comodidades, city tour incluido.', 450.00, 1, '4 días', '/placeholder.svg?height=300&width=400', ARRAY['2024-03-20', '2024-04-15', '2024-05-12'], 'bus'),
    ('Córdoba y Sierras en Bus', 'Escapada perfecta a las sierras cordobesas. Transporte en bus de primera clase, alojamiento y excursiones incluidas.', 380.00, 1, '3 días', '/placeholder.svg?height=300&width=400', ARRAY['2024-03-25', '2024-04-20', '2024-05-18'], 'bus'),
    ('Mendoza Vinos en Bus', 'Tour enológico por Mendoza con transporte terrestre. Degustaciones, bodegas premium y paisajes únicos.', 520.00, 1, '5 días', '/placeholder.svg?height=300&width=400', ARRAY['2024-04-02', '2024-04-28', '2024-05-25'], 'bus')
) AS new_packages(name, description, price, destination_id, duration, image_url, available_dates, transport_type)
WHERE NOT EXISTS (
    SELECT 1 FROM travel_packages WHERE name = new_packages.name
);
