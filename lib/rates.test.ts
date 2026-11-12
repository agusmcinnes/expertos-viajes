import { describe, it, expect } from "vitest"
import {
  rateYearOptions,
  suggestRateYear,
  formatPrice,
  RATE_FIELDS,
  hasRate,
  rateValue,
  parseRateInput,
  isEmptyRate,
  visibleRateFields,
  toDepartureISO,
  departureISODates,
  monthYearOfDeparture,
  formatDepartureDates,
  formatMonthList,
  findRateForDeparture,
  rateForDeparture,
  groupRates,
  rateCoverage,
  type RateLike,
} from "./rates"

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

// ---------------------------------------------------------------------------
// Datos reales: paquete #190 BALNEARIO CAMBORIU (contrato §1)
// ---------------------------------------------------------------------------

type Row = RateLike & { id: number; accommodation_id: number }

const CAMBORIU_DATES = [
  "3 Ene 2027", "10 Ene 2027", "17 Ene 2027", "24 Ene 2027", "31 Ene 2027",
  "7 Feb 2027", "14 Feb 2027", "21 Feb 2027", "28 Feb 2027",
  "7 Mar 2027", "14 Mar 2027",
]

let nextId = 1
function monthRow(accommodation_id: number, mes: number, dbl: number, tpl: number, cpl: number, menor: number | null): Row {
  return {
    id: nextId++, accommodation_id, mes, anio: 2027, fecha_salida: null,
    tarifa_dbl: dbl, tarifa_tpl: tpl, tarifa_cpl: cpl, tarifa_menor: menor ?? 0, currency: "USD",
  }
}
function departureRows(
  accommodation_id: number,
  fechas: string[],
  dbl: number, tpl: number, cpl: number, menor: number | null,
): Row[] {
  return fechas.map((fecha_salida) => ({
    id: nextId++, accommodation_id, fecha_salida,
    mes: Number(fecha_salida.slice(5, 7)), anio: Number(fecha_salida.slice(0, 4)),
    tarifa_sgl: null, tarifa_dbl: dbl, tarifa_tpl: tpl, tarifa_cpl: cpl, tarifa_qpl: null, tarifa_menor: menor,
    currency: "USD",
  }))
}

// Lo que hay hoy en producción para Tropikalya Prime (1736): sólo tarifas del mes
const PRIME_MONTHLY: Row[] = [
  monthRow(1736, 1, 720, 699, 682, 489),
  monthRow(1736, 2, 655, 640, 620, 460),
  monthRow(1736, 3, 577, 568, 550, 420),
]

// El flyer de Prime cargado por salida
const PRIME_FLYER: Row[] = [
  ...departureRows(1736, ["2027-01-03", "2027-01-10", "2027-01-17"], 720, 699, 682, 489),
  ...departureRows(1736, ["2027-01-24", "2027-01-31"], 685, 665, 647, 472),
  ...departureRows(1736, ["2027-02-07", "2027-02-14"], 655, 640, 620, 460),
  ...departureRows(1736, ["2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14"], 577, 568, 550, 420),
]

// Bhally (1738): sin tarifa de menor
const BHALLY_FLYER: Row[] = [
  ...departureRows(1738, ["2027-01-03", "2027-01-10", "2027-01-17", "2027-01-24"], 740, 730, 710, null),
  ...departureRows(1738, ["2027-01-31", "2027-02-07", "2027-02-14", "2027-02-21"], 670, 650, 630, null),
  ...departureRows(1738, ["2027-02-28", "2027-03-07", "2027-03-14"], 620, 595, 570, null),
]

