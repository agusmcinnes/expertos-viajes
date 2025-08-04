-- Crear tabla para configuraciones del sitio
CREATE TABLE IF NOT EXISTS site_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración inicial para la sección especial
INSERT INTO site_config (config_key, config_value, description) VALUES
('special_section_title', 'Verano 2026', 'Título de la sección especial que aparece en la página principal')
ON CONFLICT (config_key) DO NOTHING;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(config_key);

-- Habilitar RLS (Row Level Security)
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (frontend)
CREATE POLICY "Public read access for site_config" ON site_config
FOR SELECT USING (true);

-- Política para admin (escritura y actualización)
CREATE POLICY "Admin full access for site_config" ON site_config
FOR ALL USING (auth.role() = 'authenticated');
