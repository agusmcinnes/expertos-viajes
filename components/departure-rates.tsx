"use client"

import { useMemo, useState } from "react"
import { Calendar, ExternalLink, Hotel, Star, Utensils } from "lucide-react"
import { formatPrice } from "@/lib/rates"
import type { AccommodationRate } from "@/lib/supabase"
import { buildDepartureTable, lowestPrice } from "./departure-rates-data"

interface AccommodationWithRates {
  id: number
  name: string
  stars: number
  enlace_web?: string
  regimen?: string
  rates?: AccommodationRate[]
}

interface DepartureRatesProps {
  accommodations: AccommodationWithRates[]
  availableDates: string[] | null
  subtitle?: string
}

// Grilla de montos de cada hotel en las tarjetas: 2 por fila. Con 5 o 6 montos las tarjetas se usan hasta xl,
// así que desde sm van en una fila (6, en dos filas de 3); con 5, el último (Menor) ocupa la fila entera en el
// celular para no quedar huérfano.
const MOBILE_GRID: Record<number, string> = {
  4: "grid-cols-2",
  5: "grid-cols-2 sm:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3",
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < count ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  )
}

function HotelInfo({ accommodation }: { accommodation: AccommodationWithRates }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-gray-900 leading-snug">{accommodation.name}</p>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <Stars count={accommodation.stars} />
        {accommodation.regimen && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
            <Utensils className="w-3 h-3" />
            {accommodation.regimen}
          </span>
        )}
      </div>
    </div>
  )
}

function SiteLink({ href }: { href?: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
    >
      <ExternalLink className="w-3 h-3" />
      Sitio
    </a>
  )
}

export function DepartureRates({ accommodations, availableDates, subtitle }: DepartureRatesProps) {
  const { departures, columns } = useMemo(
    () => buildDepartureTable(accommodations, availableDates),
    [accommodations, availableDates]
  )
  const [activeKey, setActiveKey] = useState<string | null>(null)

  if (departures.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">No hay tarifas cargadas</p>
  }

  const active = departures.find((d) => d.key === activeKey) ?? departures[0]
  // Con Single o Quíntuple la tabla no entra en la columna principal hasta xl: hasta ahí, tarjetas.
  const wide = columns.length > 4
  const cellPadding = columns.length > 5 ? "px-2" : "px-3"

  return (
    <div>
      {/* Selector de salidas */}
      <div className="-mx-6 px-6 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className="flex gap-2 w-max" role="tablist" aria-label="Fechas de salida">
          {departures.map((departure) => {
            const isActive = departure.key === active.key
            const price = lowestPrice(departure)
            return (
              <button
                key={departure.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(departure.key)}
                className={`flex flex-col items-start rounded-xl border px-3.5 py-2 text-left transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-sm font-semibold whitespace-nowrap">{departure.shortLabel}</span>
                <span
                  className={`text-[11px] whitespace-nowrap tabular-nums ${
                    isActive ? "text-white/80" : price ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {price ? `desde ${price}` : "a consultar"}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Encabezado de la salida */}
      <div className="flex items-start justify-between gap-3 mt-4 mb-3">
        <div>
          <p className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
            <Calendar className="w-4 h-4 text-primary" />
            {active.longLabel}
          </p>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5 ml-6">{subtitle}</p>}
        </div>
        {active.daysUntil != null && active.daysUntil >= 0 && (
          <span className="shrink-0 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
            {active.daysUntil === 0 ? "Sale hoy" : `Faltan ${active.daysUntil} días`}
          </span>
        )}
      </div>

      {active.hotels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
          <Hotel className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Tarifas a consultar para esta salida</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className={`hidden ${wide ? "xl:block" : "md:block"} rounded-xl border border-gray-200 overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left font-medium px-4 py-2.5">Alojamiento</th>
                  {columns.map((col) => (
                    <th key={col.field} className={`text-right font-medium ${cellPadding} py-2.5`}>{col.label}</th>
                  ))}
                  <th className="px-4 py-2.5"><span className="sr-only">Sitio web</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.hotels.map(({ accommodation, rate }) => (
                  <tr key={accommodation.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <HotelInfo accommodation={accommodation} />
                    </td>
                    {columns.map((col) => {
                      const price = formatPrice(rate[col.field], rate.currency)
                      return (
                        <td
                          key={col.field}
                          className={`${cellPadding} py-3.5 text-right tabular-nums whitespace-nowrap ${
                            price ? "font-semibold text-green-700" : "text-gray-300"
                          }`}
                        >
                          {price ?? "—"}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3.5 text-right">
                      <SiteLink href={accommodation.enlace_web} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className={`${wide ? "xl:hidden" : "md:hidden"} space-y-3`}>
            {active.hotels.map(({ accommodation, rate }) => (
              <div key={accommodation.id} className="rounded-xl border border-gray-200 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <HotelInfo accommodation={accommodation} />
                  <SiteLink href={accommodation.enlace_web} />
                </div>
                <div className={`grid ${MOBILE_GRID[columns.length] ?? MOBILE_GRID[4]} gap-2 mt-3`}>
                  {columns.map((col, i) => {
                    const price = formatPrice(rate[col.field], rate.currency)
                    const lonely = columns.length % 2 === 1 && i === columns.length - 1
                    return (
                      <div
                        key={col.field}
                        className={`rounded-lg bg-gray-50 px-2.5 py-2 ${lonely ? "col-span-2 sm:col-span-1" : ""}`}
                      >
                        <p className="text-[11px] text-gray-500">{col.label}</p>
                        <p className={`text-sm tabular-nums ${price ? "font-semibold text-green-700" : "text-gray-300"}`}>
                          {price ?? "—"}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
