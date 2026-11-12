import { describe, it, expect, vi, beforeEach } from "vitest"

const send = vi.fn().mockResolvedValue({ text: "OK" })
vi.mock("@emailjs/browser", () => ({ default: { send } }))

async function load() {
  vi.stubEnv("NEXT_PUBLIC_EMAILJS_USER_ID", "test-key")
  vi.resetModules()
  return await import("./emailjs")
}

describe("clave pública en cada envío", () => {
  beforeEach(() => send.mockClear())

  it("sendEmail", async () => {
    const m = await load()
    await m.sendEmail({ from_name: "a", from_email: "a@a.com", message: "hola" })
    expect(send.mock.calls[0][3]).toHaveProperty("publicKey", "test-key")
  })

  it("sendAgencyNotification", async () => {
    const m = await load()
    await m.sendAgencyNotification({ agency_name: "x", agency_email: "x@x.com", agency_phone: "1" })
    expect(send.mock.calls[0][3]).toHaveProperty("publicKey", "test-key")
  })

  it("sendReservationNotification", async () => {
    const m = await load()
    await m.sendReservationNotification({
      packageName: "P",
      accommodation: "A",
      departureDate: "2027-01-03",
      clientName: "c",
      clientEmail: "c@c.com",
      clientPhone: "1",
      rooms: [{ tipo_habitacion: "dbl", cantidad: 1 }],
      passengers: [{ tipo_pasajero: "titular", nombre: "N", apellido: "A", fecha_nacimiento: "1990-03-15" }],
      reservationId: 1,
    })
    expect(send.mock.calls[0][3]).toHaveProperty("publicKey", "test-key")
    expect(send.mock.calls[0][2].fecha_salida).not.toBe("2027-01-03")
  })
})

describe("buildRoomsDetail", () => {
  it("sin menores, el texto es el de siempre", async () => {
    const m = await load()
    expect(
      m.buildRoomsDetail([
        { tipo_habitacion: "dbl", cantidad: 1, subtipo_habitacion: "matrimonial" },
        { tipo_habitacion: "tpl", cantidad: 1, subtipo_habitacion: "twin", menores: 0 },
      ])
    ).toBe("1× Doble (Matrimonial), 1× Triple (Twin)")
  })

  it("acepta los cinco tipos y muestra los menores", async () => {
    const m = await load()
    expect(
      m.buildRoomsDetail([
        { tipo_habitacion: "sgl", cantidad: 1, subtipo_habitacion: null },
        { tipo_habitacion: "dbl", cantidad: 1, subtipo_habitacion: "matrimonial", menores: 1 },
        { tipo_habitacion: "cpl", cantidad: 1, subtipo_habitacion: "twin", menores: 2 },
        { tipo_habitacion: "qpl", cantidad: 1, subtipo_habitacion: "matrimonial" },
      ])
    ).toBe("1× Single, 1× Doble (Matrimonial) + 1 menor, 1× Cuádruple (Twin) + 2 menores, 1× Quíntuple (Matrimonial)")
  })

  it("el mail de la reserva lleva los menores en detalles_habitaciones", async () => {
    send.mockClear()
    const m = await load()
    await m.sendReservationNotification({
      packageName: "P",
      accommodation: "A",
      departureDate: "2027-01-03",
      clientName: "c",
      clientEmail: "c@c.com",
      clientPhone: "1",
      rooms: [{ tipo_habitacion: "dbl", cantidad: 1, subtipo_habitacion: "matrimonial", menores: 1 }],
      passengers: [{ tipo_pasajero: "titular", nombre: "N", apellido: "A", fecha_nacimiento: "1990-03-15" }],
      reservationId: 1,
    })
    expect(send.mock.calls[0][2].detalles_habitaciones).toBe("1× Doble (Matrimonial) + 1 menor")
  })
})

describe("buildPassengersDetail", () => {
  it("incluye edad 0 y fecha legible", async () => {
    const m = await load()
    const out = m.buildPassengersDetail([
      { tipo_pasajero: "acompañante", nombre: "B", apellido: "C", fecha_nacimiento: "1990-03-15", edad_al_viajar: 0 },
    ])
    expect(out).toContain("(0 años al viajar)")
    expect(out).toContain("15/03/1990")
    expect(out).not.toContain("1990-03-15")
  })
})
