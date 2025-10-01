-- Script para actualizar la tabla agencies con los nuevos campos requeridos
-- Ejecutar en Supabase SQL Editor

-- Agregar las nuevas columnas a la tabla agencies
ALTER TABLE agencies 
-- Información Legal
ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255),
ADD COLUMN IF NOT EXISTS cuit VARCHAR(15),
ADD COLUMN IF NOT EXISTS numero_legajo VARCHAR(50),
ADD COLUMN IF NOT EXISTS nombre_fantasia VARCHAR(255),

-- Información de Contacto (teléfonos)
ADD COLUMN IF NOT EXISTS telefono_contacto_1 VARCHAR(20),
ADD COLUMN IF NOT EXISTS telefono_contacto_2 VARCHAR(20),
ADD COLUMN IF NOT EXISTS telefono_contacto_3 VARCHAR(20),

-- Información de Domicilio
ADD COLUMN IF NOT EXISTS domicilio VARCHAR(500),
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
ADD COLUMN IF NOT EXISTS pais VARCHAR(100),

-- Información de Emails
ADD COLUMN IF NOT EXISTS email_contacto_1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_contacto_2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_administracion VARCHAR(255);

-- Migrar datos existentes a los nuevos campos
UPDATE agencies SET
  razon_social = COALESCE(name, 'Agencia Sin Nombre'),
  nombre_fantasia = COALESCE(name, 'Agencia Sin Nombre'),
  cuit = COALESCE(cuit, '00-00000000-0'),  -- CUIT temporal para registros existentes
  numero_legajo = COALESCE(numero_legajo, 'LEG-' || id::text),  -- Generar legajo basado en ID
  telefono_contacto_1 = COALESCE(phone, '+54 9 11 0000-0000'),
  domicilio = COALESCE(domicilio, 'Dirección no especificada'),
  ciudad = COALESCE(ciudad, 'Ciudad no especificada'),
  provincia = COALESCE(provincia, 'Provincia no especificada'),
  pais = COALESCE(pais, 'Argentina'),
  email_contacto_1 = COALESCE(email, 'contacto@agencia.com'),
  email_administracion = COALESCE(email, 'admin@agencia.com')
WHERE razon_social IS NULL OR cuit IS NULL OR numero_legajo IS NULL;

-- Asegurar que no hay valores NULL antes de agregar constraints
UPDATE agencies SET
  razon_social = CASE WHEN razon_social IS NULL THEN 'Agencia Sin Nombre' ELSE razon_social END,
  cuit = CASE WHEN cuit IS NULL THEN '00-00000000-' || id::text ELSE cuit END,
  numero_legajo = CASE WHEN numero_legajo IS NULL THEN 'LEG-' || id::text ELSE numero_legajo END,
  nombre_fantasia = CASE WHEN nombre_fantasia IS NULL THEN 'Agencia Sin Nombre' ELSE nombre_fantasia END,
  telefono_contacto_1 = CASE WHEN telefono_contacto_1 IS NULL THEN '+54 9 11 0000-0000' ELSE telefono_contacto_1 END,
  domicilio = CASE WHEN domicilio IS NULL THEN 'Dirección no especificada' ELSE domicilio END,
  ciudad = CASE WHEN ciudad IS NULL THEN 'Ciudad no especificada' ELSE ciudad END,
  provincia = CASE WHEN provincia IS NULL THEN 'Provincia no especificada' ELSE provincia END,
  pais = CASE WHEN pais IS NULL THEN 'Argentina' ELSE pais END,
  email_contacto_1 = CASE WHEN email_contacto_1 IS NULL THEN 'contacto@agencia.com' ELSE email_contacto_1 END,
  email_administracion = CASE WHEN email_administracion IS NULL THEN 'admin@agencia.com' ELSE email_administracion END;

-- Verificar que no hay valores NULL
SELECT 
  COUNT(*) as total_registros,
  COUNT(razon_social) as razon_social_not_null,
  COUNT(cuit) as cuit_not_null,
  COUNT(numero_legajo) as numero_legajo_not_null
FROM agencies;

-- Agregar constraints para campos obligatorios (solo después de eliminar NULLs)
ALTER TABLE agencies 
ALTER COLUMN razon_social SET NOT NULL,
ALTER COLUMN cuit SET NOT NULL,
ALTER COLUMN numero_legajo SET NOT NULL,
ALTER COLUMN nombre_fantasia SET NOT NULL,
ALTER COLUMN telefono_contacto_1 SET NOT NULL,
ALTER COLUMN domicilio SET NOT NULL,
ALTER COLUMN ciudad SET NOT NULL,
ALTER COLUMN provincia SET NOT NULL,
ALTER COLUMN pais SET NOT NULL,
ALTER COLUMN email_contacto_1 SET NOT NULL,
ALTER COLUMN email_administracion SET NOT NULL;

-- Agregar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_agencies_cuit ON agencies(cuit);
CREATE INDEX IF NOT EXISTS idx_agencies_numero_legajo ON agencies(numero_legajo);
CREATE INDEX IF NOT EXISTS idx_agencies_email_contacto_1 ON agencies(email_contacto_1);
CREATE INDEX IF NOT EXISTS idx_agencies_razon_social ON agencies(razon_social);

-- Agregar constraint único para CUIT (excluyendo valores temporales)
-- Nota: Los CUIT temporales '00-00000000-X' deberán ser actualizados manualmente
-- ALTER TABLE agencies ADD CONSTRAINT unique_cuit UNIQUE (cuit);

-- Agregar constraint único para número de legajo (excluyendo valores temporales) 
-- Nota: Los legajos temporales 'LEG-X' deberán ser actualizados manualmente
-- ALTER TABLE agencies ADD CONSTRAINT unique_numero_legajo UNIQUE (numero_legajo);

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agencies' 
ORDER BY ordinal_position;