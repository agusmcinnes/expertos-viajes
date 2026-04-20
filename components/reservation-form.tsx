"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Calendar, Hotel, Users, Check, AlertCircle, Plus, X, Edit, Info, BedDouble, ClipboardCheck, CheckCircle2, ChevronLeft, ChevronRight, Star, Utensils } from "lucide-react"
import { supabase, stockService, reservationService, type CreateReservationData } from "@/lib/supabase"
import { sendReservationNotification } from "@/lib/emailjs"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/hooks/use-toast"
import { BirthDatePicker } from "@/components/ui/birth-date-picker"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { differenceInYears } from "date-fns"
import { getRoomTypeName, getRoomCapacity } from "@/lib/room-utils"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DNI_REGEX = /^\d{7,8}$/

const normalizeDni = (value: string) => value.replace(/\D/g, '')
const normalizePhone = (value: string) => value.replace(/\D/g, '')

const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim())
const isValidDni = (value: string) => DNI_REGEX.test(normalizeDni(value))
const isValidPhone = (value: string) => normalizePhone(value).length >= 8

interface Accommodation {
  id: number
  name: string
  stars: number
  regimen?: string | null
  hasStock?: boolean
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
  dni?: string
  email?: string
  telefono?: string
  datos_pendientes?: boolean
}

