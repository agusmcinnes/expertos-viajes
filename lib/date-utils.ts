const SPANISH_MONTHS: Record<string, number> = {
  'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11,
  'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
}

export function parseSpanishDate(dateStr: string): Date | null {
  const parts = dateStr.trim().split(/\s+/)
  if (parts.length < 3) return null

  const day = parseInt(parts[0])
  const month = SPANISH_MONTHS[parts[1]]
  let year = parseInt(parts[2])

  if (isNaN(day) || month === undefined || isNaN(year)) return null
  if (year < 100) year = year <= 50 ? 2000 + year : 1900 + year

  return new Date(year, month, day)
}

export function filterFutureDates(dates: string[] | null): string[] {
  if (!dates || dates.length === 0) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return dates.filter(dateStr => {
    const parsed = parseSpanishDate(dateStr)
    return parsed !== null && parsed >= today
  })
}

export function sortDatesChronologically(dates: string[]): string[] {
  return [...dates].sort((a, b) => {
    const dateA = parseSpanishDate(a)
    const dateB = parseSpanishDate(b)
    if (!dateA || !dateB) return 0
    return dateA.getTime() - dateB.getTime()
  })
}

export function getNextDeparture(dates: string[]): string | null {
  if (dates.length === 0) return null
  const sorted = sortDatesChronologically(dates)
  return sorted[0] ?? null
}

export function getDaysUntil(dateStr: string): number | null {
  const parsed = parseSpanishDate(dateStr)
  if (!parsed) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** Timestamp de la próxima salida (hoy o después), o null si no tiene ninguna futura legible. */
export function getNextDepartureTime(dates: string[] | null | undefined): number | null {
  const future = filterFutureDates(dates ?? null)
  let min: number | null = null
  for (const d of future) {
    const t = parseSpanishDate(d)!.getTime()
    if (min === null || t < min) min = t
  }
  return min
}

/**
 * Orden de los listados públicos:
 * 1. Prioridad manual (mayor primero) — para destacar un paquete a mano.
 * 2. Próxima salida, la más cercana primero.
 * 3. Sin salidas futuras al final, el más nuevo primero.
 */
export function sortPackagesForDisplay<
  T extends { priority_order?: number | null; available_dates?: string[] | null; created_at?: string }
>(packages: T[] | null | undefined): T[] {
  if (!packages) return []
  const next = new Map(packages.map((p) => [p, getNextDepartureTime(p.available_dates)]))
  return [...packages].sort((a, b) => {
    const prio = (b.priority_order ?? 0) - (a.priority_order ?? 0)
    if (prio !== 0) return prio
    const na = next.get(a) ?? null
    const nb = next.get(b) ?? null
    if (na !== nb) {
      if (na === null) return 1
      if (nb === null) return -1
      return na - nb
    }
    return (b.created_at ?? "").localeCompare(a.created_at ?? "")
  })
}
