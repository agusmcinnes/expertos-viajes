import { describe, it, expect } from "vitest"
import { buildDepartureTable, lowestPrice, type Departure, type HotelWithRates } from "./departure-rates-data"
import type { RateLike } from "@/lib/rates"

const now = new Date(2026, 10, 12)

type Row = RateLike & { id: number }
type Hotel = { id: number; name: string; rates: Row[] }

let nextId = 1
const monthRow = (mes: number, anio: number, dbl: number | null, tpl: number | null, cpl: number | null, menor: number | null, extra: Partial<Row> = {}): Row => ({
  id: nextId++, mes, anio, fecha_salida: null, tarifa_dbl: dbl, tarifa_tpl: tpl, tarifa_cpl: cpl, tarifa_menor: menor, currency: "USD", ...extra,
})
const depRow = (iso: string, dbl: number | null, tpl: number | null, cpl: number | null, menor: number | null, extra: Partial<Row> = {}): Row => {
  const [y, m] = iso.split("-").map(Number)
  return { id: nextId++, mes: m, anio: y, fecha_salida: iso, tarifa_dbl: dbl, tarifa_tpl: tpl, tarifa_cpl: cpl, tarifa_menor: menor, currency: "USD", ...extra }
}

const CAMBORIU_DATES = [
  "3 Ene 2027", "10 Ene 2027", "17 Ene 2027", "24 Ene 2027", "31 Ene 2027",
  "7 Feb 2027", "14 Feb 2027", "21 Feb 2027", "28 Feb 2027", "7 Mar 2027", "14 Mar 2027",
]

// Lo que hay hoy en la base: una fila por mes y hotel
const monthOnlyHotels = (): Hotel[] => [
  { id: 1736, name: "Tropikalya Prime", rates: [monthRow(1, 2027, 720, 699, 682, 489), monthRow(2, 2027, 655, 640, 620, 460), monthRow(3, 2027, 577, 568, 550, 420)] },
  { id: 1737, name: "Tropikalya Gold", rates: [monthRow(1, 2027, 735, 720, 699, 498), monthRow(2, 2027, 675, 655, 640, 467), monthRow(3, 2027, 594, 580, 570, 428)] },
  { id: 1738, name: "Bhally", rates: [monthRow(1, 2027, 740, 730, 710, 0), monthRow(2, 2027, 670, 650, 630, 0), monthRow(3, 2027, 620, 595, 570, 0)] },
]

// El flyer completo cargado por salida (sin filas del mes)
const flyerHotels = (): Hotel[] => {
  const rows = (groups: [string[], [number, number, number, number | null]][]) =>
    groups.flatMap(([dates, [d, t, c, m]]) => dates.map((iso) => depRow(iso, d, t, c, m)))
  return [
    { id: 1736, name: "Tropikalya Prime", rates: rows([
      [["2027-01-03", "2027-01-10", "2027-01-17"], [720, 699, 682, 489]],
      [["2027-01-24", "2027-01-31"], [685, 665, 647, 472]],
      [["2027-02-07", "2027-02-14"], [655, 640, 620, 460]],
      [["2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14"], [577, 568, 550, 420]],
    ]) },
    { id: 1737, name: "Tropikalya Gold", rates: rows([
      [["2027-01-03", "2027-01-10", "2027-01-17"], [735, 720, 699, 498]],
      [["2027-01-24", "2027-01-31"], [699, 682, 665, 480]],
      [["2027-02-07", "2027-02-14"], [675, 655, 640, 467]],
      [["2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14"], [594, 580, 570, 428]],
    ]) },
    { id: 1738, name: "Bhally", rates: rows([
      [["2027-01-03", "2027-01-10", "2027-01-17", "2027-01-24"], [740, 730, 710, null]],
      [["2027-01-31", "2027-02-07", "2027-02-14", "2027-02-21"], [670, 650, 630, null]],
      [["2027-02-28", "2027-03-07", "2027-03-14"], [620, 595, 570, null]],
    ]) },
  ]
}

const tab = <A extends HotelWithRates>(deps: Departure<A>[], key: string) => {
  const d = deps.find((x) => x.key === key)
  if (!d) throw new Error(`no hay pestaña ${key}`)
  return d
}
const dblByHotel = (d: Departure<Hotel>) => Object.fromEntries(d.hotels.map((h) => [h.accommodation.name, h.rate.tarifa_dbl]))

