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
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm"
import { Plus, Edit, Trash2, Save, X, Package, Plane, Bus, Settings, Ship, Hotel, Star, DollarSign, Users, Calendar } from "lucide-react"
import { supabase, packageService, agencyService, pdfService, getFileIcon, getFileTypeLabel, type FileUploadResult, type FileType } from "@/lib/supabase"
import { adminPackageService, isAdminAuthenticated, signOutAdmin } from "@/lib/supabase-admin"
import type { TravelPackage, Destination, Agency } from "@/lib/supabase"
import { motion } from "framer-motion"
import { SiteConfigManager } from "./site-config-manager"
import { StockManager } from "./stock-manager"
import { ReservationsManager } from "./reservations-manager"
import { useToast } from "@/hooks/use-toast"

export function AdminDashboardSimple() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingAccommodations, setIsLoadingAccommodations] = useState(false)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<number | null>(null)
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null)
  const [isAgencyDetailOpen, setIsAgencyDetailOpen] = useState(false)
  
  // Filtros
  const [filterDestination, setFilterDestination] = useState<string>("all")
  
  // Estados para manejo de archivos
  const [uploadingFiles, setUploadingFiles] = useState<Record<FileType, boolean>>({
    tarifario: false,
    flyer: false,
    piezas_redes: false
  })
  const [selectedFiles, setSelectedFiles] = useState<Record<FileType, File | null>>({
    tarifario: null,
    flyer: null,
    piezas_redes: null
  })

  // Estado para modal de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: (() => void) | null
    variant?: "default" | "destructive"
  }>({ open: false, title: "", description: "", onConfirm: null, variant: "default" })

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAdminAuthenticated()
      if (!isAuth) {
        toast({
          title: "Sesión expirada",
          description: "Por favor inicia sesión nuevamente.",
          variant: "destructive",
        })
        window.location.reload()
      }
    }
    checkAuth()
  }, [])

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOutAdmin()
      window.location.reload()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Función de debug para testing
  const debugDeletePackage = async (id: number) => {
    console.log("🐛 DEBUG: Testing delete functionality for package", id);
    try {
      // Verificar autenticación primero
      const isAuth = await isAdminAuthenticated()
      console.log("� Admin autenticado:", isAuth)
      
      if (!isAuth) {
        throw new Error("Admin no está autenticado. Por favor inicia sesión de nuevo.")
      }
      
      // Usar el servicio admin autenticado
      console.log("🐛 DEBUG: Usando adminPackageService...");
      const result = await adminPackageService.deletePackage(id)
      
      console.log("🐛 DEBUG: Delete result:", result);
      return result;
      
    } catch (error) {
      console.error("🐛 DEBUG: Delete error:", error);
      throw error;
    }
  };
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [showAccommodations, setShowAccommodations] = useState(false)
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [selectedAccommodationForRates, setSelectedAccommodationForRates] = useState<any>(null)
  const [rates, setRates] = useState<any[]>([])
  const [accommodationRates, setAccommodationRates] = useState<{[key: number]: any[]}>({}) // Nuevo estado para tarifas por alojamiento
  const [editingRateId, setEditingRateId] = useState<number | null>(null)
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
    tarifario_pdf_url: "",
    flyer_pdf_url: "",
    piezas_redes_pdf_url: "",
    is_special: false,
    is_featured: false,
    priority_order: "0",
    servicios_incluidos: "",
    servicios_adicionales: "",
    max_group_size: "",
  })

  const [accommodationFormData, setAccommodationFormData] = useState({
    name: "",
    stars: "3",
    enlace_web: "",
    regimen: "",
  })

  // Cargar datos desde Supabase
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log("🔄 LoadData iniciado...");
      setIsLoading(true)
      console.log("Cargando datos...")

      // Try to load packages
      const packagesQuery = supabase
        .from("travel_packages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const { data: packagesData, error: packagesError } = await packagesQuery

      if (packagesError) {
        console.warn("❌ Error loading packages:", packagesError)
        setPackages([])
      } else {
        console.log("📦 Paquetes cargados:", packagesData?.length || 0)
        console.log("📦 IDs de paquetes:", packagesData?.map(p => p.id) || [])
        // Add transport_type if missing and set default is_special, is_featured, and priority_order
        const packagesWithTransport = (packagesData || []).map((pkg: any) => ({
          ...pkg,
          transport_type: pkg.transport_type || "aereo",
          is_special: pkg.is_special || false,
          is_featured: pkg.is_featured || false,
          priority_order: pkg.priority_order || 0,
        }))
        setPackages(packagesWithTransport)
        console.log("✅ Paquetes procesados y guardados en estado");
      }

      // Load destinations
      const { data: destinationsData, error: destinationsError } = await supabase
        .from("destinations")
        .select("*")
        .order("name")

      if (destinationsError) throw destinationsError
      setDestinations(destinationsData || [])

      // Load agencies
      try {
        const agenciesData = await agencyService.getAllAgencies()
        setAgencies(agenciesData || [])
      } catch (error) {
        console.warn("Error loading agencies:", error)
        setAgencies([])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos. Verifica la conexión con Supabase.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funciones para manejar archivos
  const handleFileChange = (fileType: FileType, file: File | null) => {
    setSelectedFiles(prev => ({
      ...prev,
      [fileType]: file
    }))
  }

  const handleFileUpload = async (packageId: number, fileType: FileType) => {
    const file = selectedFiles[fileType]
    if (!file) return

    setUploadingFiles(prev => ({ ...prev, [fileType]: true }))

    try {
      const result = await pdfService.uploadAndUpdatePDF(packageId, fileType, file)
      
      if (result.success) {
        // Actualizar el estado local del formData
        setFormData(prev => ({
          ...prev,
          [`${fileType}_pdf_url`]: result.url || ""
        }))
        
        // Recargar packages para reflejar cambios
        await loadData()
        
        toast({
          title: "Archivo subido",
          description: `${getFileTypeLabel(fileType)} subido exitosamente.`,
        })
      } else {
        toast({
          title: "Error al subir archivo",
          description: result.error || "No se pudo subir el archivo.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Error al subir archivo",
        description: "Ocurrió un error al subir el archivo. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fileType]: false }))
      // Limpiar el archivo seleccionado
      setSelectedFiles(prev => ({ ...prev, [fileType]: null }))
    }
  }

  const handleFileDelete = (packageId: number, fileType: FileType) => {
    setConfirmDialog({
      open: true,
      title: "Eliminar Archivo",
      description: `¿Estás seguro de que quieres eliminar este archivo?`,
      variant: "destructive",
      onConfirm: () => executeFileDelete(packageId, fileType)
    })
  }

  const executeFileDelete = async (packageId: number, fileType: FileType) => {
    try {
      const success = await pdfService.deletePDF(packageId, fileType)
      if (success) {
        await pdfService.updatePDFUrl(packageId, fileType, null)
        
        // Actualizar estado local
        setFormData(prev => ({
          ...prev,
          [`${fileType}_pdf_url`]: ""
        }))
        
        await loadData()
        toast({
          title: "Archivo eliminado",
          description: "El archivo se eliminó exitosamente.",
        })
      } else {
        toast({
          title: "Error al eliminar archivo",
          description: "No se pudo eliminar el archivo.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Error al eliminar archivo",
        description: "Ocurrió un error al eliminar el archivo.",
        variant: "destructive",
      })
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
      tarifario_pdf_url: "",
      flyer_pdf_url: "",
      piezas_redes_pdf_url: "",
      is_special: false,
      is_featured: false,
      priority_order: "0",
      servicios_incluidos: "",
      servicios_adicionales: "",
      max_group_size: "",
    })
  }

  const handleEdit = async (pkg: TravelPackage) => {
    setIsEditing(pkg.id)
    setShowAccommodations(true)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      destination_id: pkg.destination_id.toString(),
      duration: pkg.duration || "",
      available_dates: pkg.available_dates?.join(", ") || "",
      transport_type: pkg.transport_type || "aereo",
      image_url: pkg.image_url || "",
      tarifario_pdf_url: pkg.tarifario_pdf_url || "",
      flyer_pdf_url: pkg.flyer_pdf_url || "",
      piezas_redes_pdf_url: pkg.piezas_redes_pdf_url || "",
      is_special: pkg.is_special || false,
      is_featured: pkg.is_featured || false,
      priority_order: pkg.priority_order?.toString() || "0",
      servicios_incluidos: pkg.servicios_incluidos?.join(", ") || "",
      servicios_adicionales: pkg.servicios_adicionales?.join(", ") || "",
      max_group_size: (pkg as any).max_group_size?.toString() || "",
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
      regimen: accommodationFormData.regimen || null,
      isNew: true,
    }

    setAccommodations(prev => [...prev, newAccommodation])
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
      regimen: "",
    })
  }

  // Función para editar alojamiento
  const handleEditAccommodation = (accommodation: any) => {
    setEditingAccommodation(accommodation.id)
    setAccommodationFormData({
      name: accommodation.name,
      stars: accommodation.stars.toString(),
      enlace_web: accommodation.enlace_web || "",
      regimen: accommodation.regimen || "",
    })
  }

  // Función para cancelar edición de alojamiento
  const handleCancelEditAccommodation = () => {
    setEditingAccommodation(null)
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
      regimen: "",
    })
  }

  // Función para guardar edición de alojamiento
  const handleSaveEditAccommodation = () => {
    if (!accommodationFormData.name || editingAccommodation === null) return

    setAccommodations(prev => prev.map(acc => 
      acc.id === editingAccommodation 
        ? {
            ...acc,
            name: accommodationFormData.name,
            stars: parseInt(accommodationFormData.stars),
            enlace_web: accommodationFormData.enlace_web || null,
            regimen: accommodationFormData.regimen || null,
          }
        : acc
    ))

    setEditingAccommodation(null)
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
      regimen: "",
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

  // Función para guardar tarifas
  const handleSaveRate = async () => {
    if (!rateFormData.mes || !rateFormData.anio) {
      toast({
        title: "Datos incompletos",
        description: "Por favor selecciona mes y año.",
        variant: "destructive",
      })
      return
    }

    const rateData = {
      mes: parseInt(rateFormData.mes),
      anio: parseInt(rateFormData.anio),
      tarifa_dbl: parseFloat(rateFormData.tarifa_dbl) || null,
      tarifa_tpl: parseFloat(rateFormData.tarifa_tpl) || null,
      tarifa_cpl: parseFloat(rateFormData.tarifa_cpl) || null,
      tarifa_menor: parseFloat(rateFormData.tarifa_menor) || null,
    }

    // Si es un alojamiento nuevo, agregar a lista temporal
    if (selectedAccommodationForRates.isNew) {
      const newRate = {
        id: editingRateId || Date.now(),
        ...rateData,
        accommodation_id: selectedAccommodationForRates.id,
        isNew: true,
      }
      
      // Actualizar las tarifas para este alojamiento específico
      setAccommodationRates(prev => {
        const currentRates = prev[selectedAccommodationForRates.id] || []
        let filteredRates
        
        if (editingRateId) {
          // Si estamos editando, reemplazar la tarifa existente
          filteredRates = currentRates.filter(r => r.id !== editingRateId)
        } else {
          // Si es nueva, eliminar cualquier tarifa existente para el mismo mes/año
          filteredRates = currentRates.filter(r => !(r.mes === rateData.mes && r.anio === rateData.anio))
        }
        
        return {
          ...prev,
          [selectedAccommodationForRates.id]: [...filteredRates, newRate]
        }
      })
      
      // También actualizar el estado rates para el modal
      setRates(prev => {
        let filtered
        if (editingRateId) {
          filtered = prev.filter(r => r.id !== editingRateId)
        } else {
          filtered = prev.filter(r => !(r.mes === rateData.mes && r.anio === rateData.anio))
        }
        return [...filtered, newRate]
      })
      
      toast({
        title: editingRateId ? "Tarifa actualizada" : "Tarifa agregada",
        description: "Los cambios se guardarán al guardar el paquete.",
      })
    } else {
      // Si es un alojamiento existente, guardar en base de datos
      try {
        if (editingRateId) {
          // Actualizar tarifa existente
          const { error } = await supabase
            .from("accommodation_rates")
            .update(rateData)
            .eq("id", editingRateId)

          if (error) throw error
          toast({
            title: "Tarifa actualizada",
            description: "La tarifa se actualizó exitosamente.",
          })
        } else {
          // Crear nueva tarifa o actualizar si ya existe para el mismo mes/año
          const { error } = await supabase
            .from("accommodation_rates")
            .upsert({
              ...rateData,
              accommodation_id: selectedAccommodationForRates.id,
            })

          if (error) throw error
          toast({
            title: "Tarifa guardada",
            description: "La tarifa se guardó exitosamente.",
          })
        }
        
        await loadRatesForAccommodation(selectedAccommodationForRates.id)
      } catch (error) {
        console.error("Error saving rate:", error)
        toast({
          title: "Error al guardar tarifa",
          description: "No se pudo guardar la tarifa. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    }

    // Limpiar formulario y resetear estado de edición
    setRateFormData({
      mes: "",
      anio: "2025",
      tarifa_dbl: "",
      tarifa_tpl: "",
      tarifa_cpl: "",
      tarifa_menor: "",
    })
    setEditingRateId(null)
  }

  // Función para editar tarifa
  const handleEditRate = (rate: any) => {
    setEditingRateId(rate.id)
    setRateFormData({
      mes: rate.mes.toString(),
      anio: rate.anio.toString(),
      tarifa_dbl: rate.tarifa_dbl?.toString() || "",
      tarifa_tpl: rate.tarifa_tpl?.toString() || "",
      tarifa_cpl: rate.tarifa_cpl?.toString() || "",
      tarifa_menor: rate.tarifa_menor?.toString() || "",
    })
  }

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setEditingRateId(null)
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
  const handleDeleteRate = (rateId: number) => {
    setConfirmDialog({
      open: true,
      title: "Eliminar Tarifa",
      description: "¿Estás seguro de que quieres eliminar esta tarifa? Esta acción no se puede deshacer.",
      variant: "destructive",
      onConfirm: () => executeDeleteRate(rateId)
    })
  }

  const executeDeleteRate = async (rateId: number) => {
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
        toast({
          title: "Tarifa eliminada",
          description: "La tarifa se eliminó exitosamente.",
        })
      } catch (error) {
        console.error("Error deleting rate:", error)
        toast({
          title: "Error al eliminar tarifa",
          description: "No se pudo eliminar la tarifa. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    }
  }

  // Función para cerrar modal de tarifas
  const handleCloseRatesModal = () => {
    setShowRatesModal(false)
    setSelectedAccommodationForRates(null)
    setRates([])
    setEditingRateId(null)
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
      // Solo eliminar alojamientos existentes si estamos editando Y hay cambios
      if (isEditing) {
        // Primero, obtener las tarifas existentes antes de eliminar los alojamientos
        const { data: existingAccommodations } = await supabase
          .from("accommodations")
          .select(`
            *,
            accommodation_rates (*)
          `)
          .eq("paquete_id", packageId)

        // Crear un mapa de tarifas existentes por nombre de alojamiento
        const existingRatesMap: {[key: string]: any[]} = {}
        if (existingAccommodations) {
          existingAccommodations.forEach(acc => {
            existingRatesMap[acc.name] = acc.accommodation_rates || []
          })
        }

        // Eliminar alojamientos existentes
        await supabase.from("accommodations").delete().eq("paquete_id", packageId)

        // Preservar las tarifas existentes en accommodationRates para alojamientos que ya existían
        accommodations.forEach(acc => {
          if (!acc.isNew && existingRatesMap[acc.name]) {
            accommodationRates[acc.id] = existingRatesMap[acc.name]
          }
        })
      }

      // Guardar nuevos alojamientos
      const accommodationsToSave = accommodations.map(acc => ({
        name: acc.name,
        stars: acc.stars,
        enlace_web: acc.enlace_web,
        regimen: acc.regimen,
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
          const ratesToSave = (accommodationRates[originalAcc.id] || []).map(rate => ({
            accommodation_id: savedAcc.id,
            mes: rate.mes,
            anio: rate.anio,
            tarifa_dbl: rate.tarifa_dbl,
            tarifa_tpl: rate.tarifa_tpl,
            tarifa_cpl: rate.tarifa_cpl,
            tarifa_menor: rate.tarifa_menor,
          }))

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
        price: formData.price,
        destination_id: Number.parseInt(formData.destination_id),
        duration: formData.duration,
        available_dates: formData.available_dates.split(",").map((d) => d.trim()),
        image_url: formData.image_url || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(formData.name)}`,
        tarifario_pdf_url: formData.tarifario_pdf_url || null,
        flyer_pdf_url: formData.flyer_pdf_url || null,
        piezas_redes_pdf_url: formData.piezas_redes_pdf_url || null,
        is_special: formData.is_special,
        is_featured: formData.is_featured,
        priority_order: formData.priority_order ? Number.parseInt(formData.priority_order) : 0,
        servicios_incluidos: formData.servicios_incluidos 
          ? formData.servicios_incluidos.split(",").map((s) => s.trim()).filter(s => s.length > 0)
          : null,
        servicios_adicionales: formData.servicios_adicionales 
          ? formData.servicios_adicionales.split(",").map((s) => s.trim()).filter(s => s.length > 0)
          : null,
        max_group_size: formData.max_group_size ? Number.parseInt(formData.max_group_size) : null,
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
        
        // Cambiar automáticamente al modo edición para permitir subir PDFs
        if (newPackage && newPackage[0]) {
          setIsAdding(false)
          setIsEditing(newPackage[0].id)
          await loadData()
          toast({
            title: "Paquete agregado",
            description: "El paquete se creó exitosamente. Ahora puedes subir los PDFs.",
          })
        } else {
          toast({
            title: "Paquete agregado",
            description: "El paquete se creó exitosamente.",
          })
        }
      } else if (isEditing) {
        const { error } = await supabase.from("travel_packages").update(packageData).eq("id", isEditing)
        if (error) throw error
        
        // Guardar alojamientos para el paquete editado
        if (accommodations.length >= 0) { // >= 0 para permitir eliminar todos los alojamientos
          await saveAccommodationsForPackage(isEditing)
        }
        
        toast({
          title: "Paquete actualizado",
          description: "El paquete se actualizó exitosamente.",
        })
        await loadData()
      }
      handleCancel()
    } catch (error) {
      console.error("Error saving package:", error)
      toast({
        title: "Error al guardar paquete",
        description: (error as Error).message,
        variant: "destructive",
      })
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
      tarifario_pdf_url: "",
      flyer_pdf_url: "",
      piezas_redes_pdf_url: "",
      is_special: false,
      is_featured: false,
      priority_order: "0",
      servicios_incluidos: "",
      servicios_adicionales: "",
      max_group_size: "",
    })
    setAccommodationFormData({
      name: "",
      stars: "3",
      enlace_web: "",
      regimen: "",
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

  const handleDelete = (id: number) => {
    console.log("🚀 HandleDelete iniciado para ID:", id);

    // Encontrar el paquete que se va a eliminar para mostrar su nombre
    const packageToDelete = packages.find(pkg => pkg.id === id)
    const packageName = packageToDelete?.name || `paquete ${id}`

    console.log("📦 Paquete a eliminar:", packageToDelete);

    setConfirmDialog({
      open: true,
      title: "Eliminar Paquete",
      description: `¿Estás seguro de que querés eliminar "${packageName}"? Esta acción no se puede deshacer.`,
      variant: "destructive",
      onConfirm: () => executeDeletePackage(id, packageName)
    })
  }

  const executeDeletePackage = async (id: number, packageName: string) => {
    try {
      console.log("✅ Usuario confirmó eliminación");
      console.log("🔄 Iniciando proceso de eliminación...");
      setIsDeleting(true)
        
        // Test directo con supabase
        console.log("🧪 Testing direct supabase call...");
        const { data: testData, error: testError } = await supabase
          .from("travel_packages")
          .select("id, name, is_active")
          .eq("id", id)
          .single();
          
        console.log("🧪 Test data:", testData, "Error:", testError);
        
        if (testError) {
          console.error("❌ Error en test directo:", testError);
          throw testError;
        }
        
        // Usar el servicio de packages para eliminar
        console.log("📞 Llamando a packageService.deletePackage...");
        const deleteResult = await debugDeletePackage(id);
        
        console.log("✅ packageService.deletePackage completado sin errores");
        console.log("📋 Resultado de eliminación:", deleteResult);
        
        // Verificar que el paquete se eliminó correctamente
        console.log("🔍 Verificando eliminación en BD...");
        const { data: verifyData, error: verifyError } = await supabase
          .from("travel_packages")
          .select("id, name, is_active")
          .eq("id", id)
          .single();
          
        console.log("🔍 Verificación:", verifyData, "Error:", verifyError);
        
        if (verifyData && verifyData.is_active === true) {
          console.error("❌ ERROR: El paquete sigue activo en BD después de eliminarlo");
          throw new Error("El paquete no se eliminó correctamente en la base de datos");
        }
        
        // Actualizar la lista inmediatamente removiendo el paquete del estado local
        console.log("🔄 Actualizando estado local...");
        setPackages(prevPackages => {
          const newPackages = prevPackages.filter(pkg => pkg.id !== id);
          console.log("📊 Paquetes antes:", prevPackages.length, "Paquetes después:", newPackages.length);
          return newPackages;
        });
        
        // Recargar datos para asegurar consistencia
        console.log("🔄 Recargando datos desde BD...");
        await loadData()
        
        console.log("🎉 Eliminación completada exitosamente");
        toast({
          title: "Paquete eliminado",
          description: `El paquete "${packageName}" fue eliminado exitosamente.`,
        })
      } catch (error) {
        console.error("❌ Error en handleDelete:", error);
        toast({
          title: "Error al eliminar paquete",
          description: (error as Error).message,
          variant: "destructive",
        })
        // Recargar datos en caso de error para mantener consistencia
        console.log("🔄 Recargando datos después del error...");
        await loadData()
      } finally {
        console.log("🏁 Finalizando handleDelete...");
        setIsDeleting(false)
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

  // Funciones para gestión de agencias
  const handleApproveAgency = async (id: number) => {
    try {
      setIsLoadingAgencies(true)
      await agencyService.updateAgencyStatus(id, 'approved')
      await loadData() // Recargar datos
      toast({
        title: "Agencia aprobada",
        description: "La agencia fue aprobada exitosamente.",
      })
    } catch (error) {
      console.error('Error al aprobar agencia:', error)
      toast({
        title: "Error al aprobar agencia",
        description: "No se pudo aprobar la agencia. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAgencies(false)
    }
  }

  const handleRejectAgency = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Rechazar Agencia",
      description: "¿Estás seguro de que quieres rechazar esta agencia?",
      variant: "destructive",
      onConfirm: () => executeRejectAgency(id)
    })
  }

  const executeRejectAgency = async (id: number) => {
    try {
      setIsLoadingAgencies(true)
      await agencyService.updateAgencyStatus(id, 'rejected')
      await loadData() // Recargar datos
      toast({
        title: "Agencia rechazada",
        description: "La agencia fue rechazada.",
      })
    } catch (error) {
      console.error('Error al rechazar agencia:', error)
      toast({
        title: "Error al rechazar agencia",
        description: "No se pudo rechazar la agencia. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAgencies(false)
    }
  }

  const handleViewAgencyDetail = (agency: Agency) => {
    setSelectedAgency(agency)
    setIsAgencyDetailOpen(true)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobada'
      case 'rejected':
        return 'Rechazada'
      case 'pending':
      default:
        return 'Pendiente'
    }
  }

  // Función para filtrar paquetes
  const getFilteredPackages = () => {
    if (filterDestination === "all") {
      return packages
    }
    return packages.filter(pkg => pkg.destination_id?.toString() === filterDestination)
  }

  const filteredPackages = getFilteredPackages()

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
            <div className="flex gap-2">
              <Button onClick={() => (window.location.href = "/")} variant="outline">
                Ver Sitio Web
              </Button>
              <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                Cerrar Sesión
              </Button>
            </div>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="packages" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Paquetes</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center space-x-2">
                <Hotel className="w-4 h-4" />
                <span>Stock</span>
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Reservas</span>
              </TabsTrigger>
              <TabsTrigger value="agencies" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Agencias</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="packages">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center mb-4">
                    <CardTitle>Gestión de Paquetes</CardTitle>
                    <Button
                      onClick={handleAdd}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 shadow-lg text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Paquete
                    </Button>
                  </div>
                  
                  {/* Filtro por destino */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <label className="text-sm font-medium text-gray-700">Filtrar por destino:</label>
                    <Select value={filterDestination} onValueChange={setFilterDestination}>
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Todos los destinos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los destinos</SelectItem>
                        {destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id.toString()}>
                            {dest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filterDestination !== "all" && (
                      <Badge variant="secondary" className="ml-2">
                        {filteredPackages.length} paquete(s) encontrado(s)
                      </Badge>
                    )}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                          <Input
                            type="text"
                            value={formData.price}
                            onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                            placeholder="1200 USD | 1.400.000 ARS"
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

                        {/* PDFs para Agencias */}
                        <div className="md:col-span-2">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">PDFs para Agencias</h4>
                          <div className="space-y-4">
                            
                            {/* Tarifario PDF */}
                            <div className="border rounded-lg p-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                📋 Tarifario PDF
                              </label>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="file"
                                  accept="*/*"
                                  onChange={(e) => handleFileChange('tarifario', e.target.files?.[0] || null)}
                                  className="flex-1"
                                />
                                {isEditing && (
                                  <Button
                                    type="button"
                                    onClick={() => handleFileUpload(isEditing, 'tarifario')}
                                    disabled={!selectedFiles.tarifario || uploadingFiles.tarifario}
                                    size="sm"
                                  >
                                    {uploadingFiles.tarifario ? "Subiendo..." : "Subir"}
                                  </Button>
                                )}
                                {isAdding && (
                                  <Button
                                    type="button"
                                    disabled
                                    size="sm"
                                    variant="outline"
                                  >
                                    Guardar paquete primero
                                  </Button>
                                )}
                              </div>
                              {formData.tarifario_pdf_url && (
                                <div className="flex gap-2 items-center">
                                  <span className="text-sm text-green-600">✓ PDF disponible</span>
                                  {isEditing && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleFileDelete(isEditing, 'tarifario')}
                                    >
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Flyer PDF */}
                            <div className="border rounded-lg p-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                🎨 Flyer PDF
                              </label>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="file"
                                  accept="*/*"
                                  onChange={(e) => handleFileChange('flyer', e.target.files?.[0] || null)}
                                  className="flex-1"
                                />
                                {isEditing && (
                                  <Button
                                    type="button"
                                    onClick={() => handleFileUpload(isEditing, 'flyer')}
                                    disabled={!selectedFiles.flyer || uploadingFiles.flyer}
                                    size="sm"
                                  >
                                    {uploadingFiles.flyer ? "Subiendo..." : "Subir"}
                                  </Button>
                                )}
                                {isAdding && (
                                  <Button
                                    type="button"
                                    disabled
                                    size="sm"
                                    variant="outline"
                                  >
                                    Guardar paquete primero
                                  </Button>
                                )}
                              </div>
                              {formData.flyer_pdf_url && (
                                <div className="flex gap-2 items-center">
                                  <span className="text-sm text-green-600">✓ PDF disponible</span>
                                  {isEditing && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleFileDelete(isEditing, 'flyer')}
                                    >
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Piezas Redes PDF */}
                            <div className="border rounded-lg p-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                📱 Piezas para Redes Sociales PDF
                              </label>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  type="file"
                                  accept="*/*"
                                  onChange={(e) => handleFileChange('piezas_redes', e.target.files?.[0] || null)}
                                  className="flex-1"
                                />
                                {isEditing && (
                                  <Button
                                    type="button"
                                    onClick={() => handleFileUpload(isEditing, 'piezas_redes')}
                                    disabled={!selectedFiles.piezas_redes || uploadingFiles.piezas_redes}
                                    size="sm"
                                  >
                                    {uploadingFiles.piezas_redes ? "Subiendo..." : "Subir"}
                                  </Button>
                                )}
                                {isAdding && (
                                  <Button
                                    type="button"
                                    disabled
                                    size="sm"
                                    variant="outline"
                                  >
                                    Guardar paquete primero
                                  </Button>
                                )}
                              </div>
                              {formData.piezas_redes_pdf_url && (
                                <div className="flex gap-2 items-center">
                                  <span className="text-sm text-green-600">✓ PDF disponible</span>
                                  {isEditing && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleFileDelete(isEditing, 'piezas_redes')}
                                    >
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Los PDFs subidos estarán disponibles para las agencias autenticadas
                          </p>
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
                        <div className="md:col-span-2 space-y-4">
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
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_featured"
                              checked={formData.is_featured}
                              onCheckedChange={(checked) => 
                                setFormData((prev) => ({ ...prev, is_featured: checked as boolean }))
                              }
                            />
                            <label
                              htmlFor="is_featured"
                              className="text-sm font-medium text-gray-700 cursor-pointer"
                            >
                              Paquete destacado (aparece en home)
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Máximo de Personas en el Grupo
                          </label>
                          <Input
                            type="number"
                            value={formData.max_group_size}
                            onChange={(e) => setFormData((prev) => ({ ...prev, max_group_size: e.target.value }))}
                            placeholder="Dejar en blanco = sin máximo"
                            min="1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Si se deja en blanco, no habrá límite máximo para el grupo
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prioridad de Ordenamiento
                          </label>
                          <Input
                            type="number"
                            value={formData.priority_order}
                            onChange={(e) => setFormData((prev) => ({ ...prev, priority_order: e.target.value }))}
                            placeholder="0"
                            min="0"
                            max="9999"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Mayor número = mayor prioridad (se muestra primero). 0 = sin prioridad especial
                          </p>
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
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Régimen (opcional)</label>
                                    <Input
                                      value={accommodationFormData.regimen}
                                      onChange={(e) => setAccommodationFormData(prev => ({...prev, regimen: e.target.value}))}
                                      placeholder="Desayuno incluido, Media pensión, etc."
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
                                    <div key={accommodation.id} className="p-3 bg-white border rounded-lg">
                                      {editingAccommodation === accommodation.id ? (
                                        // Modo edición
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                                              <Input
                                                value={accommodationFormData.name}
                                                onChange={(e) => setAccommodationFormData(prev => ({...prev, name: e.target.value}))}
                                                className="text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Estrellas</label>
                                              <Select
                                                value={accommodationFormData.stars}
                                                onValueChange={(value) => setAccommodationFormData(prev => ({...prev, stars: value}))}
                                              >
                                                <SelectTrigger className="h-8">
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
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Sitio Web</label>
                                              <Input
                                                value={accommodationFormData.enlace_web}
                                                onChange={(e) => setAccommodationFormData(prev => ({...prev, enlace_web: e.target.value}))}
                                                className="text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Régimen</label>
                                              <Input
                                                value={accommodationFormData.regimen}
                                                onChange={(e) => setAccommodationFormData(prev => ({...prev, regimen: e.target.value}))}
                                                className="text-sm"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex gap-2 justify-end">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={handleCancelEditAccommodation}
                                            >
                                              <X className="w-3 h-3 mr-1" />
                                              Cancelar
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={handleSaveEditAccommodation}
                                              disabled={!accommodationFormData.name}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <Save className="w-3 h-3 mr-1" />
                                              Guardar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        // Modo vista
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <Hotel className="w-4 h-4 text-gray-500" />
                                            <div>
                                              <div className="flex items-center space-x-2">
                                                <span className="font-medium">{accommodation.name}</span>
                                                <div className="flex items-center space-x-1">
                                                  {renderStars(accommodation.stars)}
                                                </div>
                                              </div>
                                              <div className="text-sm text-gray-600 space-x-2">
                                                {accommodation.enlace_web && (
                                                  <span className="text-blue-600 truncate max-w-xs">
                                                    {accommodation.enlace_web}
                                                  </span>
                                                )}
                                                {accommodation.regimen && (
                                                  <span className="text-gray-500">
                                                    • {accommodation.regimen}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEditAccommodation(accommodation)}
                                              className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </Button>
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
                                      )}
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
                    {filteredPackages.length > 0 ? (
                      filteredPackages.map((pkg, index) => (
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
                              {pkg.is_featured && (
                                <Badge className="bg-yellow-100 text-yellow-800">Destacado</Badge>
                              )}
                              {pkg.priority_order > 0 && (
                                <Badge className="bg-blue-100 text-blue-800">Prioridad: {pkg.priority_order}</Badge>
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
                              disabled={isDeleting}
                              className="border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 hover:text-white transition-all duration-300 hover:scale-105 disabled:opacity-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(pkg.id)}
                              disabled={isDeleting}
                              className="border-2 border-red-500 text-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-400 hover:text-white transition-all duration-300 hover:scale-105 disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No se encontraron paquetes con el filtro seleccionado</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setFilterDestination("all")}
                        >
                          Ver todos los paquetes
                        </Button>
                      </div>
                    )}

                    {packages.length === 0 && filterDestination === "all" && (
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

            <TabsContent value="agencies">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Agencias</CardTitle>
                  <p className="text-sm text-gray-600">
                    Administra las solicitudes de registro de agencias. Aprueba o rechaza el acceso al módulo especial.
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingAgencies ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando agencias...</p>
                    </div>
                  ) : agencies.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No hay agencias registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {agencies.map((agency) => (
                        <motion.div
                          key={agency.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg p-4 bg-white shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold text-lg">{agency.razon_social}</h3>
                                <Badge className={getStatusBadgeVariant(agency.status)}>
                                  {getStatusText(agency.status)}
                                </Badge>
                              </div>
                              
                              {/* Información Legal */}
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Información Legal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div><strong>Razón Social:</strong> {agency.razon_social}</div>
                                  <div><strong>Nombre de Fantasía:</strong> {agency.nombre_fantasia}</div>
                                  <div><strong>CUIT:</strong> {agency.cuit}</div>
                                  <div><strong>N° Legajo:</strong> {agency.numero_legajo}</div>
                                </div>
                              </div>

                              {/* Información de Contacto */}
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Información de Contacto</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div><strong>Teléfono Principal:</strong> {agency.telefono_contacto_1}</div>
                                  {agency.telefono_contacto_2 && (
                                    <div><strong>Teléfono 2:</strong> {agency.telefono_contacto_2}</div>
                                  )}
                                  {agency.telefono_contacto_3 && (
                                    <div><strong>Teléfono 3:</strong> {agency.telefono_contacto_3}</div>
                                  )}
                                </div>
                              </div>

                              {/* Información de Domicilio */}
                              <div className="bg-green-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Domicilio</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div className="md:col-span-2"><strong>Dirección:</strong> {agency.domicilio}</div>
                                  <div><strong>Ciudad:</strong> {agency.ciudad}</div>
                                  <div><strong>Provincia:</strong> {agency.provincia}</div>
                                  <div><strong>País:</strong> {agency.pais}</div>
                                </div>
                              </div>

                              {/* Información de Emails */}
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Correos Electrónicos</h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div><strong>Email Principal:</strong> {agency.email_contacto_1}</div>
                                  {agency.email_contacto_2 && (
                                    <div><strong>Email Secundario:</strong> {agency.email_contacto_2}</div>
                                  )}
                                  <div><strong>Email Administración:</strong> {agency.email_administracion}</div>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                <p><strong>Fecha de solicitud:</strong> {new Date(agency.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            
                            {agency.status === 'pending' && (
                              <div className="flex flex-col gap-2 ml-4">
                                <Button
                                  onClick={() => handleViewAgencyDetail(agency)}
                                  variant="outline"
                                  size="sm"
                                  className="mb-2"
                                >
                                  Ver Detalle
                                </Button>
                                <Button
                                  onClick={() => handleApproveAgency(agency.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  size="sm"
                                  disabled={isLoadingAgencies}
                                >
                                  Aprobar
                                </Button>
                                <Button
                                  onClick={() => handleRejectAgency(agency.id)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={isLoadingAgencies}
                                >
                                  Rechazar
                                </Button>
                              </div>
                            )}
                            
                            {agency.status !== 'pending' && (
                              <div className="ml-4">
                                <Button
                                  onClick={() => handleViewAgencyDetail(agency)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Ver Detalle
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock">
              <StockManager destinations={destinations} />
            </TabsContent>

            <TabsContent value="reservations">
              <ReservationsManager />
            </TabsContent>

            <TabsContent value="config">
              <SiteConfigManager />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Modal de Detalle de Agencia */}
      <Dialog open={isAgencyDetailOpen} onOpenChange={setIsAgencyDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalle de Agencia - {selectedAgency?.razon_social}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAgency && (
            <div className="space-y-6">
              {/* Estado de la Agencia */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Badge className={getStatusBadgeVariant(selectedAgency.status)}>
                  {getStatusText(selectedAgency.status)}
                </Badge>
                <span className="text-sm text-gray-600">
                  Registrada el {new Date(selectedAgency.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Información Legal */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Información Legal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Razón Social</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.razon_social}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Nombre de Fantasía</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.nombre_fantasia}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">CUIT</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.cuit}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Número de Legajo</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.numero_legajo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Teléfono Principal</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.telefono_contacto_1}
                    </p>
                  </div>
                  {selectedAgency.telefono_contacto_2 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Teléfono Secundario</label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {selectedAgency.telefono_contacto_2}
                      </p>
                    </div>
                  )}
                  {selectedAgency.telefono_contacto_3 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Teléfono Terciario</label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {selectedAgency.telefono_contacto_3}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Domicilio */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Domicilio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Dirección</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.domicilio}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Ciudad</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.ciudad}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Provincia</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.provincia}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">País</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.pais}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información de Emails */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Correos Electrónicos</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Email Principal</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.email_contacto_1}
                    </p>
                  </div>
                  {selectedAgency.email_contacto_2 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Email Secundario</label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {selectedAgency.email_contacto_2}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Email Administración</label>
                    <p className="text-sm bg-white p-2 rounded border">
                      {selectedAgency.email_administracion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones de Administración */}
              {selectedAgency.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleApproveAgency(selectedAgency.id)
                      setIsAgencyDetailOpen(false)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    disabled={isLoadingAgencies}
                  >
                    Aprobar Agencia
                  </Button>
                  <Button
                    onClick={() => {
                      handleRejectAgency(selectedAgency.id)
                      setIsAgencyDetailOpen(false)
                    }}
                    variant="destructive"
                    className="flex-1"
                    disabled={isLoadingAgencies}
                  >
                    Rechazar Agencia
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className={`p-4 rounded-lg mb-6 ${editingRateId ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
              <h3 className="font-medium mb-4">
                {editingRateId ? '✏️ Editando Tarifa' : '➕ Agregar Nueva Tarifa'}
              </h3>
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
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSaveRate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingRateId ? "Actualizar Tarifa" : "Guardar Tarifa"}
                </Button>
                {editingRateId && (
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="border-gray-400 text-gray-600 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
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
                    <div key={rate.id} className={`flex items-center justify-between p-3 border rounded-lg ${editingRateId === rate.id ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                      <div className="grid grid-cols-6 gap-4 flex-1">
                        <div className="font-medium">
                          {new Date(2024, rate.mes - 1).toLocaleDateString('es-ES', { month: 'long' })} {rate.anio}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">DBL:</span> {rate.tarifa_dbl ? `$${rate.tarifa_dbl}` : '-'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">TPL:</span> {rate.tarifa_tpl ? `$${rate.tarifa_tpl}` : '-'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">CPL:</span> {rate.tarifa_cpl ? `$${rate.tarifa_cpl}` : '-'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">MENOR:</span> {rate.tarifa_menor ? `$${rate.tarifa_menor}` : '-'}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRate(rate)}
                            className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Confirmation Dialog */}
      <AlertDialogConfirm
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, title: "", description: "", onConfirm: null })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (confirmDialog.onConfirm) {
            confirmDialog.onConfirm()
          }
        }}
        variant={confirmDialog.variant}
      />
    </div>
  )
}
