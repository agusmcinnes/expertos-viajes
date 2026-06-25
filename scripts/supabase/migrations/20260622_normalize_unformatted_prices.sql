-- 20260622_normalize_unformatted_prices.sql
--
-- Normaliza los `travel_packages.price` que quedaron como número suelto (sin
-- moneda) al formato canónico "<n> <CUR>", para que el flujo currency-aware
-- los interprete bien. Convención de la agencia: aéreo cotiza en USD, bus en ARS.
-- No toca precios vacíos ni los que ya tienen formato. Idempotente.

begin;

update public.travel_packages
set price = btrim(price) || ' USD'
where transport_type = 'aereo'
  and btrim(coalesce(price, '')) ~ '^[0-9]+(\.[0-9]+)?$';

update public.travel_packages
set price = btrim(price) || ' ARS'
where transport_type = 'bus'
  and btrim(coalesce(price, '')) ~ '^[0-9]+(\.[0-9]+)?$';

commit;
