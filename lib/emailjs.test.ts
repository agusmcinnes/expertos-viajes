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
