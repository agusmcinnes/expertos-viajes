-- Script para eliminar columnas legacy después de la migración
-- Ejecutar SOLO después de confirmar que la migración principal funcionó correctamente

-- Verificar que todos los registros tienen datos en los nuevos campos
SELECT 
  COUNT(*) as total_registros,
  COUNT(razon_social) as tiene_razon_social,
  COUNT(email_contacto_1) as tiene_email_contacto_1,
  COUNT(telefono_contacto_1) as tiene_telefono_contacto_1
FROM agencies;

-- Eliminar las columnas legacy que ya no necesitamos
ALTER TABLE agencies 
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone;

-- Verificar que las columnas fueron eliminadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agencies' 
ORDER BY ordinal_position;