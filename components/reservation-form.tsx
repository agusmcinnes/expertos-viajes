"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Hotel, Users, Check, AlertCircle, Plus, Minus, X, Edit } from "lucide-react"
import { supabase, stockService, reservationService, type CreateReservationData } from "@/lib/supabase"
import { sendReservationNotification, sendReservationConfirmation } from "@/lib/emailjs"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/hooks/use-toast"
import { BirthDatePicker } from "@/components/ui/birth-date-picker"
import { differenceInYears } from "date-fns"

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

interface RoomDetail {
  tipo_habitacion: 'dbl' | 'tpl' | 'cpl'
  cantidad: number
  subtipo_habitacion?: 'matrimonial' | 'twin' | null
}

interface Passenger {
  tipo_pasajero: 'titular' | 'acompañante'
  nombre: string
  apellido: string
  fecha_nacimiento: string
  cuil?: string
}

export function ReservationForm({ packageId, packageName, onSuccess, onClose }: ReservationFormProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [availableDates, setAvailableDates] = useState<StockAvailable[]>([])
  const [selectedAccommodation, setSelectedAccommodation] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [hasFlexibleStock, setHasFlexibleStock] = useState(false)
  const [isLoadingAccommodations, setIsLoadingAccommodations] = useState(false)
  const [isLoadingDates, setIsLoadingDates] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1) // 1: Fecha, 2: Alojamiento, 3: Habitaciones, 4: Pasajeros, 5: Datos de Contacto
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reservationId, setReservationId] = useState<number | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Datos del formulario
  const [roomsData, setRoomsData] = useState<RoomDetail[]>([])
  const [passengers, setPassengers] = useState<Passenger[]>([])

  const [contactData, setContactData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    comentarios: ""
  })

  // Cargar fechas disponibles al montar
  useEffect(() => {
    loadAvailableDates()
  }, [packageId])

  // Cargar alojamientos disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate) {
      loadAccommodationsForDate(selectedDate)
    }
  }, [selectedDate])

  // Cargar stock cuando se selecciona alojamiento
  useEffect(() => {
    if (selectedAccommodation && selectedDate) {
      loadStockForSelection()
    }
  }, [selectedAccommodation, selectedDate])

  // Scroll al inicio cuando cambia el paso
  useEffect(() => {
    setTimeout(() => {
      const modalContent = document.querySelector('.overflow-y-auto.flex-1') as HTMLElement
      if (modalContent) {
        modalContent.scrollTop = 0
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 50)
  }, [step])

  // Inicializar titular vacío cuando se llega al paso 4 (pasajeros)
  useEffect(() => {
    if (step === 4 && passengers.length === 0) {
      setPassengers([{
        tipo_pasajero: 'titular',
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        cuil: ""
      }])
    }
  }, [step, passengers.length])

  const loadAvailableDates = async () => {
    try {
      setIsLoadingDates(true)
      setHasFlexibleStock(false)

      const { data, error } = await supabase
        .from("package_stock")
        .select("*")
        .eq("package_id", packageId)
        .eq("is_available", true)

      if (error) throw error

      // Verificar si hay stock flexible
      const flexibleStock = data?.find((item: any) => item.flexible_dates === true)
      if (flexibleStock) {
        setHasFlexibleStock(true)
        setAvailableDates([flexibleStock])
      } else {
        setHasFlexibleStock(false)
        // Obtener fechas únicas y futuras
        const uniqueDates = Array.from(new Set(
          data?.filter((item: any) =>
            item.fecha_salida && new Date(item.fecha_salida) >= new Date()
          ).map((item: any) => item.fecha_salida)
        )).sort((a: any, b: any) =>
          new Date(a).getTime() - new Date(b).getTime()
        ).map(fecha => ({ fecha_salida: fecha }))

        setAvailableDates(uniqueDates as StockAvailable[])
      }
    } catch (error) {
      console.error("Error loading dates:", error)
      setError("Error al cargar las fechas disponibles")
    } finally {
      setIsLoadingDates(false)
    }
  }

  const loadAccommodationsForDate = async (fecha: string) => {
    try {
      setIsLoadingAccommodations(true)

      // Obtener alojamientos que tienen stock para esta fecha
      const { data: stockData, error: stockError } = await supabase
        .from("package_stock")
        .select("accommodation_id")
        .eq("package_id", packageId)
        .eq("is_available", true)
        .or(`fecha_salida.eq.${fecha},flexible_dates.eq.true`)

      if (stockError) throw stockError

      const accommodationIds = Array.from(new Set(stockData?.map(s => s.accommodation_id) || []))

      if (accommodationIds.length === 0) {
        setAccommodations([])
        return
      }

      // Cargar información de los alojamientos
      const { data: accomData, error: accomError } = await supabase
        .from("accommodations")
        .select("*")
        .eq("paquete_id", packageId)
        .in("id", accommodationIds)
        .order("name")

      if (accomError) throw accomError
      setAccommodations(accomData || [])
    } catch (error) {
      console.error("Error loading accommodations:", error)
      setError("Error al cargar los alojamientos")
    } finally {
      setIsLoadingAccommodations(false)
    }
  }

  const loadStockForSelection = async () => {
    try {
      const { data, error } = await supabase
        .from("package_stock")
        .select("*")
        .eq("package_id", packageId)
        .eq("accommodation_id", selectedAccommodation)
        .or(`fecha_salida.eq.${selectedDate},flexible_dates.eq.true`)
        .eq("is_available", true)
        .single()

      if (error) throw error

      if (data) {
        setAvailableDates([data])
      }
    } catch (error) {
      console.error("Error loading stock:", error)
      setError("Error al cargar el stock disponible")
    }
  }

  const getTotalCapacity = () => {
    return roomsData.reduce((sum, room) => {
      let capacity = 0
      if (room.tipo_habitacion === 'dbl') capacity = 2
      else if (room.tipo_habitacion === 'tpl') capacity = 3
      else if (room.tipo_habitacion === 'cpl') capacity = 4
      return sum + (room.cantidad * capacity)
    }, 0)
  }

  const getStockForRoomType = (tipo: 'dbl' | 'tpl' | 'cpl') => {
    if (availableDates.length === 0) return 0
    const stock = availableDates[0]
    if (tipo === 'dbl') return stock.stock_dbl
    if (tipo === 'tpl') return stock.stock_tpl
    if (tipo === 'cpl') return stock.stock_cpl
    return 0
  }

  const getRoomTypeName = (tipo: 'dbl' | 'tpl' | 'cpl') => {
    if (tipo === 'dbl') return 'Doble'
    if (tipo === 'tpl') return 'Triple'
    if (tipo === 'cpl') return 'Cuádruple'
    return tipo
  }

  const getRoomCapacity = (tipo: 'dbl' | 'tpl' | 'cpl') => {
    if (tipo === 'dbl') return 2
    if (tipo === 'tpl') return 3
    if (tipo === 'cpl') return 4
    return 0
  }

  const addRoom = (tipo: 'dbl' | 'tpl' | 'cpl') => {
    const currentCount = roomsData.filter(r => r.tipo_habitacion === tipo).reduce((sum, r) => sum + r.cantidad, 0)
    const stockAvailable = getStockForRoomType(tipo)

    if (currentCount >= stockAvailable) {
      toast({
        title: "Stock no disponible",
        description: `No hay más habitaciones ${getRoomTypeName(tipo)} disponibles`,
        variant: "destructive"
      })
      return
    }

    setRoomsData([...roomsData, {
      tipo_habitacion: tipo,
      cantidad: 1,
      subtipo_habitacion: tipo === 'dbl' ? 'matrimonial' : null
    }])
  }

  const removeRoom = (index: number) => {
    const newRoomsData = roomsData.filter((_, i) => i !== index)
    setRoomsData(newRoomsData)
  }

  const updateRoomSubtype = (index: number, subtipo: 'matrimonial' | 'twin') => {
    const newRoomsData = [...roomsData]
    newRoomsData[index].subtipo_habitacion = subtipo
    setRoomsData(newRoomsData)
  }

  const addPassenger = (tipo: 'acompañante') => {
    const totalCapacity = getTotalCapacity()
    if (passengers.length >= totalCapacity) {
      toast({
        title: "Capacidad máxima alcanzada",
        description: `Solo puedes agregar ${totalCapacity} pasajeros según las habitaciones seleccionadas`,
        variant: "destructive"
      })
      return
    }

    setPassengers([...passengers, {
      tipo_pasajero: tipo,
      nombre: "",
      apellido: "",
      fecha_nacimiento: "",
      cuil: undefined
    }])
  }

  const removePassenger = (index: number) => {
    const passengerToRemove = passengers[index]

    // Si es el titular, reiniciar con un formulario vacío
    if (passengerToRemove.tipo_pasajero === 'titular') {
      setPassengers([{
        tipo_pasajero: 'titular',
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        cuil: ""
      }])
    } else {
      // Si es acompañante, solo eliminarlo
      setPassengers(passengers.filter((_, i) => i !== index))
    }
  }

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...passengers]
    newPassengers[index] = { ...newPassengers[index], [field]: value }
    setPassengers(newPassengers)
  }

  const canProceedToStep2 = () => {
    return selectedDate !== ""
  }

  const canProceedToStep3 = () => {
    return selectedAccommodation !== null
  }

  const canProceedToStep4 = () => {
    if (roomsData.length === 0) return false

    // Validar que todas las habitaciones dobles tengan subtipo
    const allDoublesHaveSubtype = roomsData
      .filter(r => r.tipo_habitacion === 'dbl')
      .every(r => r.subtipo_habitacion !== null)

    return allDoublesHaveSubtype
  }

  const canProceedToStep5 = () => {
    // Validar que haya al menos un pasajero titular completo y mayor de 18
    if (!isTitularComplete() || !isTitularAdult()) return false

    // Validar que todos los acompañantes estén completos
    const acompanantes = passengers.filter(p => p.tipo_pasajero === 'acompañante')
    for (const acomp of acompanantes) {
      if (!acomp.nombre.trim() || !acomp.apellido.trim() || !acomp.fecha_nacimiento) {
        return false
      }
    }

    return true
  }

  const isTitularComplete = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular) return false

    return titular.nombre.trim() !== '' &&
           titular.apellido.trim() !== '' &&
           titular.cuil?.trim() !== '' &&
           titular.fecha_nacimiento !== ''
  }

  const isTitularAdult = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular || !titular.fecha_nacimiento) return false

    const birthDate = new Date(titular.fecha_nacimiento)
    const age = differenceInYears(new Date(), birthDate)
    return age >= 18
  }

  const getTitularAge = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular || !titular.fecha_nacimiento) return null

    const birthDate = new Date(titular.fecha_nacimiento)
    return differenceInYears(new Date(), birthDate)
  }

  const canSubmit = () => {
    // Validar que haya al menos un pasajero titular
    const hasTitular = passengers.some(p => p.tipo_pasajero === 'titular')
    if (!hasTitular) return false

    // Validar que haya al menos un pasajero
    if (passengers.length === 0) return false

    // Validar que el titular sea mayor de 18 años
    if (!isTitularAdult()) return false

    // Validar que todos los pasajeros tengan los campos requeridos
    const allPassengersValid = passengers.every(p => {
      const baseValid = p.nombre.trim() !== "" &&
                       p.apellido.trim() !== "" &&
                       p.fecha_nacimiento !== ""

      if (p.tipo_pasajero === 'titular') {
        return baseValid && p.cuil && p.cuil.trim() !== ""
      }

      return baseValid
    })

    if (!allPassengersValid) return false

    // Validar datos de contacto
    const contactValid = contactData.nombre.trim() !== "" &&
                        contactData.email.trim() !== "" &&
                        contactData.telefono.trim() !== ""

    return contactValid
  }

  const handleSubmit = async () => {
    if (!canSubmit() || !selectedAccommodation || !selectedDate) return

    try {
      setIsSubmitting(true)
      setError(null)

      const reservationData: CreateReservationData = {
        package_id: packageId,
        accommodation_id: selectedAccommodation,
        fecha_salida: selectedDate,
        cliente_nombre: contactData.nombre,
        cliente_email: contactData.email,
        cliente_telefono: contactData.telefono,
        comentarios: contactData.comentarios || undefined,
        details: roomsData,
        passengers: passengers
      }

      const result = await reservationService.createReservation(reservationData)

      if (!result.success) {
        throw new Error(result.error || "Error al crear la reserva")
      }

      setReservationId(result.reservation.id)

      // Enviar emails
      try {
        await sendReservationNotification({
          packageName,
          reservationId: result.reservation.id,
          clientName: contactData.nombre,
          clientEmail: contactData.email,
          clientPhone: contactData.telefono,
          accommodation: accommodations.find(a => a.id === selectedAccommodation)?.name || "",
          departureDate: selectedDate,
          rooms: roomsData,
          passengers: passengers,
          comments: contactData.comentarios
        })

        await sendReservationConfirmation({
          clientEmail: contactData.email,
          clientName: contactData.nombre,
          packageName,
          reservationId: result.reservation.id,
          accommodation: accommodations.find(a => a.id === selectedAccommodation)?.name || "",
          departureDate: selectedDate,
          rooms: roomsData
        })
      } catch (emailError) {
        console.error("Error sending emails:", emailError)
        // No fallar la reserva si falla el email
      }

      setSuccess(true)

      toast({
        title: "¡Reserva exitosa!",
        description: "Tu pre-reserva ha sido registrada correctamente",
      })

      setTimeout(() => {
        if (onSuccess) onSuccess()
        if (onClose) onClose()
      }, 3000)

    } catch (error) {
      console.error("Error submitting reservation:", error)
      setError(error instanceof Error ? error.message : "Error al crear la reserva")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la reserva",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener el título del paso actual
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Seleccione una fecha"
      case 2:
        return "Seleccione alojamiento"
      case 3:
        return "Seleccione habitaciones"
      case 4:
        return "Complete datos de pasajeros"
      case 5:
        return "Complete datos de contacto"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">
          {getStepTitle()}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Paso {step} de 5
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
              Tu pre-reserva ha sido registrada correctamente. En breve te contactaremos para confirmar y cotizar.
            </p>
            {reservationId && (
              <p className="text-sm text-gray-600 mb-2">
                ID de Reserva: <strong>#{reservationId}</strong>
              </p>
            )}
            <p className="text-sm text-gray-600">
              Enviamos un correo de confirmación a {contactData.email}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Seleccionar Fecha */}
      {step === 1 && !success && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="leading-tight">{hasFlexibleStock ? "Elige tu Fecha" : "Fecha de Salida"}</span>
              </CardTitle>
              {hasFlexibleStock && (
                <p className="text-xs sm:text-sm text-blue-600 mt-2">
                  📅 Este paquete tiene fechas flexibles. Elige cualquier fecha disponible.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingDates ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-gray-600">No hay fechas disponibles para este paquete</p>
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
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fechas disponibles *
                  </label>
                  <Select
                    value={selectedDate}
                    onValueChange={setSelectedDate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una fecha..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((date) => (
                        <SelectItem key={date.fecha_salida} value={date.fecha_salida || ""}>
                          {date.fecha_salida ? new Date(date.fecha_salida).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : "Fecha flexible"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2()}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Seleccionar Alojamiento */}
      {step === 2 && !success && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Alojamientos Disponibles
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Para la fecha seleccionada: {selectedDate ? new Date(selectedDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : ""}
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingAccommodations ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : accommodations.length === 0 ? (
                <p className="text-gray-600">No hay alojamientos disponibles para esta fecha</p>
              ) : (
                <Select
                  value={selectedAccommodation?.toString() || ""}
                  onValueChange={(value) => setSelectedAccommodation(parseInt(value))}
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

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3()}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Habitaciones */}
      {step === 3 && !success && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hotel className="w-5 h-5 mr-2" />
                Agregar Habitaciones
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Haz clic en el botón <strong>+</strong> para agregar habitaciones a tu reserva
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cards para agregar habitaciones */}
              <div className="grid grid-cols-1 gap-4">
                {(['dbl', 'tpl', 'cpl'] as const).map((tipo) => {
                  const agregadas = roomsData.filter(r => r.tipo_habitacion === tipo).length
                  const stockDisponible = getStockForRoomType(tipo)
                  const puedeAgregar = agregadas < stockDisponible

                  return (
                    <Card key={tipo} className={`${!puedeAgregar ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Info de la habitación */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Hotel className="w-5 h-5 text-primary" />
                              <h4 className="font-bold text-lg">{getRoomTypeName(tipo)}</h4>
                            </div>
                            <p className="text-sm text-gray-600">
                              <Users className="w-4 h-4 inline mr-1" />
                              Capacidad: <strong>{getRoomCapacity(tipo)} personas</strong>
                            </p>
                            {agregadas > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Agregadas: {agregadas}
                              </p>
                            )}
                          </div>

                          {/* Botón + grande */}
                          <Button
                            onClick={() => addRoom(tipo)}
                            disabled={!puedeAgregar}
                            size="lg"
                            className="w-10 h-10 rounded-full p-0 text-2xl"
                          >
                            <Plus className="text-white w-6 h-6" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Lista de habitaciones seleccionadas */}
              {roomsData.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">Habitaciones agregadas ({roomsData.length})</h4>
                    <Badge variant="outline" className="text-sm">
                      <Users className="w-4 h-4 mr-1" />
                      {getTotalCapacity()} personas
                    </Badge>
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    {roomsData.map((room, index) => (
                      <Card key={index} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Hotel className="w-4 h-4 text-primary" />
                                <span className="font-semibold">
                                  {getRoomTypeName(room.tipo_habitacion)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {getRoomCapacity(room.tipo_habitacion)} personas
                                </Badge>
                              </div>

                              {room.tipo_habitacion === 'dbl' && (
                                <div className="mt-2">
                                  <label className="text-xs font-medium text-gray-600 block mb-1">
                                    Tipo de cama:
                                  </label>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={room.subtipo_habitacion === 'matrimonial' ? 'default' : 'outline'}
                                      onClick={() => updateRoomSubtype(index, 'matrimonial')}
                                      className="text-xs"
                                    >
                                      Matrimonial
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={room.subtipo_habitacion === 'twin' ? 'default' : 'outline'}
                                      onClick={() => updateRoomSubtype(index, 'twin')}
                                      className="text-xs"
                                    >
                                      Twin (2 camas)
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRoom(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button
              onClick={() => {
                if (canProceedToStep4()) {
                  setStep(4)
                } else {
                  toast({
                    title: "Selección incompleta",
                    description: "Por favor selecciona el tipo de cama para todas las habitaciones dobles",
                    variant: "destructive"
                  })
                }
              }}
              disabled={roomsData.length === 0}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Pasajeros */}
      {step === 4 && !success && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Datos de Pasajeros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Capacidad máxima: {getTotalCapacity()} pasajeros |
                  Agregados: {passengers.length} pasajeros
                </p>
              </div>

              {/* Formulario de Titular */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Datos del Titular</h4>
                {isTitularComplete() && isTitularAdult() ? (
                  // Mostrar titular confirmado
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">Titular Confirmado</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const titularIndex = passengers.findIndex(p => p.tipo_pasajero === 'titular')
                          if (titularIndex !== -1) removePassenger(titularIndex)
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                    {passengers.filter(p => p.tipo_pasajero === 'titular').map((titular) => (
                      <div key="titular-info" className="text-sm space-y-1">
                        <p><strong>Nombre:</strong> {titular.nombre} {titular.apellido}</p>
                        <p><strong>CUIL:</strong> {titular.cuil}</p>
                        <p><strong>Fecha de Nacimiento:</strong> {new Date(titular.fecha_nacimiento).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} ({getTitularAge()} años)</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Mostrar formulario de titular
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre *
                          </label>
                          <Input
                            value={passengers[0]?.nombre || ''}
                            onChange={(e) => updatePassenger(0, 'nombre', e.target.value)}
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apellido *
                          </label>
                          <Input
                            value={passengers[0]?.apellido || ''}
                            onChange={(e) => updatePassenger(0, 'apellido', e.target.value)}
                            placeholder="Apellido"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CUIL *
                          </label>
                          <Input
                            value={passengers[0]?.cuil || ''}
                            onChange={(e) => updatePassenger(0, 'cuil', e.target.value)}
                            placeholder="20-12345678-9"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Nacimiento *
                          </label>
                          <BirthDatePicker
                            date={passengers[0]?.fecha_nacimiento ? new Date(passengers[0].fecha_nacimiento) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                updatePassenger(0, 'fecha_nacimiento', date.toISOString().split('T')[0])
                              }
                            }}
                            placeholder="Selecciona fecha de nacimiento"
                            maxYear={new Date().getFullYear()}
                            minYear={1920}
                          />
                          {passengers[0]?.fecha_nacimiento && !isTitularAdult() && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              El titular debe ser mayor de 18 años (tiene {getTitularAge()} años)
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (!isTitularComplete()) {
                            toast({
                              title: "Campos incompletos",
                              description: "Por favor completa todos los campos del titular",
                              variant: "destructive"
                            })
                            return
                          }
                          if (!isTitularAdult()) {
                            toast({
                              title: "Edad insuficiente",
                              description: `El titular debe ser mayor de 18 años (actualmente tiene ${getTitularAge()} años)`,
                              variant: "destructive"
                            })
                            return
                          }
                          toast({
                            title: "Titular confirmado",
                            description: "Datos del titular guardados correctamente",
                          })
                        }}
                        disabled={!isTitularComplete() || !isTitularAdult()}
                        className="w-full"
                      >
                        Confirmar Datos
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Acompañantes */}
              {isTitularComplete() && isTitularAdult() && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Acompañantes</h4>
                    {passengers.length < getTotalCapacity() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPassenger('acompañante')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Acompañante
                      </Button>
                    )}
                  </div>

                  {passengers.filter(p => p.tipo_pasajero === 'acompañante').length > 0 ? (
                    <div className="space-y-3">
                      {passengers.map((passenger, index) => {
                        if (passenger.tipo_pasajero !== 'acompañante') return null
                        return (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="secondary">
                                  Acompañante #{passengers.filter((p, i) => p.tipo_pasajero === 'acompañante' && i <= index).length}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePassenger(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                  </label>
                                  <Input
                                    value={passenger.nombre}
                                    onChange={(e) => updatePassenger(index, 'nombre', e.target.value)}
                                    placeholder="Nombre"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Apellido *
                                  </label>
                                  <Input
                                    value={passenger.apellido}
                                    onChange={(e) => updatePassenger(index, 'apellido', e.target.value)}
                                    placeholder="Apellido"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Nacimiento *
                                  </label>
                                  <BirthDatePicker
                                    date={passenger.fecha_nacimiento ? new Date(passenger.fecha_nacimiento) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        updatePassenger(index, 'fecha_nacimiento', date.toISOString().split('T')[0])
                                      }
                                    }}
                                    placeholder="Selecciona fecha de nacimiento"
                                    maxYear={new Date().getFullYear()}
                                    minYear={1920}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded-lg">
                      No hay acompañantes agregados. Si viajas con más personas, haz clic en "Agregar Acompañante".
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Atrás
            </Button>
            <Button
              onClick={() => setStep(5)}
              disabled={!canProceedToStep5()}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Datos de Contacto */}
      {step === 5 && !success && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Datos de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <Input
                    value={contactData.nombre}
                    onChange={(e) => setContactData({...contactData, nombre: e.target.value})}
                    placeholder="Nombre y apellido"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData({...contactData, email: e.target.value})}
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <Input
                    type="tel"
                    value={contactData.telefono}
                    onChange={(e) => setContactData({...contactData, telefono: e.target.value})}
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comentarios adicionales
                  </label>
                  <Textarea
                    value={contactData.comentarios}
                    onChange={(e) => setContactData({...contactData, comentarios: e.target.value})}
                    placeholder="Información adicional sobre la reserva..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(4)}>
              Atrás
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Confirmar Reserva"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
