"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm"
import {
  Calendar, Hotel, Edit, Trash2, Plus, Package as PackageIcon,
  ArrowLeft, Search, Zap, ZapOff, MapPin, Plane, Bus, Ship
} from "lucide-react"
import { supabase, stockService, type PackageStock, type PackageWithStockStatus, type PackageStockStatus } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface Accommodation {
  id: number
  name: string
  stars: number
  paquete_id: number
}

interface Destination {
  id: number
  name: string
}

interface StockManagerProps {
  destinations?: Destination[]
}

const TRANSPORT_META: Record<string, { label: string; icon: typeof Plane; color: string }> = {
  aereo: { label: 'Aéreo', icon: Plane, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  bus: { label: 'Bus', icon: Bus, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  crucero: { label: 'Crucero', icon: Ship, color: 'bg-purple-100 text-purple-700 border-purple-200' },
}

function StockStatusBadge({ status }: { status: PackageStockStatus }) {
  if (status === 'unlimited') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
        <Zap className="w-3 h-3 mr-1" />
        Ilimitado
      </Badge>
    )
  }
  if (status === 'loaded') {
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">Con stock</Badge>
  }
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">Sin stock</Badge>
}

export function StockManager({ destinations = [] }: StockManagerProps) {
  const { toast } = useToast()

  // Grid / detail navigation
  const [packagesWithStatus, setPackagesWithStatus] = useState<PackageWithStockStatus[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<PackageWithStockStatus | null>(null)

  // Detail view state
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<PackageStock | null>(null)
  const [tarifaWarning, setTarifaWarning] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; stockId: number | null }>({ open: false, stockId: null })
  const [unlimitedDialog, setUnlimitedDialog] = useState<{ open: boolean; pkg: PackageWithStockStatus | null; activate: boolean }>({ open: false, pkg: null, activate: true })
  const [isProcessingUnlimited, setIsProcessingUnlimited] = useState(false)

  // Filtros del grid
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDestination, setFilterDestination] = useState<string>("all")
  const [filterStockStatus, setFilterStockStatus] = useState<string>("all")
  const [filterTransport, setFilterTransport] = useState<string>("all")

  const [formData, setFormData] = useState({
    accommodation_id: "",
    fecha_salida: "",
    stock_dbl: "0",
    stock_tpl: "0",
    stock_cpl: "0",
    is_available: true,
    flexible_dates: false,
  })

  useEffect(() => {
    loadPackagesWithStatus()
  }, [])

  useEffect(() => {
    if (selectedPackage) {
      loadAccommodations(selectedPackage.id)
      loadStock(selectedPackage.id)
    } else {
      setAccommodations([])
      setStock([])
    }
  }, [selectedPackage])

  useEffect(() => {
    if (formData.accommodation_id && formData.fecha_salida) {
      checkTarifasExist(formData.accommodation_id, formData.fecha_salida)
    } else {
      setTarifaWarning(null)
    }
  }, [formData.accommodation_id, formData.fecha_salida])

  const loadPackagesWithStatus = async () => {
    try {
      setIsLoadingPackages(true)
      const data = await stockService.getPackagesWithStockStatus()
      setPackagesWithStatus(data)
    } catch (error) {
      console.error("Error loading packages with stock status:", error)
      toast({ title: "Error al cargar paquetes", variant: "destructive" })
    } finally {
      setIsLoadingPackages(false)
    }
  }

  const loadAccommodations = async (packageId: number) => {
    try {
      const { data, error } = await supabase
        .from("accommodations")
        .select("*")
        .eq("paquete_id", packageId)
        .order("name")
      if (error) throw error
      setAccommodations(data || [])
    } catch (error) {
      console.error("Error loading accommodations:", error)
      setAccommodations([])
    }
  }

  const loadStock = async (packageId: number) => {
    try {
      setIsLoadingStock(true)
      const data = await stockService.getStockByPackage(packageId)
      setStock(data || [])
    } catch (error) {
      console.error("Error loading stock:", error)
      setStock([])
    } finally {
      setIsLoadingStock(false)
    }
  }

  // =====================================================
  // Filtros del grid
  // =====================================================
  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return packagesWithStatus.filter(pkg => {
      if (q && !pkg.name.toLowerCase().includes(q)) return false
      if (filterDestination !== "all" && String(pkg.destination_id) !== filterDestination) return false
      if (filterStockStatus !== "all" && pkg.stockStatus !== filterStockStatus) return false
      if (filterTransport !== "all" && (pkg.transport_type || 'aereo') !== filterTransport) return false
      return true
    })
  }, [packagesWithStatus, searchQuery, filterDestination, filterStockStatus, filterTransport])

  const hasActiveFilters = searchQuery || filterDestination !== "all" || filterStockStatus !== "all" || filterTransport !== "all"

  const resetFilters = () => {
    setSearchQuery("")
    setFilterDestination("all")
    setFilterStockStatus("all")
    setFilterTransport("all")
  }

  // =====================================================
  // Stock ilimitado por paquete
  // =====================================================
  const askUnlimited = (pkg: PackageWithStockStatus, activate: boolean) => {
    setUnlimitedDialog({ open: true, pkg, activate })
  }

  const executeUnlimited = async () => {
    if (!unlimitedDialog.pkg) return
    try {
      setIsProcessingUnlimited(true)
      const result = await stockService.setPackageUnlimited(unlimitedDialog.pkg.id, unlimitedDialog.activate)
      const { created, updated } = result
      toast({
        title: unlimitedDialog.activate ? "Stock ilimitado activado" : "Stock ilimitado desactivado",
        description: created > 0
          ? `Se crearon ${created} registros (uno por alojamiento).`
          : `${updated} registro${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''}.`,
      })
      await loadPackagesWithStatus()
      if (selectedPackage && selectedPackage.id === unlimitedDialog.pkg.id) {
        // refrescar la vista detalle si está abierta
        await loadStock(selectedPackage.id)
      }
    } catch (error) {
      console.error("Error setting unlimited:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo actualizar el stock ilimitado.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingUnlimited(false)
      setUnlimitedDialog({ open: false, pkg: null, activate: true })
    }
  }

  // =====================================================
  // CRUD de stock (modal de agregar/editar)
  // =====================================================
  const handleOpenModal = (stockItem?: PackageStock) => {
    if (stockItem) {
      setEditingStock(stockItem)
      setFormData({
        accommodation_id: stockItem.accommodation_id.toString(),
        fecha_salida: stockItem.fecha_salida || "",
        stock_dbl: stockItem.stock_dbl.toString(),
        stock_tpl: stockItem.stock_tpl.toString(),
        stock_cpl: stockItem.stock_cpl.toString(),
        is_available: stockItem.is_available,
        flexible_dates: stockItem.flexible_dates || false,
      })
    } else {
      setEditingStock(null)
      setFormData({
        accommodation_id: "",
        fecha_salida: "",
        stock_dbl: "0",
        stock_tpl: "0",
        stock_cpl: "0",
        is_available: true,
        flexible_dates: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStock(null)
    setTarifaWarning(null)
    setFormData({
      accommodation_id: "", fecha_salida: "", stock_dbl: "0", stock_tpl: "0", stock_cpl: "0",
      is_available: true, flexible_dates: false,
    })
  }

  const handleSave = async () => {
    if (!selectedPackage || !formData.accommodation_id) {
      toast({ title: "Campos incompletos", description: "Completá los campos obligatorios.", variant: "destructive" })
      return
    }
    if (!formData.flexible_dates && !formData.fecha_salida) {
      toast({ title: "Fecha requerida", description: "Seleccioná una fecha o activá fechas flexibles.", variant: "destructive" })
      return
    }

    try {
      const stockData = {
        stock_dbl: parseInt(formData.stock_dbl),
        stock_tpl: parseInt(formData.stock_tpl),
        stock_cpl: parseInt(formData.stock_cpl),
        is_available: formData.is_available,
        flexible_dates: formData.flexible_dates,
      }

      if (editingStock) {
        await stockService.updateStock(editingStock.id, stockData)
      } else {
        await stockService.upsertStock({
          package_id: selectedPackage.id,
          accommodation_id: parseInt(formData.accommodation_id),
          fecha_salida: formData.flexible_dates ? null : formData.fecha_salida,
          ...stockData,
        } as any)
      }

      await loadStock(selectedPackage.id)
      await loadPackagesWithStatus()
      handleCloseModal()
      toast({
        title: editingStock ? "Stock actualizado" : "Stock creado",
      })
    } catch (error) {
      console.error("Error saving stock:", error)
      toast({ title: "Error al guardar", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = (stockId: number) => {
    setConfirmDialog({ open: true, stockId })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.stockId || !selectedPackage) return
    try {
      await stockService.deleteStock(confirmDialog.stockId)
      await loadStock(selectedPackage.id)
      await loadPackagesWithStatus()
      toast({ title: "Stock eliminado" })
    } catch (error) {
      console.error("Error deleting stock:", error)
      toast({ title: "Error al eliminar", variant: "destructive" })
    }
  }

  // =====================================================
  // Helpers de fecha (preservados del componente original)
  // =====================================================
  const checkTarifasExist = async (accommodationId: string, fecha: string) => {
    if (!accommodationId || !fecha) return
    try {
      const [year, month] = fecha.split('-').map(Number)
      const { data, error } = await supabase
        .from('accommodation_rates')
        .select('*')
        .eq('accommodation_id', parseInt(accommodationId))
        .eq('mes', month)
        .eq('anio', year)
        .single()
      if (error || !data) {
        setTarifaWarning(`No hay tarifas configuradas para ${month}/${year}. Las reservas no podrán calcular precios.`)
      } else {
        setTarifaWarning(null)
      }
    } catch (error) {
      console.error('Error checking tarifas:', error)
    }
  }

  const parseSpanishDate = (dateStr: string): string | null => {
    try {
      const meses: Record<string, number> = {
        'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11,
      }
      const parts = dateStr.trim().split(' ')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0])
      const month = meses[parts[1]]
      let year = parseInt(parts[2])
      if (isNaN(day) || month === undefined || isNaN(year)) return null
      if (year < 100) year = year <= 50 ? 2000 + year : 1900 + year
      const d = new Date(year, month, day)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    } catch {
      return null
    }
  }

  const formatDateToSpanish = (isoDate: string): string => {
    const date = new Date(isoDate + 'T00:00:00')
    return date.toLocaleDateString('es-AR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // =====================================================
  // Render
  // =====================================================
  if (!selectedPackage) {
    // MODO GRID
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center font-heading text-primary-900">
              <PackageIcon className="w-5 h-5 mr-2 text-primary-600" />
              Gestión de Stock por Paquete
            </CardTitle>
            <p className="text-sm text-primary-600">
              Todos los paquetes activos. Verde: con stock. Amarillo: sin stock cargado. Azul: ilimitado.
            </p>
          </CardHeader>
          <CardContent>
            {/* Toolbar */}
            <div className="mb-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="pl-9 h-10"
                  />
                </div>

                <Select value={filterDestination} onValueChange={setFilterDestination}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="Destino" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los destinos</SelectItem>
                    {destinations.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="Estado de stock" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="loaded">Con stock</SelectItem>
                    <SelectItem value="none">Sin stock</SelectItem>
                    <SelectItem value="unlimited">Ilimitado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterTransport} onValueChange={setFilterTransport}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="Transporte" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los transportes</SelectItem>
                    <SelectItem value="aereo">Aéreo</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="crucero">Crucero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Mostrando {filteredPackages.length} de {packagesWithStatus.length} paquetes</span>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-primary-600 hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            {isLoadingPackages ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Cargando paquetes...</p>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-primary-200 rounded-xl">
                <PackageIcon className="w-12 h-12 text-primary-300 mx-auto mb-4" />
                <p className="text-primary-600">No hay paquetes que coincidan con los filtros.</p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-sm text-primary-500 hover:underline mt-2">
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredPackages.map((pkg, idx) => {
                    const transportKey = (pkg.transport_type || 'aereo') as string
                    const transport = TRANSPORT_META[transportKey] || TRANSPORT_META.aereo
                    const TransportIcon = transport.icon
                    const isUnlimited = pkg.stockStatus === 'unlimited'

                    return (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                        className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col"
                      >
                        <div className="relative h-40 bg-gray-100">
                          <Image
                            src={pkg.image_url || "/hero.webp"}
                            alt={pkg.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge className={`${transport.color} border text-xs`}>
                              <TransportIcon className="w-3 h-3 mr-1" />
                              {transport.label}
                            </Badge>
                          </div>
                          <div className="absolute top-2 right-2">
                            <StockStatusBadge status={pkg.stockStatus} />
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1">
                            {pkg.name}
                          </h3>
                          <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {(pkg as any).destinations?.name || 'Sin destino'}
                            <span className="mx-1">·</span>
                            <span>{pkg.stockRecordsCount} registros</span>
                          </div>

                          <div className="flex gap-2 mt-auto">
                            <Button
                              size="sm"
                              onClick={() => setSelectedPackage(pkg)}
                              className="flex-1 bg-primary hover:bg-primary-700 text-white"
                            >
                              Gestionar
                            </Button>
                            {isUnlimited ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => askUnlimited(pkg, false)}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                title="Quitar ilimitado"
                              >
                                <ZapOff className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => askUnlimited(pkg, true)}
                                className="border-amber-500 text-amber-600 hover:bg-amber-50"
                                title="Marcar ilimitado"
                              >
                                <Zap className="w-4 h-4" />
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

        <AlertDialogConfirm
          open={unlimitedDialog.open}
          onOpenChange={(open) => !isProcessingUnlimited && setUnlimitedDialog({ open, pkg: null, activate: true })}
          title={unlimitedDialog.activate ? "Marcar como stock ilimitado" : "Quitar stock ilimitado"}
          description={
            unlimitedDialog.pkg
              ? unlimitedDialog.activate
                ? `Todos los registros de stock de "${unlimitedDialog.pkg.name}" se marcarán como ilimitados. Si el paquete no tenía stock cargado, se creará un registro flexible por cada alojamiento.`
                : `Los registros de stock de "${unlimitedDialog.pkg.name}" dejarán de ser ilimitados. Vas a tener que cargar cupos numéricos desde el form de stock.`
              : ''
          }
          confirmText={unlimitedDialog.activate ? "Activar ilimitado" : "Quitar ilimitado"}
          cancelText="Volver"
          onConfirm={executeUnlimited}
          variant="default"
        />
      </div>
    )
  }

  // =====================================================
  // MODO DETALLE
  // =====================================================
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPackage(null)}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 font-heading text-primary-900">
                <PackageIcon className="w-5 h-5 text-primary-600" />
                {selectedPackage.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <StockStatusBadge status={selectedPackage.stockStatus} />
                <span className="text-xs text-gray-500">
                  {selectedPackage.stockRecordsCount} registro{selectedPackage.stockRecordsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Stock configurado</h3>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Stock
            </Button>
          </div>

          {isLoadingStock ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando stock...</p>
            </div>
          ) : stock.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary-200 rounded-xl">
              <PackageIcon className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-primary-600 mb-2">No hay stock configurado para este paquete</p>
              <p className="text-sm text-primary-400">Hacé clic en "Agregar Stock" o marcalo como ilimitado desde el grid</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stock.map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-primary-100 rounded-xl p-5 bg-white hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Hotel className="w-4 h-4 text-primary-400" />
                        <h4 className="font-semibold">
                          {item.accommodations?.name || 'Alojamiento no encontrado'}
                        </h4>
                        {item.is_unlimited && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
                            <Zap className="w-3 h-3 mr-1" /> Ilimitado
                          </Badge>
                        )}
                        {item.flexible_dates ? (
                          <Badge className="bg-secondary-100 text-secondary-800">Fechas Flexibles</Badge>
                        ) : item.is_available ? (
                          <Badge className="bg-primary-100 text-primary-800">Disponible</Badge>
                        ) : (
                          <Badge variant="secondary">No Disponible</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        {item.flexible_dates ? (
                          <span className="text-blue-600 font-medium">Usuario elige la fecha</span>
                        ) : (
                          <span>Fecha de salida: {formatDate(item.fecha_salida)}</span>
                        )}
                      </div>

                      {item.is_unlimited ? (
                        <div className="rounded-xl p-3 bg-blue-50 text-blue-800 text-sm">
                          Stock ilimitado — las reservas no descuentan cupos.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-primary-100/60 rounded-xl p-3">
                            <div className="text-xs text-primary-500 mb-1 font-medium uppercase tracking-wide">Dobles</div>
                            <div className="text-2xl font-bold font-heading text-primary-700">{item.stock_dbl}</div>
                          </div>
                          <div className="bg-primary-50 rounded-xl p-3">
                            <div className="text-xs text-primary-500 mb-1 font-medium uppercase tracking-wide">Triples</div>
                            <div className="text-2xl font-bold font-heading text-primary-600">{item.stock_tpl}</div>
                          </div>
                          <div className="bg-secondary-100/60 rounded-xl p-3">
                            <div className="text-xs text-secondary-600 mb-1 font-medium uppercase tracking-wide">Cuádruples</div>
                            <div className="text-2xl font-bold font-heading text-secondary-700">{item.stock_cpl}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(item)}
                        className="border-primary-300 text-primary-600 hover:bg-primary hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Agregar/Editar Stock */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStock ? "Editar Stock" : "Agregar Stock"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-800 mb-2">Alojamiento *</label>
              <Select
                value={formData.accommodation_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, accommodation_id: value }))}
                disabled={!!editingStock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alojamiento" />
                </SelectTrigger>
                <SelectContent>
                  {accommodations.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({acc.stars} ★)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!selectedPackage?.available_dates || selectedPackage.available_dates.length === 0) && (
              <div className="flex items-center space-x-2 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <Checkbox
                  id="flexible_dates"
                  checked={formData.flexible_dates}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      flexible_dates: checked as boolean,
                      fecha_salida: checked ? "" : prev.fecha_salida,
                    }))
                    if (checked) setTarifaWarning(null)
                  }}
                  disabled={!!editingStock}
                />
                <label htmlFor="flexible_dates" className="text-sm font-medium cursor-pointer">
                  Fechas Flexibles
                </label>
                <Badge variant="secondary" className="ml-2">Sin fecha específica</Badge>
              </div>
            )}

            {formData.flexible_dates && (
              <div className="text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg p-3">
                <strong>Modo Fechas Flexibles:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Los usuarios podrán elegir cualquier fecha de salida</li>
                  <li>La fecha elegida debe tener tarifas configuradas</li>
                  <li>Ideal para paquetes disponibles todo el año</li>
                </ul>
              </div>
            )}

            {!formData.flexible_dates && (
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">Fecha de Salida *</label>
                {selectedPackage?.available_dates && selectedPackage.available_dates.length > 0 ? (
                  <Select
                    value={formData.fecha_salida}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, fecha_salida: value }))}
                    disabled={!!editingStock}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una fecha disponible..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const parsed = selectedPackage.available_dates
                          .map(s => {
                            const iso = parseSpanishDate(s)
                            return iso ? { iso, date: new Date(iso) } : null
                          })
                          .filter((x): x is { iso: string; date: Date } => x !== null)
                          .sort((a, b) => a.date.getTime() - b.date.getTime())
                        return parsed.map(item => (
                          <SelectItem key={item.iso} value={item.iso}>
                            {formatDateToSpanish(item.iso)}
                          </SelectItem>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                    Este paquete no tiene fechas disponibles configuradas.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">Stock Dobles</label>
                <Input type="number" min="0" value={formData.stock_dbl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_dbl: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">Stock Triples</label>
                <Input type="number" min="0" value={formData.stock_tpl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_tpl: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">Stock Cuádruples</label>
                <Input type="number" min="0" value={formData.stock_cpl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_cpl: e.target.value }))} />
              </div>
            </div>

            {tarifaWarning && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
                {tarifaWarning}
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 border border-primary-100 rounded-xl bg-primary-50/30">
              <Checkbox
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked === true }))}
              />
              <label htmlFor="is_available" className="text-sm font-medium text-primary-800 cursor-pointer">
                Disponible para reservas
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90">
                {editingStock ? "Actualizar" : "Crear"}
              </Button>
              <Button onClick={handleCloseModal} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialogConfirm
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, stockId: null })}
        title="Eliminar Stock"
        description="¿Seguro que querés eliminar este registro de stock? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}
