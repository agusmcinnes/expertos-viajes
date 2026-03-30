"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm"
import { Calendar, Hotel, Edit, Trash2, Plus, Package as PackageIcon } from "lucide-react"
import { supabase, stockService, type PackageStock, type TravelPackage } from "@/lib/supabase"
import { motion } from "framer-motion"
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

export function StockManager({ destinations = [] }: StockManagerProps) {
  const { toast } = useToast()
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<PackageStock | null>(null)
  const [tarifaWarning, setTarifaWarning] = useState<string | null>(null)

  // Estado para modal de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    stockId: number | null
  }>({ open: false, stockId: null })

  // Filtros
  const [filterDestination, setFilterDestination] = useState<string>("all")

  const [formData, setFormData] = useState({
    accommodation_id: "",
    fecha_salida: "",
    stock_dbl: "0",
    stock_tpl: "0",
    stock_cpl: "0",
    is_available: true,
    flexible_dates: false
  })

  // Verificar si existen tarifas para la fecha seleccionada
  const checkTarifasExist = async (accommodationId: string, fecha: string) => {
    if (!accommodationId || !fecha) return

    try {
      // Parsear fecha ISO (YYYY-MM-DD) correctamente
      const [year, month, day] = fecha.split('-').map(Number)
      const mes = month // El mes ya viene correcto (1-12) del string ISO
      const anio = year

      console.log('🔍 Verificando tarifas para:', { accommodationId, mes, anio, fechaOriginal: fecha })

      const { data, error } = await supabase
        .from('accommodation_rates')
        .select('*')
        .eq('accommodation_id', parseInt(accommodationId))
        .eq('mes', mes)
        .eq('anio', anio)
        .single()

      if (error || !data) {
        console.warn('❌ No se encontraron tarifas:', { mes, anio, error })
        setTarifaWarning(`No hay tarifas configuradas para ${mes}/${anio}. Las reservas no podrán calcular precios.`)
      } else {
        console.log('✅ Tarifas encontradas:', data)
        setTarifaWarning(null)
      }
    } catch (error) {
      console.error('Error checking tarifas:', error)
    }
  }

  // Convertir fecha en formato texto español a ISO (YYYY-MM-DD)
  const parseSpanishDate = (dateStr: string): string | null => {
    try {
      const meses: { [key: string]: number } = {
        'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11
      }

      // Formato: "3 Ene 2026" o "3 Ene 26"
      const parts = dateStr.trim().split(' ')
      if (parts.length !== 3) return null

      const day = parseInt(parts[0])
      const month = meses[parts[1]]
      let year = parseInt(parts[2])

      if (isNaN(day) || month === undefined || isNaN(year)) return null

      // Si el año es de 2 dígitos, convertir a 4 dígitos
      // Asumimos que años 00-50 son 2000-2050, y 51-99 son 1951-1999
      if (year < 100) {
        year = year <= 50 ? 2000 + year : 1900 + year
      }

      const date = new Date(year, month, day)
      
      // Formatear a YYYY-MM-DD
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      
      return `${yyyy}-${mm}-${dd}`
    } catch (error) {
      console.error('Error parsing date:', dateStr, error)
      return null
    }
  }

  // Formatear fecha ISO a texto legible
  const formatDateToSpanish = (isoDate: string): string => {
    const date = new Date(isoDate + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Cargar paquetes al montar
  useEffect(() => {
    loadPackages()
  }, [])

  // Cargar alojamientos cuando se selecciona un paquete
  useEffect(() => {
    if (selectedPackageId) {
      const pkg = packages.find(p => p.id === selectedPackageId)
      setSelectedPackage(pkg || null)
      console.log('📦 Paquete seleccionado:', pkg?.name)
      console.log('📅 Available dates:', pkg?.available_dates)
      loadAccommodations(selectedPackageId)
      loadStock(selectedPackageId)
    }
  }, [selectedPackageId, packages])

  // Verificar tarifas cuando cambian alojamiento o fecha
  useEffect(() => {
    if (formData.accommodation_id && formData.fecha_salida) {
      checkTarifasExist(formData.accommodation_id, formData.fecha_salida)
    } else {
      setTarifaWarning(null)
    }
  }, [formData.accommodation_id, formData.fecha_salida])

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("travel_packages")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setPackages(data || [])
    } catch (error) {
      console.error("Error loading packages:", error)
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
      setIsLoading(true)
      const data = await stockService.getStockByPackage(packageId)
      setStock(data || [])
    } catch (error) {
      console.error("Error loading stock:", error)
      setStock([])
    } finally {
      setIsLoading(false)
    }
  }

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
        flexible_dates: (stockItem as any).flexible_dates || false
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
        flexible_dates: false
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStock(null)
    setTarifaWarning(null)
    setFormData({
      accommodation_id: "",
      fecha_salida: "",
      stock_dbl: "0",
      stock_tpl: "0",
      stock_cpl: "0",
      is_available: true,
      flexible_dates: false
    })
  }

  const handleSave = async () => {
    // Validar campos según el modo
    if (!selectedPackageId || !formData.accommodation_id) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      })
      return
    }
    
    // Si no es flexible, la fecha es obligatoria
    if (!formData.flexible_dates && !formData.fecha_salida) {
      toast({
        title: "Fecha requerida",
        description: "Por favor selecciona una fecha de salida o activa fechas flexibles.",
        variant: "destructive",
      })
      return
    }

    try {
      const stockData = {
        stock_dbl: parseInt(formData.stock_dbl),
        stock_tpl: parseInt(formData.stock_tpl),
        stock_cpl: parseInt(formData.stock_cpl),
        is_available: formData.is_available,
        flexible_dates: formData.flexible_dates
      }

      console.log('💾 Guardando stock:', stockData)

      if (editingStock) {
        // Actualizar existente
        await stockService.updateStock(editingStock.id, stockData)
      } else {
        // Crear nuevo
        await stockService.upsertStock({
          package_id: selectedPackageId,
          accommodation_id: parseInt(formData.accommodation_id),
          fecha_salida: formData.flexible_dates ? null : formData.fecha_salida,
          ...stockData
        })
      }

      await loadStock(selectedPackageId)
      handleCloseModal()
      toast({
        title: editingStock ? "Stock actualizado" : "Stock creado",
        description: editingStock ? "El stock se actualizó exitosamente." : "El stock se creó exitosamente.",
      })
    } catch (error) {
      console.error("Error saving stock:", error)
      toast({
        title: "Error al guardar",
        description: "Error al guardar el stock: " + (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = (stockId: number) => {
    setConfirmDialog({ open: true, stockId })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.stockId) return

    try {
      await stockService.deleteStock(confirmDialog.stockId)
      if (selectedPackageId) {
        await loadStock(selectedPackageId)
      }
      toast({
        title: "Stock eliminado",
        description: "El registro de stock se eliminó exitosamente.",
      })
    } catch (error) {
      console.error("Error deleting stock:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el stock. Intenta nuevamente.",
        variant: "destructive",
      })
    }
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

  // Función para filtrar paquetes por destino
  const getFilteredPackages = () => {
    if (filterDestination === "all") {
      return packages
    }
    return packages.filter(pkg => pkg.destination_id?.toString() === filterDestination)
  }

  const filteredPackages = getFilteredPackages()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-heading text-primary-900">
            <PackageIcon className="w-5 h-5 mr-2 text-primary-600" />
            Gestión de Stock por Paquete
          </CardTitle>
          <p className="text-sm text-primary-600">
            Administra el stock disponible para cada paquete, alojamiento y fecha de salida
          </p>
          
          {/* Filtro por destino */}
          {destinations.length > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t mt-4">
              <label className="text-sm font-medium text-primary-800 whitespace-nowrap">
                Filtrar por destino:
              </label>
              <Select 
                value={filterDestination} 
                onValueChange={setFilterDestination}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los destinos ({packages.length})
                  </SelectItem>
                  {destinations.map((dest) => (
                    <SelectItem key={dest.id} value={dest.id.toString()}>
                      {dest.name} ({packages.filter(p => p.destination_id === dest.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {filterDestination !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {filteredPackages.length} paquete{filteredPackages.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Selector de Paquete */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary-800 mb-2">
              Seleccionar Paquete
            </label>
            <Select
              value={selectedPackageId?.toString() || ""}
              onValueChange={(value) => setSelectedPackageId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un paquete..." />
              </SelectTrigger>
              <SelectContent>
                {filteredPackages.length > 0 ? (
                  filteredPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p className="mb-2">No hay paquetes para este destino</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilterDestination("all")}
                    >
                      Ver todos los paquetes
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Contenido Principal */}
          {selectedPackageId ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Stock Configurado ({stock.length} registros)
                </h3>
                <Button
                  onClick={() => handleOpenModal()}
                  className="bg-primary hover:bg-primary-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Stock
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando stock...</p>
                </div>
              ) : stock.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-primary-200 rounded-xl">
                  <PackageIcon className="w-12 h-12 text-primary-300 mx-auto mb-4" />
                  <p className="text-primary-600 mb-2">No hay stock configurado para este paquete</p>
                  <p className="text-sm text-primary-400">Haz clic en "Agregar Stock" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stock.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-primary-100 rounded-xl p-5 bg-white hover:shadow-lg hover:shadow-primary/5 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Hotel className="w-4 h-4 text-primary-400" />
                            <h4 className="font-semibold">
                              {item.accommodations?.name || 'Alojamiento no encontrado'}
                            </h4>
                            {(item as any).flexible_dates ? (
                              <Badge className="bg-secondary-100 text-secondary-800">Fechas Flexibles</Badge>
                            ) : item.is_available ? (
                              <Badge className="bg-primary-100 text-primary-800">Disponible</Badge>
                            ) : (
                              <Badge variant="secondary">No Disponible</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Calendar className="w-4 h-4" />
                            {(item as any).flexible_dates ? (
                              <span className="text-blue-600 font-medium">Usuario elige la fecha</span>
                            ) : (
                              <span>Fecha de salida: {formatDate(item.fecha_salida!)}</span>
                            )}
                          </div>

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
            </>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-primary-200 rounded-xl">
              <PackageIcon className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-primary-600">Selecciona un paquete para gestionar su stock</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Agregar/Editar Stock */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStock ? "Editar Stock" : "Agregar Stock"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Alojamiento *
              </label>
              <Select
                value={formData.accommodation_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, accommodation_id: value }))}
                disabled={!!editingStock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alojamiento" />
                </SelectTrigger>
                <SelectContent>
                  {accommodations.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({acc.stars} ★)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox para fechas flexibles - Solo si NO hay available_dates */}
            {(!selectedPackage?.available_dates || selectedPackage.available_dates.length === 0) && (
              <div className="flex items-center space-x-2 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <Checkbox
                  id="flexible_dates"
                  checked={formData.flexible_dates}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      flexible_dates: checked as boolean,
                      fecha_salida: checked ? "" : prev.fecha_salida
                    }))
                    if (checked) setTarifaWarning(null)
                  }}
                  disabled={!!editingStock}
                />
                <label
                  htmlFor="flexible_dates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Fechas Flexibles
                </label>
                <Badge variant="secondary" className="ml-2">
                  Sin fecha específica
                </Badge>
              </div>
            )}
            
            {formData.flexible_dates && (
              <div className="text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg p-3">
                <strong>Modo Fechas Flexibles:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Los usuarios podrán elegir cualquier fecha de salida</li>
                  <li>La fecha elegida debe tener tarifas configuradas en accommodation_rates</li>
                  <li>Ideal para paquetes disponibles todo el año</li>
                </ul>
              </div>
            )}

            {/* Selector de fecha - Solo si NO es flexible */}
            {!formData.flexible_dates && (
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">
                  Fecha de Salida *
                </label>
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
                      const parsedDates = selectedPackage.available_dates
                        .map(dateStr => {
                          const isoDate = parseSpanishDate(dateStr)
                          if (!isoDate) {
                            console.warn('⚠️ No se pudo parsear fecha:', dateStr)
                            return null
                          }
                          return { original: dateStr, iso: isoDate, date: new Date(isoDate) }
                        })
                        .filter(item => item !== null)
                        .sort((a, b) => a!.date.getTime() - b!.date.getTime())
                      
                      console.log('📅 Fechas parseadas para selector:', parsedDates.length, parsedDates)
                      
                      return parsedDates.map((item) => (
                        <SelectItem key={item!.iso} value={item!.iso}>
                          {formatDateToSpanish(item!.iso)}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                  Este paquete no tiene fechas disponibles configuradas. 
                  <br />
                  Por favor, edita el paquete y agrega fechas en el campo "available_dates".
                </div>
              )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">
                  Stock Dobles
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_dbl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_dbl: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">
                  Stock Triples
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_tpl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_tpl: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-2">
                  Stock Cuádruples
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_cpl}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_cpl: e.target.value }))}
                />
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
              <label 
                htmlFor="is_available" 
                className="text-sm font-medium text-primary-800 cursor-pointer"
              >
                Disponible para reservas
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {editingStock ? "Actualizar" : "Crear"}
              </Button>
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <AlertDialogConfirm
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, stockId: null })}
        title="Eliminar Stock"
        description="¿Estás seguro de que quieres eliminar este registro de stock? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}
