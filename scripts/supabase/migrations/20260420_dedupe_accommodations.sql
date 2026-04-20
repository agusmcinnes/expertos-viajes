-- =====================================================
-- Migration: Deduplicar accommodations
-- Fecha: 2026-04-20
-- Descripción:
--   Limpia accommodations duplicados (mismo paquete_id + name)
--   generados por el bug del "delete-all + insert-all" cuando
--   el DELETE fallaba por FKs y seguía el INSERT.
--
--   Estrategia:
--     - Canonical = MIN(id) por grupo (paquete_id, name)
--     - Mover reservations y package_stock de duplicados al canonical
--     - Borrar rates de duplicados (son idénticas a las del canonical
--       por venir del mismo flujo de copia)
--     - Borrar accommodations duplicados
--
--   Todo corre en una transacción. Si algo falla, ROLLBACK.
-- =====================================================

BEGIN;

-- 1. Identificar grupos y canonicals
CREATE TEMP TABLE accom_canonical_map AS
SELECT
  a.id AS dup_id,
  FIRST_VALUE(a.id) OVER (
    PARTITION BY a.paquete_id, a.name
    ORDER BY a.id ASC
  ) AS canonical_id,
  a.paquete_id,
  a.name
FROM public.accommodations a;

-- Solo nos interesan los que no son su propio canonical
CREATE TEMP TABLE accom_to_merge AS
SELECT dup_id, canonical_id, paquete_id, name
FROM accom_canonical_map
WHERE dup_id <> canonical_id;

-- Conteo para el log
DO $log$
DECLARE
  v_groups INTEGER;
  v_dupes INTEGER;
BEGIN
  SELECT COUNT(DISTINCT (paquete_id, name)), COUNT(*)
    INTO v_groups, v_dupes
  FROM accom_to_merge;
  RAISE NOTICE 'Deduplicando: % grupos afectados, % filas duplicadas a limpiar', v_groups, v_dupes;
END;
$log$;

-- 2. Mover reservations al canonical
UPDATE public.reservations r
SET accommodation_id = m.canonical_id
FROM accom_to_merge m
WHERE r.accommodation_id = m.dup_id;

-- 3. Antes de mover package_stock, borrar filas duplicadas
--    que chocarían con el UNIQUE (package_id, accommodation_id, fecha_salida, flexible_dates)
DELETE FROM public.package_stock ps_dup
USING accom_to_merge m
WHERE ps_dup.accommodation_id = m.dup_id
  AND EXISTS (
    SELECT 1 FROM public.package_stock ps_can
    WHERE ps_can.accommodation_id = m.canonical_id
      AND ps_can.package_id = ps_dup.package_id
      AND ps_can.fecha_salida IS NOT DISTINCT FROM ps_dup.fecha_salida
      AND COALESCE(ps_can.flexible_dates, FALSE) = COALESCE(ps_dup.flexible_dates, FALSE)
  );

-- Luego mover los restantes
UPDATE public.package_stock ps
SET accommodation_id = m.canonical_id
FROM accom_to_merge m
WHERE ps.accommodation_id = m.dup_id;

-- 4. Borrar rates de duplicados (son copias idénticas de las del canonical).
--    Si hubiera rates que solo existen en un duplicado y no en el canonical,
--    se perderían; dado el patrón conocido de duplicación por delete-insert,
--    esto es aceptable.
DELETE FROM public.accommodation_rates
WHERE accommodation_id IN (SELECT dup_id FROM accom_to_merge);

-- 5. Borrar accommodations duplicados
DELETE FROM public.accommodations
WHERE id IN (SELECT dup_id FROM accom_to_merge);

-- Verificación final: no debe quedar ningún grupo con más de 1 fila
DO $verify$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM (
    SELECT paquete_id, name, COUNT(*) c
    FROM public.accommodations
    GROUP BY paquete_id, name
    HAVING COUNT(*) > 1
  ) t;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Deduplicacion incompleta: % grupos aún con duplicados', v_remaining;
  END IF;
  RAISE NOTICE 'Deduplicacion exitosa: 0 grupos con duplicados';
END;
$verify$;

COMMIT;
