import {
  departureISODates,
  formatPrice,
  hasRate,
  rateForDeparture,
  toDepartureISO,
  visibleRateFields,
  type RateFieldDef,
  type RateLike,
} from "@/lib/rates"
import { parseISODateLocal, toISODateLocal } from "@/lib/date-utils"

// Armado de la tabla pública «Tarifas por Salida»: qué pestañas hay, qué hoteles y con qué tarifa.
// Lógica pura (sin React) para poder testearla.

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DAY_MS = 24 * 60 * 60 * 1000

/** Lo mínimo de un alojamiento: sus tarifas (filas de `accommodation_rates`). */
export interface HotelWithRates {
  rates?: ReadonlyArray<RateLike> | null
}

type RateOf<A extends HotelWithRates> = NonNullable<A["rates"]>[number]

export interface DepartureHotel<A extends HotelWithRates> {
  accommodation: A
  /** Tarifa efectiva del hotel para esta pestaña (regla de §2.1: la de la salida; si no, la del mes). */
  rate: RateOf<A>
}

export interface Departure<A extends HotelWithRates> {
  key: string
  shortLabel: string
  longLabel: string
  daysUntil: number | null
  /** Hoteles con tarifa para esta pestaña, del más barato al más caro en Doble. */
  hotels: DepartureHotel<A>[]
}

export interface DepartureTable<A extends HotelWithRates> {
  departures: Departure<A>[]
  /** Columnas de la tabla, iguales para todas las pestañas (calculadas sobre todas las tarifas mostradas). */
  columns: RateFieldDef[]
}

const isMonthRow = (r: RateLike) => !(r.fecha_salida && toDepartureISO(r.fecha_salida))

const sortPrice = (rate: RateLike) => (hasRate(rate.tarifa_dbl) ? Number(rate.tarifa_dbl) : Infinity)

/** Hoteles con tarifa para la salida `iso`, ordenados por Doble (los sin Doble al final). */
function hotelsFor<A extends HotelWithRates>(
  accommodations: ReadonlyArray<A>,
  iso: string,
  rowsOf: (a: A) => ReadonlyArray<RateOf<A>>,
): DepartureHotel<A>[] {
  const hotels: DepartureHotel<A>[] = []
  for (const accommodation of accommodations) {
    const rate = rateForDeparture(rowsOf(accommodation), iso)
    if (rate) hotels.push({ accommodation, rate })
  }
  return hotels.sort((a, b) => sortPrice(a.rate) - sortPrice(b.rate))
}

function departureTab<A extends HotelWithRates>(
  iso: string,
  today: Date,
  hotels: DepartureHotel<A>[],
): Departure<A> {
  const date = parseISODateLocal(iso)!
  return {
    key: iso,
    shortLabel: `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`,
    longLabel: `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`,
    daysUntil: Math.round((date.getTime() - today.getTime()) / DAY_MS),
    hotels,
  }
}

/**
 * Pestañas de la tabla pública y sus columnas.
 * - Con salidas futuras legibles en `available_dates`: una pestaña por salida, y en cada una la tarifa
 *   efectiva de cada hotel (la de esa salida; si no hay, la de su mes). Hotel sin ninguna de las dos: no aparece.
 * - Sin salidas futuras legibles (respaldo): una pestaña por cada mes futuro con tarifas del mes
 *   (`fecha_salida` null), sólo con esas filas; y si hay tarifas por salida futuras, cada una como su salida.
 */
export function buildDepartureTable<A extends HotelWithRates>(
  accommodations: ReadonlyArray<A>,
  availableDates: ReadonlyArray<string> | null | undefined,
  now: Date = new Date(),
): DepartureTable<A> {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayISO = toISODateLocal(today)
  const allRows = (a: A) => (a.rates ?? []) as ReadonlyArray<RateOf<A>>

  let departures: Departure<A>[]
  const futureDates = departureISODates(availableDates).filter((iso) => iso >= todayISO)

  if (futureDates.length > 0) {
    departures = futureDates.map((iso) => departureTab(iso, today, hotelsFor(accommodations, iso, allRows)))
  } else {
    const monthRows = (a: A) => allRows(a).filter(isMonthRow)
    const tabs: { sortKey: string; order: number; tab: Departure<A> }[] = []

    // Tarifas del mes futuras (mes actual incluido), agrupadas por mes
    const months = new Map<string, { mes: number; anio: number }>()
    for (const acc of accommodations) {
      for (const r of monthRows(acc)) {
        if (r.anio > today.getFullYear() || (r.anio === today.getFullYear() && r.mes >= today.getMonth() + 1)) {
          months.set(`${r.anio}-${r.mes}`, { mes: r.mes, anio: r.anio })
        }
      }
    }
    for (const [key, { mes, anio }] of months) {
      const firstDay = `${anio}-${String(mes).padStart(2, "0")}-01`
      tabs.push({
        sortKey: firstDay,
        order: 0,
        tab: {
          key,
          shortLabel: `${MONTHS_SHORT[mes - 1]} ${String(anio).slice(2)}`,
          longLabel: `${MONTHS[mes - 1].charAt(0).toUpperCase()}${MONTHS[mes - 1].slice(1)} ${anio}`,
          daysUntil: null,
          hotels: hotelsFor(accommodations, firstDay, monthRows),
        },
      })
    }

    // Tarifas por salida futuras: se muestran como salidas
    const rowDates = new Set<string>()
    for (const acc of accommodations) {
      for (const r of allRows(acc)) {
        const iso = isMonthRow(r) ? null : toDepartureISO(r.fecha_salida)
        if (iso && iso >= todayISO) rowDates.add(iso)
      }
    }
    for (const iso of rowDates) {
      tabs.push({ sortKey: iso, order: 1, tab: departureTab(iso, today, hotelsFor(accommodations, iso, allRows)) })
    }

    departures = tabs
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.order - b.order)
      .map((t) => t.tab)
  }

  const columns = visibleRateFields(departures.flatMap((d) => d.hotels.map((h) => h.rate)))
  return { departures, columns }
}

/** «desde USD …» de una pestaña: la Doble más barata entre sus hoteles; null si ninguno tiene Doble. */
export function lowestPrice<A extends HotelWithRates>(departure: Departure<A>): string | null {
  const cheapest = departure.hotels.find((h) => hasRate(h.rate.tarifa_dbl))
  return cheapest ? formatPrice(cheapest.rate.tarifa_dbl, cheapest.rate.currency) : null
}