// Step Progress Bar Component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { id: 1, label: "Fecha", icon: Calendar },
    { id: 2, label: "Alojamiento", icon: Hotel },
    { id: 3, label: "Habitaciones", icon: BedDouble },
    { id: 4, label: "Pasajeros", icon: Users },
    { id: 5, label: "Resumen", icon: ClipboardCheck },
  ]

  return (
    <div className="w-full px-2 sm:px-4 mb-6 sm:mb-8">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        {/* Progress line */}
        <motion.div
          className="absolute top-4 sm:top-5 left-0 h-0.5 bg-primary z-0"
          initial={false}
          animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />

        {steps.map((step) => {
          const Icon = step.icon
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          const isPending = currentStep < step.id

          return (
            <div key={step.id} className="flex flex-col items-center z-10 relative">
              <motion.div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isActive
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </motion.div>
              <span className={`hidden sm:block text-xs mt-1.5 font-medium ${
                isCompleted ? "text-green-600" : isActive ? "text-primary" : "text-gray-400"
              }`}>
                {step.label}
              </span>
              <span className={`sm:hidden text-[10px] mt-1 font-medium ${
                isCompleted ? "text-green-600" : isActive ? "text-primary" : "text-gray-400"
              }`}>
                {step.id}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reservationId, setReservationId] = useState<number | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Datos del formulario
  const [roomsData, setRoomsData] = useState<RoomDetail[]>([])
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [comentarios, setComentarios] = useState("")

  // Navigation helpers
  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1)
    setStep(newStep)
  }

  const nextStep = () => {
    setDirection(1)
    setStep(s => s + 1)
  }

  const prevStep = () => {
    setDirection(-1)
    setStep(s => s - 1)
  }

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

  // Inicializar titular vacío cuando se llega al paso 4
  useEffect(() => {
    if (step === 4 && passengers.length === 0) {
      setPassengers([{
        tipo_pasajero: 'titular',
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        dni: "",
        email: "",
        telefono: "",
        datos_pendientes: false
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

      const flexibleStock = data?.find((item: any) => item.flexible_dates === true)
      if (flexibleStock) {
        setHasFlexibleStock(true)
        setAvailableDates([flexibleStock])
      } else {
        setHasFlexibleStock(false)
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

      const { data: stockData, error: stockError } = await supabase
        .from("package_stock")
        .select("accommodation_id")
        .eq("package_id", packageId)
        .eq("is_available", true)
        .or(`fecha_salida.eq.${fecha},flexible_dates.eq.true`)

      if (stockError) throw stockError

      const accommodationIdsWithStock = Array.from(new Set(stockData?.map(s => s.accommodation_id) || []))

      const { data: accomData, error: accomError } = await supabase
        .from("accommodations")
        .select("*")
        .eq("paquete_id", packageId)
        .order("name")

      if (accomError) throw accomError

      const uniqueAccommodationsMap: { [key: string]: Accommodation } = {}

      ;(accomData || []).forEach(accom => {
        const key = accom.name.trim().toLowerCase()
        if (!uniqueAccommodationsMap[key]) {
          uniqueAccommodationsMap[key] = {
            id: accom.id,
            name: accom.name,
            stars: accom.stars,
            regimen: accom.regimen,
            hasStock: accommodationIdsWithStock.includes(accom.id)
          }
        } else {
          if (accommodationIdsWithStock.includes(accom.id)) {
            uniqueAccommodationsMap[key].hasStock = true
            uniqueAccommodationsMap[key].id = accom.id
          }
        }
      })

      const accommodationsWithAvailability = Object.values(uniqueAccommodationsMap)
        .filter(a => a.hasStock)
        .sort((a, b) => a.name.localeCompare(b.name))

      setAccommodations(accommodationsWithAvailability)
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

  const addRoom = (tipo: 'dbl' | 'tpl' | 'cpl') => {
    const currentCount = roomsData.filter(r => r.tipo_habitacion === tipo).reduce((sum, r) => sum + r.cantidad, 0)
    const stockAvailable = getStockForRoomType(tipo)

    if (currentCount >= stockAvailable) {
      toast({
        title: "Limite alcanzado",
        description: `No puedes agregar mas habitaciones ${getRoomTypeName(tipo)}`,
        variant: "destructive"
      })
      return
    }

    setRoomsData([...roomsData, {
      tipo_habitacion: tipo,
      cantidad: 1,
      subtipo_habitacion: 'matrimonial'
    }])
  }

  const removeRoom = (index: number) => {
    setRoomsData(roomsData.filter((_, i) => i !== index))
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
        title: "Capacidad maxima alcanzada",
        description: `Solo puedes agregar ${totalCapacity} pasajeros segun las habitaciones seleccionadas`,
        variant: "destructive"
      })
      return
    }

    setPassengers([...passengers, {
      tipo_pasajero: tipo,
      nombre: "",
      apellido: "",
      fecha_nacimiento: "",
      dni: "",
      email: "",
      telefono: "",
      datos_pendientes: false
    }])
  }

  const removePassenger = (index: number) => {
    const passengerToRemove = passengers[index]
    if (passengerToRemove.tipo_pasajero === 'titular') {
      setPassengers([{
        tipo_pasajero: 'titular',
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        dni: "",
        email: "",
        telefono: "",
        datos_pendientes: false
      }])
    } else {
      setPassengers(passengers.filter((_, i) => i !== index))
    }
  }

  const updatePassenger = (index: number, field: keyof Passenger, value: string | boolean) => {
    const newPassengers = [...passengers]
    newPassengers[index] = { ...newPassengers[index], [field]: value }
    setPassengers(newPassengers)
  }

  const getDuplicateDnis = () => {
    const counts: Record<string, number> = {}
    passengers.forEach(p => {
      if (p.datos_pendientes) return
      const dni = normalizeDni(p.dni || '')
      if (dni) counts[dni] = (counts[dni] || 0) + 1
    })
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([dni]) => dni))
  }

  const isPassengerValid = (p: Passenger, duplicates: Set<string>) => {
    const baseValid = p.nombre.trim() !== '' && p.apellido.trim() !== '' && p.fecha_nacimiento !== ''
    if (p.datos_pendientes) return baseValid
    if (!baseValid) return false
    if (!isValidDni(p.dni || '')) return false
    if (!isValidEmail(p.email || '')) return false
    if (!isValidPhone(p.telefono || '')) return false
    if (duplicates.has(normalizeDni(p.dni || ''))) return false
    return true
  }

  const isTitularComplete = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular) return false
    return isPassengerValid(titular, getDuplicateDnis())
  }

  const isTitularAdult = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular || !titular.fecha_nacimiento) return false
    return differenceInYears(new Date(), new Date(titular.fecha_nacimiento)) >= 18
  }

  const getTitularAge = () => {
    const titular = passengers.find(p => p.tipo_pasajero === 'titular')
    if (!titular || !titular.fecha_nacimiento) return null
    return differenceInYears(new Date(), new Date(titular.fecha_nacimiento))
  }

  const getAgeAtTravel = (fechaNacimiento: string) => {
    if (!fechaNacimiento || !selectedDate) return null
    return differenceInYears(new Date(selectedDate), new Date(fechaNacimiento))
  }

  const canSubmit = () => {
    if (!passengers.some(p => p.tipo_pasajero === 'titular')) return false
    if (!isTitularAdult()) return false
    const duplicates = getDuplicateDnis()
    return passengers.every(p => isPassengerValid(p, duplicates))
  }

  const handleSubmit = async () => {
    if (!canSubmit() || !selectedAccommodation || !selectedDate) return

    try {
      setIsSubmitting(true)
      setError(null)

      const passengersWithAge = passengers.map(p => ({
        ...p,
        edad_al_viajar: p.fecha_nacimiento ? getAgeAtTravel(p.fecha_nacimiento) : undefined
      }))

      const titular = passengers.find(p => p.tipo_pasajero === 'titular')
      if (!titular) throw new Error('No se encontro el titular')

      const reservationData: CreateReservationData = {
        package_id: packageId,
        accommodation_id: selectedAccommodation,
        fecha_salida: selectedDate,
        cliente_nombre: `${titular.nombre} ${titular.apellido}`,
        cliente_email: titular.email || '',
        cliente_telefono: titular.telefono || '',
        comentarios: comentarios || undefined,
        details: roomsData,
        passengers: passengersWithAge
      }

      const result = await reservationService.createReservation(reservationData)

      if (!result.success) {
        throw new Error(result.error || "Error al crear la reserva")
      }

      setReservationId(result.reservation.id)

      const notified = await sendReservationNotification({
        packageName,
        reservationId: result.reservation.id,
        clientName: `${titular.nombre} ${titular.apellido}`,
        clientEmail: titular.email || '',
        clientPhone: titular.telefono || '',
        accommodation: accommodations.find(a => a.id === selectedAccommodation)?.name || "",
        departureDate: selectedDate,
        rooms: roomsData,
        passengers: passengersWithAge,
        comments: comentarios
      })

      if (!notified) {
        toast({
          title: "Reserva creada, aviso pendiente",
          description: "Tu reserva quedó registrada. Si no recibís contacto en 24hs, escribinos por WhatsApp.",
          variant: "default"
        })
      }

      setSuccess(true)
      toast({
        title: "Reserva exitosa!",
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

  const getSelectedAccommodationName = () => {
    return accommodations.find(a => a.id === selectedAccommodation)?.name || ""
  }

  const getSelectedAccommodationStars = () => {
    return accommodations.find(a => a.id === selectedAccommodation)?.stars || 0
  }

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Animation variants for step transitions
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Progress Bar */}
      {!success && <StepIndicator currentStep={step} totalSteps={5} />}

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
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
            className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold text-green-800 mb-3">Reserva Exitosa!</h3>
            <p className="text-green-700 mb-4 max-w-md mx-auto">
              Tu pre-reserva ha sido registrada correctamente. En breve te contactaremos para confirmar y cotizar.
            </p>
            {reservationId && (
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-4">
                <span className="text-sm text-gray-500">Reserva</span>
                <span className="font-bold text-primary">#{reservationId}</span>
              </div>
            )}
            {passengers.find(p => p.tipo_pasajero === 'titular')?.email && (
              <p className="text-sm text-gray-600">
                Enviamos confirmacion a {passengers.find(p => p.tipo_pasajero === 'titular')?.email}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Content with Animations */}
      {!success && (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* ===== STEP 1: Fecha ===== */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Selecciona tu fecha de salida</h2>
                  <p className="text-sm text-gray-500 mt-1">Elige cuando queres viajar</p>
                </div>

                {isLoadingDates ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">Cargando fechas...</p>
                  </div>
                ) : availableDates.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay fechas disponibles para este paquete</p>
                  </div>
                ) : hasFlexibleStock ? (
                  <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-primary">Fechas Flexibles</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Este paquete tiene fechas flexibles. Elegi cualquier fecha disponible.</p>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full text-lg h-12"
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDates.map((date) => {
                      const dateObj = date.fecha_salida ? new Date(date.fecha_salida) : null
                      if (!dateObj) return null
                      const isSelected = selectedDate === date.fecha_salida
                      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' })
                      const day = dateObj.getDate()
                      const month = dateObj.toLocaleDateString('es-ES', { month: 'short' })
                      const year = dateObj.getFullYear()

                      return (
                        <motion.button
                          key={date.fecha_salida}
                          onClick={() => setSelectedDate(date.fecha_salida || "")}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "border-gray-200 hover:border-primary/40 hover:bg-gray-50"
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center ${
                              isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                            }`}>
                              <span className="text-xs uppercase font-medium leading-none">{dayName}</span>
                              <span className="text-xl font-bold leading-tight">{day}</span>
                            </div>
                            <div>
                              <p className={`font-semibold capitalize ${isSelected ? "text-primary" : "text-gray-800"}`}>
                                {month} {year}
                              </p>
                              <p className="text-xs text-gray-500">
                                {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between gap-3 pt-2">
                  {onClose && (
                    <Button variant="ghost" onClick={onClose} className="text-gray-500">
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={nextStep}
                    disabled={!selectedDate}
                    className="ml-auto text-white min-w-[140px] h-11"
                    size="lg"
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== STEP 2: Alojamiento ===== */}
            {step === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Elegí tu alojamiento</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDateDisplay(selectedDate)}
                  </p>
                </div>

                {isLoadingAccommodations ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">Cargando alojamientos...</p>
                  </div>
                ) : accommodations.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay alojamientos disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accommodations.map((acc) => {
                      const isSelected = selectedAccommodation === acc.id
                      return (
                        <motion.button
                          key={`accom-${acc.id}`}
                          onClick={() => {
                            setSelectedAccommodation(acc.id)
                            setRoomsData([])
                          }}
                          className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "border-gray-200 hover:border-primary/40 hover:bg-gray-50"
                          }`}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                                  {acc.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star key={i} className={`w-3.5 h-3.5 ${i < acc.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                  ))}
                                </div>
                                {acc.regimen && (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
                                    <Utensils className="w-3 h-3" />
                                    {acc.regimen}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-500">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!selectedAccommodation}
                    className="text-white min-w-[140px] h-11"
                    size="lg"
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== STEP 3: Habitaciones ===== */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Arma tu habitacion</h2>
                  <p className="text-sm text-gray-500 mt-1">Toca <strong>+</strong> para agregar habitaciones</p>
                </div>

                {/* Room type cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['dbl', 'tpl', 'cpl'] as const).map((tipo) => {
                    const agregadas = roomsData.filter(r => r.tipo_habitacion === tipo).length
                    const stockDisponible = getStockForRoomType(tipo)
                    const restantes = Math.max(0, stockDisponible - agregadas)
                    const puedeAgregar = restantes > 0
                    const sinStock = stockDisponible === 0

                    return (
                      <motion.div
                        key={tipo}
                        className={`rounded-xl border-2 p-3 sm:p-4 text-center transition-all ${
                          sinStock ? 'border-gray-100 bg-gray-50 opacity-40' :
                          !puedeAgregar ? 'border-gray-200 bg-gray-50' :
                          'border-gray-200 hover:border-primary/30 hover:shadow-sm'
                        }`}
                        whileTap={puedeAgregar ? { scale: 0.97 } : {}}
                      >
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {Array.from({ length: getRoomCapacity(tipo) }, (_, i) => (
                            <Users key={i} className="w-3 h-3 text-primary/60" />
                          ))}
                        </div>
                        <h4 className="font-bold text-sm sm:text-base mb-0.5">{getRoomTypeName(tipo)}</h4>
                        <p className="text-xs text-gray-500 mb-1">{getRoomCapacity(tipo)} personas</p>
                        <p className={`text-[11px] mb-2 font-medium ${sinStock ? 'text-gray-400' : puedeAgregar ? 'text-green-600' : 'text-amber-600'}`}>
                          {sinStock ? 'Sin cupo' : `Quedan ${restantes}`}
                        </p>
                        <Button
                          onClick={() => addRoom(tipo)}
                          disabled={!puedeAgregar}
                          size="sm"
                          className="w-full text-white rounded-lg h-9"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        {agregadas > 0 && (
                          <p className="text-xs text-primary font-medium mt-2">{agregadas} agregada{agregadas > 1 ? 's' : ''}</p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>

                {/* Selected rooms */}
                {roomsData.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">Habitaciones seleccionadas</h4>
                      <Badge variant="outline" className="text-sm font-medium">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        {getTotalCapacity()} personas
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {roomsData.map((room, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BedDouble className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">{getRoomTypeName(room.tipo_habitacion)}</span>
                              <span className="text-xs text-gray-500">({getRoomCapacity(room.tipo_habitacion)} pers.)</span>
                            </div>
                            {/* Bed type toggle */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => updateRoomSubtype(index, 'matrimonial')}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                  room.subtipo_habitacion === 'matrimonial'
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary/50'
                                }`}
                              >
                                Matrimonial
                              </button>
                              <button
                                onClick={() => updateRoomSubtype(index, 'twin')}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                  room.subtipo_habitacion === 'twin'
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary/50'
                                }`}
                              >
                                Camas separadas
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => removeRoom(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-500">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button
                    onClick={() => {
                      if (roomsData.length === 0) {
                        toast({ title: "Agrega al menos una habitacion", variant: "destructive" })
                        return
                      }
                      if (!roomsData.every(r => r.subtipo_habitacion)) {
                        toast({ title: "Selecciona el tipo de cama para todas las habitaciones", variant: "destructive" })
                        return
                      }
                      nextStep()
                    }}
                    disabled={roomsData.length === 0}
                    className="text-white min-w-[140px] h-11"
                    size="lg"
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== STEP 4: Pasajeros ===== */}
            {step === 4 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Datos de pasajeros</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {passengers.length} de {getTotalCapacity()} pasajeros
                  </p>
                  {/* Mini progress bar */}
                  <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto mt-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${(passengers.length / Math.max(getTotalCapacity(), 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Titular Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <h3 className="font-semibold text-base">Titular del viaje</h3>
                    <Badge variant="outline" className="text-xs">Obligatorio</Badge>
                  </div>

                  {isTitularComplete() && isTitularAdult() ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-xl bg-green-50 border border-green-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Titular confirmado</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const titularIndex = passengers.findIndex(p => p.tipo_pasajero === 'titular')
                            if (titularIndex !== -1) removePassenger(titularIndex)
                          }}
                          className="text-gray-500 hover:text-gray-700 h-8"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                      </div>
                      {passengers.filter(p => p.tipo_pasajero === 'titular').map((titular) => (
                        <div key="titular-info" className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <p><span className="text-gray-500">Nombre:</span> <strong>{titular.nombre} {titular.apellido}</strong></p>
                          <p><span className="text-gray-500">DNI:</span> <strong>{titular.dni}</strong></p>
                          <p><span className="text-gray-500">Email:</span> <strong>{titular.email}</strong></p>
                          <p><span className="text-gray-500">Edad:</span> <strong>{getTitularAge()} anios</strong></p>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Datos Personales */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos personales</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                              <Input
                                value={passengers[0]?.nombre || ''}
                                onChange={(e) => updatePassenger(0, 'nombre', e.target.value)}
                                placeholder="Nombre"
                                className="h-11"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                              <Input
                                value={passengers[0]?.apellido || ''}
                                onChange={(e) => updatePassenger(0, 'apellido', e.target.value)}
                                placeholder="Apellido"
                                className="h-11"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                              <Input
                                value={passengers[0]?.dni || ''}
                                onChange={(e) => updatePassenger(0, 'dni', e.target.value)}
                                placeholder="12345678"
                                className="h-11"
                              />
                              {passengers[0]?.dni && !isValidDni(passengers[0].dni) && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> DNI invalido (7 u 8 digitos)
                                </p>
                              )}
                              {passengers[0]?.dni && isValidDni(passengers[0].dni) && getDuplicateDnis().has(normalizeDni(passengers[0].dni)) && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Este DNI ya esta en otro pasajero
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                              <BirthDatePicker
                                date={passengers[0]?.fecha_nacimiento ? new Date(passengers[0].fecha_nacimiento) : undefined}
                                onSelect={(date) => {
                                  if (date) updatePassenger(0, 'fecha_nacimiento', date.toISOString().split('T')[0])
                                }}
                                placeholder="Selecciona fecha"
                                maxYear={new Date().getFullYear() - 18}
                                minYear={1920}
                              />
                              {passengers[0]?.fecha_nacimiento && selectedDate && isTitularAdult() && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600">
                                  <Info className="w-3 h-3" />
                                  Edad al viajar: {getAgeAtTravel(passengers[0].fecha_nacimiento)} anios
                                </div>
                              )}
                              {passengers[0]?.fecha_nacimiento && !isTitularAdult() && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  El titular debe ser mayor de 18 anios (tiene {getTitularAge()} anios)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Datos de Contacto */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos de contacto</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                              <Input
                                type="email"
                                value={passengers[0]?.email || ''}
                                onChange={(e) => updatePassenger(0, 'email', e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="h-11"
                              />
                              {passengers[0]?.email && !isValidEmail(passengers[0].email) && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Email invalido
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
                              <Input
                                type="tel"
                                value={passengers[0]?.telefono || ''}
                                onChange={(e) => updatePassenger(0, 'telefono', e.target.value)}
                                placeholder="+54 9 11 1234-5678"
                                className="h-11"
                              />
                              {passengers[0]?.telefono && !isValidPhone(passengers[0].telefono) && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Telefono muy corto (min. 8 digitos)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            if (!isTitularAdult()) {
                              toast({ title: `El titular debe ser mayor de 18 anios (tiene ${getTitularAge()} anios)`, variant: "destructive" })
                              return
                            }
                            if (!isTitularComplete()) {
                              toast({ title: "Revisa los campos del titular", description: "Hay campos incompletos o con formato invalido", variant: "destructive" })
                              return
                            }
                            toast({ title: "Titular confirmado", description: "Datos guardados correctamente" })
                          }}
                          disabled={!isTitularComplete() || !isTitularAdult()}
                          className="w-full text-white h-11"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar Titular
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Companions Section */}
                {isTitularComplete() && isTitularAdult() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <Separator className="my-2" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-bold">+</span>
                        </div>
                        <h3 className="font-semibold text-base">Acompanantes</h3>
                        <span className="text-xs text-gray-400">Opcional</span>
                      </div>
                      {passengers.length < getTotalCapacity() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addPassenger('acompañante')}
                          className="h-8 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Agregar
                        </Button>
                      )}
                    </div>

                    {passengers.filter(p => p.tipo_pasajero === 'acompañante').length > 0 ? (
                      <Accordion type="single" collapsible defaultValue={`acomp-${passengers.findIndex(p => p.tipo_pasajero === 'acompañante' && !p.nombre)}`} className="space-y-2">
                        {passengers.map((passenger, index) => {
                          if (passenger.tipo_pasajero !== 'acompañante') return null
                          const acompNum = passengers.filter((p, i) => p.tipo_pasajero === 'acompañante' && i <= index).length
                          const duplicates = getDuplicateDnis()
                          const isValid = isPassengerValid(passenger, duplicates)
                          const hasName = passenger.nombre.trim() && passenger.apellido.trim()
                          const ageAtTravel = passenger.fecha_nacimiento ? getAgeAtTravel(passenger.fecha_nacimiento) : null
                          const summary = hasName
                            ? `${passenger.nombre} ${passenger.apellido}${ageAtTravel !== null ? ` — ${ageAtTravel} años` : ''}`
                            : 'Datos incompletos'
                          return (
                            <AccordionItem key={index} value={`acomp-${index}`} className="border border-gray-200 rounded-lg px-3 bg-white">
                              <div className="flex items-center gap-2">
                                <AccordionTrigger className="flex-1 hover:no-underline py-3">
                                  <div className="flex items-center gap-2 text-left flex-1">
                                    <Badge variant={isValid ? 'default' : 'secondary'} className="text-xs shrink-0">
                                      Acomp. #{acompNum}
                                    </Badge>
                                    <span className={`text-sm truncate ${isValid ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {summary}
                                    </span>
                                    {passenger.datos_pendientes && (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] shrink-0">
                                        Datos pendientes
                                      </Badge>
                                    )}
                                  </div>
                                </AccordionTrigger>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removePassenger(index) }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label="Eliminar acompañante"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <AccordionContent className="pb-4">
                                <div
                                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4 cursor-pointer"
                                  onClick={() => {
                                    const newPassengers = [...passengers]
                                    const currentValue = Boolean(newPassengers[index].datos_pendientes)
                                    const newValue = !currentValue
                                    newPassengers[index] = {
                                      ...newPassengers[index],
                                      datos_pendientes: newValue,
                                      dni: newValue ? '' : newPassengers[index].dni,
                                      email: newValue ? '' : newPassengers[index].email,
                                      telefono: newValue ? '' : newPassengers[index].telefono
                                    }
                                    setPassengers(newPassengers)
                                  }}
                                >
                                  <Checkbox
                                    checked={Boolean(passenger.datos_pendientes)}
                                    className="pointer-events-none mt-0.5"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">Lo completo despues</span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Marca esta opcion si te falta algun documento
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <Input
                                      value={passenger.nombre}
                                      onChange={(e) => updatePassenger(index, 'nombre', e.target.value)}
                                      placeholder="Nombre"
                                      className="h-11"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                                    <Input
                                      value={passenger.apellido}
                                      onChange={(e) => updatePassenger(index, 'apellido', e.target.value)}
                                      placeholder="Apellido"
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                                    <BirthDatePicker
                                      date={passenger.fecha_nacimiento ? new Date(passenger.fecha_nacimiento) : undefined}
                                      onSelect={(date) => {
                                        if (date) updatePassenger(index, 'fecha_nacimiento', date.toISOString().split('T')[0])
                                      }}
                                      placeholder="Selecciona fecha"
                                      maxYear={new Date().getFullYear()}
                                      minYear={1920}
                                    />
                                    {passenger.fecha_nacimiento && selectedDate && (
                                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600">
                                        <Info className="w-3 h-3" />
                                        Edad al viajar: {ageAtTravel} anios
                                      </div>
                                    )}
                                  </div>

                                  {!passenger.datos_pendientes && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                                        <Input
                                          value={passenger.dni || ''}
                                          onChange={(e) => updatePassenger(index, 'dni', e.target.value)}
                                          placeholder="12345678"
                                          className="h-11"
                                        />
                                        {passenger.dni && !isValidDni(passenger.dni) && (
                                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> DNI invalido (7 u 8 digitos)
                                          </p>
                                        )}
                                        {passenger.dni && isValidDni(passenger.dni) && duplicates.has(normalizeDni(passenger.dni)) && (
                                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Este DNI ya esta en otro pasajero
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <Input
                                          type="email"
                                          value={passenger.email || ''}
                                          onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                                          placeholder="correo@ejemplo.com"
                                          className="h-11"
                                        />
                                        {passenger.email && !isValidEmail(passenger.email) && (
                                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Email invalido
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
                                        <Input
                                          type="tel"
                                          value={passenger.telefono || ''}
                                          onChange={(e) => updatePassenger(index, 'telefono', e.target.value)}
                                          placeholder="+54 9 11 1234-5678"
                                          className="h-11"
                                        />
                                        {passenger.telefono && !isValidPhone(passenger.telefono) && (
                                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Telefono muy corto (min. 8 digitos)
                                          </p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          Sin acompanantes. Toca "Agregar" si viajas con mas personas.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-500">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button
                    onClick={() => {
                      if (!canSubmit()) {
                        toast({ title: "Completa todos los campos requeridos", variant: "destructive" })
                        return
                      }
                      nextStep()
                    }}
                    disabled={!isTitularComplete() || !isTitularAdult()}
                    className="text-white min-w-[140px] h-11"
                    size="lg"
                  >
                    Revisar Reserva
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== STEP 5: Resumen ===== */}
            {step === 5 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Revisa tu reserva</h2>
                  <p className="text-sm text-gray-500 mt-1">Verifica que todo este correcto antes de confirmar</p>
                </div>

                {/* Summary Cards */}
                <div className="space-y-3">
                  {/* Fecha */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Fecha de salida</p>
                        <p className="font-semibold text-gray-900 capitalize">{formatDateDisplay(selectedDate)}</p>
                      </div>
                    </div>
                    <button onClick={() => goToStep(1)} className="text-xs text-primary hover:underline font-medium">Editar</button>
                  </div>

                  {/* Alojamiento */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Hotel className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Alojamiento</p>
                        <p className="font-semibold text-gray-900">{getSelectedAccommodationName()}</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {Array.from({ length: getSelectedAccommodationStars() }, (_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => goToStep(2)} className="text-xs text-primary hover:underline font-medium">Editar</button>
                  </div>

                  {/* Habitaciones */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BedDouble className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Habitaciones ({roomsData.length})</p>
                        <div className="space-y-0.5 mt-0.5">
                          {roomsData.map((room, i) => (
                            <p key={i} className="text-sm text-gray-800">
                              {getRoomTypeName(room.tipo_habitacion)} - {room.subtipo_habitacion === 'matrimonial' ? 'Matrimonial' : 'Camas separadas'}
                            </p>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Capacidad total: {getTotalCapacity()} personas</p>
                      </div>
                    </div>
                    <button onClick={() => goToStep(3)} className="text-xs text-primary hover:underline font-medium">Editar</button>
                  </div>

                  {/* Pasajeros */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Pasajeros ({passengers.length})</p>
                        <div className="space-y-1 mt-1">
                          {passengers.map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Badge variant={p.tipo_pasajero === 'titular' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                {p.tipo_pasajero === 'titular' ? 'Titular' : 'Acomp.'}
                              </Badge>
                              <span className="text-sm text-gray-800">{p.nombre} {p.apellido}</span>
                              {p.fecha_nacimiento && selectedDate && (
                                <span className="text-xs text-gray-500">({getAgeAtTravel(p.fecha_nacimiento)} anios)</span>
                              )}
                              {p.datos_pendientes && (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Datos pendientes</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => goToStep(4)} className="text-xs text-primary hover:underline font-medium">Editar</button>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comentarios adicionales</label>
                  <Textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Informacion adicional sobre la reserva (opcional)..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-500 order-2 sm:order-1">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Volver a Pasajeros
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit() || isSubmitting}
                    className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white h-12 text-base font-semibold shadow-lg shadow-green-200 order-1 sm:order-2 min-w-[200px]"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Confirmar Reserva
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
