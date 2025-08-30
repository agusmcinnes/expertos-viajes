"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bus, MapPin, Star, Users } from "lucide-react"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"
import { NavigationButton } from "@/components/navigation-button"
import { PackageCard } from "@/components/package-card"

export function BusPackagesPage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState("todos")

  const destinations = [
    { id: "todos", name: "Todos los Destinos" },
    { id: "brasil", name: "Brasil" },
    { id: "argentina", name: "Argentina" },
    { id: "grupales", name: "Salidas Especiales" }
  ]

  useEffect(() => {
    loadPackages()
  }, [selectedDestination])

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      let data: TravelPackage[] = []
      
      if (selectedDestination === "todos") {
        // Cargar todos los paquetes de bus
        const allDestinations = await Promise.all(
          destinations
            .filter(d => d.id !== "todos")
            .map(dest => packageService.getPackagesByDestination(dest.id))
        )
        data = allDestinations.flat()
      } else {
        data = await packageService.getPackagesByDestination(selectedDestination)
      }
      
      // Filtrar solo paquetes de bus
      const busPackages = data.filter(pkg => pkg.transport_type === 'bus')
      setPackages(busPackages)
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/comfortable-bus-scenic-route.png')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-bus/80 to-bus-600/70"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8 p-4 border-2 border-white rounded-lg inline-block">
              <Image
                src="/logo_vdv.png"
                alt="Vete de Viaje"
                width={200}
                height={60}
                className="h-12 w-auto"
              />
            </div>
            <Bus className="w-16 h-16 mx-auto mb-6 text-yellow-300" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              ¡Viajá en <span className="text-yellow-300">Bus</span>!
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-orange-100">
              Descubrí destinos increíbles con la comodidad y economía de viajar en bus. 
              Aventura y paisajes únicos en cada kilómetro.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>Buses modernos</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-200" />
                <span>Grupos reducidos</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                <span>Rutas panorámicas</span>
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
                    ? "bg-bus text-white shadow-lg"
                    : "hover:bg-orange-50 hover:border-bus"
                }`}
              >
                <Bus className="w-4 h-4 mr-2" />
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
              Nuestros Viajes en Bus
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona el destino perfecto para tu próxima aventura terrestre
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
                <PackageCard key={pkg.id} package={pkg} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bus className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay viajes disponibles
              </h3>
              <p className="text-gray-500">
                No se encontraron viajes en bus para el destino seleccionado.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-bus to-bus-600">
        <div className="container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para la aventura?
            </h2>
            <p className="text-xl mb-8 text-orange-100">
              Contactanos para planificar tu viaje en bus con asesoramiento personalizado
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-bus hover:bg-orange-50"
              >
                <Bus className="w-5 h-5 mr-2" />
                Consultar Disponibilidad
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-bus"
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
