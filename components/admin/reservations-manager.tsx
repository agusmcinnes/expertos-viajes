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
import { supabase, reservationService, type ReservationWithDetails, type Reservation, type ReservationDetail, type PackageStock } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { ROOM_TYPES, formatMenores, formatRoomDetail, getRoomCapacity, getRoomStock, getRoomTypeName, getSubtypeLabel, roomsCapacity, type RoomType } from "@/lib/room-utils"
import { parseISODateLocal } from "@/lib/date-utils"

function summarizeRooms(details: ReservationDetail[] | undefined): string {
  if (!details || details.length === 0) return 'Sin habitaciones'
  return details
    .map(d => formatRoomDetail(d.tipo_habitacion, d.cantidad, d.subtipo_habitacion, d.menores))
    .join(', ')
}

/** Lectura de la fila de stock de la reserva para describir el impacto en cupo antes de confirmar o cancelar. */
type StockLookup =
  | { reservationId: number; status: 'loading' }
  | { reservationId: number; status: 'error' }
  | { reservationId: number; status: 'ready'; row: PackageStock | null }

/**
 * Misma fila que usan confirm/cancel_reservation_atomic: la de la fecha exacta y, si no hay,
 * la de fechas flexibles; en los dos casos sólo las disponibles.
 */
async function findStockRow(r: ReservationWithDetails): Promise<PackageStock | null> {
  const base = () => supabase
    .from('package_stock')
    .select('*')
    .eq('package_id', r.package_id)
    .eq('accommodation_id', r.accommodation_id)
    .eq('is_available', true)
  const { data: exact, error } = await base().eq('fecha_salida', r.fecha_salida).limit(1)
  if (error) throw error
  if (exact && exact.length > 0) return exact[0] as PackageStock
  const { data: flexible, error: flexibleError } = await base().eq('flexible_dates', true).limit(1)
  if (flexibleError) throw flexibleError
  return (flexible?.[0] as PackageStock | undefined) ?? null
}

/** Habitaciones de la reserva sumadas por tipo, en orden canónico (el cupo cuenta habitaciones, no menores). */
function roomsByType(details: ReservationDetail[] | undefined): { tipo: RoomType; cantidad: number }[] {
  const totals = new Map<RoomType, number>()
  for (const d of details || []) totals.set(d.tipo_habitacion, (totals.get(d.tipo_habitacion) || 0) + d.cantidad)
  return ROOM_TYPES.filter(t => totals.has(t)).map(tipo => ({ tipo, cantidad: totals.get(tipo) || 0 }))
}

interface StockImpact {
  /** «1 doble, 1 triple»: tipos con cupo controlado, que se descuentan o reponen. Vacío si no hay. */
  controlled: string
  /** Nombres de los tipos sin cupo controlado (columna en NULL): no descuentan ni reponen. */
  uncontrolled: string[]
}

function stockImpact(details: ReservationDetail[] | undefined, row: PackageStock): StockImpact {
  const controlled: string[] = []
  const uncontrolled: string[] = []
  for (const { tipo, cantidad } of roomsByType(details)) {
    if (getRoomStock(row, tipo) === null) uncontrolled.push(getRoomTypeName(tipo))
    else controlled.push(`${cantidad} ${getRoomTypeName(tipo).toLowerCase()}`)
  }
  return { controlled: controlled.join(', '), uncontrolled }
}

/** «Quíntuple no descuenta cupo…» / «Single y Quíntuple no descuentan cupo…». */
function describeUncontrolled(names: string[], action: 'confirm' | 'cancel'): string {
  if (names.length === 0) return ''
  const plural = names.length > 1
  const verbo = action === 'confirm'
    ? (plural ? 'descuentan' : 'descuenta')
    : (plural ? 'reponen' : 'repone')
  const motivo = plural ? 'esos tipos no tienen cupo controlado' : 'ese tipo no tiene cupo controlado'
  return `${names.join(' y ')} no ${verbo} cupo: ${motivo}${action === 'confirm' ? ' (queda a confirmar)' : ''}.`
}

/** Texto del diálogo sobre qué pasa con el cupo al confirmar o cancelar. */
function describeStockImpact(r: ReservationWithDetails, action: 'confirm' | 'cancel', lookup: StockLookup | null): string {
  if (action === 'cancel' && r.estado !== 'confirmada') return 'No había stock descontado para esta reserva.'
  if (!r.reservation_details || r.reservation_details.length === 0) return 'La reserva no tiene habitaciones cargadas.'
  if (!lookup || lookup.reservationId !== r.id || lookup.status === 'loading') return 'Revisando el stock cargado…'
  if (lookup.status === 'error') {
    return action === 'confirm'
      ? 'No se pudo leer el stock cargado. Al confirmar se descuentan sólo los tipos con cupo controlado.'
      : 'No se pudo leer el stock cargado. Al cancelar se reponen sólo los tipos con cupo controlado.'
  }
  const row = lookup.row
  if (!row) {
    return action === 'confirm'
      ? 'No hay stock cargado para esta salida y alojamiento: cargalo en Stock antes de confirmar.'
      : 'No se encontró el stock de esta salida y alojamiento: no se repone cupo.'
  }
  if (row.is_unlimited) {
    return action === 'confirm'
      ? 'El stock de este alojamiento es ilimitado: no se descuenta cupo.'
      : 'El stock de este alojamiento es ilimitado: no hay cupo para reponer.'
  }
  const { controlled, uncontrolled } = stockImpact(r.reservation_details, row)
  const parts: string[] = []
  if (controlled) parts.push(action === 'confirm' ? `Se descontará del stock: ${controlled}.` : `Se repondrá al stock: ${controlled}.`)
  parts.push(describeUncontrolled(uncontrolled, action))
  return parts.filter(Boolean).join(' ')
}

