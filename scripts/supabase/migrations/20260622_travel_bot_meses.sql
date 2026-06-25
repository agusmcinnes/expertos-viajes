-- 20260622_travel_bot_meses.sql
--
-- Agrega `meses text[]` a la vista travel_packages_bot: los meses (nombre
-- completo en español) en los que el paquete tiene salida, derivados de
-- available_dates. Sirve como filtro enum determinístico por mes para el bot
-- (el worker del kb_pipeline tiene blocklisteado `available_dates`, pero `meses`
-- no, y matchea "julio" → meses contiene "julio" sin tener que inferir fechas).
--
-- Recrea la vista (drop + create) sumando la columna; el resto queda igual.

begin;

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
  end as precio_desde
from public.travel_packages tp
left join public.destinations d on d.id = tp.destination_id
left join agg on agg.paquete_id = tp.id
left join meses_pkg mp on mp.paquete_id = tp.id;

grant select on public.travel_packages_bot to anon, authenticated;

commit;
