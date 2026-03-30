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
