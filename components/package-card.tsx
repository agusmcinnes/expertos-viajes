"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plane, 
  Bus, 
  Ship, 
  MapPin, 
  Calendar, 
  Users, 
  Clock, 
  Star, 
  ChevronDown,
  ChevronUp 
} from "lucide-react"
import { motion } from "framer-motion"
import type { TravelPackage } from "@/lib/supabase"
import { NavigationButton } from "@/components/navigation-button"

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
  },
  bus: {
    bg: "bg-red-100", 
    text: "text-red-800",
    gradient: "from-red-600 to-rose-600",
    accent: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
  crucero: {
    bg: "bg-blue-100",
    text: "text-blue-800", 
    gradient: "from-blue-600 to-cyan-600",
    accent: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
  }
}

const TRANSPORT_LABELS = {
  aereo: "En Avión",
  bus: "En Bus",
  crucero: "En Crucero"
}

export function PackageCard({ package: pkg, index = 0 }: PackageCardProps) {
  const [showAllDates, setShowAllDates] = useState(false)
  
  const transportType = pkg.transport_type || 'aereo'
  const colors = TRANSPORT_COLORS[transportType]
  const Icon = TRANSPORT_ICONS[transportType]
  
  // Truncar descripción para preview
  const truncateDescription = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...'
  }

  // Mostrar fechas disponibles
  const availableDates = pkg.available_dates || []
  const visibleDates = showAllDates ? availableDates : availableDates.slice(0, 2)
  const hasMoreDates = availableDates.length > 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white group h-full flex flex-col">
        <div className="relative">
          <Image
            src={pkg.image_url || "/hero.webp"}
            alt={pkg.name}
            width={400}
            height={250}
            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges superiores */}
          <div className="absolute top-4 left-4 space-y-2">
            <Badge className={`${colors.bg} ${colors.text} shadow-md`}>
              <Icon className="w-3 h-3 mr-1" />
              {TRANSPORT_LABELS[transportType]}
            </Badge>
            {pkg.duration && (
              <Badge variant="outline" className="bg-white/90 text-gray-900 border-white flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {pkg.duration}
              </Badge>
            )}
          </div>
          
          {/* Precio destacado */}
          <div className={`absolute bottom-0 right-0 bg-gradient-to-r ${colors.gradient} text-white px-4 py-2 rounded-tl-lg`}>
            <div className="text-right">
              <p className="text-xs opacity-90">Desde</p>
              <p className="text-lg font-bold">${pkg.price.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6 flex-1 flex flex-col">
          {/* Título y descripción */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{pkg.name}</h3>
            <p className="text-gray-600 text-sm mb-3">
              {truncateDescription(pkg.description)}
            </p>
          </div>

          {/* Información del paquete - con altura mínima fija */}
          <div className="space-y-3 mb-6 flex-1">
            {/* Duración */}
            {pkg.duration && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{pkg.duration}</span>
              </div>
            )}
            
            {/* Tamaño del grupo */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-green-500" />
              <span>
                {pkg.max_group_size 
                  ? `Máximo ${pkg.max_group_size} personas`
                  : 'Sin máximo de personas'
                }
              </span>
            </div>
            
            {/* Fechas disponibles - con altura mínima */}
            <div className="space-y-2 min-h-[120px]">
              {availableDates.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <span>Fechas disponibles:</span>
                  </div>
                  
                  <div className="ml-6 space-y-1">
                    {visibleDates.map((date, idx) => (
                      <div key={idx} className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded">
                        {date}
                      </div>
                    ))}
                    
                    {hasMoreDates && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="text-xs p-1 h-auto"
                      >
                        {showAllDates ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Mostrar menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Ver todas las fechas ({availableDates.length - 2} más)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Consultar fechas disponibles</span>
                </div>
              )}
            </div>
          </div>

          {/* Precio y botón - siempre al final */}
          <div className="border-t pt-4 mt-auto">

            <NavigationButton 
              href={`/paquete/${pkg.id}`}
              className={`w-full ${colors.button} text-white transition-colors duration-200`}
              loadingText="Cargando..."
            >
              Ver Detalles del Viaje
            </NavigationButton>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
