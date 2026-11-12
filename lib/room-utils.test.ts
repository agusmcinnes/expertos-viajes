import { describe, it, expect } from "vitest"
import {
  ROOM_TYPES,
  MAX_MENORES_POR_HABITACION,
  UNCONTROLLED_ROOM_LIMIT,
  isRoomType,
  getRoomTypeName,
  getRoomCapacity,
  maxMenores,
  roomsCapacity,
  validateRoomDetails,
  getSubtypeLabel,
  formatMenores,
  formatRoomDetail,
  getRoomStock,
  roomStockStatus,
} from "./room-utils"

describe("ROOM_TYPES", () => {
  it("está en orden canónico", () => {
    expect(ROOM_TYPES).toEqual(["sgl", "dbl", "tpl", "cpl", "qpl"])
  })
  it("isRoomType reconoce los cinco", () => {
    for (const t of ROOM_TYPES) expect(isRoomType(t)).toBe(true)
    expect(isRoomType("menor")).toBe(false)
    expect(isRoomType(undefined)).toBe(false)
  })
})

describe("getRoomTypeName", () => {
  it("nombra los 5 tipos", () => {
    expect(getRoomTypeName("sgl")).toBe("Single")
    expect(getRoomTypeName("dbl")).toBe("Doble")
    expect(getRoomTypeName("tpl")).toBe("Triple")
    expect(getRoomTypeName("cpl")).toBe("Cuádruple")
    expect(getRoomTypeName("qpl")).toBe("Quíntuple")
  })

  it("devuelve tal cual un valor desconocido", () => {
    expect(getRoomTypeName("xyz")).toBe("xyz")
  })
})

describe("getRoomCapacity", () => {
  it("devuelve la capacidad de cada tipo", () => {
    expect(getRoomCapacity("sgl")).toBe(1)
    expect(getRoomCapacity("dbl")).toBe(2)
    expect(getRoomCapacity("tpl")).toBe(3)
    expect(getRoomCapacity("cpl")).toBe(4)
    expect(getRoomCapacity("qpl")).toBe(5)
  })

  it("devuelve 0 con un valor desconocido", () => {
    expect(getRoomCapacity("xyz")).toBe(0)
  })
})

describe("maxMenores", () => {
  it("2 en doble, triple y cuádruple; 0 en single y quíntuple", () => {
    expect(maxMenores("dbl")).toBe(2)
    expect(maxMenores("tpl")).toBe(2)
    expect(maxMenores("cpl")).toBe(2)
    expect(maxMenores("sgl")).toBe(0)
    expect(maxMenores("qpl")).toBe(0)
    expect(maxMenores("xyz")).toBe(0)
  })
  it("la constante coincide", () => {
    expect(MAX_MENORES_POR_HABITACION).toEqual({ sgl: 0, dbl: 2, tpl: 2, cpl: 2, qpl: 0 })
  })
})

describe("roomsCapacity", () => {
  it("vacío o null es 0", () => {
    expect(roomsCapacity([])).toBe(0)
    expect(roomsCapacity(null)).toBe(0)
  })
  it("doble + 1 menor = 3 pasajeros (el caso del cliente)", () => {
    expect(roomsCapacity([{ tipo_habitacion: "dbl", cantidad: 1, menores: 1 }])).toBe(3)
  })
  it("suma cantidad × capacidad + menores en varias filas", () => {
    expect(
      roomsCapacity([
        { tipo_habitacion: "sgl", cantidad: 1 },
        { tipo_habitacion: "dbl", cantidad: 2, menores: 2 },
        { tipo_habitacion: "tpl", cantidad: 1, menores: 0 },
        { tipo_habitacion: "qpl", cantidad: 1, menores: null },
      ]),
    ).toBe(1 + 4 + 2 + 3 + 5)
  })
})

describe("validateRoomDetails", () => {
  it("ok con menores dentro del límite", () => {
    expect(
      validateRoomDetails([
        { tipo_habitacion: "dbl", cantidad: 1, menores: 2 },
        { tipo_habitacion: "sgl", cantidad: 1 },
        { tipo_habitacion: "qpl", cantidad: 1, menores: 0 },
        { tipo_habitacion: "cpl", cantidad: 2, menores: 4 },
      ]),
    ).toBeNull()
  })
  it("pide al menos una habitación", () => {
    expect(validateRoomDetails([])).toBe("Seleccioná al menos una habitación.")
  })
  it("rechaza tipo desconocido", () => {
    expect(validateRoomDetails([{ tipo_habitacion: "menor", cantidad: 1 }])).toContain("no válido")
  })
  it("rechaza cantidad 0", () => {
    expect(validateRoomDetails([{ tipo_habitacion: "dbl", cantidad: 0 }])).toContain("al menos 1")
  })
  it("single y quíntuple no admiten menores", () => {
    expect(validateRoomDetails([{ tipo_habitacion: "sgl", cantidad: 1, menores: 1 }])).toBe(
      "La habitación Single no admite menores.",
    )
    expect(validateRoomDetails([{ tipo_habitacion: "qpl", cantidad: 1, menores: 1 }])).toBe(
      "La habitación Quíntuple no admite menores.",
    )
  })
  it("hasta 2 menores por habitación", () => {
    expect(validateRoomDetails([{ tipo_habitacion: "dbl", cantidad: 1, menores: 3 }])).toBe(
      "Una habitación Doble admite hasta 2 menores.",
    )
    expect(validateRoomDetails([{ tipo_habitacion: "tpl", cantidad: 2, menores: 5 }])).toBe(
      "2 habitaciones Triple admiten hasta 4 menores.",
    )
  })
  it("rechaza menores negativos o con decimales", () => {
    expect(validateRoomDetails([{ tipo_habitacion: "dbl", cantidad: 1, menores: -1 }])).toContain("no es válida")
    expect(validateRoomDetails([{ tipo_habitacion: "dbl", cantidad: 1, menores: 1.5 }])).toContain("no es válida")
  })
})

