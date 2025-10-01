-- Script de rollback para revertir cambios en la tabla agencies
-- Ejecutar solo si necesitas revertir la migración

-- Remover constraints únicos
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS unique_cuit;
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS unique_numero_legajo;

-- Remover índices
DROP INDEX IF EXISTS idx_agencies_cuit;
DROP INDEX IF EXISTS idx_agencies_numero_legajo;
DROP INDEX IF EXISTS idx_agencies_email_contacto_1;
DROP INDEX IF EXISTS idx_agencies_razon_social;

-- Remover columnas nuevas (CUIDADO: esto eliminará todos los datos de estas columnas)
ALTER TABLE agencies 
DROP COLUMN IF EXISTS razon_social,
DROP COLUMN IF EXISTS cuit,
DROP COLUMN IF EXISTS numero_legajo,
DROP COLUMN IF EXISTS nombre_fantasia,
DROP COLUMN IF EXISTS telefono_contacto_1,
DROP COLUMN IF EXISTS telefono_contacto_2,
DROP COLUMN IF EXISTS telefono_contacto_3,
DROP COLUMN IF EXISTS domicilio,
DROP COLUMN IF EXISTS ciudad,
DROP COLUMN IF EXISTS provincia,
DROP COLUMN IF EXISTS pais,
DROP COLUMN IF EXISTS email_contacto_1,
DROP COLUMN IF EXISTS email_contacto_2,
DROP COLUMN IF EXISTS email_administracion;

-- Verificar que la tabla volvió a su estado original
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agencies' 
ORDER BY ordinal_position;