"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plane,
  Bus,
  Ship,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react"
import { motion } from "framer-motion"
import type { TravelPackage } from "@/lib/supabase"
import { NavigationButton } from "@/components/navigation-button"
import { filterFutureDates, sortDatesChronologically, getNextDeparture, getDaysUntil } from "@/lib/date-utils"

interface PackageCardProps {
  package: TravelPackage
  index?: number
}

const TRANSPORT_ICONS = {
  aereo: Plane,
  bus: Bus,
  crucero: Ship,
}

const TRANSPORT_COLORS = {
  aereo: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    gradient: "from-purple-600 to-violet-600",
    accent: "text-purple-600",
    button: "bg-purple-600 hover:bg-purple-700",
    ring: "hover:ring-purple-400/40",
    nextBg: "bg-gradient-to-r from-purple-50 to-violet-50",
    nextBorder: "border-purple-200",
    pill: "bg-purple-50 text-purple-700 border-purple-100",
    countdownBg: "bg-purple-100 text-purple-700",
  },
  bus: {
    bg: "bg-red-100",
    text: "text-red-800",
    gradient: "from-red-600 to-rose-600",
    accent: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
    ring: "hover:ring-red-400/40",
    nextBg: "bg-gradient-to-r from-red-50 to-rose-50",
    nextBorder: "border-red-200",
    pill: "bg-red-50 text-red-700 border-red-100",
    countdownBg: "bg-red-100 text-red-700",
  },
  crucero: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    gradient: "from-blue-600 to-cyan-600",
    accent: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    ring: "hover:ring-blue-400/40",
    nextBg: "bg-gradient-to-r from-blue-50 to-cyan-50",
    nextBorder: "border-blue-200",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
    countdownBg: "bg-blue-100 text-blue-700",
  }
}

const TRANSPORT_LABELS = {
  aereo: "En Avión",
  bus: "En Bus",
  crucero: "En Crucero"
}

export function PackageCard({ package: pkg, index = 0 }: PackageCardProps) {
  const [showMoreDates, setShowMoreDates] = useState(false)

  const transportType = pkg.transport_type || 'aereo'
  const colors = TRANSPORT_COLORS[transportType]
  const Icon = TRANSPORT_ICONS[transportType]

  // Filter and sort future dates
  const futureDates = sortDatesChronologically(filterFutureDates(pkg.available_dates))
  const nextDeparture = getNextDeparture(futureDates)
  const daysUntil = nextDeparture ? getDaysUntil(nextDeparture) : null
  const remainingDates = futureDates.filter(d => d !== nextDeparture)
  const visibleRemainingDates = showMoreDates ? remainingDates : remainingDates.slice(0, 3)
  const hasHiddenDates = remainingDates.length > 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="h-full"
    >
      <Card className={`overflow-hidden transition-all duration-500 transform hover:-translate-y-1 bg-white group h-full flex flex-col border-0 shadow-lg hover:shadow-2xl hover:ring-2 ${colors.ring}`}>

        {/* === IMAGE SECTION === */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={pkg.image_url || "/hero.webp"}
            alt={pkg.name}
            width={400}
            height={280}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />

          {/* Transport pill */}
          <div className="absolute top-3 left-3 z-10">
            <Badge className={`${colors.bg} ${colors.text} shadow-md backdrop-blur-sm text-xs font-semibold px-2.5 py-1`}>
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {TRANSPORT_LABELS[transportType]}
            </Badge>
          </div>

          {/* Bottom gradient overlay with title + price */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-20 pb-4 px-5">
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                  {pkg.name}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-white/80 text-xs">
                  {pkg.destinations?.name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {pkg.destinations.name}
                    </span>
                  )}
                  {pkg.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      {pkg.duration}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Desde</p>
                <p className="text-xl font-bold text-white drop-shadow-md">{pkg.price}</p>
              </div>
            </div>
          </div>
        </div>

        {/* === CONTENT SECTION === */}
        <CardContent className="p-5 flex-1 flex flex-col">

          {/* Next Departure — Hero Element */}
          {nextDeparture ? (
            <div className={`${colors.nextBg} ${colors.nextBorder} border rounded-xl p-3.5 mb-4`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
                    Próxima salida
                  </p>
                  <p className="text-base font-bold text-gray-900 font-heading flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0 opacity-60" />
                    {nextDeparture}
                  </p>
                </div>
                {daysUntil !== null && daysUntil <= 90 && (
                  <div className={`${colors.countdownBg} rounded-lg px-3 py-1.5 text-center shrink-0`}>
                    <p className="text-lg font-bold leading-none">{daysUntil}</p>
                    <p className="text-[9px] uppercase tracking-wide font-medium mt-0.5">
                      {daysUntil === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-sm">Consultar fechas disponibles</span>
              </div>
            </div>
          )}

          {/* Remaining dates as inline pills */}
          {remainingDates.length > 0 && (
            <div className="mb-4 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
                Más fechas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleRemainingDates.map((date, idx) => (
                  <span
                    key={idx}
                    className={`${colors.pill} text-xs px-2.5 py-1 rounded-md font-medium border`}
                  >
                    {date}
                  </span>
                ))}
                {hasHiddenDates && !showMoreDates && (
                  <button
                    onClick={() => setShowMoreDates(true)}
                    className={`${colors.accent} text-xs px-2.5 py-1 rounded-md font-semibold hover:underline cursor-pointer bg-transparent`}
                  >
                    +{remainingDates.length - 3} más
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spacer when no remaining dates */}
          {remainingDates.length === 0 && <div className="flex-1" />}

          {/* CTA Button */}
          <NavigationButton
            href={`/paquete/${pkg.id}`}
            className={`w-full ${colors.button} text-white transition-all duration-200 group/btn font-semibold`}
            loadingText="Cargando..."
          >
            <span className="flex items-center justify-center gap-2">
              Ver Detalles
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </span>
          </NavigationButton>
        </CardContent>
      </Card>
    </motion.div>
  )
}