describe("getSubtypeLabel", () => {
  it("etiqueta los subtipos", () => {
    expect(getSubtypeLabel("matrimonial")).toBe("Matrimonial")
    expect(getSubtypeLabel("twin")).toBe("Twin")
  })

  it("devuelve vacío con null", () => {
    expect(getSubtypeLabel(null)).toBe("")
  })
})

describe("formatMenores", () => {
  it("singular, plural y vacío", () => {
    expect(formatMenores(1)).toBe("1 menor")
    expect(formatMenores(2)).toBe("2 menores")
    expect(formatMenores(0)).toBe("")
    expect(formatMenores(undefined)).toBe("")
  })
})

describe("formatRoomDetail", () => {
  it("incluye el subtipo si hay", () => {
    expect(formatRoomDetail("dbl", 2, "twin")).toBe("2 Doble (Twin)")
  })

  it("sin subtipo no lo muestra", () => {
    expect(formatRoomDetail("tpl", 1)).toBe("1 Triple")
  })

  it("sin menores (0, null o undefined) no cambia", () => {
    expect(formatRoomDetail("dbl", 1, "matrimonial", 0)).toBe("1 Doble (Matrimonial)")
    expect(formatRoomDetail("dbl", 1, "matrimonial", null)).toBe("1 Doble (Matrimonial)")
  })

  it("con menores los suma al final", () => {
    expect(formatRoomDetail("dbl", 1, "matrimonial", 1)).toBe("1 Doble (Matrimonial) + 1 menor")
    expect(formatRoomDetail("tpl", 1, null, 2)).toBe("1 Triple + 2 menores")
  })

  it("nombra single y quíntuple", () => {
    expect(formatRoomDetail("sgl", 1)).toBe("1 Single")
    expect(formatRoomDetail("qpl", 1)).toBe("1 Quíntuple")
  })
})

describe("getRoomStock", () => {
  const stock = { stock_sgl: null, stock_dbl: 3, stock_tpl: 0, stock_cpl: 1, stock_qpl: 2, is_unlimited: false }

  it("devuelve el cupo de un tipo controlado", () => {
    expect(getRoomStock(stock, "dbl")).toBe(3)
    expect(getRoomStock(stock, "tpl")).toBe(0)
    expect(getRoomStock(stock, "qpl")).toBe(2)
  })
  it("columna en NULL o ausente (fila vieja) = no se controla", () => {
    expect(getRoomStock(stock, "sgl")).toBeNull()
    expect(getRoomStock({ stock_dbl: 3, stock_tpl: 1, stock_cpl: 1 }, "qpl")).toBeNull()
  })
  it("ilimitado = no se controla ningún tipo", () => {
    expect(getRoomStock({ ...stock, is_unlimited: true }, "tpl")).toBeNull()
  })
  it("sin fila de stock = 0", () => {
    expect(getRoomStock(null, "dbl")).toBe(0)
    expect(getRoomStock(undefined, "sgl")).toBe(0)
  })
})

describe("roomStockStatus", () => {
  const stock = { stock_sgl: null, stock_dbl: 3, stock_tpl: 0, stock_cpl: 1, stock_qpl: null, is_unlimited: false }

  it("Quedan N descontando lo ya elegido", () => {
    expect(roomStockStatus(stock, "dbl", 1)).toEqual({ kind: "limited", total: 3, remaining: 2, canAdd: true, label: "Quedan 2" })
    expect(roomStockStatus(stock, "cpl", 1)).toMatchObject({ kind: "limited", remaining: 0, canAdd: false, label: "Quedan 0" })
  })
  it("Sin cupo con 0 cargado o sin fila", () => {
    expect(roomStockStatus(stock, "tpl")).toEqual({ kind: "sold_out", total: 0, remaining: 0, canAdd: false, label: "Sin cupo" })
    expect(roomStockStatus(null, "dbl").label).toBe("Sin cupo")
  })
  it("A confirmar con la columna en NULL", () => {
    expect(roomStockStatus(stock, "sgl")).toEqual({ kind: "unconfirmed", total: null, remaining: null, canAdd: true, label: "A confirmar" })
  })
  it("Disponible con stock ilimitado", () => {
    expect(roomStockStatus({ ...stock, is_unlimited: true }, "tpl")).toMatchObject({ kind: "unlimited", label: "Disponible", canAdd: true })
  })
  it("sin control, el techo es UNCONTROLLED_ROOM_LIMIT", () => {
    expect(roomStockStatus(stock, "qpl", UNCONTROLLED_ROOM_LIMIT).canAdd).toBe(false)
    expect(roomStockStatus(stock, "qpl", UNCONTROLLED_ROOM_LIMIT - 1).canAdd).toBe(true)
  })
})
