"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Star, Plane, Bus, Ship } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { packageService, destinationService } from "@/lib/supabase"
import type { TravelPackage, Destination } from "@/lib/supabase"
import Link from "next/link"

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

  const getTransportInfo = (transport_type?: "aereo" | "bus" | "crucero") => {
    const transportType = transport_type || "aereo"
    switch (transportType) {
      case "bus":
        return { icon: Bus, text: "Bus", className: "bg-bus text-white" }
      case "crucero":
        return { icon: Ship, text: "Crucero", className: "bg-blue-600 text-white" }
      default:
        return { icon: Plane, text: "Aéreo", className: "bg-primary text-white" }
    }
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
              Nuestros <span className="text-primary">Destinos</span>
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
            <div className="grid md:grid-cols-2 gap-8 auto-rows-fr">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-full flex flex-col">
                    <div className="relative overflow-hidden">
                      <Image
                        src={pkg.image_url || "/placeholder.svg?height=300&width=400"}
                        alt={pkg.name}
                        width={400}
                        height={300}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-secondary text-gray-900 font-semibold">${pkg.price}</Badge>
                      </div>
                      <div className="absolute top-4 left-4">
                        <Badge variant="outline" className="bg-white/90 text-gray-900">
                          {pkg.duration}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{pkg.name}</h3>
                      <p className="text-gray-600 mb-4 leading-relaxed flex-1">{pkg.description}</p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            Próximas salidas: {pkg.available_dates?.slice(0, 2).join(", ") || "Consultar fechas"}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="w-4 h-4 mr-2" />
                          <span>Grupos reducidos (máx. {pkg.max_capacity} personas)</span>
                        </div>
                        {(() => {
                          const transportInfo = getTransportInfo(pkg.transport_type)
                          const TransportIcon = transportInfo.icon
                          return (
                            <div className="flex items-center text-sm text-gray-500">
                              <TransportIcon className="w-4 h-4 mr-2" />
                              <span>Transporte: {transportInfo.text}</span>
                            </div>
                          )
                        })()}
                        <div className="flex items-center text-sm text-gray-500">
                          <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                          <span>Calificación 4.9/5</span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-auto">
                        <Button 
                          asChild
                          className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-white"
                        >
                          <Link
                            href="/contacto"
                          >
                            Solicitar Información
                          </Link>
                        </Button>

                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
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