/** Descripción del aviso después de confirmar o cancelar, con la fila leída antes de la acción. */
function describeStockResult(r: ReservationWithDetails, action: 'confirm' | 'cancel', lookup: StockLookup | null): string {
  const fallback = action === 'confirm'
    ? `Reserva #${r.id} confirmada.`
    : (r.estado === 'confirmada' ? `Reserva #${r.id} cancelada.` : 'Reserva cancelada (no tenía stock descontado).')
  if (action === 'cancel' && r.estado !== 'confirmada') return fallback
  if (!lookup || lookup.reservationId !== r.id || lookup.status !== 'ready' || !lookup.row) return fallback
  if (lookup.row.is_unlimited) {
    return action === 'confirm' ? 'Stock ilimitado: no se descontó cupo.' : 'Stock ilimitado: no había cupo para reponer.'
  }
  const { controlled, uncontrolled } = stockImpact(r.reservation_details, lookup.row)
  const parts: string[] = []
  if (controlled) parts.push(action === 'confirm' ? `Stock descontado: ${controlled}.` : `Se devolvió al stock: ${controlled}.`)
  if (uncontrolled.length > 0) {
    parts.push(`${uncontrolled.join(' y ')}: sin cupo controlado, a confirmar.`)
  }
  return parts.length > 0 ? parts.join(' ') : fallback
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
  const [stockLookup, setStockLookup] = useState<StockLookup | null>(null)

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

  // Lee la fila de stock para que el diálogo diga qué tipos descuentan (o reponen) cupo y cuáles no se controlan
  const loadStockLookup = async (r: ReservationWithDetails) => {
    setStockLookup({ reservationId: r.id, status: 'loading' })
    try {
      const row = await findStockRow(r)
      setStockLookup(prev => prev?.reservationId === r.id ? { reservationId: r.id, status: 'ready', row } : prev)
    } catch (error) {
      console.error("Error loading stock for reservation:", error)
      setStockLookup(prev => prev?.reservationId === r.id ? { reservationId: r.id, status: 'error' } : prev)
    }
  }

  const askConfirm = (r: ReservationWithDetails) => {
    setConfirmDialog({ open: true, type: 'confirm', reservation: r })
    loadStockLookup(r)
  }

  const askCancel = (r: ReservationWithDetails) => {
    setConfirmDialog({ open: true, type: 'cancel', reservation: r })
    if (r.estado === 'confirmada') loadStockLookup(r)
  }

  const executeAction = async () => {
    if (!confirmDialog.reservation || !confirmDialog.type) return
    const { type, reservation } = confirmDialog

    try {
      setIsProcessing(true)
      if (type === 'confirm') {
        await reservationService.confirmReservation(reservation.id)
        toast({
          title: "Reserva confirmada",
          description: describeStockResult(reservation, 'confirm', stockLookup),
        })
      } else {
        await reservationService.cancelReservation(reservation.id)
        toast({
          title: "Reserva cancelada",
          description: describeStockResult(reservation, 'cancel', stockLookup),
        })
      }
      await loadReservations()
      if (selectedReservation?.id === reservation.id) setIsDetailModalOpen(false)
    } catch (error) {
      console.error("Error processing reservation:", error)
      const motivo = (error as { message?: string } | null)?.message
      toast({
        title: type === 'confirm' ? "No se pudo confirmar" : "No se pudo cancelar",
        description: motivo || "Error de conexión. Probá de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = parseISODateLocal(dateString)
    if (!date) return dateString
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
                            {formatRoomDetail(detail.tipo_habitacion, detail.cantidad, null, detail.menores)}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Capacidad: {roomsCapacity([detail])} {roomsCapacity([detail]) === 1 ? 'persona' : 'personas'}
                            {detail.menores
                              ? ` (${detail.cantidad * getRoomCapacity(detail.tipo_habitacion)} + ${formatMenores(detail.menores)})`
                              : ''}
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
                            <span>Nacimiento: {parseISODateLocal(passenger.fecha_nacimiento)?.toLocaleDateString('es-AR') ?? passenger.fecha_nacimiento}</span>
                            {passenger.dni && <span>DNI: {passenger.dni}</span>}
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
              ? `Vas a confirmar la reserva de ${confirmDialog.reservation.cliente_nombre}. ${describeStockImpact(confirmDialog.reservation, 'confirm', stockLookup)}`
              : `Vas a cancelar la reserva de ${confirmDialog.reservation.cliente_nombre}. ${describeStockImpact(confirmDialog.reservation, 'cancel', stockLookup)}`
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
