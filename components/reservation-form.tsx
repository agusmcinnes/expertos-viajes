"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Hotel, Users, DollarSign, Check, AlertCircle, Plus, Minus } from "lucide-react"
import { supabase, stockService, reservationService, type CreateReservationData } from "@/lib/supabase"
import { sendReservationNotification, sendReservationConfirmation } from "@/lib/emailjs"
import { motion, AnimatePresence } from "framer-motion"

interface Accommodation {
  id: number
  name: string
  stars: number
  regimen?: string | null
}

interface ReservationFormProps {
  packageId: number
  packageName: string
  onSuccess?: () => void
  onClose?: () => void
}

interface StockAvailable {
  fecha_salida: string | null
  accommodation_id: number
  stock_dbl: number
  stock_tpl: number
  stock_cpl: number
  flexible_dates?: boolean
}

export function ReservationForm({ packageId, packageName, onSuccess, onClose }: ReservationFormProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [availableDates, setAvailableDates] = useState<StockAvailable[]>([])
  const [selectedAccommodation, setSelectedAccommodation] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [hasFlexibleStock, setHasFlexibleStock] = useState(false) // Nuevo estado
  const [isLoadingAccommodations, setIsLoadingAccommodations] = useState(false)
  const [isLoadingDates, setIsLoadingDates] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  const [priceBreakdown, setPriceBreakdown] = useState<any[]>([])
  const [step, setStep] = useState(1) // 1: Selección, 2: Datos personales, 3: Confirmación
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Ref para el contenedor scrolleable
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Datos del formulario
  const [roomsData, setRoomsData] = useState({
    dbl: 0,
    tpl: 0,
    cpl: 0
  })

  const [personalData, setPersonalData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    dni: "",
    comentarios: ""
  })

  // Cargar alojamientos al montar
  useEffect(() => {
    loadAccommodations()
  }, [packageId])

  // Cargar fechas disponibles cuando se selecciona un alojamiento
  useEffect(() => {
    if (selectedAccommodation) {
      loadAvailableDates(selectedAccommodation)
    }
  }, [selectedAccommodation])

  // Calcular precio cuando cambian los datos de habitaciones
  useEffect(() => {
    console.log('🔄 useEffect calculatePrice:', { 
      selectedAccommodation, 
      selectedDate, 
      hasRooms: hasRooms(),
      roomsData 
    })
    
    if (selectedAccommodation && selectedDate && hasRooms()) {
      calculatePrice()
    } else {
      setCalculatedPrice(null)
      setPriceBreakdown([])
    }
  }, [roomsData, selectedAccommodation, selectedDate])

  // Scroll al inicio cuando cambia el paso
  useEffect(() => {
    console.log('🔝 Scroll effect triggered, step:', step)
    
    // Usar setTimeout para asegurarnos de que el DOM se haya actualizado
    setTimeout(() => {
      // Buscar el contenedor scrolleable del modal (el más cercano al formulario)
      const modalContent = document.querySelector('.overflow-y-auto.flex-1') as HTMLElement
      if (modalContent) {
        console.log('✅ Found modal content, scrolling to top...')
        modalContent.scrollTop = 0
        console.log('✅ Scroll completed, scrollTop:', modalContent.scrollTop)
      } else {
        console.log('⚠️ Modal content not found, using window scroll')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 50) // Pequeño delay para asegurar que el DOM esté actualizado
  }, [step])

  const loadAccommodations = async () => {
    try {
      setIsLoadingAccommodations(true)
      const { data, error } = await supabase
        .from("accommodations")
        .select("*")
        .eq("paquete_id", packageId)
        .order("name")

      if (error) throw error
      setAccommodations(data || [])
    } catch (error) {
      console.error("Error loading accommodations:", error)
      setError("Error al cargar los alojamientos")
    } finally {
      setIsLoadingAccommodations(false)
    }
  }

  const loadAvailableDates = async (accommodationId: number) => {
    try {
      setIsLoadingDates(true)
      setHasFlexibleStock(false)
      setSelectedDate("") // Reset fecha seleccionada
      console.log('🔍 Buscando fechas para paquete:', packageId, 'alojamiento:', accommodationId)
      
      const { data, error } = await supabase
        .from("package_stock")
        .select("*")
        .eq("package_id", packageId)
        .eq("accommodation_id", accommodationId)
        .eq("is_available", true)

      console.log('📅 Fechas encontradas:', data?.length || 0, 'registros')
      console.log('📋 Datos:', data)

      if (error) throw error
      
      // Verificar si hay stock flexible
      const flexibleStock = data?.find((item: any) => item.flexible_dates === true)
      if (flexibleStock) {
        console.log('🎯 Stock flexible detectado!')
        setHasFlexibleStock(true)
        setAvailableDates([flexibleStock])
      } else {
        setHasFlexibleStock(false)
        // Filtrar solo fechas futuras para stock específico
        const futureStock = data?.filter((item: any) => 
          item.fecha_salida && new Date(item.fecha_salida) >= new Date()
        ).sort((a: any, b: any) => 
          new Date(a.fecha_salida).getTime() - new Date(b.fecha_salida).getTime()
        ) || []
        setAvailableDates(futureStock)
      }
    } catch (error) {
      console.error("Error loading dates:", error)
      setError("Error al cargar las fechas disponibles")
    } finally {
      setIsLoadingDates(false)
    }
  }

  const hasRooms = () => {
    return roomsData.dbl > 0 || roomsData.tpl > 0 || roomsData.cpl > 0
  }

  const getTotalRooms = () => {
    return roomsData.dbl + roomsData.tpl + roomsData.cpl
  }

  const calculatePrice = async () => {
    if (!selectedAccommodation || !selectedDate) return

    console.log('💰 Calculando precio...')

    try {
      const details = []
      
      if (roomsData.dbl > 0) {
        details.push({
          tipo_habitacion: 'dbl' as const,
          cantidad: roomsData.dbl,
          adultos: roomsData.dbl * 2, // 2 adultos por habitación doble
          menores: 0
        })
      }
      
      if (roomsData.tpl > 0) {
        details.push({
          tipo_habitacion: 'tpl' as const,
          cantidad: roomsData.tpl,
          adultos: roomsData.tpl * 3, // 3 adultos por habitación triple
          menores: 0
        })
      }
      
      if (roomsData.cpl > 0) {
        details.push({
          tipo_habitacion: 'cpl' as const,
          cantidad: roomsData.cpl,
          adultos: roomsData.cpl * 4, // 4 adultos por habitación cuádruple
          menores: 0
        })
      }

      console.log('📋 Detalles para calcular:', details)

      if (details.length === 0) return

      const { total, breakdown } = await reservationService.calculatePrice(
        selectedAccommodation,
        selectedDate,
        details
      )

      console.log('✅ Precio calculado:', total, breakdown)

      setCalculatedPrice(total)
      setPriceBreakdown(breakdown)
    } catch (error) {
      console.error("❌ Error calculating price:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      
      if (errorMessage.includes("No se encontraron tarifas")) {
        setError("⚠️ No hay tarifas configuradas para este mes. Contacta al administrador.")
      } else {
        setError("Error al calcular el precio: " + errorMessage)
      }
      setCalculatedPrice(null)
      setPriceBreakdown([])
    }
  }

  const handleSubmit = async () => {
    setError(null)
    
    // Validaciones
    if (!selectedAccommodation || !selectedDate) {
      setError("Por favor selecciona alojamiento y fecha")
      return
    }

    if (!hasRooms()) {
      setError("Por favor selecciona al menos una habitación")
      return
    }

    if (!personalData.nombre || !personalData.email || !personalData.telefono) {
      setError("Por favor completa todos los datos personales")
      return
    }

    try {
      setIsSubmitting(true)

      const details = []
      
      if (roomsData.dbl > 0) {
        details.push({
          tipo_habitacion: 'dbl' as const,
          cantidad: roomsData.dbl,
          adultos: roomsData.dbl * 2,
          menores: 0
        })
      }
      
      if (roomsData.tpl > 0) {
        details.push({
          tipo_habitacion: 'tpl' as const,
          cantidad: roomsData.tpl,
          adultos: roomsData.tpl * 3,
          menores: 0
        })
      }
      
      if (roomsData.cpl > 0) {
        details.push({
          tipo_habitacion: 'cpl' as const,
          cantidad: roomsData.cpl,
          adultos: roomsData.cpl * 4,
          menores: 0
        })
      }

      const totalPersons = details.reduce((sum, d) => sum + d.adultos, 0)

      const reservationData: CreateReservationData = {
        package_id: packageId,
        accommodation_id: selectedAccommodation,
        fecha_salida: selectedDate,
        cliente_nombre: personalData.nombre,
        cliente_email: personalData.email,
        cliente_telefono: personalData.telefono,
        cliente_dni: personalData.dni,
        cantidad_personas: totalPersons,
        comentarios: personalData.comentarios,
        details
      }

      const result = await reservationService.createReservation(reservationData)

      if (result.success && result.reservation) {
        setSuccess(true)
        setStep(3)
        
        // Enviar emails de notificación
        try {
          // Formato de detalles de habitaciones
          const detallesHabitaciones = result.breakdown?.map((item: any) => {
            const tipo = item.tipo_habitacion === 'dbl' ? 'Dobles' : 
                        item.tipo_habitacion === 'tpl' ? 'Triples' : 'Cuádruples'
            return `${item.cantidad}x ${tipo}`
          }).join(', ') || 'N/A'

          // Email al admin
          await sendReservationNotification({
            package_name: packageName,
            accommodation_name: selectedAccommodationData?.name || 'N/A',
            fecha_salida: new Date(selectedDate).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            cliente_nombre: personalData.nombre,
            cliente_email: personalData.email,
            cliente_telefono: personalData.telefono,
            cliente_dni: personalData.dni,
            cantidad_personas: totalPersons,
            precio_total: result.reservation.precio_total,
            detalles_habitaciones: detallesHabitaciones,
            comentarios: personalData.comentarios,
            reservation_id: result.reservation.id
          })

          // Email de confirmación al cliente
          await sendReservationConfirmation({
            package_name: packageName,
            accommodation_name: selectedAccommodationData?.name || 'N/A',
            fecha_salida: new Date(selectedDate).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            cliente_nombre: personalData.nombre,
            cliente_email: personalData.email,
            cantidad_personas: totalPersons,
            precio_total: result.reservation.precio_total,
            detalles_habitaciones: detallesHabitaciones,
            reservation_id: result.reservation.id
          })
        } catch (emailError) {
          console.error('Error sending emails:', emailError)
          // No bloqueamos la reserva por error de email
        }
        
        setTimeout(() => {
          if (onSuccess) onSuccess()
          if (onClose) onClose()
        }, 3000)
      } else {
        setError(result.error || "Error al crear la reserva")
      }
    } catch (error) {
      console.error("Error submitting reservation:", error)
      setError("Error al procesar la reserva. Por favor intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Agregar tiempo para evitar problemas de zona horaria
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const selectedStock = hasFlexibleStock && availableDates.length > 0
    ? availableDates[0] // Stock flexible (solo hay uno)
    : availableDates.find(d => d.fecha_salida === selectedDate) // Stock específico
  const selectedAccommodationData = accommodations.find(a => a.id === selectedAccommodation)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b pb-3 sm:pb-4">
        <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3 pr-4">Reservar: {packageName}</h2>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Badge variant={step === 1 ? "default" : "secondary"} className="text-xs sm:text-sm">1. Selección</Badge>
          <Badge variant={step === 2 ? "default" : "secondary"} className="text-xs sm:text-sm">2. Datos</Badge>
          <Badge variant={step === 3 ? "default" : "secondary"} className="text-xs sm:text-sm">3. Confirmación</Badge>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-green-800 mb-2">¡Reserva Exitosa!</h3>
            <p className="text-green-600 mb-4">
              Tu pre-reserva ha sido registrada correctamente. En breve te contactaremos para confirmar.
            </p>
            <p className="text-sm text-gray-600">
              Enviamos un correo de confirmación a {personalData.email}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Selección de Alojamiento y Fechas */}
      {step === 1 && !success && (
        <div className="space-y-6">
          {/* Selección de Alojamiento */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Seleccionar Alojamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAccommodations ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : accommodations.length === 0 ? (
                <p className="text-gray-600">No hay alojamientos disponibles para este paquete</p>
              ) : (
                <Select
                  value={selectedAccommodation?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedAccommodation(parseInt(value))
                    setSelectedDate("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un alojamiento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accommodations.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{acc.name}</span>
                          <span className="text-yellow-500">{'★'.repeat(acc.stars)}</span>
                          {acc.regimen && <span className="text-gray-500 text-sm">• {acc.regimen}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Selección de Fecha */}
          {selectedAccommodation && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="leading-tight">{hasFlexibleStock ? "Elige tu Fecha" : "Fecha de Salida"}</span>
                </CardTitle>
                {hasFlexibleStock && (
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    📅 Este paquete tiene fechas flexibles. Elige cualquier fecha y verificaremos la disponibilidad de tarifas.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingDates ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : availableDates.length === 0 ? (
                  <p className="text-gray-600">No hay fechas disponibles para este alojamiento</p>
                ) : hasFlexibleStock ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona tu fecha preferida *
                    </label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 La fecha debe tener tarifas configuradas. Si no hay tarifas, no podremos procesar tu reserva.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedDate}
                    onValueChange={setSelectedDate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una fecha..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((stock) => (
                        <SelectItem key={stock.fecha_salida} value={stock.fecha_salida!}>
                          {formatDate(stock.fecha_salida!)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selección de Habitaciones */}
          {selectedDate && selectedStock && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Habitaciones
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600">
                  Elige la cantidad que necesitas
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Habitaciones Dobles */}
                {selectedStock.stock_dbl > 0 && (
                  <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">Dobles</h4>
                        <p className="text-xs text-gray-600">2 personas</p>
                      </div>
                      <Badge className="bg-green-600 text-xs flex-shrink-0 ml-2">Disponible</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Cantidad:</span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, dbl: Math.max(0, prev.dbl - 1) }))}
                          disabled={roomsData.dbl === 0}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <span className="text-base sm:text-lg font-bold w-8 sm:w-12 text-center">{roomsData.dbl}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, dbl: Math.min(selectedStock.stock_dbl, prev.dbl + 1) }))}
                          disabled={roomsData.dbl >= selectedStock.stock_dbl}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Habitaciones Triples */}
                {selectedStock.stock_tpl > 0 && (
                  <div className="border rounded-lg p-3 sm:p-4 bg-green-50">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">Triples</h4>
                        <p className="text-xs text-gray-600">3 personas</p>
                      </div>
                      <Badge className="bg-green-600 text-xs flex-shrink-0 ml-2">Disponible</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Cantidad:</span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, tpl: Math.max(0, prev.tpl - 1) }))}
                          disabled={roomsData.tpl === 0}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <span className="text-base sm:text-lg font-bold w-8 sm:w-12 text-center">{roomsData.tpl}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, tpl: Math.min(selectedStock.stock_tpl, prev.tpl + 1) }))}
                          disabled={roomsData.tpl >= selectedStock.stock_tpl}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Habitaciones Cuádruples */}
                {selectedStock.stock_cpl > 0 && (
                  <div className="border rounded-lg p-3 sm:p-4 bg-purple-50">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">Cuádruples</h4>
                        <p className="text-xs text-gray-600">4 personas</p>
                      </div>
                      <Badge className="bg-green-600 text-xs flex-shrink-0 ml-2">Disponible</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Cantidad:</span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, cpl: Math.max(0, prev.cpl - 1) }))}
                          disabled={roomsData.cpl === 0}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <span className="text-base sm:text-lg font-bold w-8 sm:w-12 text-center">{roomsData.cpl}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoomsData(prev => ({ ...prev, cpl: Math.min(selectedStock.stock_cpl, prev.cpl + 1) }))}
                          disabled={roomsData.cpl >= selectedStock.stock_cpl}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen de Habitaciones */}
                {hasRooms() && (
                  <div className="bg-gray-50 border rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm sm:text-base">Total de habitaciones:</span>
                      <span className="text-xl sm:text-2xl font-bold">{getTotalRooms()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Precio Calculado */}
          {calculatedPrice !== null && (
            <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Precio Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {priceBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-start gap-2 text-xs sm:text-sm">
                      <span className="flex-1">
                        {item.cantidad}x {item.tipo_habitacion.toUpperCase()} 
                        <span className="block sm:inline sm:ml-1 text-gray-600">
                          ({item.adultos} adultos{item.menores > 0 && `, ${item.menores} menores`})
                        </span>
                      </span>
                      <span className="font-medium flex-shrink-0">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 sm:pt-3 flex justify-between items-center">
                    <span className="text-base sm:text-xl font-bold">Total:</span>
                    <span className="text-xl sm:text-3xl font-bold text-green-600">
                      {formatCurrency(calculatedPrice)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de Navegación */}
          <div className="space-y-2 sm:space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-red-800">
                {error}
              </div>
            )}
            {!hasRooms() && !error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-yellow-800">
                ℹ️ Selecciona al menos una habitación para continuar
              </div>
            )}
            {hasRooms() && calculatedPrice === null && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-blue-800">
                ⏳ Calculando precio...
              </div>
            )}
            <div className="flex gap-2 sm:gap-3">
              {onClose && (
                <Button onClick={onClose} variant="outline" className="flex-1 text-sm sm:text-base">
                  Cancelar
                </Button>
              )}
              <Button
                onClick={() => {
                  console.log('🔘 Botón continuar clickeado:', { 
                    hasRooms: hasRooms(), 
                    calculatedPrice,
                    disabled: !hasRooms() || calculatedPrice === null 
                  })
                  setStep(2)
                }}
                disabled={!hasRooms() || calculatedPrice === null}
                className="flex-1 bg-primary hover:bg-primary/90 text-sm sm:text-base"
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Datos Personales */}
      {step === 2 && !success && (
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Nombre Completo *</label>
                  <Input
                    value={personalData.nombre}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Juan Pérez"
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Email *</label>
                  <Input
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="juan@ejemplo.com"
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Teléfono *</label>
                  <Input
                    type="tel"
                    value={personalData.telefono}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="+54 9 11 1234-5678"
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">DNI (opcional)</label>
                  <Input
                    value={personalData.dni}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, dni: e.target.value }))}
                    placeholder="12345678"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Comentarios adicionales</label>
                <Textarea
                  value={personalData.comentarios}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, comentarios: e.target.value }))}
                  placeholder="Agrega cualquier información adicional..."
                  rows={3}
                  className="text-sm sm:text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Reserva */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Resumen de tu Reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-600">Paquete:</span>
                <span className="font-medium text-right">{packageName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600">Alojamiento:</span>
                <span className="font-medium text-right">{selectedAccommodationData?.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600">Fecha de salida:</span>
                <span className="font-medium text-right">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600">Habitaciones:</span>
                <span className="font-medium">{getTotalRooms()}</span>
              </div>
              <div className="border-t pt-2 sm:pt-3 flex justify-between items-center gap-2">
                <span className="text-base sm:text-lg font-bold">Precio Total:</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedPrice!)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Navegación */}
          <div className="flex gap-2 sm:gap-3">
            <Button onClick={() => setStep(1)} variant="outline" className="flex-1 text-sm sm:text-base">
              Volver
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !personalData.nombre || !personalData.email || !personalData.telefono}
              className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="hidden sm:inline">Procesando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Confirmar Reserva</span>
                  <span className="sm:hidden">Confirmar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