describe("RATE_FIELDS", () => {
  it("orden canónico Single, Doble, Triple, Cuádruple, Quíntuple, Menor", () => {
    expect(RATE_FIELDS.map((f) => f.label)).toEqual(["Single", "Doble", "Triple", "Cuádruple", "Quíntuple", "Menor"])
    expect(RATE_FIELDS.map((f) => f.short)).toEqual(["SGL", "DBL", "TPL", "CPL", "QPL", "MENOR"])
    expect(RATE_FIELDS.map((f) => f.field)).toEqual([
      "tarifa_sgl", "tarifa_dbl", "tarifa_tpl", "tarifa_cpl", "tarifa_qpl", "tarifa_menor",
    ])
  })
})

describe("hasRate / rateValue / parseRateInput / isEmptyRate", () => {
  it("null, undefined, 0 y NaN son sin tarifa", () => {
    expect(hasRate(null)).toBe(false)
    expect(hasRate(undefined)).toBe(false)
    expect(hasRate(0)).toBe(false)
    expect(hasRate(Number.NaN)).toBe(false)
    expect(hasRate(720)).toBe(true)
  })
  it("rateValue normaliza a null", () => {
    expect(rateValue(0)).toBeNull()
    expect(rateValue(undefined)).toBeNull()
    expect(rateValue(489)).toBe(489)
  })
  it("parseRateInput lee el input del panel", () => {
    expect(parseRateInput("")).toBeNull()
    expect(parseRateInput("  ")).toBeNull()
    expect(parseRateInput("0")).toBeNull()
    expect(parseRateInput("abc")).toBeNull()
    expect(parseRateInput(" 720 ")).toBe(720)
    expect(parseRateInput("720,5")).toBe(720.5)
  })
  it("parseRateInput: el punto o la coma con tres dígitos son miles", () => {
    expect(parseRateInput("850.000")).toBe(850000)
    expect(parseRateInput("1.250.000")).toBe(1250000)
    expect(parseRateInput("1.250.000,50")).toBe(1250000.5)
    expect(parseRateInput("1,250")).toBe(1250)
    expect(parseRateInput("1,250.50")).toBe(1250.5)
    expect(parseRateInput("850 000")).toBe(850000)
    expect(parseRateInput("720.50")).toBe(720.5)
    expect(parseRateInput("720.5")).toBe(720.5)
    expect(parseRateInput("720.")).toBe(720)
  })
  it("parseRateInput: lo que no se entiende no se guarda como otro número", () => {
    for (const s of ["720abc", "USD 720", "-720", "1.2.3", "12.50,3", "0.000"]) {
      expect(parseRateInput(s)).toBeNull()
    }
  })
  it("isEmptyRate", () => {
    expect(isEmptyRate({ tarifa_dbl: 0, tarifa_menor: null })).toBe(true)
    expect(isEmptyRate({ tarifa_qpl: 900 })).toBe(false)
  })
})

describe("visibleRateFields", () => {
  it("sin single ni quíntuple: Doble, Triple, Cuádruple, Menor", () => {
    expect(visibleRateFields(PRIME_FLYER).map((f) => f.short)).toEqual(["DBL", "TPL", "CPL", "MENOR"])
  })
  it("Menor se muestra siempre aunque nadie la tenga", () => {
    expect(visibleRateFields(BHALLY_FLYER).map((f) => f.short)).toEqual(["DBL", "TPL", "CPL", "MENOR"])
    expect(visibleRateFields([]).map((f) => f.short)).toEqual(["DBL", "TPL", "CPL", "MENOR"])
  })
  it("suma Single o Quíntuple si alguna tarifa la tiene, en orden canónico", () => {
    const rates = [{ tarifa_dbl: 700 }, { tarifa_qpl: 900, tarifa_sgl: 0 }, null, undefined]
    expect(visibleRateFields(rates).map((f) => f.short)).toEqual(["DBL", "TPL", "CPL", "QPL", "MENOR"])
    expect(visibleRateFields([{ tarifa_sgl: 1200 }, { tarifa_qpl: 900 }]).map((f) => f.short)).toEqual([
      "SGL", "DBL", "TPL", "CPL", "QPL", "MENOR",
    ])
  })
})

