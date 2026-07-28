-- 20260728_package_vigencia.sql
--
-- Objetivo: que "el paquete ya salió" sea un hecho DERIVADO de los datos y no
-- una tarea que alguien tiene que acordarse de hacer a mano.
--
-- Hoy `is_active` es un switch manual. Cuando pasa la última salida, el admin
-- tiene que apagarlo a mano; si se olvida, el paquete se sigue ofreciendo (y el
-- bot de WhatsApp lo cotiza). Esta migración agrega la vigencia como dato
-- calculado, sin tocar `is_active`.
--
-- Los dos conceptos quedan ortogonales, que es lo correcto:
--   is_active → decisión humana ("no quiero vender esto")
--   vigente   → hecho del calendario ("todavía tiene una salida por delante")
--
-- Cambios:
--   1) Normaliza `available_dates` (trigger + backfill). Hoy hay valores que el
--      parser existente no lee: '' (ARUBA) y punto final ('22 Feb 2027.' en
--      CAPAO DA CANOA / INGLESES / TORRES) — 4 de 50 paquetes activos.
--   2) `first_departure_date` / `last_departure_date` como columnas GENERATED
--      sobre travel_packages (mismo patrón que `available_dates_enriched`).
--   3) `vigente` en la vista `travel_packages_bot`, que es la que consume Mindo.
--
-- No se toca `parse_departure_date` a propósito: `available_dates_enriched` es
-- una columna GENERATED que depende de la cadena de parseo, y reemplazar esa
-- función con dependencias vivas es riesgoso. En vez de hacer el parser cada vez
-- más tolerante, se limpia el dato en origen y se lo mantiene limpio.
--
-- Rollback al final del archivo.

begin;

-- =====================================================================
-- 1) Normalización de available_dates
-- =====================================================================

-- Saca puntuación final y espacios, y descarta strings vacíos. Preserva el
-- orden original de las fechas.
create or replace function public.clean_available_dates(dates text[])
returns text[]
language sql
immutable
as $$
  select array_agg(v order by ord)
  from (
    select btrim(regexp_replace(d, '[.,;]+\s*$', '')) as v, ord
    from unnest(coalesce(dates, array[]::text[])) with ordinality as t(d, ord)
  ) s
  where nullif(s.v, '') is not null;
$$;

comment on function public.clean_available_dates(text[]) is
  'Normaliza un array de fechas de salida: quita puntuación final y descarta '
  'vacíos. Devuelve NULL si no queda ninguna fecha.';

create or replace function public.tg_normalize_available_dates()
returns trigger
language plpgsql
as $$
begin
  new.available_dates := public.clean_available_dates(new.available_dates);
  return new;
end;
$$;

drop trigger if exists normalize_available_dates on public.travel_packages;

create trigger normalize_available_dates
  before insert or update of available_dates on public.travel_packages
  for each row
  execute function public.tg_normalize_available_dates();

-- Backfill. Va ANTES de crear las columnas generadas para que se calculen sobre
-- el dato ya limpio. Idempotente: sobre datos limpios no cambia nada.
update public.travel_packages
set available_dates = public.clean_available_dates(available_dates)
where available_dates is distinct from public.clean_available_dates(available_dates);

-- =====================================================================
-- 2) Fechas de salida derivadas
-- =====================================================================

create or replace function public.departure_date_min(dates text[])
returns date
language sql
immutable
as $$
  select min(public.parse_departure_date(d))
  from unnest(coalesce(dates, array[]::text[])) as d;
$$;

create or replace function public.departure_date_max(dates text[])
returns date
language sql
immutable
as $$
  select max(public.parse_departure_date(d))
  from unnest(coalesce(dates, array[]::text[])) as d;
$$;

alter table public.travel_packages
  add column if not exists first_departure_date date
    generated always as (public.departure_date_min(available_dates)) stored;

alter table public.travel_packages
  add column if not exists last_departure_date date
    generated always as (public.departure_date_max(available_dates)) stored;

comment on column public.travel_packages.last_departure_date is
  'Última salida parseable de available_dates. NULL si no hay ninguna legible. '
  'Es la base de `vigente` en travel_packages_bot.';

create index if not exists travel_packages_last_departure_idx
  on public.travel_packages (last_departure_date);

-- =====================================================================
-- 3) Vista del bot: agrega `vigente`
-- =====================================================================
-- Idéntica a 20260622_travel_bot_meses.sql salvo por la columna nueva.
-- `tp.*` ya arrastra first_departure_date / last_departure_date.

drop view if exists public.travel_packages_bot;

