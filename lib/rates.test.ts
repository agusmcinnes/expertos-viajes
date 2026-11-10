import { describe, it, expect } from "vitest"
import { rateYearOptions, suggestRateYear, formatPrice } from "./rates"

const now = new Date(2026, 10, 10)

describe("rateYearOptions", () => {
  it("devuelve anterior, actual y dos siguientes", () => {
    expect(rateYearOptions(now)).toEqual([2025, 2026, 2027, 2028])
  })
  it("agrega el año extra y ordena", () => {
    expect(rateYearOptions(now, 2024)).toEqual([2024, 2025, 2026, 2027, 2028])
  })
})

describe("suggestRateYear", () => {
  it("mes pasado va al año que viene", () => {
    expect(suggestRateYear(1, now)).toBe(2027)
  })
  it("mes actual o futuro es este año", () => {
    expect(suggestRateYear(11, now)).toBe(2026)
    expect(suggestRateYear(12, now)).toBe(2026)
  })
})

describe("formatPrice", () => {
  it("null sin monto", () => {
    expect(formatPrice(0, "USD")).toBeNull()
  })
  it("USD por defecto", () => {
    expect(formatPrice(720, null)).toBe("USD 720")
  })
  it("ARS con separador de miles", () => {
    expect(formatPrice(850000, "ars")).toBe("ARS 850.000")
  })
})
