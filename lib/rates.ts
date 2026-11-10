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
