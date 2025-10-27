"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, Hotel, DollarSign, Check, X, Eye, Filter } from "lucide-react"
import { reservationService, type ReservationWithDetails, type Reservation } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

export function ReservationsManager() {
  const { toast } = useToast()
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [filteredReservations, setFilteredReservations] = useState<ReservationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadReservations()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [reservations, filterStatus])

  const loadReservations = async () => {
    try {
      setIsLoading(true)
      const data = await reservationService.getAllReservations()
      setReservations(data)
    } catch (error) {
      console.error("Error loading reservations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    if (filterStatus === "all") {
      setFilteredReservations(reservations)
    } else {
      setFilteredReservations(reservations.filter(r => r.estado === filterStatus))
    }
  }

  const handleViewDetail = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setIsDetailModalOpen(true)
  }

  const handleConfirm = async (id: number) => {
    if (!confirm("¿Confirmar esta reserva? Esto reducirá el stock disponible.")) return

    try {
      setIsProcessing(true)
      await reservationService.confirmReservation(id)
      await loadReservations()
      toast({
        title: "Reserva confirmada",
        description: "La reserva se confirmó exitosamente y se actualizó el stock.",
        duration: 5000,
      })
      if (selectedReservation && selectedReservation.id === id) {
        setIsDetailModalOpen(false)
      }
    } catch (error) {
      console.error("Error confirming reservation:", error)
      toast({
        title: "Error al confirmar",
        description: "No se pudo confirmar la reserva. Intenta nuevamente.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm("¿Cancelar esta reserva? Si estaba confirmada, se restaurará el stock.")) return

    try {
      setIsProcessing(true)
      await reservationService.cancelReservation(id)
      await loadReservations()
      toast({
        title: "Reserva cancelada",
        description: "La reserva se canceló exitosamente y se restauró el stock.",
        duration: 5000,
      })
      if (selectedReservation && selectedReservation.id === id) {
        setIsDetailModalOpen(false)
      }
    } catch (error) {
      console.error("Error canceling reservation:", error)
      toast({
        title: "Error al cancelar",
        description: "No se pudo cancelar la reserva. Intenta nuevamente.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
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
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (estado: Reservation['estado']) => {
    const variants = {
      pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmada: "bg-green-100 text-green-800 border-green-200",
      cancelada: "bg-red-100 text-red-800 border-red-200",
      completada: "bg-blue-100 text-blue-800 border-blue-200"
    }
    
    const labels = {
      pendiente: "Pendiente",
      confirmada: "Confirmada",
      cancelada: "Cancelada",
      completada: "Completada"
    }
    
    return (
      <Badge className={`${variants[estado]} border`}>
        {labels[estado]}
      </Badge>
    )
  }

  const getTipoHabitacionLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      dbl: "Doble",
      tpl: "Triple",
      cpl: "Cuádruple"
    }
    return labels[tipo] || tipo
  }

  const stats = {
    total: reservations.length,
    pendientes: reservations.filter(r => r.estado === 'pendiente').length,
    confirmadas: reservations.filter(r => r.estado === 'confirmada').length,
    canceladas: reservations.filter(r => r.estado === 'cancelada').length
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmadas}</p>
              </div>
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{stats.canceladas}</p>
              </div>
              <X className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Gestión de Reservas
            </CardTitle>
            
            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="completada">Completadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando reservas...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No hay reservas {filterStatus !== 'all' && `con estado "${filterStatus}"`}</p>
              <p className="text-sm text-gray-500">Las reservas aparecerán aquí cuando los usuarios las realicen</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredReservations.map((reservation, index) => (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Info Principal */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {reservation.travel_packages?.name || 'Paquete no encontrado'}
                          </h3>
                          {getStatusBadge(reservation.estado)}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4" />
                            <span><strong>Cliente:</strong> {reservation.cliente_nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Hotel className="w-4 h-4" />
                            <span><strong>Hotel:</strong> {reservation.accommodations?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span><strong>Salida:</strong> {formatDate(reservation.fecha_salida)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span><strong>Total:</strong> {formatCurrency(reservation.precio_total)}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          <strong>Creada:</strong> {formatDate(reservation.created_at)}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex lg:flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(reservation)}
                          className="flex-1 lg:flex-none"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalle
                        </Button>
                        
                        {reservation.estado === 'pendiente' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(reservation.id)}
                            disabled={isProcessing}
                            className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Confirmar
                          </Button>
                        )}
                        
                        {(reservation.estado === 'pendiente' || reservation.estado === 'confirmada') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(reservation.id)}
                            disabled={isProcessing}
                            className="flex-1 lg:flex-none border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Detalle de Reserva #{selectedReservation?.id}</span>
              {selectedReservation && getStatusBadge(selectedReservation.estado)}
            </DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              {/* Información del Paquete */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Información del Viaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paquete:</span>
                    <span className="font-medium">{selectedReservation.travel_packages?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alojamiento:</span>
                    <span className="font-medium">
                      {selectedReservation.accommodations?.name}
                      {selectedReservation.accommodations?.stars && ` (${selectedReservation.accommodations.stars} ★)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha de Salida:</span>
                    <span className="font-medium">{formatDate(selectedReservation.fecha_salida)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Información del Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Datos del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{selectedReservation.cliente_nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedReservation.cliente_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="font-medium">{selectedReservation.cliente_telefono}</span>
                  </div>
                  {selectedReservation.cliente_dni && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">DNI:</span>
                      <span className="font-medium">{selectedReservation.cliente_dni}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detalles de Habitaciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Habitaciones Reservadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedReservation.reservation_details.map((detail) => (
                      <div key={detail.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">
                              {detail.cantidad}x Habitación {getTipoHabitacionLabel(detail.tipo_habitacion)}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {detail.adultos} adultos{detail.menores > 0 && ` + ${detail.menores} menores`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Precio unitario</p>
                            <p className="font-medium">{formatCurrency(detail.precio_unitario)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-gray-600">Subtotal:</span>
                          <span className="font-bold">{formatCurrency(detail.precio_subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Comentarios */}
              {selectedReservation.comentarios && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Comentarios del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedReservation.comentarios}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Total */}
              <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Precio Total</p>
                      <p className="text-xs text-gray-500">{selectedReservation.cantidad_personas} personas</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(selectedReservation.precio_total)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Acciones */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedReservation.estado === 'pendiente' && (
                  <Button
                    onClick={() => handleConfirm(selectedReservation.id)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Reserva
                  </Button>
                )}
                
                {(selectedReservation.estado === 'pendiente' || selectedReservation.estado === 'confirmada') && (
                  <Button
                    onClick={() => handleCancel(selectedReservation.id)}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar Reserva
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
