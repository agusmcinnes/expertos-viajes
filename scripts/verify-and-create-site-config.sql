-- Script para verificar y crear la tabla site_config si no existe
-- Ejecutar esto en el editor SQL de Supabase

-- 1. Verificar si la tabla existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'site_config'
);

-- 2. Si la consulta anterior devuelve 'false', ejecutar todo lo siguiente:

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
DROP POLICY IF EXISTS "Public read access for site_config" ON site_config;
CREATE POLICY "Public read access for site_config" ON site_config
FOR SELECT USING (true);

-- Política para admin (escritura y actualización) - más permisiva
DROP POLICY IF EXISTS "Admin full access for site_config" ON site_config;
CREATE POLICY "Admin full access for site_config" ON site_config
FOR ALL USING (true);

-- Verificar que los datos se insertaron correctamente
SELECT * FROM site_config;
