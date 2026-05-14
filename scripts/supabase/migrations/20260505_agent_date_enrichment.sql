-- =====================================================
-- AGENT DATE ENRICHMENT
-- =====================================================
-- Agrega una columna `available_dates_enriched` a `travel_packages`
-- que mantiene una versión enriquecida (semana del mes, quincena,
-- estación, rango numérico de días) de `available_dates`. La nueva
-- columna se calcula sola via GENERATED ALWAYS AS ... STORED.
--
-- Objetivo: que un agente IA externo que usa embeddings pueda
-- matchear queries por períodos relativos ("primera semana de julio",
-- "fines de mayo", "vacaciones de invierno") sin cambiar nada en el
-- frontend.
--
-- - `available_dates` queda intacto (lo sigue usando el frontend).
-- - La columna nueva es additive y se mantiene sola.
-- - Reversible con: DROP COLUMN + DROP FUNCTION (ver al final).
-- =====================================================

-- 0) Limpieza de un intento previo basado en vista (si quedó colgado)
DROP VIEW IF EXISTS public.travel_packages_agent;

-- 1) Parser tolerante: acepta variaciones de "DD MES YYYY"
--    - "19 Jul 2026", "19 JUL 2026", "5 Dic 2026"
--    - "23 Jul 26"  (año de 2 dígitos -> 20XX)
--    - "1 Mayo 2026" (mes en español completo)
--    - Strings que no encajan ("Desde 01 Mayo hasta 30 Sept 2026") -> NULL
CREATE OR REPLACE FUNCTION public.parse_departure_date(d text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  dd int;
  mm int;
  yy int;
BEGIN
  IF d IS NULL
     OR trim(d) !~ '^\s*\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,12}\.?\s+\d{2,4}\s*$'
  THEN
    RETURN NULL;
  END IF;

  parts := regexp_split_to_array(trim(d), '\s+');
  dd := parts[1]::int;
  yy := parts[3]::int;
  IF yy < 100 THEN yy := yy + 2000; END IF;

  mm := CASE lower(regexp_replace(parts[2], '\.', ''))
    WHEN 'ene' THEN 1 WHEN 'enero' THEN 1 WHEN 'jan' THEN 1 WHEN 'january' THEN 1
    WHEN 'feb' THEN 2 WHEN 'febrero' THEN 2 WHEN 'february' THEN 2
    WHEN 'mar' THEN 3 WHEN 'marzo' THEN 3 WHEN 'march' THEN 3
    WHEN 'abr' THEN 4 WHEN 'abril' THEN 4 WHEN 'apr' THEN 4 WHEN 'april' THEN 4
    WHEN 'may' THEN 5 WHEN 'mayo' THEN 5
    WHEN 'jun' THEN 6 WHEN 'junio' THEN 6 WHEN 'june' THEN 6
    WHEN 'jul' THEN 7 WHEN 'julio' THEN 7 WHEN 'july' THEN 7
    WHEN 'ago' THEN 8 WHEN 'agosto' THEN 8 WHEN 'aug' THEN 8 WHEN 'august' THEN 8
    WHEN 'sep' THEN 9 WHEN 'set' THEN 9 WHEN 'sept' THEN 9
    WHEN 'septiembre' THEN 9 WHEN 'setiembre' THEN 9 WHEN 'september' THEN 9
    WHEN 'oct' THEN 10 WHEN 'octubre' THEN 10 WHEN 'october' THEN 10
    WHEN 'nov' THEN 11 WHEN 'noviembre' THEN 11 WHEN 'november' THEN 11
    WHEN 'dic' THEN 12 WHEN 'diciembre' THEN 12 WHEN 'dec' THEN 12 WHEN 'december' THEN 12
    ELSE NULL
  END;

  IF mm IS NULL OR dd < 1 OR dd > 31 OR yy < 1900 OR yy > 2100 THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN make_date(yy, mm, dd);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- 2) Enriquecedor por fecha individual: agrega contexto temporal
