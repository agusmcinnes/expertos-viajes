"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, Clock, Users, Plane, Bus, Ship, Hotel, Star, DollarSign, Mail, Phone } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { TravelPackage, Destination } from "@/lib/supabase"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { ContactFormFunctional } from "./contact-form-functional"

interface PackageDetailPageProps {
  packageId: string
}

interface Accommodation {
  id: number
  name: string
  stars: number
  enlace_web?: string
  rates?: AccommodationRate[]
}

interface AccommodationRate {
  id: number
  mes: number
  anio: number
  tarifa_dbl: number
  tarifa_tpl: number
  tarifa_cpl: number
  tarifa_menor: number
}

export function PackageDetailPage({ packageId }: PackageDetailPageProps) {
  const router = useRouter()
  const [package_, setPackage] = useState<TravelPackage | null>(null)
  const [destination, setDestination] = useState<Destination | null>(null)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)

  useEffect(() => {
    loadPackageData()
  }, [packageId])

  const loadPackageData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Cargar el paquete
      const { data: packageData, error: packageError } = await supabase
        .from("travel_packages")
        .select("*")
        .eq("id", parseInt(packageId))
        .eq("is_active", true)
        .single()

      if (packageError) throw new Error("Paquete no encontrado")

      setPackage(packageData)

      // Cargar el destino
      const { data: destinationData, error: destinationError } = await supabase
        .from("destinations")
        .select("*")
        .eq("id", packageData.destination_id)
        .single()

      if (destinationError) throw destinationError
      setDestination(destinationData)

      // Cargar alojamientos con sus tarifas
      const { data: accommodationsData, error: accommodationsError } = await supabase
        .from("accommodations")
        .select(`
          *,
          accommodation_rates (*)
        `)
        .eq("paquete_id", parseInt(packageId))

      if (accommodationsError) throw accommodationsError

      // Transformar los datos para incluir las tarifas
      const accommodationsWithRates = accommodationsData.map(acc => ({
        ...acc,
        rates: acc.accommodation_rates || []
      }))

      setAccommodations(accommodationsWithRates)

    } catch (error) {
      console.error("Error loading package data:", error)
      setError(error instanceof Error ? error.message : "Error al cargar el paquete")
    } finally {
      setIsLoading(false)
    }
  }

  const getTransportIcon = (transportType: string) => {
    switch (transportType) {
      case "bus":
        return <Bus className="w-5 h-5" />
      case "crucero":
        return <Ship className="w-5 h-5" />
      default:
        return <Plane className="w-5 h-5" />
    }
  }

  const getTransportColor = (transportType: string) => {
    switch (transportType) {
      case "bus":
        return "bg-orange-100 text-orange-800"
      case "crucero":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-sky-100 text-sky-800"
    }
  }

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ))
  }

  const getMonthName = (month: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    return months[month - 1]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando paquete...</p>
        </div>
      </div>
    )
  }

  if (error || !package_) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Paquete no encontrado</h1>
          <p className="text-gray-600 mb-6">{error || "El paquete solicitado no existe o no está disponible"}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con imagen de fondo */}
      <div 
        className="relative h-96 bg-cover bg-center bg-gray-800"
        style={{
          backgroundImage: package_.image_url 
            ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${package_.image_url})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
            <Button 
              onClick={() => router.back()} 
              variant="secondary" 
              className="mb-6 bg-white/90 hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{package_.name}</h1>
              
              <div className="flex flex-wrap gap-4 mb-6">
                {destination && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <MapPin className="w-4 h-4 mr-1" />
                    {destination.name}
                  </Badge>
                )}
                
                <Badge className={`${getTransportColor(package_.transport_type || 'aereo')} bg-white/20 text-white border-white/30`}>
                  {getTransportIcon(package_.transport_type || 'aereo')}
                  <span className="ml-1 capitalize">{package_.transport_type || 'aereo'}</span>
                </Badge>

                {package_.duration && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <Clock className="w-4 h-4 mr-1" />
                    {package_.duration}
                  </Badge>
                )}

                <Badge variant="secondary" className="bg-green-500/80 text-white border-green-400/30 text-lg px-3 py-1">
                  <DollarSign className="w-5 h-5 mr-1" />
                  Desde {formatCurrency(package_.price)}
                </Badge>
              </div>

              {package_.is_special && (
                <Badge className="bg-purple-500/80 text-white border-purple-400/30">
                  ✨ Paquete Especial
                </Badge>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            {/* Descripción */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Descripción del Viaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium text-gray-900 mb-2">{children}</h3>,
                        p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-1">{children}</ol>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic text-gray-800">{children}</em>
                      }}
                    >
                      {package_.description}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Servicios */}
            {(package_.servicios_incluidos?.length || package_.servicios_adicionales?.length) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Servicios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {package_.servicios_incluidos && package_.servicios_incluidos.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-green-700 mb-3">✅ Incluido</h3>
                          <ul className="space-y-2">
                            {package_.servicios_incluidos.map((service, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span>{service}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {package_.servicios_adicionales && package_.servicios_adicionales.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-blue-700 mb-3">➕ Adicionales</h3>
                          <ul className="space-y-2">
                            {package_.servicios_adicionales.map((service, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>{service}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Alojamientos */}
            {accommodations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Hotel className="w-5 h-5 mr-2" />
                      Alojamientos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {accommodations.map((accommodation) => (
                        <div key={accommodation.id} className="border rounded-lg p-6 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">{accommodation.name}</h3>
                              <div className="flex items-center space-x-2">
                                {renderStars(accommodation.stars)}
                                <span className="text-sm text-gray-600">({accommodation.stars} estrellas)</span>
                              </div>
                              {accommodation.enlace_web && (
                                <a 
                                  href={accommodation.enlace_web} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
                                >
                                  Visitar sitio web →
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Tarifas */}
                          {accommodation.rates && accommodation.rates.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Tarifas por Mes</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-3">Mes</th>
                                      <th className="text-left py-2 px-3">Año</th>
                                      <th className="text-left py-2 px-3">Doble</th>
                                      <th className="text-left py-2 px-3">Triple</th>
                                      <th className="text-left py-2 px-3">Cuádruple</th>
                                      <th className="text-left py-2 px-3">Menor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {accommodation.rates
                                      .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
                                      .map((rate) => (
                                      <tr key={rate.id} className="border-b hover:bg-white/50">
                                        <td className="py-2 px-3 font-medium">{getMonthName(rate.mes)}</td>
                                        <td className="py-2 px-3">{rate.anio}</td>
                                        <td className="py-2 px-3">{formatCurrency(rate.tarifa_dbl)}</td>
                                        <td className="py-2 px-3">{formatCurrency(rate.tarifa_tpl)}</td>
                                        <td className="py-2 px-3">{formatCurrency(rate.tarifa_cpl)}</td>
                                        <td className="py-2 px-3">{formatCurrency(rate.tarifa_menor)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Información del viaje */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="mb-6 sticky top-4">
                <CardHeader>
                  <CardTitle>Información del Viaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      Desde {formatCurrency(package_.price)}
                    </div>
                    <p className="text-sm text-gray-600">Precio por persona</p>
                  </div>

                  {package_.available_dates && package_.available_dates.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Fechas Disponibles
                      </h4>
                      <div className="space-y-1">
                        {package_.available_dates.slice(0, 5).map((date, index) => (
                          <div key={index} className="text-sm bg-gray-50 rounded px-2 py-1">
                            {date}
                          </div>
                        ))}
                        {package_.available_dates.length > 5 && (
                          <p className="text-xs text-gray-500">
                            +{package_.available_dates.length - 5} fechas más
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => setShowContactForm(true)}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      size="lg"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Consultar sobre este viaje
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    <p className="flex items-center justify-center mb-1">
                      <Phone className="w-4 h-4 mr-1" />
                      O llámanos directamente
                    </p>
                    <p className="font-semibold">+54 9 11 1234-5678</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modal de formulario de contacto */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Consultar sobre {package_.name}</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowContactForm(false)}
              >
                ✕
              </Button>
            </div>
            
            <ContactFormFunctional 
              packageName={package_.name}
              onSuccess={() => {
                setShowContactForm(false)
                // Aquí podrías agregar una notificación de éxito
              }}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}
