-- Migración: agregar flag is_grupal a travel_packages y reasignar paquetes
-- Fecha: 2026-04-24
-- Propósito: "Salidas grupales acompañadas" deja de ser un destino y pasa a ser
--            un atributo del paquete. Los paquetes se reasignan a su destino geográfico real.

BEGIN;

-- 1. Agregar columna is_grupal (default false)
ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS is_grupal BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Marcar como is_grupal=true todos los paquetes actualmente en el destino "grupales" (id=4)
UPDATE public.travel_packages
  SET is_grupal = TRUE
  WHERE destination_id = 4;

-- 3. Reasignar cada paquete a su destino geográfico real
-- Brasil (id=2)
UPDATE public.travel_packages SET destination_id = 2 WHERE id IN (68, 74, 50, 73, 71, 72, 39, 27);

-- Caribe y Centroamérica (id=3)
UPDATE public.travel_packages SET destination_id = 3 WHERE id IN (91);

-- Exóticos y Resto del Mundo (id=7)
UPDATE public.travel_packages SET destination_id = 7 WHERE id IN (153, 143);

-- 4. Índice para acelerar búsquedas por flag
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_grupal
  ON public.travel_packages (is_grupal)
  WHERE is_grupal = TRUE;

COMMIT;
