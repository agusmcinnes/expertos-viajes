import type { RoomType } from "./room-utils"
import { parseISODateLocal, parseSpanishDate, toISODateLocal } from "./date-utils"

/** Años que se pueden elegir para una tarifa: el anterior, el actual y los dos siguientes. */
export function rateYearOptions(now: Date = new Date(), extra?: number): number[] {
  const y = now.getFullYear()
  const years = [y - 1, y, y + 1, y + 2]
  if (extra != null && !years.includes(extra)) years.push(extra)
  return years.sort((a, b) => a - b)
}

/** Año sugerido para un mes: si el mes ya pasó este año, el año que viene. */
export function suggestRateYear(mes: number, now: Date = new Date()): number {
  const y = now.getFullYear()
  return mes < now.getMonth() + 1 ? y + 1 : y
}

/** "USD 720", "ARS 850.000"; null si no hay monto. */
export function formatPrice(amount: number | null | undefined, currency?: string | null): string | null {
  if (amount == null || amount === 0) return null
  const code = (currency || "USD").toUpperCase()
  const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)
  return `${code} ${number}`
}

// ---------------------------------------------------------------------------
// Columnas de tarifa
// ---------------------------------------------------------------------------

export type RateField = "tarifa_sgl" | "tarifa_dbl" | "tarifa_tpl" | "tarifa_cpl" | "tarifa_qpl" | "tarifa_menor"

export interface RateFieldDef {
  field: RateField
  /** "Single", "Doble", "Triple", "Cuádruple", "Quíntuple", "Menor" */
  label: string
  /** "SGL", "DBL", "TPL", "CPL", "QPL", "MENOR" */
  short: string
  /** Tipo de habitación de la columna; null en Menor (no es un tipo de habitación). */
  roomType: RoomType | null
  /** Si la tabla pública la muestra siempre (Doble, Triple, Cuádruple, Menor) o sólo cuando alguna tarifa la tiene. */
  alwaysVisible: boolean
}

/** Orden canónico en toda pantalla o texto: Single, Doble, Triple, Cuádruple, Quíntuple, Menor. */
export const RATE_FIELDS: readonly RateFieldDef[] = [
  { field: "tarifa_sgl", label: "Single", short: "SGL", roomType: "sgl", alwaysVisible: false },
  { field: "tarifa_dbl", label: "Doble", short: "DBL", roomType: "dbl", alwaysVisible: true },
  { field: "tarifa_tpl", label: "Triple", short: "TPL", roomType: "tpl", alwaysVisible: true },
  { field: "tarifa_cpl", label: "Cuádruple", short: "CPL", roomType: "cpl", alwaysVisible: true },
  { field: "tarifa_qpl", label: "Quíntuple", short: "QPL", roomType: "qpl", alwaysVisible: false },
  { field: "tarifa_menor", label: "Menor", short: "MENOR", roomType: null, alwaysVisible: true },
]

/** Los seis montos de una tarifa. Las filas viejas pueden no traer sgl/qpl: undefined vale como null. */
export type RateValues = { [K in RateField]?: number | null }

/** Lo mínimo de una fila de `accommodation_rates` que usan estos helpers. */
export interface RateLike extends RateValues {
  mes: number
  anio: number
  /** 'YYYY-MM-DD' si es la tarifa de una salida; null/undefined si es la tarifa del mes. */
  fecha_salida?: string | null
  currency?: string | null
}

/** `null`, `undefined`, `0` (y NaN) son «sin tarifa». */
export function hasRate(value: number | null | undefined): boolean {
  return value != null && value !== 0 && !Number.isNaN(value)
}

/** El monto si hay tarifa; null si no (normaliza 0 y undefined a null). */
export function rateValue(value: number | null | undefined): number | null {
  return hasRate(value) ? Number(value) : null
}

/** Texto del input del panel → monto. "" , "0" o basura → null. Acepta coma decimal ("720,5"). */
export function parseRateInput(value: string | null | undefined): number | null {
  if (value == null) return null
  let s = String(value).trim().replace(/\s+/g, "")
  if (!/^\d[\d.,]*$/.test(s)) return null

  // Un separador seguido de exactamente tres dígitos es de miles («850.000», «1.250.000», «1,250»): ninguna
  // tarifa tiene tres decimales. Si no, punto o coma son el decimal («720,5», «720.50»).
  if (/^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".")
  else if (/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "")
  else if ((s.match(/[.,]/g) ?? []).length > 1) return null
  else s = s.replace(",", ".")

  const n = Number(s)
  return rateValue(Number.isFinite(n) ? n : null)
}

