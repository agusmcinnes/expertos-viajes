"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Star, ArrowLeft, MapPin, CheckCircle, Plane, Bus, Ship } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"
import { NavigationButton } from "@/components/navigation-button"
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/breadcrumbs"

interface DestinationData {
  name: string
  description: string
  highlights: string[]
  heroImage: string
  code: string
}

interface DestinationPageProps {
  destination: DestinationData
}

export function DestinationPage({ destination }: DestinationPageProps) {
  const searchParams = useSearchParams()
  const transport = searchParams.get('transport') || 'all'
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPackages()
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [destination.code, transport])

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      const data = await packageService.getPackagesByDestination(destination.code)
      
      // Filtrar por tipo de transporte si se especifica
      let filteredPackages = data
      if (transport && transport !== 'all') {
        filteredPackages = data.filter(pkg => {
          // Filtrado real por tipo de transporte
          return pkg.transport_type === transport
        })
      }
      
      setPackages(filteredPackages)
    } catch (error) {
      console.error("Error loading packages:", error)
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  const getTransportIcon = (transportType: string) => {
    switch (transportType) {
      case 'aereo':
        return <Plane className="w-4 h-4" />
      case 'bus':
        return <Bus className="w-4 h-4" />
      case 'crucero':
        return <Ship className="w-4 h-4" />
      default:
        return <Plane className="w-4 h-4" />
    }
  }

  const getTransportColor = (transportType: string) => {
    switch (transportType) {
      case 'aereo':
        return 'bg-blue-100 text-blue-800'
      case 'bus':
        return 'bg-orange-100 text-orange-800'
      case 'crucero':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTransportName = (transportType: string) => {
    switch (transportType) {
      case 'aereo':
        return 'En Avión'
      case 'bus':
        return 'En Bus'
      case 'crucero':
        return 'En Crucero'
      default:
        return 'Transporte'
    }
  }

  const handleNavigation = (href: string) => {
    if (href.includes("#")) {
      // Para navegación con hash, hacer scroll suave después de navegar
      setTimeout(() => {
        const element = document.querySelector(href.split("#")[1] ? `#${href.split("#")[1]}` : "#inicio")
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    } else {
      // Para otras navegaciones, ir al top
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const breadcrumbItems = [
    { label: "Destinos", href: "/#destinos" },
    { label: destination.name }
  ]

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${destination.heroImage}')`,
          }}
        >
          <div className="absolute inset-0 bg-primary/80"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4 text-center text-white"
        >
          <div className="max-w-4xl mx-auto mt-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault()
                  window.location.href = "/#destinos"
                }}
                className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver a Destinos
              </Link>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-2xl md:text-3xl lg:text-5xl font-bold mb-6 leading-tight"
            >
              {destination.name}
              {transport && transport !== 'all' && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Badge className={`text-lg px-4 py-2 ${getTransportColor(transport)}`}>
                    {getTransportIcon(transport)}
                    <span className="ml-2">{getTransportName(transport)}</span>
                  </Badge>
                </div>
              )}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg md:text-xl text-white/90 max-w-5xl mx-auto"
            >
              {destination.description}
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <div className="max-w-6xl mx-auto mb-8">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          
          <div className="max-w-6xl mx-auto">
            {/* Highlights */}
            {destination.highlights && destination.highlights.length > 0 && (
              <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
                Lo mejor de <span className="text-primary">{destination.name}</span>
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {destination.highlights.map((highlight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <span className="text-gray-700">{highlight}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>)}
            

            {/* Packages Section */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">Paquetes Disponibles</h2>

              {isLoading ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {[1, 2].map((i) => (
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
                <div className="grid md:grid-cols-2 gap-8">
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
                            <Badge className="bg-gradient-to-r from-secondary to-secondary/80 text-gray-900 font-semibold shadow-lg">
                              Desde ${pkg.price}
                            </Badge>
                          </div>
                          <div className="absolute top-4 left-4 space-y-2">
                            <Badge variant="outline" className="bg-white/90 text-gray-900 border-white flex justify-center">
                              {pkg.duration}
                            </Badge>
                            {transport && transport !== 'all' && (
                              <Badge className={`${getTransportColor(transport)} flex`}>
                                {getTransportIcon(transport)}
                                <span className="ml-1">{getTransportName(transport)}</span>
                              </Badge>
                            )}
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
                          </div>

                          <div className="flex gap-3">
                            <NavigationButton 
                              href={`/paquete/${pkg.id}`}
                              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-white"
                              loadingText="Cargando..."
                            >
                              Ver Detalles
                            </NavigationButton>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500"
                >
                  {transport && transport !== 'all' ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 opacity-50 flex items-center justify-center bg-gray-100 rounded-full">
                        {getTransportIcon(transport)}
                      </div>
                      <p className="text-lg">
                        No hay paquetes disponibles {getTransportName(transport).toLowerCase()} para {destination.name}
                      </p>
                      <p className="text-sm">Pronto agregaremos nuevas opciones para este tipo de transporte</p>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No hay paquetes disponibles para este destino</p>
                      <p className="text-sm">Pronto agregaremos nuevas opciones</p>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-16"
            >
              <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl p-8 md:p-12 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para tu aventura?</h3>
                <p className="text-lg mb-6 text-white/90">
                  Contactanos para personalizar tu viaje a {destination.name} según tus preferencias y presupuesto.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-gray-900 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Link
                      href="/contacto"
                    >
                      Solicitar Cotización
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl bg-transparent"
                  >
                    <Link
                      href="/"
                      onClick={(e) => {
                        e.preventDefault()
                        window.location.href = "/#destinos"
                      }}
                    >
                      Ver Otros Destinos
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
