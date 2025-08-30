"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plane, Bus, Ship } from "lucide-react"
import { motion } from "framer-motion"
import { packageService, destinationService } from "@/lib/supabase"
import type { TravelPackage, Destination } from "@/lib/supabase"
import Link from "next/link"
import { PackageCard } from "@/components/package-card"

export function DestinationsSectionDynamic() {
  const [activeDestination, setActiveDestination] = useState("argentina")
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDestinations()
  }, [])

  useEffect(() => {
    if (activeDestination) {
      loadPackagesByDestination(activeDestination)
    }
  }, [activeDestination])

  const loadDestinations = async () => {
    try {
      const data = await destinationService.getAllDestinations()
      setDestinations(data)
      if (data.length > 0) {
        setActiveDestination(data[0].code)
      }
    } catch (error) {
      console.error("Error loading destinations:", error)
    }
  }

  const loadPackagesByDestination = async (destinationCode: string) => {
    try {
      setIsLoading(true)
      const data = await packageService.getPackagesByDestination(destinationCode)
      setPackages(data)
    } catch (error) {
      console.error("Error loading packages:", error)
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  const getDestinationIcon = (code: string) => {
    const icons: Record<string, string> = {
      argentina: "",
      brasil: "",
      caribe: "",
      grupales: "",
      "eeuu-canada": "🏙️",
      "europa-clasicos": "🏛️", 
      "exoticos-mundo": "🌍",
    }
    return icons[code] || ""
  }

  return (
    <section id="destinos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Destinos <span className="text-primary">Destacados</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Desde aventuras locales hasta experiencias exóticas, tenemos el viaje perfecto para vos. Explorá nuestros
              destinos más populares y encontrá tu próxima aventura.
            </p>
          </motion.div>

          {/* Destination Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {destinations.map((destination, index) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  asChild
                  variant={activeDestination === destination.code ? "default" : "outline"}
                  className={`px-6 py-3 text-lg transition-all duration-300 ${
                    activeDestination === destination.code
                      ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white transform scale-105 shadow-lg"
                      : "border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 hover:text-white hover:scale-105 shadow-lg hover:shadow-xl"
                  }`}
                >
                  <Link href={`/destinos/${destination.code === "mediterráneo" ? "mediterraneo" : destination.code}`}>
                    {destination.name}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {/* Packages Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-t-lg"></div>
                  <div className="bg-white p-6 rounded-b-lg">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8">
              {packages.map((pkg, index) => (
                <PackageCard key={pkg.id} package={pkg} index={index} />
              ))}
            </div>
          )}

          {packages.length === 0 && !isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay paquetes disponibles para este destino</p>
              <p className="text-sm">Pronto agregaremos nuevas opciones</p>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">¿No encontrás lo que buscás?</h3>
              <p className="text-lg mb-6 text-white/90">
                Creamos viajes personalizados según tus sueños y presupuesto. Contanos qué tenés en mente y lo hacemos
                realidad.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-gray-900 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Crear Viaje Personalizado
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
