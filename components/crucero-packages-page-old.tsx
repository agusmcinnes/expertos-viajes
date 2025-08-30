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

// Datos de ejemplo para cruceros
const mockCruceroPackages = [
  {
    id: 1,
    name: "Crucero por el Caribe",
    description: "Navega por las aguas cristalinas del Caribe visitando las islas más paradisíacas.",
    price: 1200,
    originalPrice: 1500,
    duration: "7 días",
    ports: ["Miami", "Cozumel", "Jamaica", "Bahamas"],
    dates: ["15 Mar 2024", "20 Apr 2024", "25 May 2024"],
    maxPassengers: 4000,
    rating: 4.8,
    image: "/tropical-beach-paradise.png",
    features: ["Todo incluido", "Entretenimiento", "Spa", "Casino"],
    ship: "Royal Caribbean - Symphony of the Seas"
  },
  {
    id: 2,
    name: "Crucero Mediterráneo",
    description: "Explora la historia y cultura del Mediterráneo visitando puertos icónicos.",
    price: 1800,
    originalPrice: 2200,
    duration: "10 días",
    ports: ["Barcelona", "Roma", "Nápoles", "Santorini", "Mykonos"],
    dates: ["10 Jun 2024", "15 Jul 2024", "20 Ago 2024"],
    maxPassengers: 3000,
    rating: 4.9,
    image: "/placeholder.jpg",
    features: ["Excursiones incluidas", "Gastronomía gourmet", "WiFi", "Balcón"],
    ship: "MSC Meraviglia"
  },
  {
    id: 3,
    name: "Crucero Brasil - Especial",
    description: "Descubre las costas brasileñas con paradas en las ciudades más vibrantes.",
    price: 2500,
    originalPrice: 3000,
    duration: "12 días",
    ports: ["Santos", "Río de Janeiro", "Salvador", "Recife", "Fortaleza"],
    dates: ["5 Sep 2024", "10 Oct 2024", "15 Nov 2024"],
    maxPassengers: 2500,
    rating: 4.7,
    image: "/rio-christ-beaches.png",
    features: ["Espectáculos brasileños", "Clases de samba", "Caipirinha bar", "Excursiones"],
    ship: "Costa Fascinosa"
  }
]

export function CruceroPackagesPage() {
  const [packages, setPackages] = useState(mockCruceroPackages)
  const [selectedDestination, setSelectedDestination] = useState("todos")

  const destinations = [
    { id: "todos", name: "Todos los Cruceros" },
    { id: "caribe", name: "Caribe" },
    { id: "mediterraneo", name: "Mediterráneo" },
    { id: "brasil", name: "Brasil" },
    { id: "especiales", name: "Especiales" }
  ]

  const filterPackages = (destination: string) => {
    setSelectedDestination(destination)
    if (destination === "todos") {
      setPackages(mockCruceroPackages)
    } else {
      // Filtrar por destino (implementar lógica según necesidades)
      const filtered = mockCruceroPackages.filter(pkg => 
        pkg.name.toLowerCase().includes(destination.toLowerCase()) ||
        pkg.ports.some(port => port.toLowerCase().includes(destination.toLowerCase()))
      )
      setPackages(filtered)
    }
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
          <div className="absolute inset-0 bg-blue-900/70"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Ship className="w-16 h-16 mx-auto mb-6 text-cyan-300" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Cruceros de Ensueño
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Navega hacia destinos increíbles con el máximo confort y lujo. 
              Experiencias únicas en el mar te están esperando.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>Cruceros de lujo</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-300" />
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

      {/* Paquetes de Cruceros */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Nuestros Cruceros Destacados
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona el crucero perfecto para tu próxima aventura marítima
            </p>
          </motion.div>

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
                      src={pkg.image}
                      alt={pkg.name}
                      width={400}
                      height={250}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-blue-600 text-white">
                        <Ship className="w-3 h-3 mr-1" />
                        Crucero
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{pkg.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
                      <p className="text-xs text-blue-600 font-medium">{pkg.ship}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>{pkg.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-green-500" />
                        <span>Hasta {pkg.maxPassengers} pasajeros</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                        <span>{pkg.ports.join(" • ")}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {pkg.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {pkg.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pkg.features.length - 3} más
                        </Badge>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          {pkg.originalPrice && (
                            <p className="text-sm text-gray-500 line-through">
                              ${pkg.originalPrice.toLocaleString()}
                            </p>
                          )}
                          <p className="text-2xl font-bold text-blue-600">
                            ${pkg.price.toLocaleString()}
                            <span className="text-sm font-normal text-gray-500"> por persona</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-gray-700">Próximas salidas:</p>
                        <div className="flex flex-wrap gap-1">
                          {pkg.dates.slice(0, 2).map((date, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {date}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <NavigationButton 
                        href={`/paquete/${pkg.id}`}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        loadingText="Cargando..."
                      >
                        Ver Detalles del Crucero
                      </NavigationButton>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {packages.length === 0 && (
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
              ¿Listo para navegar?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Contactanos para planificar tu crucero perfecto con asesoramiento personalizado
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Ship className="w-5 h-5 mr-2" />
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