describe("fechas", () => {
  it("toDepartureISO acepta ISO, timestamp, «3 Ene 2027» y Date sin correrse de día", () => {
    expect(toDepartureISO("2027-01-03")).toBe("2027-01-03")
    expect(toDepartureISO("2027-01-03T00:00:00+00:00")).toBe("2027-01-03")
    expect(toDepartureISO("3 Ene 2027")).toBe("2027-01-03")
    expect(toDepartureISO(new Date(2027, 0, 3))).toBe("2027-01-03")
    expect(toDepartureISO(new Date(2027, 0, 3, 23, 30))).toBe("2027-01-03")
    expect(toDepartureISO("cualquier cosa")).toBeNull()
    expect(toDepartureISO(new Date(Number.NaN))).toBeNull()
    expect(toDepartureISO(null)).toBeNull()
  })
  it("departureISODates ordena, saca repetidas e ignora ilegibles", () => {
    expect(departureISODates(["10 Ene 2027", "3 Ene 2027", "3 Ene 2027", "a definir"])).toEqual(["2027-01-03", "2027-01-10"])
    expect(departureISODates(null)).toEqual([])
    // Sólo cuenta como salida lo que también lee la vista del bot.
    expect(departureISODates(["24 Ene 2027 (últimos lugares)", "31 Feb 2027", "2027-01-03", "3 Ene 2027"])).toEqual(["2027-01-03"])
    expect(departureISODates(CAMBORIU_DATES)).toHaveLength(11)
  })
  it("monthYearOfDeparture", () => {
    expect(monthYearOfDeparture("2027-03-14")).toEqual({ mes: 3, anio: 2027 })
    expect(monthYearOfDeparture("31 Ene 2027")).toEqual({ mes: 1, anio: 2027 })
    expect(monthYearOfDeparture("x")).toBeNull()
  })
})

describe("formatDepartureDates", () => {
  it("un mes", () => {
    expect(formatDepartureDates(["2027-01-03", "2027-01-10", "2027-01-17"])).toBe("3, 10 y 17 Ene 2027")
    expect(formatDepartureDates(["2027-01-24", "2027-01-31"])).toBe("24 y 31 Ene 2027")
    expect(formatDepartureDates(["2027-01-03"])).toBe("3 Ene 2027")
  })
  it("varios meses del mismo año", () => {
    expect(formatDepartureDates(["2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14"])).toBe("21 y 28 Feb · 7 y 14 Mar 2027")
  })
  it("cambio de año", () => {
    expect(formatDepartureDates(["2027-01-03", "2026-12-27"])).toBe("27 Dic 2026 · 3 Ene 2027")
  })
  it("ordena, saca repetidas, mezcla formatos e ignora ilegibles", () => {
    expect(formatDepartureDates(["10 Ene 2027", "2027-01-03", new Date(2027, 0, 3), "nada"])).toBe("3 y 10 Ene 2027")
    expect(formatDepartureDates([])).toBe("")
  })
})

describe("formatMonthList", () => {
  it("meses de uno o varios años", () => {
    expect(formatMonthList([{ mes: 1, anio: 2027 }])).toBe("Ene 2027")
    expect(formatMonthList([{ mes: 3, anio: 2027 }, { mes: 1, anio: 2027 }, { mes: 2, anio: 2027 }])).toBe("Ene, Feb y Mar 2027")
    expect(formatMonthList([{ mes: 1, anio: 2027 }, { mes: 12, anio: 2026 }])).toBe("Dic 2026 · Ene 2027")
  })
})

