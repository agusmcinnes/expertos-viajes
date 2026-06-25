-- 20260622_travel_bot_pricing.sql
--
-- Objetivo: que el bot de WhatsApp (Mindo) pueda cotizar por hotel y por
-- ocupación (doble/triple/cuádruple/menor) sin inventar, leyendo datos ya
-- existentes en `accommodation_rates`.
--
-- Cambios (mínimos, sin rediseñar tablas base):
--   1) `accommodation_rates.currency`  -> moneda por tarifa (USD/ARS), con backfill.
--   2) Vista `travel_packages_bot`     -> por paquete, una columna `hoteles_tarifas`
--      (text[]) ya formateada y currency-aware, más `precio_desde`,
--      `destination_name` y `regimenes`. Es lo que consume Mindo por PostgREST.
--
-- La web puede seguir leyendo las tablas como hasta ahora; esta vista es aditiva.

begin;

-- 1) Moneda en accommodation_rates -------------------------------------------
alter table public.accommodation_rates
  add column if not exists currency text;

-- Backfill: moneda = la del string `price` del paquete dueño del hotel.
update public.accommodation_rates r
set currency = case
    when upper(coalesce(tp.price, '')) like '%ARS%' or tp.price like '%$%' then 'ARS'
    else 'USD'
  end
from public.accommodations a
join public.travel_packages tp on tp.id = a.paquete_id
where r.accommodation_id = a.id
  and r.currency is null;

alter table public.accommodation_rates
  alter column currency set default 'USD';

-- 2) Vista para el bot --------------------------------------------------------
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
      -- bases disponibles
      coalesce(nullif(concat_ws(' · ',
        case when r.tarifa_dbl   is not null then 'doble '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_dbl)::text   end,
        case when r.tarifa_tpl   is not null then 'triple '    || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_tpl)::text   end,
        case when r.tarifa_cpl   is not null then 'cuádruple ' || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_cpl)::text   end,
        case when r.tarifa_menor is not null then 'menor '     || coalesce(r.currency,'USD') || ' ' || trunc(r.tarifa_menor)::text end
      ), ''), 'consultar asesor'),
      -- sufijo con las bases faltantes (solo si hay al menos una cargada y una faltante)
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
)
select
  tp.*,
  d.name as destination_name,
  agg.regimenes,
  agg.hoteles_tarifas,
  case
    when agg.min_dbl is not null
    then coalesce(agg.min_currency, 'USD') || ' ' || trunc(agg.min_dbl)::text
    else null
  end as precio_desde
from public.travel_packages tp
left join public.destinations d on d.id = tp.destination_id
left join agg on agg.paquete_id = tp.id;

-- PostgREST: exponer la vista a los roles que ya leen el catálogo.
grant select on public.travel_packages_bot to anon, authenticated;

commit;
