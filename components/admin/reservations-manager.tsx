"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, Hotel, Check, X, Eye, Filter, Search, AlertCircle, BedDouble } from "lucide-react"
import { reservationService, type ReservationWithDetails, type Reservation, type ReservationDetail } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { getRoomTypeName, getSubtypeLabel } from "@/lib/room-utils"

const ROOM_CAPACITY: Record<string, number> = { dbl: 2, tpl: 3, cpl: 4, qpl: 5 }

function summarizeRooms(details: ReservationDetail[] | undefined): string {
  if (!details || details.length === 0) return 'Sin habitaciones'
  return details
    .map(d => {
      const base = `${d.cantidad}× ${getRoomTypeName(d.tipo_habitacion)}`
      return d.subtipo_habitacion ? `${base} (${getSubtypeLabel(d.subtipo_habitacion)})` : base
    })
    .join(' + ')
}

function describeStockImpact(details: ReservationDetail[] | undefined): string {
  if (!details || details.length === 0) return ''
  return details.map(d => `${d.cantidad} ${getRoomTypeName(d.tipo_habitacion).toLowerCase()}`).join(', ')
}

export function ReservationsManager() {
  const { toast } = useToast()
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Filtros
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPackageId, setFilterPackageId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'confirm' | 'cancel' | null
    reservation: ReservationWithDetails | null
  }>({ open: false, type: null, reservation: null })

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      setIsLoading(true)
      const data = await reservationService.getAllReservations()
      setReservations(data)
    } catch (error) {
      console.error("Error loading reservations:", error)
      toast({ title: "Error al cargar reservas", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const packageOptions = useMemo(() => {
    const seen = new Map<number, string>()
    reservations.forEach(r => {
      if (r.travel_packages?.id && !seen.has(r.travel_packages.id)) {
        seen.set(r.travel_packages.id, r.travel_packages.name)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [reservations])

  const filteredReservations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return reservations.filter(r => {
      if (filterStatus !== 'all' && r.estado !== filterStatus) return false
      if (filterPackageId !== 'all' && String(r.travel_packages?.id) !== filterPackageId) return false
      if (dateFrom && r.fecha_salida < dateFrom) return false
      if (dateTo && r.fecha_salida > dateTo) return false
      if (q) {
        const hay = [
          r.cliente_nombre,
          r.cliente_email,
          r.cliente_telefono,
          r.travel_packages?.name || '',
          r.accommodations?.name || '',
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [reservations, filterStatus, filterPackageId, dateFrom, dateTo, searchQuery])

  const resetFilters = () => {
    setSearchQuery("")
    setFilterStatus("all")
    setFilterPackageId("all")
    setDateFrom("")
    setDateTo("")
  }

  const countPending = (r: ReservationWithDetails) =>
    (r.reservation_passengers || []).filter(p => p.datos_pendientes).length

  const handleViewDetail = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setIsDetailModalOpen(true)
  }

  const askConfirm = (r: ReservationWithDetails) => {
    setConfirmDialog({ open: true, type: 'confirm', reservation: r })
  }

  const askCancel = (r: ReservationWithDetails) => {
    setConfirmDialog({ open: true, type: 'cancel', reservation: r })
  }

  const executeAction = async () => {
    if (!confirmDialog.reservation || !confirmDialog.type) return
    const { type, reservation } = confirmDialog

    try {
      setIsProcessing(true)
      if (type === 'confirm') {
        await reservationService.confirmReservation(reservation.id)
        const impact = describeStockImpact(reservation.reservation_details)
        toast({
          title: "Reserva confirmada",
          description: impact ? `Stock descontado: ${impact}.` : `Reserva #${reservation.id} confirmada.`,
        })
      } else {
        await reservationService.cancelReservation(reservation.id)
        const wasConfirmed = reservation.estado === 'confirmada'
        const impact = describeStockImpact(reservation.reservation_details)
        toast({
          title: "Reserva cancelada",
          description: wasConfirmed && impact
            ? `Se repuso al stock: ${impact}.`
            : 'Reserva cancelada (no tenía stock descontado).',
        })
      }
      await loadReservations()
      if (selectedReservation?.id === reservation.id) setIsDetailModalOpen(false)
    } catch (error) {
      console.error("Error processing reservation:", error)
      toast({
        title: type === 'confirm' ? "Error al confirmar" : "Error al cancelar",
        description: "Intenta nuevamente en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
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
    return <Badge className={`${variants[estado]} border`}>{labels[estado]}</Badge>
  }

  const stats = useMemo(() => ({
    total: reservations.length,
    pendientes: reservations.filter(r => r.estado === 'pendiente').length,
    confirmadas: reservations.filter(r => r.estado === 'confirmada').length,
    canceladas: reservations.filter(r => r.estado === 'cancelada').length,
  }), [reservations])

  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterPackageId !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-primary border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">Total</p>
                <p className="text-2xl font-bold font-heading text-primary-900">{stats.total}</p>
              </div>
              <div className="w-10 h-10 p-2 rounded-xl bg-primary-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-400 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Pendientes</p>
                <p className="text-2xl font-bold font-heading text-amber-600">{stats.pendientes}</p>
              </div>
              <div className="w-10 h-10 p-2 rounded-xl bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600">Confirmadas</p>
                <p className="text-2xl font-bold font-heading text-emerald-600">{stats.confirmadas}</p>
              </div>
              <div className="w-10 h-10 p-2 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-red-400 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-500">Canceladas</p>
                <p className="text-2xl font-bold font-heading text-red-600">{stats.canceladas}</p>
              </div>
              <div className="w-10 h-10 p-2 rounded-xl bg-red-100 flex items-center justify-center">
                <X className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-heading text-primary-900">
            <Calendar className="w-5 h-5 mr-2 text-primary-600" />
            Gestión de Reservas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente, email, paquete..."
                  className="pl-9 h-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Estado" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="completada">Completadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPackageId} onValueChange={setFilterPackageId}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Paquete" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los paquetes</SelectItem>
                  {packageOptions.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Desde"
                  className="h-10"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Hasta"
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Mostrando {filteredReservations.length} de {reservations.length} reservas
              </span>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-primary-600 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando reservas...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary-200 rounded-xl">
              <Calendar className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-primary-600 mb-2">No hay reservas que coincidan con los filtros</p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-sm text-primary-500 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredReservations.map((reservation, index) => {
                  const pendingCount = countPending(reservation)
                  const paxCount = reservation.reservation_passengers?.length || 0
                  const roomsSummary = summarizeRooms(reservation.reservation_details)
                  return (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="border border-primary-100 rounded-xl p-5 bg-white hover:shadow-lg hover:shadow-primary/5 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {reservation.travel_packages?.name || 'Paquete no encontrado'}
                            </h3>
                            {getStatusBadge(reservation.estado)}
                            <Badge variant="outline" className="text-xs font-mono text-gray-500">
                              #{reservation.id}
                            </Badge>
                            {pendingCount > 0 && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {pendingCount} {pendingCount === 1 ? 'dato pendiente' : 'datos pendientes'}
                              </Badge>
                            )}
                          </div>

                          <div className="grid sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4" />
                              <span><strong>{reservation.cliente_nombre}</strong></span>
                              <span className="text-gray-400">· {reservation.cliente_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Hotel className="w-4 h-4" />
                              <span>{reservation.accommodations?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Salida {formatDate(reservation.fecha_salida)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <BedDouble className="w-4 h-4" />
                              <span>{roomsSummary} · {paxCount} pax</span>
                            </div>
                          </div>
                        </div>

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
                              onClick={() => askConfirm(reservation)}
                              disabled={isProcessing}
                              className="flex-1 lg:flex-none bg-primary hover:bg-primary-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Confirmar
                            </Button>
                          )}

                          {(reservation.estado === 'pendiente' || reservation.estado === 'confirmada') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => askCancel(reservation)}
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
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-heading text-primary-900">
              <span>Reserva #{selectedReservation?.id}</span>
              {selectedReservation && getStatusBadge(selectedReservation.estado)}
            </DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-5">
              {/* Viaje */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading text-primary-800">Viaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paquete</span>
                    <span className="font-medium">{selectedReservation.travel_packages?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alojamiento</span>
                    <span className="font-medium">
                      {selectedReservation.accommodations?.name}
                      {selectedReservation.accommodations?.stars && ` (${selectedReservation.accommodations.stars} ★)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha de salida</span>
                    <span className="font-medium">{formatDate(selectedReservation.fecha_salida)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading text-primary-800">Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre</span>
                    <span className="font-medium">{selectedReservation.cliente_nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email</span>
                    <a href={`mailto:${selectedReservation.cliente_email}`} className="font-medium text-primary-600 hover:underline">
                      {selectedReservation.cliente_email}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teléfono</span>
                    <a href={`tel:${selectedReservation.cliente_telefono}`} className="font-medium text-primary-600 hover:underline">
                      {selectedReservation.cliente_telefono}
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Habitaciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading text-primary-800">Habitaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedReservation.reservation_details.map((detail) => (
                      <div key={detail.id} className="border border-primary-100 rounded-lg p-3 bg-primary-50/30 flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-sm">
                            {detail.cantidad}× {getRoomTypeName(detail.tipo_habitacion)}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Capacidad: {detail.cantidad * (ROOM_CAPACITY[detail.tipo_habitacion] || 0)} personas
                          </p>
                        </div>
                        {detail.subtipo_habitacion && (
                          <Badge variant="secondary">
                            {getSubtypeLabel(detail.subtipo_habitacion)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pasajeros */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading text-primary-800 flex items-center gap-2">
                    Pasajeros
                    <span className="text-xs font-normal text-gray-500">
                      ({selectedReservation.reservation_passengers?.length || 0})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedReservation.reservation_passengers && selectedReservation.reservation_passengers.length > 0 ? (
                      selectedReservation.reservation_passengers.map((passenger) => (
                        <div key={passenger.id} className="border border-primary-100 rounded-lg p-3 bg-primary-50/30">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={passenger.tipo_pasajero === 'titular' ? 'default' : 'secondary'}>
                              {passenger.tipo_pasajero === 'titular' ? 'Titular' : 'Acompañante'}
                            </Badge>
                            <span className="font-semibold text-sm">
                              {passenger.nombre} {passenger.apellido}
                            </span>
                            {passenger.edad_al_viajar != null && (
                              <span className="text-xs text-gray-500">· {passenger.edad_al_viajar} años al viajar</span>
                            )}
                            {passenger.datos_pendientes && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-[10px]">
                                Datos pendientes
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>Nacimiento: {new Date(passenger.fecha_nacimiento).toLocaleDateString('es-AR')}</span>
                            {passenger.dni && <span>DNI: {passenger.dni}</span>}
                            {passenger.cuil && <span>CUIL: {passenger.cuil}</span>}
                            {passenger.email && <span className="truncate">✉ {passenger.email}</span>}
                            {passenger.telefono && <span>☎ {passenger.telefono}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Sin información de pasajeros
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedReservation.comentarios && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-heading text-primary-800">Comentarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedReservation.comentarios}
                    </p>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-gray-500 italic text-center">
                El precio se cotiza fuera del sistema y se comunica al cliente por el agente.
              </p>

              <div className="flex gap-3 pt-4 border-t">
                {selectedReservation.estado === 'pendiente' && (
                  <Button
                    onClick={() => askConfirm(selectedReservation)}
                    disabled={isProcessing}
                    className="flex-1 bg-primary hover:bg-primary-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Reserva
                  </Button>
                )}
                {(selectedReservation.estado === 'pendiente' || selectedReservation.estado === 'confirmada') && (
                  <Button
                    onClick={() => askCancel(selectedReservation)}
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

      <AlertDialogConfirm
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, type: null, reservation: null })}
        title={confirmDialog.type === 'confirm' ? "Confirmar reserva" : "Cancelar reserva"}
        description={
          confirmDialog.reservation
            ? confirmDialog.type === 'confirm'
              ? `Vas a confirmar la reserva de ${confirmDialog.reservation.cliente_nombre}. Se descontará del stock: ${describeStockImpact(confirmDialog.reservation.reservation_details)}.`
              : `Vas a cancelar la reserva de ${confirmDialog.reservation.cliente_nombre}. ${confirmDialog.reservation.estado === 'confirmada' ? `Se repondrá al stock: ${describeStockImpact(confirmDialog.reservation.reservation_details)}.` : 'No había stock descontado para esta reserva.'}`
            : ''
        }
        confirmText={confirmDialog.type === 'confirm' ? "Confirmar" : "Sí, cancelar"}
        cancelText="Volver"
        onConfirm={executeAction}
        variant={confirmDialog.type === 'cancel' ? "destructive" : "default"}
      />
    </div>
  )
}
