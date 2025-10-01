-- Script SQL para agregar las nuevas columnas y tabla para el módulo de agencias

-- 1. Agregar columnas a travel_packages para PDFs y Drive
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

-- 2. Crear tabla de agencias
CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_agencies_email ON agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);
CREATE INDEX IF NOT EXISTS idx_travel_packages_pdf_url ON travel_packages(pdf_url) WHERE pdf_url IS NOT NULL;

-- 4. Agregar comentarios para documentación
COMMENT ON TABLE agencies IS 'Tabla para almacenar información de agencias de viajes que pueden acceder al módulo especial';
COMMENT ON COLUMN agencies.status IS 'Estado de la agencia: pending (pendiente de aprobación), approved (aprobada), rejected (rechazada)';
COMMENT ON COLUMN agencies.password IS 'Contraseña hasheada de la agencia para autenticación';
COMMENT ON COLUMN travel_packages.pdf_url IS 'URL del archivo PDF disponible para descarga por agencias';
COMMENT ON COLUMN travel_packages.drive_folder_url IS 'URL de la carpeta de Google Drive con flyers del paquete';

-- 5. Habilitar Row Level Security (RLS) si es necesario
-- ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas de seguridad (opcional, ajustar según necesidades)
-- CREATE POLICY "Agencies can read their own data" ON agencies
--   FOR SELECT USING (true);