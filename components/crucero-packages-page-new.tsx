"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ship, MapPin, Star, Users } from "lucide-react"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"
import { NavigationButton } from "@/components/navigation-button"
import { PackageCard } from "@/components/package-card"

export function CruceroPackagesPage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState("todos")

  const destinations = [
    { id: "todos", name: "Todos los Cruceros" },
    { id: "caribe", name: "Caribe" },
    { id: "brasil", name: "Brasil" },
    { id: "europa-clasicos", name: "Europa" },
    { id: "exoticos-mundo", name: "Exóticos" }
  ]

  useEffect(() => {
    loadPackages()
  }, [selectedDestination])

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      let data: TravelPackage[] = []
      
      if (selectedDestination === "todos") {
        // Cargar todos los paquetes de crucero
        const allDestinations = await Promise.all(
          destinations
            .filter(d => d.id !== "todos")
            .map(dest => packageService.getPackagesByDestination(dest.id))
        )
        data = allDestinations.flat()
      } else {
        data = await packageService.getPackagesByDestination(selectedDestination)
      }
      
      // Filtrar solo paquetes de crucero
      const cruceroPackages = data.filter(pkg => pkg.transport_type === 'crucero')
      setPackages(cruceroPackages)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/tropical-beach-paradise.png')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-cyan-600/70"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Ship className="w-16 h-16 mx-auto mb-6 text-cyan-200" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Cruceros de Ensueño
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Navega hacia destinos extraordinarios con toda la comodidad y lujo del mejor crucero. 
              Vive experiencias únicas en alta mar.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>Servicio de lujo</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-200" />
                <span>Todo incluido</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                <span>Múltiples destinos</span>
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
                <Ship className="w-4 h-4 mr-2" />
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
              Nuestros Cruceros
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona el crucero perfecto para tu próxima aventura marítima
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
              <Ship className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay cruceros disponibles
              </h3>
              <p className="text-gray-500">
                No se encontraron cruceros para el destino seleccionado.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para zarpar?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Contactanos para reservar tu camarote y vivir la experiencia de crucero perfecta
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Ship className="w-5 h-5 mr-2" />
                Ver Disponibilidad
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
