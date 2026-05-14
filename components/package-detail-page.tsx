"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, MapPin, Calendar, Clock, Users, Plane, Bus, Ship, Hotel, Star, DollarSign, Mail, Phone, ChevronDown, ChevronUp, Utensils, CheckCircle2, PlusCircle, ExternalLink, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { TravelPackage, Destination } from "@/lib/supabase"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { ContactFormFunctional } from "./contact-form-functional"
import { ReservationForm } from "./reservation-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PackageDetailPageProps {
  packageId: string
}

interface Accommodation {
  id: number
  name: string
  stars: number
  enlace_web?: string
  regimen?: string
  rates?: AccommodationRate[]
}

interface AccommodationRate {
  id: number
  mes: number
  anio: number
  tarifa_dbl: number | null
  tarifa_tpl: number | null
  tarifa_cpl: number | null
  tarifa_menor: number | null
}

export function PackageDetailPage({ packageId }: PackageDetailPageProps) {
  const router = useRouter()
  const [package_, setPackage] = useState<TravelPackage | null>(null)
  const [destination, setDestination] = useState<Destination | null>(null)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showReservationForm, setShowReservationForm] = useState(false)
  const [showPromoAlert, setShowPromoAlert] = useState(false)
  const [showAllDates, setShowAllDates] = useState(false)

  useEffect(() => {
    loadPackageData()
  }, [packageId])

  useEffect(() => {
    if (showReservationForm) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }, [showReservationForm])

  const loadPackageData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: packageData, error: packageError } = await supabase
        .from("travel_packages")
        .select("*")
        .eq("id", parseInt(packageId))
        .eq("is_active", true)
        .single()

      if (packageError) throw new Error("Paquete no encontrado")
      setPackage(packageData)

      const { data: destinationData, error: destinationError } = await supabase
        .from("destinations")
        .select("*")
        .eq("id", packageData.destination_id)
        .single()

      if (destinationError) throw destinationError
      setDestination(destinationData)

      const { data: accommodationsData, error: accommodationsError } = await supabase
        .from("accommodations")
        .select(`
          *,
          accommodation_rates (*)
        `)
        .eq("paquete_id", parseInt(packageId))

      if (accommodationsError) throw accommodationsError

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
      case "bus": return <Bus className="w-5 h-5" />
      case "crucero": return <Ship className="w-5 h-5" />
      default: return <Plane className="w-5 h-5" />
    }
  }

  const getTransportLabel = (transportType: string) => {
    switch (transportType) {
      case "bus": return "En Bus"
      case "crucero": return "Crucero"
      default: return "En Avion"
    }
  }

  const getTransportAccentColor = (transportType: string) => {
    switch (transportType) {
      case "bus": return "bg-red-500"
      case "crucero": return "bg-blue-500"
      default: return "bg-purple-500"
    }
  }

  const getTransportBgColor = (transportType: string) => {
    switch (transportType) {
      case "bus": return "bg-red-50 text-red-700 border-red-200"
      case "crucero": return "bg-blue-50 text-blue-700 border-blue-200"
      default: return "bg-purple-50 text-purple-700 border-purple-200"
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

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null || amount === 0) return '-'
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando paquete...</p>
        </div>
      </div>
    )
  }

  if (error || !package_) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Paquete no encontrado</h1>
          <p className="text-gray-600 mb-6">{error || "El paquete solicitado no existe o no esta disponible"}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  const transportType = package_.transport_type || 'aereo'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HERO SECTION ===== */}
      <div
        className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-cover bg-center bg-gray-800 overflow-hidden"
        style={{
          backgroundImage: package_.image_url
            ? `url(${package_.image_url})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            onClick={() => router.back()}
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </Button>
        </div>

        {/* Special badge */}
        {package_.is_special && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-purple-500/90 text-white border-purple-400/30 backdrop-blur-sm shadow-lg">
              Paquete Especial
            </Badge>
          </div>
        )}

        {/* Hero content - positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 top-14 sm:top-16 pb-6 sm:pb-8 md:pb-10 flex items-end">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white max-w-4xl"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                {package_.name}
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Transport accent strip at bottom */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${getTransportAccentColor(transportType)}`} />
      </div>

      {/* ===== QUICK FACTS STRIP ===== */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {package_.duration && (
              <div className="flex items-center gap-3 py-4 px-3 sm:px-5">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getTransportBgColor(transportType)} border`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Duracion</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{package_.duration}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-4 px-3 sm:px-5">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getTransportBgColor(transportType)} border`}>
                {getTransportIcon(transportType)}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Transporte</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{getTransportLabel(transportType)}</p>
              </div>
            </div>
            {destination && (
              <div className="flex items-center gap-3 py-4 px-3 sm:px-5">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getTransportBgColor(transportType)} border`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Destino</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 truncate max-w-[140px]">
                    {package_.ciudades && package_.ciudades.length > 0
                      ? package_.ciudades.join(", ")
                      : destination.name}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-4 px-3 sm:px-5 bg-green-50/50">
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-green-100 text-green-700 border border-green-200">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Desde</p>
                <p className="text-base font-bold text-green-700 mt-0.5">{package_.price}</p>
                {package_.cuotas && (
                  <p className="text-[10px] text-green-600 font-medium">{package_.cuotas}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="container mx-auto px-4 pt-6 sm:pt-8 pb-8 sm:pb-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Descripcion del Viaje</CardTitle>
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

            {/* Services */}
            {(package_.servicios_incluidos?.length || package_.servicios_adicionales?.length) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Servicios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {package_.servicios_incluidos && package_.servicios_incluidos.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold text-green-700">Incluido en el paquete</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {package_.servicios_incluidos.map((service, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 bg-green-50 text-green-800 border border-green-200 rounded-full px-3 py-1.5 text-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {package_.servicios_incluidos?.length && package_.servicios_adicionales?.length && (
                        <Separator />
                      )}

                      {package_.servicios_adicionales && package_.servicios_adicionales.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <PlusCircle className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-700">Servicios adicionales</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {package_.servicios_adicionales.map((service, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1.5 text-sm"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Accommodations with Accordion */}
            {accommodations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg sm:text-xl">
                      <Hotel className="w-5 h-5 mr-2" />
                      Alojamientos y Tarifas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-5">
                      {accommodations.map((accommodation) => (
                        <div key={accommodation.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Hotel header */}
                          <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">{accommodation.name}</h3>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-0.5">
                                {renderStars(accommodation.stars)}
                              </div>
                              {accommodation.regimen && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  <Utensils className="w-3 h-3 mr-1" />
                                  {accommodation.regimen}
                                </Badge>
                              )}
                              {accommodation.enlace_web && (
                                <a
                                  href={accommodation.enlace_web}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Ver sitio web
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Rates */}
                          {accommodation.rates && accommodation.rates.length > 0 ? (
                            <div className="p-4 sm:p-5">
                              {/* Desktop table */}
                              <div className="hidden md:block">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-gray-200">
                                      <TableHead className="font-semibold text-gray-900">Periodo</TableHead>
                                      <TableHead className="font-semibold text-gray-900">Doble</TableHead>
                                      <TableHead className="font-semibold text-gray-900">Triple</TableHead>
                                      <TableHead className="font-semibold text-gray-900">Cuadruple</TableHead>
                                      <TableHead className="font-semibold text-gray-900">Menor</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {accommodation.rates
                                      .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
                                      .map((rate) => (
                                        <TableRow key={rate.id} className="hover:bg-gray-50/50">
                                          <TableCell className="font-medium">
                                            {getMonthName(rate.mes)} {rate.anio}
                                          </TableCell>
                                          <TableCell className="font-semibold text-green-700">{formatCurrency(rate.tarifa_dbl)}</TableCell>
                                          <TableCell className="font-semibold text-green-700">{formatCurrency(rate.tarifa_tpl)}</TableCell>
                                          <TableCell className="font-semibold text-green-700">{formatCurrency(rate.tarifa_cpl)}</TableCell>
                                          <TableCell className="font-semibold text-green-700">{formatCurrency(rate.tarifa_menor)}</TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>

                              {/* Mobile cards */}
                              <div className="md:hidden space-y-3">
                                {accommodation.rates
                                  .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
                                  .map((rate) => (
                                    <div key={rate.id} className="bg-gray-50 rounded-lg p-3">
                                      <h5 className="font-semibold text-sm mb-2 text-gray-900">
                                        {getMonthName(rate.mes)} {rate.anio}
                                      </h5>
                                      <div className="grid grid-cols-2 gap-1.5 text-sm">
                                        <div className="flex justify-between p-1.5">
                                          <span className="text-gray-500">Doble</span>
                                          <span className="font-semibold text-green-700">{formatCurrency(rate.tarifa_dbl)}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5">
                                          <span className="text-gray-500">Triple</span>
                                          <span className="font-semibold text-green-700">{formatCurrency(rate.tarifa_tpl)}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5">
                                          <span className="text-gray-500">Cuadruple</span>
                                          <span className="font-semibold text-green-700">{formatCurrency(rate.tarifa_cpl)}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5">
                                          <span className="text-gray-500">Menor</span>
                                          <span className="font-semibold text-green-700">{formatCurrency(rate.tarifa_menor)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay tarifas cargadas</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* ===== SIDEBAR ===== */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:sticky lg:top-24"
            >
              <Card className="mb-6 shadow-xl ring-1 ring-gray-100 overflow-hidden">
                {/* Price header */}
                <div className={`${getTransportAccentColor(transportType)} px-6 py-5 text-white text-center`}>
                  <p className="text-sm opacity-90 mb-1">Precio por persona</p>
                  <div className="text-3xl sm:text-4xl font-bold tracking-tight">
                    Desde {package_.price}
                  </div>
                  <p className="text-xs opacity-75 mt-1">en base doble</p>
                  {package_.cuotas && (
                    <p className="text-sm opacity-90 mt-1 font-medium">{package_.cuotas}</p>
                  )}
                </div>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* Available dates */}
                  {package_.available_dates && package_.available_dates.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                        Fechas Disponibles
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(showAllDates ? package_.available_dates : package_.available_dates.slice(0, 5)).map((date, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-gray-50 border-gray-200 font-normal"
                          >
                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                            {date}
                          </Badge>
                        ))}
                      </div>

                      {package_.available_dates.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllDates(!showAllDates)}
                          className="text-xs p-1 h-auto mt-2 text-primary hover:text-primary/80"
                        >
                          {showAllDates ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Mostrar menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Ver {package_.available_dates.length - 5} mas
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowPromoAlert(true)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white text-base font-semibold shadow-lg shadow-green-200/50 h-12 relative overflow-hidden group"
                      size="lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <Calendar className="w-5 h-5 mr-2" />
                      Reservar Ahora
                    </Button>
                    <p className="text-center text-[11px] text-gray-400 -mt-1">Sin cargo por reservar online</p>

                    <Button
                      onClick={() => setShowContactForm(true)}
                      variant="outline"
                      className="w-full border-2 text-sm h-11"
                      size="lg"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Consultar sobre este viaje
                    </Button>
                  </div>

                  <Separator />

                  {/* Phone numbers */}
                  <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      O contactanos directamente
                    </p>
                    <div className="space-y-1">
                      <a href="tel:+5493794030711" className="block text-sm font-semibold text-gray-700 hover:text-primary transition-colors">
                        +54 9 379 4030711
                      </a>
                      <a href="tel:+5493795870001" className="block text-sm font-semibold text-gray-700 hover:text-primary transition-colors">
                        +54 9 3795 870001
                      </a>
                    </div>
                    <a
                      href="https://wa.me/5493794030711"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Escribinos por WhatsApp
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE FIXED BOTTOM BAR ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <p className="text-xs text-gray-500">Desde</p>
            <p className="text-lg font-bold text-gray-900">{package_.price}</p>
            {package_.cuotas && (
              <p className="text-[10px] text-green-600 font-medium">{package_.cuotas}</p>
            )}
          </div>
          <Button
            onClick={() => setShowPromoAlert(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-semibold h-11 px-6 shadow-lg shadow-green-200/50"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Reservar
          </Button>
        </div>
      </div>

      {/* Spacer for mobile fixed bar */}
      <div className="h-20 lg:hidden" />

      {/* ===== PROMO ALERT DIALOG ===== */}
      <AlertDialog open={showPromoAlert} onOpenChange={setShowPromoAlert}>
        <AlertDialogContent className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl">
              Beneficio por Autogestion!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm sm:text-base text-muted-foreground">
                <p className="text-gray-700">
                  <strong>Por auto gestionar tu reserva accedes a una tarifa promocionada</strong>, lo veras reflejado en tu liquidacion.
                </p>
                <p className="text-gray-600">
                  Completar el formulario no genera gastos. No compartiremos tu informacion personal y no te solicitaremos datos de tus medios de pago en esta instancia.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPromoAlert(false)
                setShowReservationForm(true)
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
            >
              Entendido, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== CONTACT FORM MODAL ===== */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold pr-2">Consultar sobre {package_.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContactForm(false)}
                className="flex-shrink-0 h-8 w-8 p-0 rounded-full"
              >
                X
              </Button>
            </div>

            <ContactFormFunctional
              packageName={package_.name}
              onSuccess={() => {
                setShowContactForm(false)
              }}
            />
          </motion.div>
        </div>
      )}

      {/* ===== RESERVATION FORM MODAL ===== */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full sm:my-8 min-h-screen sm:min-h-0 max-h-screen sm:max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Reserva tu viaje</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{package_.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReservationForm(false)}
                className="flex-shrink-0 h-9 w-9 p-0 rounded-full hover:bg-gray-100"
              >
                X
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 sm:pr-2 -mr-1 sm:-mr-2">
              <ReservationForm
                packageId={parseInt(packageId)}
                packageName={package_.name}
                onSuccess={() => {
                  setShowReservationForm(false)
                }}
                onClose={() => setShowReservationForm(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