create view public.travel_packages_bot
with (security_invoker = true) as
with mes(num, abbr) as (
  values (1,'ene'),(2,'feb'),(3,'mar'),(4,'abr'),(5,'may'),(6,'jun'),
         (7,'jul'),(8,'ago'),(9,'sep'),(10,'oct'),(11,'nov'),(12,'dic')
),
rate_lines as (
  select
    a.paquete_id,
    a.regimen,
    r.tarifa_dbl,
    coalesce(r.currency, 'USD') as currency,
    format(
      '%s %s★%s — %s %s: %s%s',
      a.name,
      a.stars,
      case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
      coalesce(m.abbr, r.mes::text),
      r.anio,
      coalesce(nullif(concat_ws(' · ',
        case when r.tarifa_dbl   is not null then 'doble '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_dbl)::text   end,
        case when r.tarifa_tpl   is not null then 'triple '    || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_tpl)::text   end,
        case when r.tarifa_cpl   is not null then 'cuádruple ' || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_cpl)::text   end,
        case when r.tarifa_menor is not null then 'menor '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_menor)::text end
      ), ''), 'consultar asesor'),
      case
        when concat_ws('', case when r.tarifa_dbl is not null then 'x' end,
                            case when r.tarifa_tpl is not null then 'x' end,
                            case when r.tarifa_cpl is not null then 'x' end,
                            case when r.tarifa_menor is not null then 'x' end) <> ''
         and concat_ws('/', case when r.tarifa_dbl is null then 'doble' end,
                            case when r.tarifa_tpl is null then 'triple' end,
                            case when r.tarifa_cpl is null then 'cuádruple' end,
                            case when r.tarifa_menor is null then 'menor' end) <> ''
        then '. ' || concat_ws('/', case when r.tarifa_dbl is null then 'doble' end,
                                    case when r.tarifa_tpl is null then 'triple' end,
                                    case when r.tarifa_cpl is null then 'cuádruple' end,
                                    case when r.tarifa_menor is null then 'menor' end)
                  || ': consultar asesor'
        else ''
      end
    ) as linea
  from public.accommodations a
  join public.accommodation_rates r on r.accommodation_id = a.id
  left join mes m on m.num = r.mes
),
agg as (
  select
    paquete_id,
    array_agg(linea order by linea) as hoteles_tarifas,
    array_agg(distinct regimen) filter (where coalesce(regimen,'') <> '') as regimenes,
    min(tarifa_dbl) filter (where tarifa_dbl is not null) as min_dbl,
    (array_agg(currency order by tarifa_dbl nulls last))[1] as min_currency
  from rate_lines
  group by paquete_id
),
meses_pkg as (
  select tp.id as paquete_id,
    array_agg(ml.label order by ml.ord) as meses
  from public.travel_packages tp
  cross join (values
    ('enero','%ene%',1),('febrero','%feb%',2),('marzo','%mar%',3),('abril','%abr%',4),
    ('mayo','%may%',5),('junio','%jun%',6),('julio','%jul%',7),('agosto','%ago%',8),
    ('septiembre','%sep%',9),('octubre','%oct%',10),('noviembre','%nov%',11),('diciembre','%dic%',12)
  ) as ml(label, pat, ord)
  where exists (
    select 1 from unnest(coalesce(tp.available_dates, array[]::text[])) d
    where lower(d) like ml.pat
  )
  group by tp.id
)
select
  tp.*,
  d.name as destination_name,
  agg.regimenes,
  agg.hoteles_tarifas,
  mp.meses,
  case
    when agg.min_dbl is not null
    then coalesce(agg.min_currency, 'USD') || ' ' || trunc(agg.min_dbl)::text
    else null
  end as precio_desde,
  -- Vigente = todavía tiene una salida por delante. Conservador a propósito:
  -- si no hay ninguna fecha legible (last_departure_date is null) el paquete
  -- sigue vigente, porque esconder un viaje vendible es peor que mostrar uno
  -- vencido. Una salida HOY cuenta como vigente.
  (tp.last_departure_date is null
   or tp.last_departure_date >= current_date) as vigente
from public.travel_packages tp
left join public.destinations d on d.id = tp.destination_id
left join agg on agg.paquete_id = tp.id
left join meses_pkg mp on mp.paquete_id = tp.id;

grant select on public.travel_packages_bot to anon, authenticated;

commit;

-- =====================================================================
-- Verificación (correr a mano después de aplicar)
-- =====================================================================
-- -- Paquetes activos que ya vencieron (deberían salir del feed del bot):
-- select id, name, last_departure_date, available_dates
-- from public.travel_packages_bot
-- where is_active and not vigente
-- order by last_departure_date;
--
-- -- Paquetes sin ninguna fecha legible (quedan vigentes por diseño — revisar
-- -- si es dato faltante):
-- select id, name, available_dates
-- from public.travel_packages
-- where is_active and last_departure_date is null;

-- =====================================================================
-- Rollback
-- =====================================================================
-- begin;
-- drop trigger if exists normalize_available_dates on public.travel_packages;
-- drop function if exists public.tg_normalize_available_dates();
-- drop index if exists public.travel_packages_last_departure_idx;
-- alter table public.travel_packages drop column if exists last_departure_date;
-- alter table public.travel_packages drop column if exists first_departure_date;
-- drop function if exists public.departure_date_max(text[]);
-- drop function if exists public.departure_date_min(text[]);
-- drop function if exists public.clean_available_dates(text[]);
-- -- y volver a aplicar 20260622_travel_bot_meses.sql para restaurar la vista.
-- commit;