/** Si la tarifa no tiene ningún monto cargado. */
export function isEmptyRate(rate: RateValues): boolean {
  return RATE_FIELDS.every((f) => !hasRate(rate[f.field]))
}

/**
 * Columnas a mostrar en una tabla de tarifas: Doble, Triple, Cuádruple y Menor siempre;
 * Single y Quíntuple sólo si alguna tarifa de la lista las tiene. En orden canónico.
 */
export function visibleRateFields(rates: ReadonlyArray<RateValues | null | undefined>): RateFieldDef[] {
  return RATE_FIELDS.filter((f) => f.alwaysVisible || rates.some((r) => r != null && hasRate(r[f.field])))
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

/**
 * Normaliza una fecha de salida a 'YYYY-MM-DD' (fecha local).
 * Acepta 'YYYY-MM-DD' (o un timestamp ISO: se toman los 10 primeros caracteres), "3 Ene 2027" o un Date.
 * Devuelve null si no se puede leer.
 */
export function toDepartureISO(fecha: string | Date | null | undefined): string | null {
  if (fecha == null) return null
  if (fecha instanceof Date) return Number.isNaN(fecha.getTime()) ? null : toISODateLocal(fecha)
  const iso = parseISODateLocal(fecha)
  if (iso) return toISODateLocal(iso)
  const spanish = parseSpanishDate(fecha)
  return spanish ? toISODateLocal(spanish) : null
}

/**
 * Una salida del paquete tal como está escrita en `available_dates` («3 Ene 2027») → 'YYYY-MM-DD', o null si
 * no se lee. Sólo acepta el formato del paquete (no 'YYYY-MM-DD'): es lo que lee la vista del bot.
 */
export function packageDepartureISO(texto: string | null | undefined): string | null {
  const date = texto ? parseSpanishDate(texto) : null
  return date ? toISODateLocal(date) : null
}

/** Salidas del paquete (`available_dates`, «3 Ene 2027») → 'YYYY-MM-DD' sin repetir, en orden. Ignora las ilegibles. */
export function departureISODates(availableDates: ReadonlyArray<string> | null | undefined): string[] {
  const set = new Set<string>()
  for (const d of availableDates ?? []) {
    const iso = packageDepartureISO(d)
    if (iso) set.add(iso)
  }
  return [...set].sort()
}

/** Mes y año de una salida 'YYYY-MM-DD' (para guardar `mes`/`anio` de una tarifa por salida). */
export function monthYearOfDeparture(fecha: string | Date): { mes: number; anio: number } | null {
  const iso = toDepartureISO(fecha)
  const date = iso ? parseISODateLocal(iso) : null
  return date ? { mes: date.getMonth() + 1, anio: date.getFullYear() } : null
}

/**
 * Lista de salidas legible: "3, 10 y 17 Ene 2027", "21 y 28 Feb · 7 y 14 Mar 2027",
 * "27 Dic 2026 · 3 Ene 2027". Ordena, saca repetidas e ignora las ilegibles.
 * Acepta 'YYYY-MM-DD', «3 Ene 2027» o Date.
 */
export function formatDepartureDates(fechas: ReadonlyArray<string | Date>): string {
  const isos = [...new Set(fechas.map(toDepartureISO).filter((d): d is string => d != null))].sort()
  const byMonth: { anio: number; mes: number; days: number[] }[] = []
  for (const iso of isos) {
    const date = parseISODateLocal(iso)!
    const anio = date.getFullYear()
    const mes = date.getMonth() + 1
    const last = byMonth[byMonth.length - 1]
    if (last && last.anio === anio && last.mes === mes) last.days.push(date.getDate())
    else byMonth.push({ anio, mes, days: [date.getDate()] })
  }
  return byMonth
    .map((m, i) => {
      const text = `${joinSpanish(m.days.map(String))} ${MONTHS_SHORT[m.mes - 1]}`
      const lastOfYear = i === byMonth.length - 1 || byMonth[i + 1].anio !== m.anio
      return lastOfYear ? `${text} ${m.anio}` : text
    })
    .join(" · ")
}

/** Lista de meses legible: "Ene 2027", "Ene, Feb y Mar 2027", "Dic 2026 · Ene 2027". */
export function formatMonthList(months: ReadonlyArray<{ mes: number; anio: number }>): string {
  const keys = [...new Set(months.map((m) => m.anio * 100 + m.mes))].sort((a, b) => a - b)
  const byYear: { anio: number; meses: number[] }[] = []
  for (const key of keys) {
    const anio = Math.floor(key / 100)
    const mes = key % 100
    const last = byYear[byYear.length - 1]
    if (last && last.anio === anio) last.meses.push(mes)
    else byYear.push({ anio, meses: [mes] })
  }
  return byYear
    .map((y) => `${joinSpanish(y.meses.map((m) => MONTHS_SHORT[m - 1]))} ${y.anio}`)
    .join(" · ")
}

/** ["3"] → "3"; ["3","10"] → "3 y 10"; ["3","10","17"] → "3, 10 y 17". */
function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

// ---------------------------------------------------------------------------
// Búsqueda de tarifa para una salida — contrato §2.1
// ---------------------------------------------------------------------------

/** Clave de la fila: la salida ('YYYY-MM-DD') si es por salida, o null si es la tarifa del mes. */
function rowDeparture(rate: RateLike): string | null {
  return rate.fecha_salida ? toDepartureISO(rate.fecha_salida) : null
}

export type RateMatchKind = "departure" | "month"

/**
 * Tarifa de un hotel para la salida `fecha`, diciendo de dónde salió:
 * la fila con esa `fecha_salida` ("departure"); si no hay, la del mes/año de la salida con
 * `fecha_salida` null ("month"); si tampoco, null («a consultar»).
 * `fecha`: 'YYYY-MM-DD', «3 Ene 2027» o Date (fecha local).
 */
export function findRateForDeparture<R extends RateLike>(
  rates: ReadonlyArray<R> | null | undefined,
  fecha: string | Date,
): { rate: R; kind: RateMatchKind } | null {
  const iso = toDepartureISO(fecha)
  if (!iso || !rates) return null
  const own = rates.find((r) => rowDeparture(r) === iso)
  if (own) return { rate: own, kind: "departure" }
  const date = parseISODateLocal(iso)!
  const mes = date.getMonth() + 1
  const anio = date.getFullYear()
  const monthly = rates.find((r) => rowDeparture(r) === null && r.mes === mes && r.anio === anio)
  return monthly ? { rate: monthly, kind: "month" } : null
}

/** La tarifa de un hotel para una salida (regla de §2.1), o null si es «a consultar». */
export function rateForDeparture<R extends RateLike>(
  rates: ReadonlyArray<R> | null | undefined,
  fecha: string | Date,
): R | null {
  return findRateForDeparture(rates, fecha)?.rate ?? null
}

// ---------------------------------------------------------------------------
// Agrupado para el panel
// ---------------------------------------------------------------------------

export interface RateGroup<R extends RateLike> {
  /** Clave estable del grupo (valores + moneda + tipo). */
  key: string
  kind: RateMatchKind
  /** Filas del grupo, ordenadas por fecha (o por año/mes en las del mes). */
  rates: R[]
  /** Ids de las filas (si las filas tienen id). Sirve para borrar o reemplazar el grupo entero. */
  ids: number[]
  /** Los seis montos normalizados (0 y undefined → null). */
  values: Record<RateField, number | null>
  /** Moneda en mayúsculas ("USD" si la fila no trae). */
  currency: string
  /** Sólo en "departure": salidas 'YYYY-MM-DD' ordenadas. */
  dates: string[]
  /** Sólo en "month": meses ordenados. */
  months: { mes: number; anio: number }[]
  /** "3, 10 y 17 Ene 2027" en salidas; "Ene y Feb 2027" en meses. */
  label: string
}

export interface GroupedRates<R extends RateLike> {
  /** Tarifas del mes (`fecha_salida` null), agrupadas por montos idénticos. */
  monthly: RateGroup<R>[]
  /** Tarifas por salida, agrupadas por montos idénticos. */
  departures: RateGroup<R>[]
}

function normalizedValues(rate: RateValues): Record<RateField, number | null> {
  const out = {} as Record<RateField, number | null>
  for (const f of RATE_FIELDS) out[f.field] = rateValue(rate[f.field])
  return out
}

function normalizedCurrency(currency: string | null | undefined): string {
  return (currency || "USD").toUpperCase()
}

/**
 * Agrupa las tarifas de UN hotel en filas con montos idénticos (los seis valores y la moneda),
 * separando las del mes de las por salida. Así se lista «3, 10 y 17 Ene 2027 → DBL 720 …» como en
 * el flyer, y se edita o borra el grupo entero. Grupos ordenados por su primera fecha.
 */
export function groupRates<R extends RateLike & { id?: number }>(
  rates: ReadonlyArray<R> | null | undefined,
): GroupedRates<R> {
  const groups = new Map<string, { kind: RateMatchKind; rates: R[]; values: Record<RateField, number | null>; currency: string }>()
  for (const rate of rates ?? []) {
    const values = normalizedValues(rate)
    const currency = normalizedCurrency(rate.currency)
    const kind: RateMatchKind = rowDeparture(rate) ? "departure" : "month"
    const key = `${kind}|${currency}|${RATE_FIELDS.map((f) => values[f.field] ?? "-").join("|")}`
    const group = groups.get(key)
    if (group) group.rates.push(rate)
    else groups.set(key, { kind, rates: [rate], values, currency })
  }

  const monthly: RateGroup<R>[] = []
  const departures: RateGroup<R>[] = []
  for (const [key, g] of groups) {
    if (g.kind === "departure") {
      const sorted = [...g.rates].sort((a, b) => rowDeparture(a)!.localeCompare(rowDeparture(b)!))
      const dates = [...new Set(sorted.map((r) => rowDeparture(r)!))]
      departures.push({
        key,
        kind: "departure",
        rates: sorted,
        ids: idsOf(sorted),
        values: g.values,
        currency: g.currency,
        dates,
        months: [],
        label: formatDepartureDates(dates),
      })
    } else {
      const sorted = [...g.rates].sort((a, b) => a.anio - b.anio || a.mes - b.mes)
      const months = sorted.map((r) => ({ mes: r.mes, anio: r.anio }))
      monthly.push({
        key,
        kind: "month",
        rates: sorted,
        ids: idsOf(sorted),
        values: g.values,
        currency: g.currency,
        dates: [],
        months,
        label: formatMonthList(months),
      })
    }
  }

  monthly.sort((a, b) => a.months[0].anio - b.months[0].anio || a.months[0].mes - b.months[0].mes)
  departures.sort((a, b) => a.dates[0].localeCompare(b.dates[0]))
  return { monthly, departures }
}

function idsOf(rates: ReadonlyArray<{ id?: number }>): number[] {
  return rates.map((r) => r.id).filter((id): id is number => typeof id === "number")
}

// ---------------------------------------------------------------------------
// Cobertura de salidas para el panel
// ---------------------------------------------------------------------------

export interface RateCoverage<R extends RateLike> {
  /** Salidas futuras (hoy incluido) del paquete sin tarifa propia ni del mes, 'YYYY-MM-DD' ordenadas. */
  missing: string[]
  /** Filas por salida cuya fecha ya no es una salida del paquete (pasada o futura). */
  orphans: R[]
}

/**
 * Para avisarle al dueño: qué salidas futuras de un paquete quedan sin tarifa en un hotel, y qué
 * tarifas por salida quedaron huérfanas (su fecha ya no está en `available_dates`).
 * `availableDates` es el texto del paquete («3 Ene 2027»); `now` se puede fijar para tests.
 */
export function rateCoverage<R extends RateLike>(
  availableDates: ReadonlyArray<string> | null | undefined,
  rates: ReadonlyArray<R> | null | undefined,
  now: Date = new Date(),
): RateCoverage<R> {
  const departures = departureISODates(availableDates)
  const today = toISODateLocal(now)
  const missing = departures.filter((iso) => iso >= today && !findRateForDeparture(rates, iso))
  const departureSet = new Set(departures)
  const orphans = (rates ?? []).filter((r) => {
    const iso = rowDeparture(r)
    return iso !== null && !departureSet.has(iso)
  })
  return { missing, orphans }
}