describe("rateForDeparture (regla §2.1)", () => {
  it("hoy, sólo con tarifas del mes, el 24 Ene toma la de enero (el error que reportó el cliente)", () => {
    const match = findRateForDeparture(PRIME_MONTHLY, "2027-01-24")
    expect(match?.kind).toBe("month")
    expect(match?.rate.tarifa_dbl).toBe(720)
  })

  it("con fila propia, gana la de la salida", () => {
    const rates = [...PRIME_MONTHLY, ...departureRows(1736, ["2027-01-24", "2027-01-31"], 685, 665, 647, 472)]
    expect(findRateForDeparture(rates, "2027-01-24")).toMatchObject({ kind: "departure", rate: { tarifa_dbl: 685 } })
    expect(rateForDeparture(rates, "31 Ene 2027")?.tarifa_dbl).toBe(685)
    // Las otras salidas de enero siguen con la del mes
    expect(findRateForDeparture(rates, "2027-01-17")).toMatchObject({ kind: "month", rate: { tarifa_dbl: 720 } })
  })

  it("con el flyer completo, cada salida tiene su tarifa", () => {
    const rates = [...PRIME_MONTHLY, ...PRIME_FLYER]
    expect(rateForDeparture(rates, "2027-01-03")?.tarifa_dbl).toBe(720)
    expect(rateForDeparture(rates, "2027-01-24")?.tarifa_dbl).toBe(685)
    expect(rateForDeparture(rates, "2027-02-14")?.tarifa_dbl).toBe(655)
    expect(rateForDeparture(rates, "2027-02-21")?.tarifa_dbl).toBe(577)
    expect(rateForDeparture(rates, new Date(2027, 2, 14))?.tarifa_menor).toBe(420)
  })

  it("sin fila propia ni del mes: a consultar (null)", () => {
    expect(rateForDeparture(PRIME_MONTHLY, "2027-04-04")).toBeNull()
    // Una fila por salida de otro día del mismo mes no sirve de respaldo
    expect(rateForDeparture(BHALLY_FLYER, "2027-01-05")).toBeNull()
  })

  it("fecha ilegible o sin tarifas: null", () => {
    expect(rateForDeparture(PRIME_MONTHLY, "a definir")).toBeNull()
    expect(rateForDeparture(null, "2027-01-03")).toBeNull()
    expect(rateForDeparture([], "2027-01-03")).toBeNull()
  })

  it("filas viejas sin fecha_salida (undefined) son tarifas del mes", () => {
    const old = [{ mes: 1, anio: 2027, tarifa_dbl: 720 }] as RateLike[]
    expect(findRateForDeparture(old, "2027-01-10")?.kind).toBe("month")
  })
})

