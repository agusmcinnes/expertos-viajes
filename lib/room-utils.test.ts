import { describe, it, expect } from "vitest"
import {
  getRoomTypeName,
  getRoomCapacity,
  getSubtypeLabel,
  formatRoomDetail,
} from "./room-utils"

describe("getRoomTypeName", () => {
  it("nombra los 4 tipos", () => {
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
    expect(getRoomCapacity("dbl")).toBe(2)
    expect(getRoomCapacity("tpl")).toBe(3)
    expect(getRoomCapacity("cpl")).toBe(4)
    expect(getRoomCapacity("qpl")).toBe(5)
  })

  it("devuelve 0 con un valor desconocido", () => {
    expect(getRoomCapacity("xyz")).toBe(0)
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

describe("formatRoomDetail", () => {
  it("incluye el subtipo si hay", () => {
    expect(formatRoomDetail("dbl", 2, "twin")).toBe("2 Doble (Twin)")
  })

  it("sin subtipo no lo muestra", () => {
    expect(formatRoomDetail("tpl", 1)).toBe("1 Triple")
  })
})