describe("buildDepartureTable — flyer de Camboriú por salida", () => {
  const { departures, columns } = buildDepartureTable(flyerHotels(), CAMBORIU_DATES, now)

  it("una pestaña por salida, en orden", () => {
    expect(departures.map((d) => d.key)).toEqual([
      "2027-01-03", "2027-01-10", "2027-01-17", "2027-01-24", "2027-01-31",
      "2027-02-07", "2027-02-14", "2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14",
    ])
    expect(tab(departures, "2027-01-24").shortLabel).toBe("24 Ene")
    expect(tab(departures, "2027-01-24").longLabel).toBe("24 de enero de 2027")
  })

  it("24 Ene: Prime 685 (no 720), y el «desde» sale de la tarifa efectiva", () => {
    const d = tab(departures, "2027-01-24")
    expect(dblByHotel(d)).toEqual({ "Tropikalya Prime": 685, "Tropikalya Gold": 699, Bhally: 740 })
    expect(lowestPrice(d)).toBe("USD 685")
  })

  it("31 Ene: Bhally ya está en 670 y el orden cambia", () => {
    const d = tab(departures, "2027-01-31")
    expect(d.hotels.map((h) => h.accommodation.name)).toEqual(["Bhally", "Tropikalya Prime", "Tropikalya Gold"])
    expect(lowestPrice(d)).toBe("USD 670")
  })

  it("21 Feb: Prime 577 (no 655)", () => {
    expect(dblByHotel(tab(departures, "2027-02-21"))["Tropikalya Prime"]).toBe(577)
  })

  it("columnas: Doble, Triple, Cuádruple y Menor", () => {
    expect(columns.map((c) => c.label)).toEqual(["Doble", "Triple", "Cuádruple", "Menor"])
  })
})

describe("buildDepartureTable — sólo filas del mes (como hoy)", () => {
  const { departures, columns } = buildDepartureTable(monthOnlyHotels(), CAMBORIU_DATES, now)

  it("cada salida toma la tarifa de su mes", () => {
    expect(dblByHotel(tab(departures, "2027-01-24"))).toEqual({ "Tropikalya Prime": 720, "Tropikalya Gold": 735, Bhally: 740 })
    expect(dblByHotel(tab(departures, "2027-02-21"))["Tropikalya Prime"]).toBe(655)
    expect(lowestPrice(tab(departures, "2027-01-03"))).toBe("USD 720")
    expect(columns.map((c) => c.field)).toEqual(["tarifa_dbl", "tarifa_tpl", "tarifa_cpl", "tarifa_menor"])
  })
})

describe("buildDepartureTable — mixto (sólo 24 y 31 Ene con fila propia)", () => {
  const hotels = monthOnlyHotels()
  hotels[0].rates.push(depRow("2027-01-24", 685, 665, 647, 472), depRow("2027-01-31", 685, 665, 647, 472))
  const { departures } = buildDepartureTable(hotels, CAMBORIU_DATES, now)

  it("24 y 31 Ene usan la fila propia; el resto, la del mes", () => {
    expect(dblByHotel(tab(departures, "2027-01-17"))["Tropikalya Prime"]).toBe(720)
    expect(dblByHotel(tab(departures, "2027-01-24"))["Tropikalya Prime"]).toBe(685)
    expect(dblByHotel(tab(departures, "2027-01-31"))["Tropikalya Prime"]).toBe(685)
    expect(dblByHotel(tab(departures, "2027-02-07"))["Tropikalya Prime"]).toBe(655)
    // Los otros hoteles siguen con la del mes
    expect(dblByHotel(tab(departures, "2027-01-24"))["Tropikalya Gold"]).toBe(735)
  })
})

describe("buildDepartureTable — hotel sin tarifa para una salida", () => {
  it("no aparece en esa salida; salida sin hoteles queda vacía («a consultar»)", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "A", rates: [monthRow(1, 2027, 500, 480, 460, 300)] },
      { id: 2, name: "B", rates: [monthRow(2, 2027, 600, 580, 560, 350)] },
    ]
    const { departures } = buildDepartureTable(hotels, ["10 Ene 2027", "7 Feb 2027", "7 Mar 2027"], now)
    expect(tab(departures, "2027-01-10").hotels.map((h) => h.accommodation.name)).toEqual(["A"])
    expect(tab(departures, "2027-02-07").hotels.map((h) => h.accommodation.name)).toEqual(["B"])
    expect(tab(departures, "2027-03-07").hotels).toEqual([])
    expect(lowestPrice(tab(departures, "2027-03-07"))).toBeNull()
  })

  it("Doble en 0 no cuenta para el «desde» y va al final", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "SinDoble", rates: [monthRow(1, 2027, 0, 480, 460, 300)] },
      { id: 2, name: "ConDoble", rates: [monthRow(1, 2027, 900, 880, 860, 400)] },
    ]
    const d = buildDepartureTable(hotels, ["10 Ene 2027"], now).departures[0]
    expect(d.hotels.map((h) => h.accommodation.name)).toEqual(["ConDoble", "SinDoble"])
    expect(lowestPrice(d)).toBe("USD 900")
  })
})

