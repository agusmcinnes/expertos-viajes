import { describe, it, expect, vi, afterEach } from "vitest"
import {
  parseSpanishDate,
  parseISODateLocal,
  toISODateLocal,
  spanishDateToISO,
  filterFutureDates,
  sortDatesChronologically,
  sortPackagesForDisplay,
  uniqueById,
} from "./date-utils"

afterEach(() => vi.useRealTimers())

function relojFijo() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 10, 23, 30))
}

describe("parseSpanishDate", () => {
  it("parsea un día con mes capitalizado", () => {
    const d = parseSpanishDate("3 Ene 2027")!
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(3)
  })

  it("acepta el mes en minúscula", () => {
    const d = parseSpanishDate("3 ene 2027")!
    expect(d).not.toBeNull()
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(3)
  })

  it("acepta espacios dobles", () => {
    expect(parseSpanishDate("3  Ene  2027")).not.toBeNull()
  })

  it("interpreta años de 2 dígitos", () => {
    expect(parseSpanishDate("3 Ene 27")?.getFullYear()).toBe(2027)
    expect(parseSpanishDate("3 Ene 99")?.getFullYear()).toBe(1999)
  })

  it("devuelve null con entradas inválidas", () => {
    for (const s of ["3 Enero 2027", "3 Ene", "hola", ""]) {
      expect(parseSpanishDate(s)).toBeNull()
    }
  })
})

describe("parseISODateLocal", () => {
  it("devuelve el día local, no el anterior (regresión del 10/11)", () => {
    const d = parseISODateLocal("2027-01-03")!
    expect(d.getDate()).toBe(3)
    expect(d.getDay()).toBe(0) // domingo
    // por esto no se usa new Date('YYYY-MM-DD') en Argentina
    expect(new Date("2027-01-03").getDate()).toBe(2)
  })

  it("devuelve null con entradas inválidas", () => {
    expect(parseISODateLocal(null)).toBeNull()
    expect(parseISODateLocal("")).toBeNull()
    expect(parseISODateLocal("03/01/2027")).toBeNull()
  })
})

describe("toISODateLocal", () => {
  it("devuelve la fecha local", () => {
    expect(toISODateLocal(new Date(2027, 0, 3))).toBe("2027-01-03")
  })

  it("a las 23:30 locales sigue siendo el mismo día (toISOString daría el 4)", () => {
    expect(toISODateLocal(new Date(2027, 0, 3, 23, 30))).toBe("2027-01-03")
  })
})

describe("spanishDateToISO", () => {
  it("convierte una fecha en español a ISO", () => {
    expect(spanishDateToISO("10 Ene 2027")).toBe("2027-01-10")
  })

  it("devuelve null con basura", () => {
    expect(spanishDateToISO("basura")).toBeNull()
  })
})

describe("filterFutureDates", () => {
  it("deja las de hoy en adelante y descarta lo ilegible", () => {
    relojFijo()
    expect(
      filterFutureDates(["9 Nov 2026", "10 Nov 2026", "3 Ene 2027", "basura"]),
    ).toEqual(["10 Nov 2026", "3 Ene 2027"])
  })

  it("con null devuelve []", () => {
    expect(filterFutureDates(null)).toEqual([])
  })
})

describe("sortDatesChronologically", () => {
  it("ordena de la más cercana a la más lejana", () => {
    expect(
      sortDatesChronologically(["10 Ene 2027", "3 Ene 2027", "1 Dic 2026"]),
    ).toEqual(["1 Dic 2026", "3 Ene 2027", "10 Ene 2027"])
  })
})

describe("sortPackagesForDisplay", () => {
  it("ordena por prioridad, próxima salida y, sin salida futura, el más nuevo primero", () => {
    relojFijo()
    const a = { priority_order: 0, available_dates: ["10 Ene 2027"], created_at: "2026-01-01" }
    const b = { priority_order: 5, available_dates: ["10 Mar 2027"], created_at: "2026-01-01" }
    const c = { priority_order: 0, available_dates: ["3 Ene 2027"], created_at: "2026-01-01" }
    const d = { priority_order: 0, available_dates: ["1 Ene 2020"], created_at: "2026-06-01" }
    const e = { priority_order: 0, available_dates: null, created_at: "2026-05-01" }
    expect(sortPackagesForDisplay([a, b, c, d, e])).toEqual([b, c, a, d, e])
  })

  it("con null devuelve []", () => {
    expect(sortPackagesForDisplay(null)).toEqual([])
  })
})

describe("uniqueById", () => {
  it("quita repetidos conservando el primero", () => {
    expect(uniqueById([{ id: 1, n: "a" }, { id: 2, n: "b" }, { id: 1, n: "c" }])).toEqual([
      { id: 1, n: "a" },
      { id: 2, n: "b" },
    ])
  })
})
