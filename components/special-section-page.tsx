"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Star, Sparkles, ArrowLeft, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { siteConfigService, packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"

export function SpecialSectionPage() {
  const [sectionTitle, setSectionTitle] = useState("Sección Especial") // Default fallback
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Cargar título de la sección especial
      try {
        const config = await siteConfigService.getConfig('special_section_title')
        setSectionTitle(config.config_value)
      } catch (error) {
        console.log("Config not found, using default title")
        // Mantener el valor por defecto si no se encuentra la configuración
      }

      // Cargar paquetes especiales
      try {
        const specialPackages = await packageService.getSpecialPackages()
        setPackages(specialPackages)
      } catch (error) {
        // Fallback: mostrar paquetes de alto precio
        const allPackages = await packageService.getActivePackages()
        const fallbackPackages = allPackages.filter(pkg => pkg.price >= 2000)
        setPackages(fallbackPackages)
      }
    } catch (error) {
      console.error("Error loading special section data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Hero Section Loading */}
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-pulse">
              <div className="h-16 bg-white/20 rounded w-96 mx-auto mb-6"></div>
              <div className="h-6 bg-white/20 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </section>

        {/* Content Loading */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"
        >
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4 text-center text-white"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <Link
                href="/"
                className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al Inicio
              </Link>
            </motion.div>

            <div className="flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-secondary mr-4" />
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight"
              >
                {sectionTitle}
              </motion.h1>
              <Sparkles className="w-12 h-12 text-secondary ml-4" />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto"
            >
              Descubrí nuestras experiencias más exclusivas y especiales, diseñadas para hacer de tu viaje 
              algo verdaderamente único e inolvidable.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {packages.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-16"
                >
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Experiencias <span className="text-primary">Exclusivas</span>
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Cada viaje en esta sección ha sido cuidadosamente seleccionado para ofrecerte 
                    lo mejor de lo mejor. Experiencias premium que transformarán tu forma de viajar.
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                            <Badge className="bg-gradient-to-r from-secondary to-secondary/80 text-gray-900 font-semibold shadow-lg">
                              ${pkg.price}
                            </Badge>
                          </div>
                          <div className="absolute top-4 left-4">
                            <Badge variant="outline" className="bg-white/90 text-gray-900 border-white">
                              {pkg.duration}
                            </Badge>
                          </div>
                          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Especial
                            </Badge>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
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
                            <div className="flex items-center text-sm text-gray-500">
                              <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                              <span>Experiencia premium exclusiva</span>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-auto">
                            <Button 
                              asChild
                              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-white"
                            >
                              <Link href={`/paquete/${pkg.id}`}>
                                Ver Detalles
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-gray-500"
              >
                <Sparkles className="w-24 h-24 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-semibold mb-4">Próximamente experiencias especiales</h3>
                <p className="text-lg mb-6">Estamos preparando algo increíble para vos</p>
                <Button asChild variant="outline">
                  <Link href="/">
                    Explorar Otros Destinos
                  </Link>
                </Button>
              </motion.div>
            )}

            {/* CTA Section */}
            {packages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mt-20"
              >
                <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl p-8 md:p-12 text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Buscás algo aún más exclusivo?</h3>
                  <p className="text-lg mb-6 text-white/90">
                    Creamos experiencias completamente personalizadas y únicas. 
                    Contanos tu sueño y lo convertimos en el viaje perfecto para vos.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      asChild
                      className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-gray-900 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <Link href="/contacto">
                        Crear Experiencia Única
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl bg-transparent"
                    >
                      <Link href="/">
                        Ver Otros Destinos
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
