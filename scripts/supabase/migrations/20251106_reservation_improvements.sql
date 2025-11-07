-- =====================================================
-- Migration: Mejoras al Sistema de Reservas
-- Fecha: 2025-11-06
-- Descripción:
--   - Cambio de CUIL a DNI
--   - Agregar email y teléfono a pasajeros
--   - Agregar edad al momento de viajar
--   - Permitir campos pendientes de completar
--   - Extender subtipo_habitacion a todos los tipos
-- =====================================================

-- =====================================================
-- TABLA: reservation_passengers
-- =====================================================

-- 1. Agregar campo DNI (reemplaza CUIL pero mantenemos CUIL por compatibilidad)
ALTER TABLE public.reservation_passengers
ADD COLUMN IF NOT EXISTS dni VARCHAR(20);

-- 2. Agregar email del pasajero
ALTER TABLE public.reservation_passengers
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 3. Agregar teléfono del pasajero
ALTER TABLE public.reservation_passengers
ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

-- 4. Agregar edad al momento de viajar (calculada automáticamente)
ALTER TABLE public.reservation_passengers
ADD COLUMN IF NOT EXISTS edad_al_viajar INTEGER;

-- 5. Agregar flag para datos pendientes de completar
ALTER TABLE public.reservation_passengers
ADD COLUMN IF NOT EXISTS datos_pendientes BOOLEAN DEFAULT FALSE;

-- Comentarios descriptivos
COMMENT ON COLUMN public.reservation_passengers.dni IS 'DNI del pasajero (formato texto para permitir puntos). Reemplaza al campo cuil.';
COMMENT ON COLUMN public.reservation_passengers.email IS 'Email de contacto del pasajero (opcional si datos_pendientes = true)';
COMMENT ON COLUMN public.reservation_passengers.telefono IS 'Teléfono de contacto del pasajero (opcional si datos_pendientes = true)';
COMMENT ON COLUMN public.reservation_passengers.edad_al_viajar IS 'Edad que tendrá el pasajero al momento del viaje (fecha_salida)';
COMMENT ON COLUMN public.reservation_passengers.datos_pendientes IS 'Indica si el pasajero tiene datos pendientes de completar (DNI, email o teléfono)';

-- =====================================================
-- TABLA: reservation_details
-- =====================================================

-- 6. Modificar constraint de subtipo_habitacion para permitir en todos los tipos
-- Primero eliminamos el constraint anterior si existe
ALTER TABLE public.reservation_details
DROP CONSTRAINT IF EXISTS reservation_details_subtipo_habitacion_check;

-- Ahora creamos el nuevo constraint que permite matrimonial/twin para todos los tipos
ALTER TABLE public.reservation_details
ADD CONSTRAINT reservation_details_subtipo_habitacion_check
CHECK (subtipo_habitacion IN ('matrimonial', 'twin') OR subtipo_habitacion IS NULL);

-- Actualizar comentario
COMMENT ON COLUMN public.reservation_details.subtipo_habitacion IS 'Subtipo de habitación: matrimonial (cama matrimonial) o twin (camas separadas). Aplica a todos los tipos de habitación (dbl, tpl, cpl, qpl)';

-- =====================================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- =====================================================

-- Índice para búsquedas por DNI
CREATE INDEX IF NOT EXISTS idx_reservation_passengers_dni
ON public.reservation_passengers(dni);

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_reservation_passengers_email
ON public.reservation_passengers(email);

-- Índice para búsquedas por datos pendientes
CREATE INDEX IF NOT EXISTS idx_reservation_passengers_datos_pendientes
ON public.reservation_passengers(datos_pendientes)
WHERE datos_pendientes = TRUE;

-- =====================================================
-- MIGRACIÓN DE DATOS EXISTENTES (CUIL → DNI)
-- =====================================================

-- Copiar datos de CUIL a DNI para registros existentes que tengan CUIL
UPDATE public.reservation_passengers
SET dni = cuil
WHERE cuil IS NOT NULL AND dni IS NULL;

-- =====================================================
-- NOTAS DE MIGRACIÓN
-- =====================================================

-- IMPORTANTE:
-- 1. El campo 'cuil' se mantiene por compatibilidad con registros antiguos
-- 2. Los nuevos registros usarán el campo 'dni'
-- 3. El campo 'subtipo_habitacion' ahora puede usarse en todos los tipos de habitación
-- 4. Los campos email y telefono son opcionales si datos_pendientes = TRUE
-- 5. La edad_al_viajar debe calcularse en el frontend: differenceInYears(fecha_salida, fecha_nacimiento)

-- Para verificar la migración:
-- SELECT * FROM public.reservation_passengers LIMIT 5;
-- SELECT * FROM public.reservation_details LIMIT 5;