describe("buildDepartureTable — salidas pasadas", () => {
  it("las salidas pasadas no aparecen", () => {
    const { departures } = buildDepartureTable(monthOnlyHotels(), ["3 Nov 2026", "24 Ene 2027"], now)
    expect(departures.map((d) => d.key)).toEqual(["2027-01-24"])
  })
  it("una salida de hoy sí, con 0 días", () => {
    const { departures } = buildDepartureTable([], ["12 Nov 2026"], now)
    expect(departures[0].daysUntil).toBe(0)
  })
})

describe("buildDepartureTable — paquete sin fechas de salida", () => {
  it("agrupa por los meses futuros con tarifa del mes", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "A", rates: [monthRow(10, 2026, 400, 0, 0, 0), monthRow(11, 2026, 450, 430, 410, 300), monthRow(1, 2027, 500, 480, 460, 300)] },
      { id: 2, name: "B", rates: [monthRow(1, 2027, 480, 470, 450, 290)] },
    ]
    const { departures } = buildDepartureTable(hotels, null, now)
    expect(departures.map((d) => d.key)).toEqual(["2026-11", "2027-1"])
    expect(departures.map((d) => d.shortLabel)).toEqual(["Nov 26", "Ene 27"])
    expect(tab(departures, "2027-1").longLabel).toBe("Enero 2027")
    expect(tab(departures, "2027-1").daysUntil).toBeNull()
    expect(tab(departures, "2027-1").hotels.map((h) => h.accommodation.name)).toEqual(["B", "A"])
    expect(lowestPrice(tab(departures, "2027-1"))).toBe("USD 480")
  })

  it("fechas ilegibles cuentan como sin fechas", () => {
    const { departures } = buildDepartureTable(monthOnlyHotels(), ["a confirmar", "Enero"], now)
    expect(departures.map((d) => d.key)).toEqual(["2027-1", "2027-2", "2027-3"])
  })

  it("las pestañas de mes usan sólo filas del mes; las filas por salida se muestran como salidas", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "A", rates: [monthRow(1, 2027, 720, 699, 682, 489), depRow("2027-01-24", 685, 665, 647, 472), depRow("2026-10-03", 1, 1, 1, 1)] },
      { id: 2, name: "B", rates: [depRow("2027-02-07", 655, 640, 620, 460)] },
    ]
    const { departures } = buildDepartureTable(hotels, [], now)
    expect(departures.map((d) => d.key)).toEqual(["2027-1", "2027-01-24", "2027-02-07"])
    // El mes de enero muestra la tarifa del mes de A, no la de su salida del 24
    expect(dblByHotel(tab(departures, "2027-1"))).toEqual({ A: 720 })
    // La salida del 24 Ene muestra la fila propia de A
    expect(dblByHotel(tab(departures, "2027-01-24"))).toEqual({ A: 685 })
    expect(tab(departures, "2027-01-24").shortLabel).toBe("24 Ene")
    // 7 Feb: A no tiene ni fila propia ni de febrero; B sí
    expect(dblByHotel(tab(departures, "2027-02-07"))).toEqual({ B: 655 })
    // Un mes que sólo tiene filas por salida no genera pestaña de mes
    expect(departures.some((d) => d.key === "2027-2")).toBe(false)
  })

  it("sin ninguna tarifa futura no hay pestañas", () => {
    expect(buildDepartureTable([{ id: 1, name: "A", rates: [monthRow(3, 2026, 1, 1, 1, 1)] }], null, now).departures).toEqual([])
  })
})

describe("buildDepartureTable — columnas", () => {
  it("Single y Quíntuple aparecen si alguna tarifa mostrada las tiene, en orden canónico y fijas para todas las pestañas", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "A", rates: [monthRow(1, 2027, 500, 480, 460, 300, { tarifa_sgl: 800 }), monthRow(2, 2027, 500, 480, 460, 300)] },
      { id: 2, name: "B", rates: [depRow("2027-02-07", 600, 580, 560, 350, { tarifa_qpl: 520 })] },
    ]
    const { columns } = buildDepartureTable(hotels, ["10 Ene 2027", "7 Feb 2027"], now)
    expect(columns.map((c) => c.label)).toEqual(["Single", "Doble", "Triple", "Cuádruple", "Quíntuple", "Menor"])
  })

  it("Single en 0 o null no suma la columna", () => {
    const hotels: Hotel[] = [{ id: 1, name: "A", rates: [monthRow(1, 2027, 500, 480, 460, 300, { tarifa_sgl: 0, tarifa_qpl: null })] }]
    expect(buildDepartureTable(hotels, ["10 Ene 2027"], now).columns).toHaveLength(4)
  })

  it("una tarifa que no se muestra (salida pasada) no suma columnas", () => {
    const hotels: Hotel[] = [
      { id: 1, name: "A", rates: [monthRow(10, 2026, 500, 480, 460, 300, { tarifa_sgl: 800 }), monthRow(1, 2027, 500, 480, 460, 300)] },
    ]
    expect(buildDepartureTable(hotels, ["10 Ene 2027"], now).columns).toHaveLength(4)
  })
})
