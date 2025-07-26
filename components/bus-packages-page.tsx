"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Star, Bus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"

export function BusPackagesPage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    loadBusPackages()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const loadBusPackages = async () => {
    try {
      setIsLoading(true)
      setHasError(false)
      const data = await packageService.getPackagesByTransport("bus")
      setPackages(data)
    } catch (error) {
      console.error("Error loading bus packages:", error)
      setHasError(true)
      if (error instanceof Error && error.message.includes("transport_type")) {
        setErrorMessage("La base de datos necesita ser actualizada. Por favor, ejecuta el script de migración.")
      } else {
        setErrorMessage("Error al cargar los paquetes de bus.")
      }
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  if (hasError) {
    return (
      <div className="min-h-screen">
        {/* Hero Section - same as before */}
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/comfortable-bus-scenic-route.png')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-bus/80 to-bus-600/70"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 container mx-auto px-4 text-center text-white"
          >
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8 p-4 border-2 border-white rounded-lg"
              >
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              >
                ¡Viajá en <span className="text-yellow-300">Bus</span>!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8"
              >
                Descubrí destinos increíbles de manera económica y cómoda. Cada kilómetro es una nueva aventura.
              </motion.p>
            </div>
          </motion.div>
        </section>

        {/* Error Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-8"
              >
                <Bus className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
                <h3 className="text-xl font-semibold text-yellow-800 mb-4">Configuración Pendiente</h3>
                <p className="text-yellow-700 mb-6">{errorMessage}</p>
                <div className="bg-white p-4 rounded border text-left text-sm text-gray-600">
                  <p className="font-semibold mb-2">Para habilitar los viajes en bus:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Ejecuta el script de migración de la base de datos</li>
                    <li>Agrega paquetes de viaje en bus desde el panel de admin</li>
                    <li>Recarga esta página</li>
                  </ol>
                </div>
                <Button onClick={() => window.location.reload()} className="mt-4 bg-bus hover:bg-bus-600 text-white">
                  Recargar Página
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/comfortable-bus-scenic-route.png')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-bus-600/90"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4 text-center text-white"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 mt-10"
            >
              <Image
                src="/logo_vdv.png"
                alt="Vete de Viaje"
                width={300}
                height={100}
                className="h-20 w-auto mx-auto mb-4"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              ¡Viajá en <span className="text-yellow-300">Bus</span>!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8"
            >
              Descubrí destinos increíbles de manera económica y cómoda. Cada kilómetro es una nueva aventura.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300 mb-2">50%</div>
                <div className="text-white/80">Más económico</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300 mb-2">100%</div>
                <div className="text-white/80">Cómodo y seguro</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300 mb-2">24/7</div>
                <div className="text-white/80">Asistencia en ruta</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Packages Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Nuestros <span className="text-bus">Viajes en Bus</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Viajá cómodo, seguro y a precios increíbles. Nuestros buses de primera clase te llevan a los mejores
                destinos.
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
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                      <div className="relative overflow-hidden">
                        <Image
                          src={pkg.image_url || "/placeholder.svg?height=300&width=400"}
                          alt={pkg.name}
                          width={400}
                          height={300}
                          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-gradient-to-r from-bus to-bus-600 text-white font-semibold shadow-lg">
                            ${pkg.price}
                          </Badge>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge variant="outline" className="bg-white/90 text-gray-900 border-white">
                            <Bus className="w-3 h-3 mr-1" />
                            {pkg.duration}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{pkg.name}</h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">{pkg.description}</p>

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
                          <div className="flex items-center text-sm text-gray-500">
                            <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                            <span>Calificación 4.8/5</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            asChild
                            className="flex-1 bg-gradient-to-r from-bus to-bus-600 hover:from-bus-600 hover:to-bus-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-white"
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
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gray-500">
                <Bus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hay viajes en bus disponibles</p>
                <p className="text-sm">Pronto agregaremos nuevas opciones</p>
              </motion.div>
            )}

            {/* Benefits Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-20"
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
                ¿Por qué elegir <span className="text-bus">viajar en bus</span>?
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: "💰",
                    title: "Más Económico",
                    description: "Hasta 50% menos que otros medios de transporte",
                  },
                  {
                    icon: "🛏️",
                    title: "Máxima Comodidad",
                    description: "Asientos reclinables, aire acondicionado y WiFi",
                  },
                  {
                    icon: "🌍",
                    title: "Paisajes Únicos",
                    description: "Disfrutá del viaje y los paisajes en el camino",
                  },
                  {
                    icon: "🔒",
                    title: "Seguridad Total",
                    description: "Conductores profesionales y asistencia 24/7",
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="text-4xl mb-4">{benefit.icon}</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                    <p className="text-gray-600 text-sm">{benefit.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-16"
            >
              <div className="bg-gradient-to-r from-bus via-bus-600 to-bus-700 rounded-2xl p-8 md:p-12 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para tu próxima aventura en bus?</h3>
                <p className="text-lg mb-6 text-white/90">
                  Contactanos y armamos el viaje perfecto para vos. ¡La aventura comienza en el primer kilómetro!
                </p>
                <Button
                  size="lg"
                  className="bg-white text-bus hover:bg-gray-100 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Solicitar Cotización
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
