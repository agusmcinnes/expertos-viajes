"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, MapPin, Calendar, Users, Clock, Star } from "lucide-react"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"

export function AvionPackagesPage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState("todos")

  const destinations = [
    { id: "todos", name: "Todos los Destinos" },
    { id: "argentina", name: "Argentina" },
    { id: "brasil", name: "Brasil" },
    { id: "caribe", name: "Caribe & Centroamérica" },
    { id: "eeuu-canada", name: "EEUU / Canadá" },
    { id: "europa-clasicos", name: "Europa y Clásicos" },
    { id: "exoticos-mundo", name: "Exóticos y Resto del Mundo" },
    { id: "grupales", name: "Salidas Grupales Acompañadas" }
  ]

  useEffect(() => {
    loadPackages()
  }, [selectedDestination])

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      let data: TravelPackage[] = []
      
      if (selectedDestination === "todos") {
        // Cargar todos los paquetes aéreos
        const allDestinations = await Promise.all(
          destinations
            .filter(d => d.id !== "todos")
            .map(dest => packageService.getPackagesByDestination(dest.id))
        )
        data = allDestinations.flat()
      } else {
        data = await packageService.getPackagesByDestination(selectedDestination)
      }
      
      // Filtrar solo paquetes aéreos
      const aereoPackages = data.filter(pkg => pkg.transport_type === 'aereo')
      setPackages(aereoPackages)
    } catch (error) {
      console.error("Error loading packages:", error)
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterPackages = (destination: string) => {
    setSelectedDestination(destination)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/hero.webp')`,
          }}
        >
          <div className="absolute inset-0 bg-blue-600/70"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Plane className="w-16 h-16 mx-auto mb-6 text-blue-200" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Viajes en Avión
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Volá hacia tus destinos soñados con la comodidad y velocidad del transporte aéreo. 
              Descubrí el mundo sin límites.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>Vuelos de calidad</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-200" />
                <span>Grupos personalizados</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                <span>Destinos mundiales</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filtros de Destinos */}
      <section className="py-8 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {destinations.map((destination) => (
              <Button
                key={destination.id}
                variant={selectedDestination === destination.id ? "default" : "outline"}
                onClick={() => filterPackages(destination.id)}
                className={`transition-all duration-300 ${
                  selectedDestination === destination.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "hover:bg-blue-50 hover:border-blue-300"
                }`}
              >
                <Plane className="w-4 h-4 mr-2" />
                {destination.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Paquetes */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Nuestros Viajes en Avión
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona el destino perfecto para tu próxima aventura aérea
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-t-lg"></div>
                  <div className="bg-white p-6 rounded-b-lg shadow-lg">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white">
                    <div className="relative">
                      <Image
                        src={pkg.image_url || "/hero.webp"}
                        alt={pkg.name}
                        width={400}
                        height={250}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute top-4 left-4 space-y-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          <Plane className="w-3 h-3 mr-1" />
                          En Avión
                        </Badge>
                        <Badge variant="outline" className="bg-white/90 text-gray-900 border-white block">
                          {pkg.duration}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>{pkg.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-green-500" />
                          <span>Hasta {pkg.max_capacity || 20} personas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-red-500" />
                          <span>
                            {pkg.available_dates?.slice(0, 2).join(", ") || "Consultar fechas"}
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              ${pkg.price.toLocaleString()}
                              <span className="text-sm font-normal text-gray-500"> por persona</span>
                            </p>
                          </div>
                        </div>

                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          <Link href={`/paquete/${pkg.id}`}>Ver Detalles del Viaje</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Plane className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay viajes disponibles
              </h3>
              <p className="text-gray-500">
                No se encontraron viajes en avión para el destino seleccionado.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-sky-600">
        <div className="container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para volar?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Contactanos para planificar tu viaje perfecto con asesoramiento personalizado
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Plane className="w-5 h-5 mr-2" />
                Consultar Disponibilidad
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600"
                asChild
              >
                <Link href="/contacto">
                  Contactar Experto
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
