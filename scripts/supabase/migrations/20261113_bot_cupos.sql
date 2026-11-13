-- =====================================================================
-- 2026-11-13 · Vista del bot: cupo por hotel y salida (columna `cupos`)
-- =====================================================================
-- Pedido de Alejandro (13/11): la web muestra «Quedan 5» por salida, hotel y
-- tipo de habitación, y al catálogo de Mindo el stock le llega vacío porque
-- travel_packages_bot no tenía ninguna columna de cupo.
--
-- Agrega `cupos` (text[]) AL FINAL de la vista; el resto queda idéntico a la
-- del 12/11 (20261112_tarifas_por_salida_y_habitaciones.sql, sección E).
-- Una línea por hotel, mes y cupo, p. ej.:
--   «Hotel Bhally 3★ — salidas 3, 10, 17, 24 y 31 ene 2027: quedan 5 dobles, 5 triples, 5 cuádruples»
--   «Hotel Bhally 3★ — salida 7 feb 2027: quedan 2 dobles; sin cupo en triple»
--   «Hotel Bhally 3★ — salida 14 feb 2027: sin cupo»
-- Salidas del mismo hotel y mes con el mismo cupo van en una línea.
-- Paquetes ilimitados o sin cupo por fecha: `cupos` = NULL.
-- No se llama `stock`: el adaptador de Mindo toma ese nombre como un número.
-- En Mindo hay que sumar `cupos` al field_mapping de la tienda para que sincronice.
--
-- Rollback: volver a correr la sección E de 20261112 con
--   drop view public.travel_packages_bot; antes (create or replace no saca columnas)
--   y re-dar grants: grant select on public.travel_packages_bot to anon, authenticated, service_role;

begin;

