-- Agregar columna ciudades a travel_packages
-- Permite asociar una o varias ciudades a cada paquete de viaje
ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS ciudades TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.travel_packages.ciudades IS 'Lista de ciudades incluidas en el paquete de viaje';