--    con rangos numéricos explícitos para que el embedding matchee
--    queries como "primera semana de julio" o "fines de mayo".
CREATE OR REPLACE FUNCTION public.enrich_departure_date(d text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH p AS (SELECT public.parse_departure_date(d) AS dt),
  m(n,name) AS (VALUES
    (1,'enero'),(2,'febrero'),(3,'marzo'),(4,'abril'),
    (5,'mayo'),(6,'junio'),(7,'julio'),(8,'agosto'),
    (9,'septiembre'),(10,'octubre'),(11,'noviembre'),(12,'diciembre')),
  dn(n,name) AS (VALUES
    (0,'domingo'),(1,'lunes'),(2,'martes'),(3,'miércoles'),
    (4,'jueves'),(5,'viernes'),(6,'sábado')),
  f AS (
    SELECT dt,
      EXTRACT(day   FROM dt)::int AS dd,
      EXTRACT(month FROM dt)::int AS mm,
      EXTRACT(year  FROM dt)::int AS yy,
      EXTRACT(dow   FROM dt)::int AS dow,
      EXTRACT(day FROM (date_trunc('month', dt) + interval '1 month - 1 day'))::int AS days_in_month
    FROM p WHERE dt IS NOT NULL
  )
  SELECT COALESCE(
    (SELECT format(
      '%s — %s %s de %s de %s — %s semana de %s (días %s al %s) — %s quincena de %s — %s de %s — mes %s/%s%s',
      d,
      (SELECT name FROM dn WHERE n = f.dow),
      f.dd,
      (SELECT name FROM m WHERE n = f.mm),
      f.yy,
      CASE
        WHEN f.dd <= 7  THEN 'primera'
        WHEN f.dd <= 14 THEN 'segunda'
        WHEN f.dd <= 21 THEN 'tercera'
        WHEN f.dd <= 28 THEN 'cuarta'
        ELSE 'última'
      END,
      (SELECT name FROM m WHERE n = f.mm),
      ((((f.dd - 1) / 7)) * 7) + 1,
      LEAST(((((f.dd - 1) / 7)) + 1) * 7, f.days_in_month),
      CASE WHEN f.dd <= 15 THEN 'primera' ELSE 'segunda' END,
      (SELECT name FROM m WHERE n = f.mm),
      CASE
        WHEN f.dd <= 10 THEN 'comienzos'
        WHEN f.dd <= 20 THEN 'mediados'
        ELSE 'fines'
      END,
      (SELECT name FROM m WHERE n = f.mm),
      f.mm, f.yy,
      CASE
        WHEN f.mm IN (12, 1, 2)  THEN ' — verano en Argentina — temporada alta'
        WHEN f.mm IN (6, 7)      THEN ' — invierno en Argentina — vacaciones de invierno escolares'
        WHEN f.mm IN (3, 4, 5)   THEN ' — otoño en Argentina'
        WHEN f.mm IN (9, 10, 11) THEN ' — primavera en Argentina'
      END
    ) FROM f),
    d
  );
$$;

-- 3) Wrapper a nivel array: el que se usa en la columna generada.
CREATE OR REPLACE FUNCTION public.enrich_dates_array(d text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN d IS NULL THEN NULL
    ELSE ARRAY(SELECT public.enrich_departure_date(x) FROM unnest(d) AS x)
  END;
$$;

-- 4) Columna generada en travel_packages.
--    Si ya existe (por re-run), no hace nada.
ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS available_dates_enriched text[]
  GENERATED ALWAYS AS (public.enrich_dates_array(available_dates)) STORED;

COMMENT ON COLUMN public.travel_packages.available_dates_enriched IS
  'Versión enriquecida de available_dates con metadata temporal '
  '(semana del mes, quincena, estación, rango de días). Pensada para '
  'consumo del agente IA de embeddings. Se calcula sola via GENERATED '
  'ALWAYS AS STORED — no escribir manualmente.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- SELECT id, name, available_dates, available_dates_enriched
-- FROM public.travel_packages
-- WHERE is_active = true
-- LIMIT 3;
--
-- ROLLBACK
-- =====================================================
-- ALTER TABLE public.travel_packages DROP COLUMN IF EXISTS available_dates_enriched;
-- DROP FUNCTION IF EXISTS public.enrich_dates_array(text[]);
-- DROP FUNCTION IF EXISTS public.enrich_departure_date(text);
-- DROP FUNCTION IF EXISTS public.parse_departure_date(text);