create or replace view public.travel_packages_bot
with (security_invoker = true) as
with mes(num, abbr) as (
  values (1,'ene'),(2,'feb'),(3,'mar'),(4,'abr'),(5,'may'),(6,'jun'),
         (7,'jul'),(8,'ago'),(9,'sep'),(10,'oct'),(11,'nov'),(12,'dic')
),
tarifas as (
  select
    r.id,
    r.accommodation_id,
    r.mes,
    r.anio,
    r.fecha_salida,
    nullif(r.tarifa_sgl, 0)   as sgl,
    nullif(r.tarifa_dbl, 0)   as dbl,
    nullif(r.tarifa_tpl, 0)   as tpl,
    nullif(r.tarifa_cpl, 0)   as cpl,
    nullif(r.tarifa_qpl, 0)   as qpl,
    nullif(r.tarifa_menor, 0) as menor,
    coalesce(r.currency, 'USD') as currency
  from public.accommodation_rates r
),
pkg_salidas as (
  select distinct s.paquete_id, s.fecha
  from (
    select tp.id as paquete_id, public.parse_departure_date(d.d) as fecha
    from public.travel_packages tp
    cross join lateral unnest(coalesce(tp.available_dates, array[]::text[])) as d(d)
  ) s
  where s.fecha is not null
),
filas_salida as (
  select t.*
  from tarifas t
  join public.accommodations a on a.id = t.accommodation_id
  where t.fecha_salida is not null
    and (
      exists (select 1 from pkg_salidas s
              where s.paquete_id = a.paquete_id and s.fecha = t.fecha_salida)
      or not exists (select 1 from pkg_salidas s where s.paquete_id = a.paquete_id)
    )
),
meses_salida as (
  select distinct accommodation_id, mes, anio
  from filas_salida
),
salidas_hotel as (
  select ms.accommodation_id, s.fecha
  from meses_salida ms
  join public.accommodations a on a.id = ms.accommodation_id
  join pkg_salidas s
    on s.paquete_id = a.paquete_id
   and extract(month from s.fecha)::int = ms.mes
   and extract(year from s.fecha)::int = ms.anio
  union
  select fs.accommodation_id, fs.fecha_salida
  from filas_salida fs
),
efectivas as (
  select
    sh.accommodation_id,
    sh.fecha,
    extract(month from sh.fecha)::int as mes,
    extract(year from sh.fecha)::int  as anio,
    case when fs.id is not null then fs.sgl      else fm.sgl      end as sgl,
    case when fs.id is not null then fs.dbl      else fm.dbl      end as dbl,
    case when fs.id is not null then fs.tpl      else fm.tpl      end as tpl,
    case when fs.id is not null then fs.cpl      else fm.cpl      end as cpl,
    case when fs.id is not null then fs.qpl      else fm.qpl      end as qpl,
    case when fs.id is not null then fs.menor    else fm.menor    end as menor,
    case when fs.id is not null then fs.currency else fm.currency end as currency
  from salidas_hotel sh
  left join filas_salida fs
    on fs.accommodation_id = sh.accommodation_id
   and fs.fecha_salida = sh.fecha
  left join tarifas fm
    on fm.accommodation_id = sh.accommodation_id
   and fm.fecha_salida is null
   and fm.mes  = extract(month from sh.fecha)::int
   and fm.anio = extract(year from sh.fecha)::int
  where fs.id is not null or fm.id is not null
),
tramos as (
  select t.accommodation_id, t.mes, t.anio, null::int[] as dias,
         t.sgl, t.dbl, t.tpl, t.cpl, t.qpl, t.menor, t.currency
  from tarifas t
  where t.fecha_salida is null
    and not exists (select 1 from meses_salida ms
                    where ms.accommodation_id = t.accommodation_id
                      and ms.mes = t.mes and ms.anio = t.anio)
  union all
  select e.accommodation_id, e.mes, e.anio,
         array_agg(extract(day from e.fecha)::int order by e.fecha) as dias,
         e.sgl, e.dbl, e.tpl, e.cpl, e.qpl, e.menor, e.currency
  from efectivas e
  group by e.accommodation_id, e.mes, e.anio,
           e.sgl, e.dbl, e.tpl, e.cpl, e.qpl, e.menor, e.currency
),
rate_lines as (
  select
    a.paquete_id,
    a.regimen,
    t.dbl as tarifa_dbl,
    t.currency,
    format(
      '%s %s★%s — %s%s %s: %s%s',
      a.name,
      a.stars,
      case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
      x.salidas,
      coalesce(m.abbr, t.mes::text),
      t.anio,
      coalesce(nullif(x.cuerpo, ''), 'consultar asesor'),
      case when x.cuerpo <> '' and x.faltan <> ''
           then '. ' || x.faltan || ': consultar asesor'
           else ''
      end
    ) as linea,
    -- Orden: el de siempre (alfabético por línea) para las líneas del mes; las
    -- de salida se ordenan por hotel, mes y primer día de la salida.
    case
      when t.dias is null then null
      else format('%s %s★%s — %s %s %s',
             a.name,
             a.stars,
             case when coalesce(a.regimen, '') <> '' then ' (' || a.regimen || ')' else '' end,
             coalesce(m.abbr, t.mes::text),
             t.anio,
             lpad(t.dias[1]::text, 2, '0'))
    end as orden_salida
  from tramos t
  join public.accommodations a on a.id = t.accommodation_id
  left join mes m on m.num = t.mes
  cross join lateral (
    select
      case
        when t.dias is null then ''
        when cardinality(t.dias) = 1 then 'salida ' || t.dias[1]::text || ' '
        else 'salidas '
             || array_to_string(t.dias[1:cardinality(t.dias) - 1], ', ')
             || ' y ' || t.dias[cardinality(t.dias)]::text || ' '
      end as salidas,
      -- Orden canónico: single, doble, triple, cuádruple, quíntuple, menor.
      concat_ws(' · ',
        case when t.sgl   is not null then 'single '    || t.currency || ' ' || trunc(t.sgl)::text   end,
        case when t.dbl   is not null then 'doble '     || t.currency || ' ' || trunc(t.dbl)::text   end,
        case when t.tpl   is not null then 'triple '    || t.currency || ' ' || trunc(t.tpl)::text   end,
        case when t.cpl   is not null then 'cuádruple ' || t.currency || ' ' || trunc(t.cpl)::text   end,
        case when t.qpl   is not null then 'quíntuple ' || t.currency || ' ' || trunc(t.qpl)::text   end,
        case when t.menor is not null then 'menor '     || t.currency || ' ' || trunc(t.menor)::text end
      ) as cuerpo,
      -- Bases faltantes: sólo las de siempre. Single y quíntuple casi nunca
      -- tienen tarifa; nombrarlas ensuciaría todas las líneas.
      concat_ws('/',
        case when t.dbl   is null then 'doble'     end,
        case when t.tpl   is null then 'triple'    end,
        case when t.cpl   is null then 'cuádruple' end,
        case when t.menor is null then 'menor'     end
      ) as faltan
  ) x
),
agg as (
  select
    paquete_id,
    array_agg(linea order by coalesce(orden_salida, linea), linea) as hoteles_tarifas,
    array_agg(distinct regimen) filter (where coalesce(regimen, '') <> '') as regimenes,
    min(tarifa_dbl) filter (where tarifa_dbl is not null) as min_dbl,
    (array_agg(currency order by tarifa_dbl))[1] as min_currency
  from rate_lines
  group by paquete_id
),
meses_pkg as (
  select tp_1.id as paquete_id,
    array_agg(ml.label order by ml.ord) as meses
  from public.travel_packages tp_1
  cross join (values
    ('enero','%ene%',1),('febrero','%feb%',2),('marzo','%mar%',3),('abril','%abr%',4),
    ('mayo','%may%',5),('junio','%jun%',6),('julio','%jul%',7),('agosto','%ago%',8),
    ('septiembre','%sep%',9),('octubre','%oct%',10),('noviembre','%nov%',11),('diciembre','%dic%',12)
  ) as ml(label, pat, ord)
  where exists (
    select 1 from unnest(coalesce(tp_1.available_dates, array[]::text[])) d_1(d)
    where lower(d_1.d) like ml.pat
  )
  group by tp_1.id
),
cupo_lines as (
  -- Cupo de cada hotel y salida futura con cupo controlado. Sólo salidas del
  -- paquete (misma regla que filas_salida). No entran: filas ilimitadas
  -- («Disponible»), filas sin fecha y tipos en NULL («A confirmar»).
  select
    ps.package_id as paquete_id,
    a.name || case when a.stars is not null then ' ' || a.stars || '★' else '' end as hotel,
    ps.fecha_salida,
    case
      when x.quedan is null then 'sin cupo'
      when x.agotado is null then 'quedan ' || x.quedan
      else 'quedan ' || x.quedan || '; sin cupo en ' || x.agotado
    end as cuerpo
  from public.package_stock ps
  join public.accommodations a on a.id = ps.accommodation_id
  cross join lateral (
    select
      string_agg(c.n || ' ' || c.tipo || case when c.n = 1 then '' else 's' end, ', ' order by c.ord)
        filter (where c.n > 0) as quedan,
      string_agg(c.tipo, ', ' order by c.ord) filter (where c.n = 0) as agotado
    from (values
      (1, 'single',    ps.stock_sgl),
      (2, 'doble',     ps.stock_dbl),
      (3, 'triple',    ps.stock_tpl),
      (4, 'cuádruple', ps.stock_cpl),
      (5, 'quíntuple', ps.stock_qpl)
    ) as c(ord, tipo, n)
    where c.n is not null
  ) x
  where ps.fecha_salida is not null
    and ps.fecha_salida >= current_date
    and not coalesce(ps.is_unlimited, false)
    and coalesce(ps.is_available, true)
    and (
      exists (select 1 from pkg_salidas s
              where s.paquete_id = ps.package_id and s.fecha = ps.fecha_salida)
      or not exists (select 1 from pkg_salidas s where s.paquete_id = ps.package_id)
    )
),
cupo_tramos as (
  -- Salidas del mismo hotel y mes con el mismo cupo, en una línea (como las tarifas).
  select
    paquete_id,
    hotel,
    cuerpo,
    extract(month from fecha_salida)::int as mes,
    extract(year from fecha_salida)::int  as anio,
    array_agg(extract(day from fecha_salida)::int order by fecha_salida) as dias,
    min(fecha_salida) as primera
  from cupo_lines
  group by paquete_id, hotel, cuerpo, extract(month from fecha_salida), extract(year from fecha_salida)
),
cupos_pkg as (
  select
    t.paquete_id,
    array_agg(
      format('%s — %s %s %s: %s',
        t.hotel,
        case when cardinality(t.dias) = 1 then 'salida ' || t.dias[1]::text
             else 'salidas ' || array_to_string(t.dias[1:cardinality(t.dias) - 1], ', ')
                  || ' y ' || t.dias[cardinality(t.dias)]::text
        end,
        coalesce(m.abbr, t.mes::text),
        t.anio,
        t.cuerpo)
      order by t.hotel, t.primera
    ) as cupos
  from cupo_tramos t
  left join mes m on m.num = t.mes
  group by t.paquete_id
)
select
  tp.id,
  tp.name,
  tp.description,
  tp.price,
  tp.destination_id,
  tp.duration,
  tp.image_url,
  tp.available_dates,
  tp.max_capacity,
  tp.is_active,
  tp.created_at,
  tp.updated_at,
  tp.transport_type,
  tp.is_special,
  tp.servicios_incluidos,
  tp.servicios_adicionales,
  tp.max_group_size,
  tp.tarifario_pdf_url,
  tp.flyer_pdf_url,
  tp.piezas_redes_pdf_url,
  tp.is_featured,
  tp.priority_order,
  tp.url,
  tp.ciudades,
  tp.is_grupal,
  tp.available_dates_enriched,
  tp.novedades_category_id,
  tp.cuotas,
  tp.first_departure_date,
  tp.last_departure_date,
  d.name as destination_name,
  agg.regimenes,
  agg.hoteles_tarifas,
  mp.meses,
  case
    when agg.min_dbl is not null
    then coalesce(agg.min_currency, 'USD') || ' ' || trunc(agg.min_dbl)::text
    else null
  end as precio_desde,
  (tp.last_departure_date is null
   or tp.last_departure_date >= current_date) as vigente,
  cp.cupos
from public.travel_packages tp
left join public.destinations d on d.id = tp.destination_id
left join agg on agg.paquete_id = tp.id
left join meses_pkg mp on mp.paquete_id = tp.id
left join cupos_pkg cp on cp.paquete_id = tp.id;

notify pgrst, 'reload schema';

commit;
