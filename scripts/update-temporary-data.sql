-- Script para actualizar datos temporales después de la migración inicial
-- Ejecutar después de update-agencies-table.sql

-- Ver registros con datos temporales que necesitan actualización
SELECT 
  id,
  razon_social,
  cuit,
  numero_legajo,
  email_contacto_1,
  created_at
FROM agencies 
WHERE 
  cuit LIKE '00-00000000-%' 
  OR numero_legajo LIKE 'LEG-%'
  OR razon_social = 'Agencia Sin Nombre'
ORDER BY created_at;

-- Ejemplo de actualización manual para registros específicos:
-- IMPORTANTE: Reemplazar los valores con datos reales

/*
-- Ejemplo para actualizar una agencia específica (reemplazar ID y datos reales):
UPDATE agencies SET
  razon_social = 'Viajes del Sur S.A.',
  cuit = '30-12345678-9',
  numero_legajo = 'EVT001',
  nombre_fantasia = 'Viajes del Sur',
  telefono_contacto_1 = '+54 9 11 4567-8901',
  domicilio = 'Av. Corrientes 1234',
  ciudad = 'Buenos Aires',
  provincia = 'Buenos Aires',
  email_contacto_1 = 'contacto@viajeselsur.com',
  email_administracion = 'admin@viajeselsur.com'
WHERE id = 1;  -- Reemplazar con el ID real

-- Repetir para cada agencia que necesite actualización
*/

-- Script para generar automáticamente las declaraciones UPDATE:
SELECT 
  'UPDATE agencies SET razon_social = ''ACTUALIZAR'', cuit = ''XX-XXXXXXXX-X'', numero_legajo = ''EVTXXX'' WHERE id = ' || id || ';'
FROM agencies 
WHERE cuit LIKE '00-00000000-%' OR numero_legajo LIKE 'LEG-%';