-- Migration: Modificar sistema de reservas para incluir datos de pasajeros
-- Date: 2025-10-30
-- Description:
--   - Crear tabla reservation_passengers para almacenar datos de cada pasajero
--   - Eliminar campos de precio de reservations y reservation_details
--   - Agregar subtipo de habitación (matrimonial/twin) para habitaciones dobles
--   - Eliminar campos cantidad_personas, adultos, menores

-- ============================================================================
-- 1. CREAR TABLA reservation_passengers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_passengers (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  tipo_pasajero VARCHAR(20) NOT NULL CHECK (tipo_pasajero IN ('titular', 'acompañante')),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  cuil VARCHAR(20), -- Solo requerido para titular
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_reservation_passengers_reservation_id
  ON public.reservation_passengers(reservation_id);
CREATE INDEX idx_reservation_passengers_tipo
  ON public.reservation_passengers(tipo_pasajero);

-- Comentarios para documentación
COMMENT ON TABLE public.reservation_passengers IS
  'Almacena información detallada de cada pasajero en una reserva';
COMMENT ON COLUMN public.reservation_passengers.tipo_pasajero IS
  'titular: pasajero principal que realiza la reserva, acompañante: otros pasajeros';
COMMENT ON COLUMN public.reservation_passengers.cuil IS
  'CUIL/CUIT solo requerido para el titular de la reserva';


-- ============================================================================
-- 2. MODIFICAR TABLA reservations
-- ============================================================================

-- Eliminar columnas relacionadas con precio y cantidad
ALTER TABLE public.reservations
  DROP COLUMN IF EXISTS precio_total,
  DROP COLUMN IF EXISTS cantidad_personas,
  DROP COLUMN IF EXISTS cliente_dni;

COMMENT ON TABLE public.reservations IS
  'Pre-reservas realizadas por usuarios. El precio será cotizado manualmente por un admin.';


-- ============================================================================
-- 3. MODIFICAR TABLA reservation_details
-- ============================================================================

-- Eliminar columnas de precio y conteo de pasajeros
ALTER TABLE public.reservation_details
  DROP COLUMN IF EXISTS precio_unitario,
  DROP COLUMN IF EXISTS precio_subtotal,
  DROP COLUMN IF EXISTS adultos,
  DROP COLUMN IF EXISTS menores;

-- Agregar columna para subtipo de habitación (matrimonial/twin para dobles)
ALTER TABLE public.reservation_details
  ADD COLUMN IF NOT EXISTS subtipo_habitacion VARCHAR(20)
    CHECK (subtipo_habitacion IN ('matrimonial', 'twin', NULL));

COMMENT ON COLUMN public.reservation_details.subtipo_habitacion IS
  'Subtipo de habitación: matrimonial o twin (solo aplica para habitaciones dobles)';


-- ============================================================================
-- 4. POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ============================================================================

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.reservation_passengers ENABLE ROW LEVEL SECURITY;

-- Política para lectura (cualquiera autenticado puede leer)
CREATE POLICY "Allow authenticated read access"
  ON public.reservation_passengers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para inserción (cualquiera autenticado puede insertar)
CREATE POLICY "Allow authenticated insert access"
  ON public.reservation_passengers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política para actualización (cualquiera autenticado puede actualizar)
CREATE POLICY "Allow authenticated update access"
  ON public.reservation_passengers
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Política para eliminación (cualquiera autenticado puede eliminar)
CREATE POLICY "Allow authenticated delete access"
  ON public.reservation_passengers
  FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================================
-- 5. FUNCIÓN HELPER: Contar pasajeros de una reserva
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_reservation_passengers_count(reservation_id_param INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  passenger_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO passenger_count
  FROM public.reservation_passengers
  WHERE reservation_id = reservation_id_param;

  RETURN passenger_count;
END;
$$;

COMMENT ON FUNCTION public.get_reservation_passengers_count IS
  'Retorna la cantidad total de pasajeros para una reserva específica';


-- ============================================================================
-- 6. FUNCIÓN HELPER: Validar capacidad de habitaciones vs pasajeros
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_reservation_capacity(reservation_id_param INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  total_capacity INTEGER;
  passenger_count INTEGER;
BEGIN
  -- Calcular capacidad total según habitaciones reservadas
  SELECT
    SUM(
      CASE
        WHEN tipo_habitacion = 'dbl' THEN cantidad * 2
        WHEN tipo_habitacion = 'tpl' THEN cantidad * 3
        WHEN tipo_habitacion = 'cpl' THEN cantidad * 4
        ELSE 0
      END
    )
  INTO total_capacity
  FROM public.reservation_details
  WHERE reservation_id = reservation_id_param;

  -- Contar pasajeros
  SELECT COUNT(*)
  INTO passenger_count
  FROM public.reservation_passengers
  WHERE reservation_id = reservation_id_param;

  -- Validar que no exceda la capacidad
  RETURN passenger_count <= COALESCE(total_capacity, 0);
END;
$$;

COMMENT ON FUNCTION public.validate_reservation_capacity IS
  'Valida que la cantidad de pasajeros no exceda la capacidad de las habitaciones reservadas';


-- ============================================================================
-- NOTAS IMPORTANTES PARA LA EJECUCIÓN
-- ============================================================================

/*
INSTRUCCIONES DE USO:

1. Antes de ejecutar este script en producción, hacer BACKUP de las tablas:
   - reservations
   - reservation_details

2. Si hay datos existentes, considerar:
   - Las columnas eliminadas (precio_total, cantidad_personas, etc.) se perderán
   - Evaluar si es necesario migrar datos existentes antes de eliminar columnas

3. Después de ejecutar el script:
   - Verificar que las políticas RLS funcionen correctamente
   - Probar las funciones helper con datos de prueba
   - Actualizar el código de la aplicación para usar la nueva estructura

4. Para revertir cambios (ROLLBACK):
   - Guardar una copia de este script y crear un script de reversión
   - Las columnas eliminadas no se pueden recuperar sin backup
*/
