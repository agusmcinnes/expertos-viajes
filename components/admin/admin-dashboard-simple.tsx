"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Save, X, Package, Plane, Bus, Settings, Ship, Hotel, Star, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { TravelPackage, Destination } from "@/lib/supabase"
import { motion } from "framer-motion"
import { SiteConfigManager } from "./site-config-manager"

export function AdminDashboardSimple() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingAccommodations, setIsLoadingAccommodations] = useState(false)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [showAccommodations, setShowAccommodations] = useState(false)
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [selectedAccommodationForRates, setSelectedAccommodationForRates] = useState<any>(null)
  const [rates, setRates] = useState<any[]>([])
  const [accommodationRates, setAccommodationRates] = useState<{[key: number]: any[]}>({}) // Nuevo estado para tarifas por alojamiento
  const [rateFormData, setRateFormData] = useState({
    mes: "",
    anio: "2025",
    tarifa_dbl: "",
    tarifa_tpl: "",
    tarifa_cpl: "",
    tarifa_menor: "",
  })

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    destination_id: "",
    duration: "",
    available_dates: "",
    transport_type: "aereo" as "aereo" | "bus" | "crucero",
    image_url: "",
    is_special: false,
    servicios_incluidos: "",
    servicios_adicionales: "",
  })

  const [accommodationFormData, setAccommodationFormData] = useState({
    name: "",
    stars: "3",
    enlace_web: "",
  })

  // Cargar datos desde Supabase
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Try to load packages
      const packagesQuery = supabase
        .from("travel_packages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const { data: packagesData, error: packagesError } = await packagesQuery

      if (packagesError) {
        console.warn("Error loading packages:", packagesError)
        setPackages([])
      } else {
        // Add transport_type if missing and set default is_special
        const packagesWithTransport = (packagesData || []).map((pkg: any) => ({
          ...pkg,
          transport_type: pkg.transport_type || "aereo",
          is_special: pkg.is_special || false,
        }))
        setPackages(packagesWithTransport)
      }

      // Load destinations
      const { data: destinationsData, error: destinationsError } = await supabase
        .from("destinations")
        .select("*")
        .order("name")

      if (destinationsError) throw destinationsError
      setDestinations(destinationsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      alert("Error al cargar los datos. Verifica la conexión con Supabase.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setIsAdding(true)
    setShowAccommodations(true)
    setAccommodations([])
    setAccommodationRates({}) // Limpiar tarifas temporales
    setFormData({
      name: "",
      description: "",
      price: "",
      destination_id: "",
      duration: "",
      available_dates: "",
      transport_type: "aereo",
      image_url: "",
      is_special: false,
      servicios_incluidos: "",
      servicios_adicionales: "",
    })
  }

  const handleEdit = async (pkg: TravelPackage) => {
    setIsEditing(pkg.id)
    setShowAccommodations(true)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price.toString(),
      destination_id: pkg.destination_id.toString(),
      duration: pkg.duration || "",
      available_dates: pkg.available_dates?.join(", ") || "",
      transport_type: pkg.transport_type || "aereo",
      image_url: pkg.image_url || "",
      is_special: pkg.is_special || false,
      servicios_incluidos: pkg.servicios_incluidos?.join(", ") || "",
      servicios_adicionales: pkg.servicios_adicionales?.join(", ") || "",
    })
    
    // Cargar alojamientos existentes
    await loadAccommodationsForPackage(pkg.id)
  }

  // Función para cargar alojamientos cuando se edita un paquete
  const loadAccommodationsForPackage = async (packageId: number) => {
    try {
      setIsLoadingAccommodations(true)
      const { data, error } = await supabase
        .from("accommodations")
        .select("*")
        .eq("paquete_id", packageId)

      if (error) throw error
      setAccommodations(data || [])
    } catch (error) {
      console.error("Error loading accommodations:", error)
      setAccommodations([])
    } finally {
      setIsLoadingAccommodations(false)
    }
  }

  // Función para agregar alojamiento
  const handleAddAccommodation = () => {
    if (!accommodationFormData.name) return

    const newAccommodation = {
      id: Date.now(), // Temporal ID para nuevos alojamientos
      name: accommodationFormData.name,
      stars: parseInt(accommodationFormData.stars),
      enlace_web: accommodationFormData.enlace_web || null,
      isNew: true,
    }

    setAccommodations(prev => [...prev, newAccommodation])
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
    })
  }

  // Función para eliminar alojamiento de la lista temporal
  const handleRemoveAccommodation = (id: number) => {
    setAccommodations(prev => prev.filter(acc => acc.id !== id))
  }

  // Función para abrir modal de tarifas
  const handleManageRates = async (accommodation: any) => {
    setSelectedAccommodationForRates(accommodation)
    setShowRatesModal(true)
    
    // Si es un alojamiento existente (no nuevo), cargar sus tarifas
    if (!accommodation.isNew) {
      await loadRatesForAccommodation(accommodation.id)
    } else {
      // Si es nuevo, cargar tarifas temporales si existen
      const tempRates = accommodationRates[accommodation.id] || []
      setRates(tempRates)
    }
  }

  // Función para cargar tarifas de un alojamiento
  const loadRatesForAccommodation = async (accommodationId: number) => {
    try {
      setIsLoadingRates(true)
      const { data, error } = await supabase
        .from("accommodation_rates")
        .select("*")
        .eq("accommodation_id", accommodationId)
        .order("anio", { ascending: true })
        .order("mes", { ascending: true })

      if (error) throw error
      setRates(data || [])
    } catch (error) {
      console.error("Error loading rates:", error)
      setRates([])
    } finally {
      setIsLoadingRates(false)
    }
  }

  // Función para agregar/actualizar tarifa
  const handleSaveRate = async () => {
    if (!rateFormData.mes || !rateFormData.anio) {
      alert("Por favor selecciona mes y año")
      return
    }

    const rateData = {
      mes: parseInt(rateFormData.mes),
      anio: parseInt(rateFormData.anio),
      tarifa_dbl: parseFloat(rateFormData.tarifa_dbl) || 0,
      tarifa_tpl: parseFloat(rateFormData.tarifa_tpl) || 0,
      tarifa_cpl: parseFloat(rateFormData.tarifa_cpl) || 0,
      tarifa_menor: parseFloat(rateFormData.tarifa_menor) || 0,
    }

    // Si es un alojamiento nuevo, agregar a lista temporal
    if (selectedAccommodationForRates.isNew) {
      const newRate = {
        id: Date.now(),
        ...rateData,
        accommodation_id: selectedAccommodationForRates.id,
        isNew: true,
      }
      
      // Actualizar las tarifas para este alojamiento específico
      setAccommodationRates(prev => {
        const currentRates = prev[selectedAccommodationForRates.id] || []
        const filteredRates = currentRates.filter(r => !(r.mes === rateData.mes && r.anio === rateData.anio))
        return {
          ...prev,
          [selectedAccommodationForRates.id]: [...filteredRates, newRate]
        }
      })
      
      // También actualizar el estado rates para el modal
      setRates(prev => {
        const filtered = prev.filter(r => !(r.mes === rateData.mes && r.anio === rateData.anio))
        return [...filtered, newRate]
      })
      
      alert("Tarifa agregada (se guardará al guardar el paquete)")
    } else {
      // Si es un alojamiento existente, guardar en base de datos
      try {
        const { error } = await supabase
          .from("accommodation_rates")
          .upsert({
            ...rateData,
            accommodation_id: selectedAccommodationForRates.id,
          })

        if (error) throw error
        await loadRatesForAccommodation(selectedAccommodationForRates.id)
        alert("Tarifa guardada exitosamente")
      } catch (error) {
        console.error("Error saving rate:", error)
        alert("Error al guardar la tarifa")
      }
    }

    // Limpiar formulario
    setRateFormData({
      mes: "",
      anio: "2025",
      tarifa_dbl: "",
      tarifa_tpl: "",
      tarifa_cpl: "",
      tarifa_menor: "",
    })
  }

  // Función para eliminar tarifa
  const handleDeleteRate = async (rateId: number) => {
    if (!confirm("¿Estás seguro de eliminar esta tarifa?")) return

    if (selectedAccommodationForRates.isNew) {
      // Eliminar de lista temporal y del estado del modal
      setAccommodationRates(prev => {
        const currentRates = prev[selectedAccommodationForRates.id] || []
        const filteredRates = currentRates.filter(r => r.id !== rateId)
        return {
          ...prev,
          [selectedAccommodationForRates.id]: filteredRates
        }
      })
      setRates(prev => prev.filter(r => r.id !== rateId))
    } else {
      // Eliminar de base de datos
      try {
        const { error } = await supabase
          .from("accommodation_rates")
          .delete()
          .eq("id", rateId)

        if (error) throw error
        await loadRatesForAccommodation(selectedAccommodationForRates.id)
        alert("Tarifa eliminada exitosamente")
      } catch (error) {
        console.error("Error deleting rate:", error)
        alert("Error al eliminar la tarifa")
      }
    }
  }

  // Función para cerrar modal de tarifas
  const handleCloseRatesModal = () => {
    setShowRatesModal(false)
    setSelectedAccommodationForRates(null)
    setRates([])
    setRateFormData({
      mes: "",
      anio: "2025",
      tarifa_dbl: "",
      tarifa_tpl: "",
      tarifa_cpl: "",
      tarifa_menor: "",
    })
  }

  // Función para guardar alojamientos en la base de datos
  const saveAccommodationsForPackage = async (packageId: number) => {
    try {
      // Eliminar alojamientos existentes si estamos editando
      if (isEditing) {
        await supabase.from("accommodations").delete().eq("paquete_id", packageId)
      }

      // Guardar nuevos alojamientos
      const accommodationsToSave = accommodations.map(acc => ({
        name: acc.name,
        stars: acc.stars,
        enlace_web: acc.enlace_web,
        paquete_id: packageId,
      }))

      if (accommodationsToSave.length > 0) {
        const { data: savedAccommodations, error } = await supabase
          .from("accommodations")
          .insert(accommodationsToSave)
          .select()

        if (error) throw error

        // Guardar tarifas para cada alojamiento
        for (let i = 0; i < accommodations.length; i++) {
          const originalAcc = accommodations[i]
          const savedAcc = savedAccommodations[i]
          
          // Obtener tarifas para este alojamiento específico
          let ratesToSave: any[] = []
          
          if (originalAcc.isNew) {
            // Si es un alojamiento nuevo, usar las tarifas temporales
            const tempRates = accommodationRates[originalAcc.id] || []
            ratesToSave = tempRates.map(rate => ({
              accommodation_id: savedAcc.id,
              mes: rate.mes,
              anio: rate.anio,
              tarifa_dbl: rate.tarifa_dbl,
              tarifa_tpl: rate.tarifa_tpl,
              tarifa_cpl: rate.tarifa_cpl,
              tarifa_menor: rate.tarifa_menor,
            }))
          } else {
            // Si es un alojamiento existente, las tarifas ya están en la BD
            // No necesitamos hacer nada aquí porque las tarifas se mantienen
          }

          if (ratesToSave.length > 0) {
            console.log(`Guardando ${ratesToSave.length} tarifas para alojamiento ${savedAcc.name}:`, ratesToSave)
            
            const { error: rateError } = await supabase
              .from("accommodation_rates")
              .insert(ratesToSave)

            if (rateError) {
              console.error("Error saving rates:", rateError)
              throw rateError
            }
          }
        }
      }
    } catch (error) {
      console.error("Error saving accommodations:", error)
      throw error
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const packageData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        destination_id: Number.parseInt(formData.destination_id),
        duration: formData.duration,
        available_dates: formData.available_dates.split(",").map((d) => d.trim()),
        image_url: formData.image_url || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(formData.name)}`,
        is_special: formData.is_special,
        servicios_incluidos: formData.servicios_incluidos 
          ? formData.servicios_incluidos.split(",").map((s) => s.trim()).filter(s => s.length > 0)
          : null,
        servicios_adicionales: formData.servicios_adicionales 
          ? formData.servicios_adicionales.split(",").map((s) => s.trim()).filter(s => s.length > 0)
          : null,
      }

      // Only add transport_type if the form has it
      if (formData.transport_type) {
        (packageData as any).transport_type = formData.transport_type
      }

      if (isAdding) {
        const { data: newPackage, error } = await supabase.from("travel_packages").insert([packageData]).select()
        if (error) throw error
        
        // Guardar alojamientos para el nuevo paquete
        if (newPackage && newPackage[0] && accommodations.length > 0) {
          await saveAccommodationsForPackage(newPackage[0].id)
        }
        
        alert("Paquete agregado exitosamente")
      } else if (isEditing) {
        const { error } = await supabase.from("travel_packages").update(packageData).eq("id", isEditing)
        if (error) throw error
        
        // Guardar alojamientos para el paquete editado
        if (accommodations.length >= 0) { // >= 0 para permitir eliminar todos los alojamientos
          await saveAccommodationsForPackage(isEditing)
        }
        
        alert("Paquete actualizado exitosamente")
      }

      await loadData()
      handleCancel()
    } catch (error) {
      console.error("Error saving package:", error)
      alert("Error al guardar el paquete: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setIsEditing(null)
    setShowAccommodations(false)
    setAccommodations([])
    setRates([])
    setAccommodationRates({}) // Limpiar tarifas temporales
    setShowRatesModal(false)
    setSelectedAccommodationForRates(null)
    setFormData({
      name: "",
      description: "",
      price: "",
      destination_id: "",
      duration: "",
      available_dates: "",
      transport_type: "aereo",
      image_url: "",
      is_special: false,
      servicios_incluidos: "",
      servicios_adicionales: "",
    })
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
    })
    setRateFormData({
      mes: "",
      anio: "2025",
      tarifa_dbl: "",
      tarifa_tpl: "",
      tarifa_cpl: "",
      tarifa_menor: "",
    })
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que querés eliminar este paquete?")) {
      try {
        const { error } = await supabase.from("travel_packages").update({ is_active: false }).eq("id", id)

        if (error) throw error

        await loadData()
        alert("Paquete eliminado exitosamente")
      } catch (error) {
        console.error("Error deleting package:", error)
        alert("Error al eliminar el paquete")
      }
    }
  }

  // Función para renderizar estrellas
  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ))
  }

  const getPackagesByTransport = (transport: "aereo" | "bus" | "crucero") => {
    return packages.filter((pkg) => {
      const packageTransport = pkg.transport_type || "aereo"
      return packageTransport === transport
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Ver Sitio Web
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Paquetes</p>
                  <p className="text-3xl font-bold text-gray-900">{packages.length}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paquetes Aéreos</p>
                  <p className="text-3xl font-bold text-primary">{getPackagesByTransport("aereo").length}</p>
                </div>
                <Plane className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paquetes en Bus</p>
                  <p className="text-3xl font-bold text-bus">{getPackagesByTransport("bus").length}</p>
                </div>
                <Bus className="w-8 h-8 text-bus" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cruceros</p>
                  <p className="text-3xl font-bold text-blue-600">{getPackagesByTransport("crucero").length}</p>
                </div>
                <Ship className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs para diferentes secciones de administración */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="packages" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="packages" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Gestión de Paquetes</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configuración del Sitio</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="packages">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Gestión de Paquetes</CardTitle>
                    <Button
                      onClick={handleAdd}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Paquete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Add/Edit Form */}
                  {(isAdding || isEditing) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-6 bg-gray-50 rounded-lg"
                    >
                      <h3 className="text-lg font-semibold mb-4">
                        {isAdding ? "Agregar Nuevo Paquete" : "Editar Paquete"}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Paquete</label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Buenos Aires & Cataratas"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Precio (USD)</label>
                          <Input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                            placeholder="1200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
                          <Select
                            value={formData.destination_id}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, destination_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar destino" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinations.map((dest) => (
                                <SelectItem key={dest.id} value={dest.id.toString()}>
                                  {dest.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Transporte</label>
                          <Select
                            value={formData.transport_type}
                            onValueChange={(value: "aereo" | "bus" | "crucero") =>
                              setFormData((prev) => ({ ...prev, transport_type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar transporte" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aereo">
                                <div className="flex items-center space-x-2">
                                  <Plane className="w-4 h-4" />
                                  <span>Aéreo</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="bus">
                                <div className="flex items-center space-x-2">
                                  <Bus className="w-4 h-4" />
                                  <span>Bus</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="crucero">
                                <div className="flex items-center space-x-2">
                                  <Ship className="w-4 h-4" />
                                  <span>Crucero</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
                          <Input
                            value={formData.duration}
                            onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                            placeholder="7 días"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción (Markdown soportado)
                          </label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción del paquete de viaje... Puedes usar **negrita**, *cursiva*, listas, etc."
                            rows={5}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tip: Usa **texto** para negrita, *texto* para cursiva, - para listas
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fechas Disponibles (separadas por coma)
                          </label>
                          <Input
                            value={formData.available_dates}
                            onChange={(e) => setFormData((prev) => ({ ...prev, available_dates: e.target.value }))}
                            placeholder="15 Mar 2024, 22 Abr 2024, 10 May 2024"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">URL de Imagen</label>
                          <Input
                            value={formData.image_url}
                            onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                            placeholder="https://ejemplo.com/imagen.jpg (opcional)"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Servicios Incluidos (separados por coma)
                          </label>
                          <Textarea
                            value={formData.servicios_incluidos}
                            onChange={(e) => setFormData((prev) => ({ ...prev, servicios_incluidos: e.target.value }))}
                            placeholder="Desayuno, Traslados, Guía turístico, Seguro de viaje"
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Servicios Adicionales (separados por coma)
                          </label>
                          <Textarea
                            value={formData.servicios_adicionales}
                            onChange={(e) => setFormData((prev) => ({ ...prev, servicios_adicionales: e.target.value }))}
                            placeholder="Almuerzo, Excursiones opcionales, WiFi, Spa"
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_special"
                              checked={formData.is_special}
                              onCheckedChange={(checked) => 
                                setFormData((prev) => ({ ...prev, is_special: checked as boolean }))
                              }
                            />
                            <label
                              htmlFor="is_special"
                              className="text-sm font-medium text-gray-700 cursor-pointer"
                            >
                              Paquete de la sección especial
                            </label>
                          </div>
                        </div>

                        {/* Sección de Alojamientos */}
                        {showAccommodations && (
                          <div className="md:col-span-2 mt-6">
                            <div className="border-t pt-6">
                              <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Hotel className="w-5 h-5 mr-2" />
                                Alojamientos
                              </h3>
                              
                              {/* Formulario para agregar alojamiento */}
                              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <h4 className="font-medium mb-3">Agregar Alojamiento</h4>
                                <div className="grid md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Hotel</label>
                                    <Input
                                      value={accommodationFormData.name}
                                      onChange={(e) => setAccommodationFormData(prev => ({...prev, name: e.target.value}))}
                                      placeholder="Hotel Paradise"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estrellas</label>
                                    <Select
                                      value={accommodationFormData.stars}
                                      onValueChange={(value) => setAccommodationFormData(prev => ({...prev, stars: value}))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <SelectItem key={star} value={star.toString()}>
                                            <div className="flex items-center space-x-1">
                                              <span>{star}</span>
                                              {renderStars(star)}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web (opcional)</label>
                                    <Input
                                      value={accommodationFormData.enlace_web}
                                      onChange={(e) => setAccommodationFormData(prev => ({...prev, enlace_web: e.target.value}))}
                                      placeholder="https://hotelparadise.com"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  onClick={handleAddAccommodation}
                                  className="mt-3 bg-green-600 hover:bg-green-700"
                                  disabled={!accommodationFormData.name}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Agregar Alojamiento
                                </Button>
                              </div>

                              {/* Lista de alojamientos agregados */}
                              {isLoadingAccommodations ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                  <span className="ml-2 text-gray-600">Cargando alojamientos...</span>
                                </div>
                              ) : accommodations.length > 0 ? (
                                <div className="space-y-2">
                                  <h4 className="font-medium">Alojamientos del Paquete ({accommodations.length})</h4>
                                  {accommodations.map((accommodation) => (
                                    <div key={accommodation.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Hotel className="w-4 h-4 text-gray-500" />
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium">{accommodation.name}</span>
                                            <div className="flex items-center space-x-1">
                                              {renderStars(accommodation.stars)}
                                            </div>
                                          </div>
                                          {accommodation.enlace_web && (
                                            <div className="text-sm text-blue-600 truncate max-w-xs">
                                              {accommodation.enlace_web}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleManageRates(accommodation)}
                                          className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRemoveAccommodation(accommodation.id)}
                                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}

                      </div>
                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Guardar
                            </>
                          )}
                        </Button>
                        <Button onClick={handleCancel} variant="outline">
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Packages List */}
                  <div className="space-y-4">
                    {packages.map((pkg, index) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                              <Badge variant="outline">{destinations.find((d) => d.id === pkg.destination_id)?.name}</Badge>
                              <Badge
                                className={
                                  (pkg.transport_type || "aereo") === "bus" 
                                    ? "bg-bus text-white" 
                                    : (pkg.transport_type || "aereo") === "crucero"
                                    ? "bg-blue-600 text-white"
                                    : "bg-secondary text-gray-900"
                                }
                              >
                                {(pkg.transport_type || "aereo") === "bus" ? (
                                  <>
                                    <Bus className="w-3 h-3 mr-1" />
                                    Bus
                                  </>
                                ) : (pkg.transport_type || "aereo") === "crucero" ? (
                                  <>
                                    <Ship className="w-3 h-3 mr-1" />
                                    Crucero
                                  </>
                                ) : (
                                  <>
                                    <Plane className="w-3 h-3 mr-1" />
                                    Aéreo
                                  </>
                                )}
                              </Badge>
                              <Badge className="bg-green-100 text-green-800">${pkg.price}</Badge>
                              {pkg.is_special && (
                                <Badge className="bg-purple-100 text-purple-800">Sección Especial</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-2">{pkg.description}</p>
                            
                            {/* Mostrar servicios si existen */}
                            {(pkg.servicios_incluidos || pkg.servicios_adicionales) && (
                              <div className="mb-2 space-y-1">
                                {pkg.servicios_incluidos && pkg.servicios_incluidos.length > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium text-green-700">Incluye:</span> {pkg.servicios_incluidos.join(", ")}
                                  </div>
                                )}
                                {pkg.servicios_adicionales && pkg.servicios_adicionales.length > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium text-blue-700">Adicionales:</span> {pkg.servicios_adicionales.join(", ")}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Duración: {pkg.duration}</span>
                              <span>Fechas: {pkg.available_dates?.slice(0, 2).join(", ")}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(pkg)}
                              className="border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 hover:text-white transition-all duration-300 hover:scale-105"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(pkg.id)}
                              className="border-2 border-red-500 text-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-400 hover:text-white transition-all duration-300 hover:scale-105"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {packages.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay paquetes disponibles</p>
                        <p className="text-sm">Agregá tu primer paquete de viaje</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config">
              <SiteConfigManager />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Modal de Tarifas */}
      {showRatesModal && selectedAccommodationForRates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Gestionar Tarifas - {selectedAccommodationForRates.name}
              </h2>
              <Button variant="outline" onClick={handleCloseRatesModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Formulario para agregar/editar tarifa */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-4">Agregar/Actualizar Tarifa</h3>
              <div className="grid md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <Select
                    value={rateFormData.mes}
                    onValueChange={(value) => setRateFormData(prev => ({...prev, mes: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "1", label: "Enero" },
                        { value: "2", label: "Febrero" },
                        { value: "3", label: "Marzo" },
                        { value: "4", label: "Abril" },
                        { value: "5", label: "Mayo" },
                        { value: "6", label: "Junio" },
                        { value: "7", label: "Julio" },
                        { value: "8", label: "Agosto" },
                        { value: "9", label: "Septiembre" },
                        { value: "10", label: "Octubre" },
                        { value: "11", label: "Noviembre" },
                        { value: "12", label: "Diciembre" },
                      ].map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <Select
                    value={rateFormData.anio}
                    onValueChange={(value) => setRateFormData(prev => ({...prev, anio: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DBL (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rateFormData.tarifa_dbl}
                    onChange={(e) => setRateFormData(prev => ({...prev, tarifa_dbl: e.target.value}))}
                    placeholder="150.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TPL (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rateFormData.tarifa_tpl}
                    onChange={(e) => setRateFormData(prev => ({...prev, tarifa_tpl: e.target.value}))}
                    placeholder="120.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPL (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rateFormData.tarifa_cpl}
                    onChange={(e) => setRateFormData(prev => ({...prev, tarifa_cpl: e.target.value}))}
                    placeholder="100.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MENOR (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rateFormData.tarifa_menor}
                    onChange={(e) => setRateFormData(prev => ({...prev, tarifa_menor: e.target.value}))}
                    placeholder="75.00"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveRate}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Tarifa
              </Button>
            </div>

            {/* Lista de tarifas existentes */}
            {isLoadingRates ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-gray-600">Cargando tarifas...</span>
              </div>
            ) : rates.length > 0 ? (
              <div>
                <h3 className="font-medium mb-4">Tarifas Existentes</h3>
                <div className="space-y-2">
                  {rates.map((rate) => (
                    <div key={rate.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="grid grid-cols-6 gap-4 flex-1">
                        <div className="font-medium">
                          {new Date(2024, rate.mes - 1).toLocaleDateString('es-ES', { month: 'long' })} {rate.anio}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">DBL:</span> ${rate.tarifa_dbl}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">TPL:</span> ${rate.tarifa_tpl}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">CPL:</span> ${rate.tarifa_cpl}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">MENOR:</span> ${rate.tarifa_menor}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRate(rate.id)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!isLoadingRates && rates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay tarifas configuradas</p>
                <p className="text-sm">Agrega la primera tarifa para este alojamiento</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
