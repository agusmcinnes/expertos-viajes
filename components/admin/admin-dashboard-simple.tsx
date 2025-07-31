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
import { Plus, Edit, Trash2, Save, X, Package, Plane, Bus, Settings } from "lucide-react"
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    destination_id: "",
    duration: "",
    available_dates: "",
    transport_type: "aereo" as "aereo" | "bus",
    image_url: "",
    is_special: false,
  })

  // Cargar datos desde Supabase
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Try to load packages with transport_type, fallback if column doesn't exist
      const packagesQuery = supabase
        .from("travel_packages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const { data: packagesData, error: packagesError } = await packagesQuery

      if (packagesError) {
        // If transport_type column doesn't exist, load without it
        if (packagesError.message.includes("transport_type")) {
          console.warn("transport_type column doesn't exist yet. Loading packages without transport filter.")
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("travel_packages")
            .select(
              "id, name, description, price, destination_id, duration, image_url, available_dates, max_capacity, is_active, created_at, updated_at",
            )
            .eq("is_active", true)
            .order("created_at", { ascending: false })

          if (fallbackError) throw fallbackError

                    // Add transport_type if missing and set default is_special
          const packagesWithTransport = (packagesData || []).map((pkg: any) => ({
            ...pkg,
            transport_type: pkg.transport_type || "aereo",
            is_special: pkg.is_special || false,
          }))

          setPackages(packagesWithTransport)
        } else {
          throw packagesError
        }
      } else {
        setPackages(packagesData || [])
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
    })
  }

  const handleEdit = (pkg: TravelPackage) => {
    setIsEditing(pkg.id)
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
    })
  }

  const handleSave = async () => {
    try {
      const packageData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        destination_id: Number.parseInt(formData.destination_id),
        duration: formData.duration,
        available_dates: formData.available_dates.split(",").map((d) => d.trim()),
        image_url: formData.image_url || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(formData.name)}`,
        is_special: formData.is_special,
      }

      // Only add transport_type if the form has it and it's not the default
      if (formData.transport_type && formData.transport_type !== "aereo") {
        ;(packageData as any).transport_type = formData.transport_type
      }

      if (isAdding) {
        const { error } = await supabase.from("travel_packages").insert([packageData])
        if (error) {
          // If transport_type column doesn't exist, try without it
          if (error.message.includes("transport_type")) {
            const { transport_type, ...dataWithoutTransport } = packageData as any
            const { error: retryError } = await supabase.from("travel_packages").insert([dataWithoutTransport])
            if (retryError) throw retryError
            alert("Paquete agregado exitosamente (sin tipo de transporte - ejecuta la migración de BD)")
          } else {
            throw error
          }
        } else {
          alert("Paquete agregado exitosamente")
        }
      } else if (isEditing) {
        const { error } = await supabase.from("travel_packages").update(packageData).eq("id", isEditing)
        if (error) {
          // If transport_type column doesn't exist, try without it
          if (error.message.includes("transport_type")) {
            const { transport_type, ...dataWithoutTransport } = packageData as any
            const { error: retryError } = await supabase
              .from("travel_packages")
              .update(dataWithoutTransport)
              .eq("id", isEditing)
            if (retryError) throw retryError
            alert("Paquete actualizado exitosamente (sin tipo de transporte - ejecuta la migración de BD)")
          } else {
            throw error
          }
        } else {
          alert("Paquete actualizado exitosamente")
        }
      }

      await loadData()
      handleCancel()
    } catch (error) {
      console.error("Error saving package:", error)
      alert("Error al guardar el paquete")
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setIsEditing(null)
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

  const getPackagesByTransport = (transport: "aereo" | "bus") => {
    return packages.filter((pkg) => {
      // Si transport_type no existe o es undefined, considerarlo como "aereo" por defecto
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
          className="grid md:grid-cols-3 gap-6 mb-8"
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
                      <Plus className="w-4 h-4 mr-2text-white" />
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
                        onValueChange={(value: "aereo" | "bus") =>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción del paquete de viaje..."
                        rows={3}
                      />
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
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
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
                              (pkg.transport_type || "aereo") === "bus" ? "bg-bus text-white" : "bg-secondary text-gray-900"
                            }
                          >
                            {(pkg.transport_type || "aereo") === "bus" ? (
                              <>
                                <Bus className="w-3 h-3 mr-1" />
                                Bus
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
</div>
  )
}