describe("groupRates", () => {
  it("agrupa el flyer de Prime como lo publica la agencia", () => {
    const { monthly, departures } = groupRates([...PRIME_MONTHLY, ...PRIME_FLYER])
    expect(departures.map((g) => g.label)).toEqual([
      "3, 10 y 17 Ene 2027",
      "24 y 31 Ene 2027",
      "7 y 14 Feb 2027",
      "21 y 28 Feb · 7 y 14 Mar 2027",
    ])
    expect(departures[1].values).toEqual({
      tarifa_sgl: null, tarifa_dbl: 685, tarifa_tpl: 665, tarifa_cpl: 647, tarifa_qpl: null, tarifa_menor: 472,
    })
    expect(departures[3].dates).toEqual(["2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14"])
    expect(departures[3].ids).toHaveLength(4)
    expect(departures[0].kind).toBe("departure")
    expect(departures[0].currency).toBe("USD")

    // Las tres del mes tienen montos distintos: tres grupos, ordenados
    expect(monthly.map((g) => g.label)).toEqual(["Ene 2027", "Feb 2027", "Mar 2027"])
    expect(monthly[0].kind).toBe("month")
    expect(monthly[0].dates).toEqual([])
  })

  it("Bhally: grupos que cruzan meses y sin menor", () => {
    const { departures } = groupRates(BHALLY_FLYER)
    expect(departures.map((g) => g.label)).toEqual([
      "3, 10, 17 y 24 Ene 2027",
      "31 Ene · 7, 14 y 21 Feb 2027",
      "28 Feb · 7 y 14 Mar 2027",
    ])
    expect(departures.every((g) => g.values.tarifa_menor === null)).toBe(true)
  })

  it("0 y null valen lo mismo; la moneda separa grupos", () => {
    const rates: Row[] = [
      { id: 1, accommodation_id: 1, mes: 1, anio: 2027, fecha_salida: "2027-01-10", tarifa_dbl: 700, tarifa_menor: 0, currency: "usd" },
      { id: 2, accommodation_id: 1, mes: 1, anio: 2027, fecha_salida: "2027-01-03", tarifa_dbl: 700, tarifa_menor: null, currency: null },
      { id: 3, accommodation_id: 1, mes: 1, anio: 2027, fecha_salida: "2027-01-17", tarifa_dbl: 700, currency: "ARS" },
    ]
    const { departures } = groupRates(rates)
    expect(departures).toHaveLength(2)
    expect(departures[0]).toMatchObject({ currency: "USD", dates: ["2027-01-03", "2027-01-10"], ids: [2, 1] })
    expect(departures[1]).toMatchObject({ currency: "ARS", dates: ["2027-01-17"] })
  })

  it("tarifas del mes iguales se agrupan", () => {
    const { monthly } = groupRates([monthRow(1, 2, 500, 480, 460, 300), monthRow(1, 1, 500, 480, 460, 300)])
    expect(monthly).toHaveLength(1)
    expect(monthly[0].label).toBe("Ene y Feb 2027")
    expect(monthly[0].months).toEqual([{ mes: 1, anio: 2027 }, { mes: 2, anio: 2027 }])
  })

  it("lista vacía", () => {
    expect(groupRates(null)).toEqual({ monthly: [], departures: [] })
  })
})

describe("rateCoverage", () => {
  const before = new Date(2026, 10, 12)

  it("con sólo tarifas del mes (hoy), ninguna salida queda sin tarifa", () => {
    expect(rateCoverage(CAMBORIU_DATES, PRIME_MONTHLY, before)).toEqual({ missing: [], orphans: [] })
  })

  it("con el flyer por salida completo, tampoco", () => {
    expect(rateCoverage(CAMBORIU_DATES, BHALLY_FLYER, before)).toEqual({ missing: [], orphans: [] })
  })

  it("salidas futuras sin tarifa propia ni del mes", () => {
    const partial = BHALLY_FLYER.filter((r) => r.fecha_salida! < "2027-02-28")
    expect(rateCoverage(CAMBORIU_DATES, partial, before).missing).toEqual(["2027-02-28", "2027-03-07", "2027-03-14"])
    // Con la tarifa de marzo como respaldo, sólo queda el 28 Feb
    const withMarch = [...partial, monthRow(1738, 3, 620, 595, 570, null)]
    expect(rateCoverage(CAMBORIU_DATES, withMarch, before).missing).toEqual(["2027-02-28"])
  })

  it("las salidas pasadas no cuentan como faltantes (hoy sí)", () => {
    expect(rateCoverage(CAMBORIU_DATES, [], new Date(2027, 1, 7, 15)).missing).toEqual([
      "2027-02-07", "2027-02-14", "2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14",
    ])
  })

  it("filas por salida huérfanas: su fecha ya no es una salida del paquete", () => {
    const orphan = departureRows(1736, ["2027-03-21"], 577, 568, 550, 420)
    const result = rateCoverage(CAMBORIU_DATES, [...PRIME_MONTHLY, ...PRIME_FLYER, ...orphan], before)
    expect(result.orphans).toEqual(orphan)
    expect(result.missing).toEqual([])
  })

  it("sin salidas cargadas: todas las filas por salida son huérfanas, las del mes no", () => {
    const result = rateCoverage(null, [...PRIME_MONTHLY, ...PRIME_FLYER], before)
    expect(result.missing).toEqual([])
    expect(result.orphans).toHaveLength(PRIME_FLYER.length)
  })
})
