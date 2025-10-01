import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para TypeScript
export interface TravelPackage {
  id: number
  name: string
  description: string
  price: string
  destination_id: number
  duration: string | null
  image_url: string | null
  available_dates: string[] | null
  max_capacity: number
  max_group_size?: number | null
  is_active: boolean
  is_special: boolean
  transport_type?: "aereo" | "bus" | "crucero"
  servicios_incluidos?: string[] | null
  servicios_adicionales?: string[] | null
  tarifario_pdf_url?: string | null
  flyer_pdf_url?: string | null
  piezas_redes_pdf_url?: string | null
  created_at: string
  updated_at: string
  destinations?: {
    id: number
    name: string
    code: string
  }
}

export interface Accommodation {
  id: number
  name: string
  stars: number
  enlace_web?: string | null
  regimen?: string | null
  paquete_id: number
  created_at: string
  updated_at: string
}

export interface AccommodationRate {
  id: number
  accommodation_id: number
  mes: number
  anio: number
  tarifa_dbl: number
  tarifa_tpl: number
  tarifa_cpl: number
  tarifa_menor: number
  created_at: string
  updated_at: string
}

export interface TravelPackageWithAccommodations extends TravelPackage {
  accommodations?: (Accommodation & { rates?: AccommodationRate[] })[]
}

export interface Destination {
  id: number
  name: string
  code: string
  description: string | null
  created_at: string
}

export interface ContactInquiry {
  id: number
  name: string
  email: string
  phone?: string | null
  message: string
  package_id?: number | null
  status: "pending" | "contacted" | "closed"
  created_at: string
}

export interface SiteConfig {
  id: number
  config_key: string
  config_value: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Agency {
  id: number
  razon_social: string
  cuit: string
  numero_legajo: string
  nombre_fantasia: string
  telefono_contacto_1: string // obligatorio
  telefono_contacto_2?: string | null
  telefono_contacto_3?: string | null
  domicilio: string
  ciudad: string
  provincia: string
  pais: string
  email_contacto_1: string // obligatorio
  email_contacto_2?: string | null
  email_administracion: string
  password: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}

// Funciones helper para interactuar con Supabase
export const packageService = {
  // Obtener todos los paquetes activos
  async getActivePackages() {
    const { data, error } = await supabase
      .from("travel_packages")
      .select(`
        *,
        destinations (
          id,
          name,
          code
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Obtener paquetes por destino y tipo de transporte
  async getPackagesByDestination(destinationCode: string, transportType?: "aereo" | "bus") {
    let query = supabase
      .from("travel_packages")
      .select(`
        *,
        destinations!inner (
          id,
          name,
          code
        )
      `)
      .eq("destinations.code", destinationCode)
      .eq("is_active", true)

    // Only filter by transport_type if the column exists and transportType is specified
    if (transportType) {
      try {
        query = query.eq("transport_type", transportType)
      } catch (error) {
        console.warn("transport_type column might not exist yet, skipping filter")
      }
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  // Obtener paquetes por tipo de transporte
  async getPackagesByTransport(transportType: "aereo" | "bus") {
    try {
      const { data, error } = await supabase
        .from("travel_packages")
        .select(`
          *,
          destinations (
            id,
            name,
            code
          )
        `)
        .eq("transport_type", transportType)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        // If the column doesn't exist, return empty array for bus, all packages for aereo
        if (error.message.includes("transport_type") && error.message.includes("does not exist")) {
          console.warn("transport_type column doesn't exist yet. Please run the database migration.")

          if (transportType === "bus") {
            return [] // No bus packages if column doesn't exist
          } else {
            // Return all packages as aereo if column doesn't exist
            const { data: allData, error: allError } = await supabase
              .from("travel_packages")
              .select(`
                *,
                destinations (
                  id,
                  name,
                  code
                )
              `)
              .eq("is_active", true)
              .order("created_at", { ascending: false })

            if (allError) throw allError
            return allData
          }
        }
        throw error
      }
      return data
    } catch (error) {
      console.error("Error in getPackagesByTransport:", error)
      // Fallback: return empty array for bus, all packages for aereo
      if (transportType === "bus") {
        return []
      } else {
        const { data, error: fallbackError } = await supabase
          .from("travel_packages")
          .select(`
            *,
            destinations (
              id,
              name,
              code
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        if (fallbackError) throw fallbackError
        return data || []
      }
    }
  },

  // Obtener paquete con alojamientos
  async getPackageWithAccommodations(packageId: number) {
    const { data: packageData, error: packageError } = await supabase
      .from("travel_packages")
      .select(`
        *,
        destinations (
          id,
          name,
          code
        )
      `)
      .eq("id", packageId)
      .single()

    if (packageError) throw packageError

    const { data: accommodations, error: accommodationsError } = await supabase
      .from("accommodations")
      .select(`
        *,
        accommodation_rates (*)
      `)
      .eq("paquete_id", packageId)
      .order("created_at", { ascending: false })

    if (accommodationsError) throw accommodationsError

    return { ...packageData, accommodations: accommodations || [] }
  },

  // Crear nuevo paquete
  async createPackage(packageData: Omit<TravelPackage, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("travel_packages").insert([packageData]).select()

    if (error) throw error
    return data[0]
  },

  // Actualizar paquete
  async updatePackage(id: number, packageData: Partial<TravelPackage>) {
    const { data, error } = await supabase
      .from("travel_packages")
      .update({ ...packageData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Eliminar paquete (soft delete)
  async deletePackage(id: number) {
    console.log("🔧 packageService.deletePackage iniciado para ID:", id)
    
    try {
      // Intento 1: Actualización normal
      const { data, error } = await supabase
        .from("travel_packages")
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()

      console.log("🔧 packageService resultado:", { data, error })

      if (error) {
        console.error("🔧 packageService error:", error)
        
        // Si hay error de RLS, intentamos con rpc (stored procedure)
        if (error.message.includes('RLS') || error.message.includes('policy') || error.message.includes('permission')) {
          console.log("🔧 Intentando con función RPC para bypass RLS...")
          return await this.deletePackageWithRPC(id)
        }
        
        throw error
      }

      if (!data || data.length === 0) {
        console.warn("🔧 packageService: No se actualizó ningún registro")
        
        // Verificar si el paquete existe
        const { data: checkData } = await supabase
          .from("travel_packages")
          .select("id, is_active")
          .eq("id", id)
          .single()
        
        if (!checkData) {
          throw new Error(`No se encontró el paquete con ID ${id}`)
        }
        
        if (!checkData.is_active) {
          console.log("🔧 El paquete ya estaba inactivo")
          return checkData
        }
        
        throw new Error(`No se pudo actualizar el paquete con ID ${id} - problemas de permisos`)
      }

      console.log("🔧 packageService: Paquete actualizado exitosamente:", data[0])
      return data[0]
    } catch (error) {
      console.error("🔧 Error en deletePackage:", error)
      throw error
    }
  },

  // Función auxiliar para eliminar con RPC (bypass RLS)
  async deletePackageWithRPC(id: number) {
    console.log("🔧 Usando RPC para eliminar paquete:", id)
    
    const { data, error } = await supabase.rpc('admin_delete_package', {
      package_id: id
    })
    
    if (error) {
      console.error("🔧 Error en RPC:", error)
      throw error
    }
    
    console.log("🔧 RPC exitoso:", data)
    return data
  },

  // Obtener paquetes especiales
  async getSpecialPackages() {
    const { data, error } = await supabase
      .from("travel_packages")
      .select(`
        *,
        destinations (
          id,
          name,
          code
        )
      `)
      .eq("is_active", true)
      .eq("is_special", true)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },
}

export const destinationService = {
  // Obtener todos los destinos
  async getAllDestinations() {
    const { data, error } = await supabase.from("destinations").select("*").order("name")

    if (error) throw error
    return data
  },
}

export const contactService = {
  // Crear nueva consulta
  async createInquiry(inquiryData: Omit<ContactInquiry, "id" | "created_at">) {
    const { data, error } = await supabase.from("contact_inquiries").insert([inquiryData]).select()

    if (error) throw error
    return data[0]
  },

  // Obtener todas las consultas
  async getAllInquiries() {
    const { data, error } = await supabase
      .from("contact_inquiries")
      .select(`
        *,
        travel_packages (
          name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },
}

// Servicio para configuración del sitio
export const siteConfigService = {
  // Obtener configuración por clave
  async getConfig(key: string) {
    const { data, error } = await supabase
      .from("site_config")
      .select("*")
      .eq("config_key", key)
      .single()

    if (error) throw error
    return data
  },

  // Obtener todas las configuraciones
  async getAllConfigs() {
    const { data, error } = await supabase
      .from("site_config")
      .select("*")
      .order("config_key")

    if (error) throw error
    return data
  },

  // Actualizar configuración
  async updateConfig(key: string, value: string) {
    const { data, error } = await supabase
      .from("site_config")
      .update({ 
        config_value: value, 
        updated_at: new Date().toISOString() 
      })
      .eq("config_key", key)
      .select()

    if (error) throw error
    return data[0]
  },

  // Crear nueva configuración
  async createConfig(key: string, value: string, description?: string) {
    const { data, error } = await supabase
      .from("site_config")
      .insert([{ 
        config_key: key, 
        config_value: value, 
        description 
      }])
      .select()

    if (error) throw error
    return data[0]
  },
}

// Servicio para alojamientos
export const accommodationService = {
  // Obtener alojamientos por paquete
  async getAccommodationsByPackage(packageId: number) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("paquete_id", packageId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Obtener alojamiento con tarifas
  async getAccommodationWithRates(accommodationId: number) {
    const { data: accommodation, error: accommodationError } = await supabase
      .from("accommodations")
      .select("*")
      .eq("id", accommodationId)
      .single()

    if (accommodationError) throw accommodationError

    const { data: rates, error: ratesError } = await supabase
      .from("accommodation_rates")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })

    if (ratesError) throw ratesError

    return { ...accommodation, rates: rates || [] }
  },

  // Crear nuevo alojamiento
  async createAccommodation(accommodationData: Omit<Accommodation, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("accommodations")
      .insert([accommodationData])
      .select()

    if (error) throw error
    return data[0]
  },

  // Actualizar alojamiento
  async updateAccommodation(id: number, accommodationData: Partial<Accommodation>) {
    const { data, error } = await supabase
      .from("accommodations")
      .update({ ...accommodationData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Eliminar alojamiento
  async deleteAccommodation(id: number) {
    const { error } = await supabase
      .from("accommodations")
      .delete()
      .eq("id", id)

    if (error) throw error
  },
}

// Servicio para tarifas de alojamientos
export const accommodationRateService = {
  // Obtener tarifas por alojamiento
  async getRatesByAccommodation(accommodationId: number) {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })

    if (error) throw error
    return data
  },

  // Obtener tarifas por mes y año
  async getRatesByMonthYear(accommodationId: number, mes: number, anio: number) {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .eq("mes", mes)
      .eq("anio", anio)
      .single()

    if (error) throw error
    return data
  },

  // Crear o actualizar tarifas
  async upsertRate(rateData: Omit<AccommodationRate, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .upsert([rateData], { 
        onConflict: "accommodation_id,mes,anio" 
      })
      .select()

    if (error) throw error
    return data[0]
  },

  // Crear múltiples tarifas
  async createMultipleRates(rates: Omit<AccommodationRate, "id" | "created_at" | "updated_at">[]) {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .insert(rates)
      .select()

    if (error) throw error
    return data
  },

  // Eliminar tarifa
  async deleteRate(id: number) {
    const { error } = await supabase
      .from("accommodation_rates")
      .delete()
      .eq("id", id)

    if (error) throw error
  },

  // Eliminar todas las tarifas de un alojamiento
  async deleteRatesByAccommodation(accommodationId: number) {
    const { error } = await supabase
      .from("accommodation_rates")
      .delete()
      .eq("accommodation_id", accommodationId)

    if (error) throw error
  },
}

// Servicios para agencias
export const agencyService = {
  // Registrar nueva agencia
  async registerAgency(agencyData: Omit<Agency, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    try {
      console.log('Registrando agencia con datos:', agencyData)
      
      // Hash de la contraseña usando una función simple (en producción usar bcrypt o similar)
      const hashedPassword = await hashPassword(agencyData.password)
      console.log('Password hasheado exitosamente')
      
      const insertData = {
        ...agencyData,
        password: hashedPassword,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Datos a insertar:', insertData)
      
      const { data, error } = await supabase
        .from("agencies")
        .insert([insertData])
        .select()

      if (error) {
        console.error('Error de Supabase details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`)
      }
      
      console.log('Agencia insertada exitosamente:', data)
      return data[0]
    } catch (error) {
      console.error('Error en registerAgency:', error)
      throw error
    }
  },

  // Obtener agencia por email y validar contraseña
  async validateAgencyLogin(email: string, password: string) {
    try {
      // Primero buscar la agencia sin filtrar por status
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("email_contacto_1", email)
        .single()

      if (error && error.code === 'PGRST116') {
        // No se encontró ninguna agencia con ese email
        return { success: false, message: 'No existe una agencia registrada con este email' }
      }
      
      if (error) throw error
      if (!data) return { success: false, message: 'No existe una agencia registrada con este email' }

      // Verificar el estado de la agencia
      if (data.status === 'pending') {
        return { success: false, message: 'Su solicitud de registro está siendo revisada por el administrador. Le notificaremos por email cuando sea aprobada.' }
      }
      
      if (data.status === 'rejected') {
        return { success: false, message: 'Su solicitud de registro fue rechazada. Contacte al administrador para más información.' }
      }

      // Si la agencia no tiene contraseña guardada (agencias antiguas), retornar null
      if (!data.password) {
        console.error('Agency does not have password set:', data.email_contacto_1)
        return { success: false, message: 'Error de configuración de cuenta. Contacte al administrador.' }
      }

      // Validar contraseña
      const isPasswordValid = await verifyPassword(password, data.password)
      if (!isPasswordValid) {
        return { success: false, message: 'Contraseña incorrecta' }
      }

      // Login exitoso
      return { success: true, agency: data }
      
    } catch (error) {
      console.error('Error in validateAgencyLogin:', error)
      return { success: false, message: 'Error interno del servidor. Intente nuevamente.' }
    }
  },

  // Obtener agencia por email
  async getAgencyByEmail(email: string) {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("email_contacto_1", email)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Obtener paquetes con PDF para agencias
  async getPackagesWithPDF() {
    const { data, error } = await supabase
      .from("travel_packages")
      .select(`
        *,
        destinations (
          id,
          name,
          code
        )
      `)
      .eq("is_active", true)
      .or("tarifario_pdf_url.not.is.null,flyer_pdf_url.not.is.null,piezas_redes_pdf_url.not.is.null")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Obtener todas las solicitudes de agencias (para admin)
  async getAllAgencies() {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Aprobar/rechazar agencia (para admin)
  async updateAgencyStatus(id: number, status: 'approved' | 'rejected') {
    const { data, error } = await supabase
      .from("agencies")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()

    if (error) throw error
    return data[0]
  }
}

// Funciones auxiliares para manejo de contraseñas
export const hashPassword = async (password: string): Promise<string> => {
  // En una implementación de producción, usar bcrypt o similar
  // Por ahora usamos una función hash simple
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'salt_secret_key')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const hashedInput = await hashPassword(password)
  return hashedInput === hash
}

// Tipos para archivos (expandido para incluir todo tipo de archivos)
export type FileType = 'tarifario' | 'flyer' | 'piezas_redes'
export type PDFType = 'tarifario' | 'flyer' | 'piezas_redes' // Mantenemos para compatibilidad

export interface FileUploadResult {
  success: boolean
  url?: string
  error?: string
  fileName?: string
  fileSize?: number
  fileType?: string
}

// Servicio para manejo de PDFs en Supabase Storage
export const pdfService = {
  // Subir un PDF específico para un paquete
  async uploadPDF(packageId: number, pdfType: PDFType, file: File): Promise<FileUploadResult> {
    try {
      console.log('🔧 Iniciando upload PDF:', { packageId, pdfType, fileName: file.name, fileSize: file.size, fileType: file.type })
      
      // Validar archivo - ahora permite múltiples tipos
      const allowedTypes = [
        // PDFs
        'application/pdf',
        // Imágenes
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documentos
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain', // .txt
        'text/csv', // .csv
        // Videos
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/mp3',
        // Archivos comprimidos
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
      ]

      if (!allowedTypes.includes(file.type)) {
        console.error('❌ Tipo de archivo no permitido:', file.type)
        return { 
          success: false, 
          error: `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: PDF, imágenes, documentos, videos, audio y archivos comprimidos.` 
        }
      }

      // Aumentar límite de tamaño a 100MB para otros tipos de archivo
      const maxSize = file.type.startsWith('video/') ? 200 * 1024 * 1024 : 100 * 1024 * 1024 // 200MB para videos, 100MB para otros
      if (file.size > maxSize) {
        console.error('❌ Archivo muy grande:', file.size)
        const maxSizeMB = file.type.startsWith('video/') ? '200MB' : '100MB'
        return { 
          success: false, 
          error: `El archivo es muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamaño máximo: ${maxSizeMB}` 
        }
      }

      // Test básico de conectividad
      console.log('� Probando conectividad con Supabase...')
      const { data: testData, error: testError } = await supabase.storage.from('pdfs_expertos').list()
      
      if (testError) {
        console.error('❌ Error de conectividad:', testError)
        return { success: false, error: 'Error de conectividad: ' + testError.message }
      }
      
      console.log('✅ Conectividad OK, archivos actuales:', testData?.length || 0)

      // Definir ruta del archivo
      const filePath = `packages/${packageId}/${pdfType}.pdf`
      console.log('📁 Ruta del archivo:', filePath)

      // Test de upload simple
      console.log('📤 Intentando upload...')
      const { data, error } = await supabase.storage
        .from('pdfs_expertos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('❌ Error en upload:', error)
        console.error('❌ Error details:', {
          message: error.message,
          name: error.name
        })
        return { success: false, error: `Error de upload: ${error.message}` }
      }
      
      console.log('✅ Archivo subido exitosamente:', data)

      // Obtener URL pública/signed para descarga
      let downloadUrl: string
      
      // Primero intentar URL pública
      const { data: publicUrlData } = supabase.storage
        .from('pdfs_expertos')
        .getPublicUrl(filePath)
      
      downloadUrl = publicUrlData.publicUrl
      console.log('🔗 URL pública generada:', downloadUrl)
      
      // Si el bucket no es público, usar signed URL
      // Esto es útil si necesitas URLs temporales con expiración
      /*
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('pdfs_expertos')
        .createSignedUrl(filePath, 3600) // 1 hora de expiración
      
      if (signedError) {
        console.warn('⚠️ No se pudo crear signed URL, usando public URL:', signedError)
      } else {
        downloadUrl = signedUrlData.signedUrl
        console.log('🔗 Signed URL generada:', downloadUrl)
      }
      */

      return {
        success: true,
        url: downloadUrl
      }
    } catch (error) {
      console.error('💥 Error uploading PDF:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  // Eliminar un PDF específico
  async deletePDF(packageId: number, pdfType: PDFType): Promise<boolean> {
    try {
      const filePath = `packages/${packageId}/${pdfType}.pdf`
      const { error } = await supabase.storage
        .from('pdfs_expertos')
        .remove([filePath])

      return !error
    } catch (error) {
      console.error('Error deleting PDF:', error)
      return false
    }
  },

  // Eliminar todos los PDFs de un paquete
  async deleteAllPackagePDFs(packageId: number): Promise<boolean> {
    try {
      const files = ['tarifario.pdf', 'flyer.pdf', 'piezas_redes.pdf']
      const filePaths = files.map(file => `packages/${packageId}/${file}`)

      const { error } = await supabase.storage
        .from('pdfs_expertos')
        .remove(filePaths)

      return !error
    } catch (error) {
      console.error('Error deleting package PDFs:', error)
      return false
    }
  },

  // Actualizar URL de PDF en la base de datos
  async updatePDFUrl(packageId: number, pdfType: PDFType, url: string | null): Promise<boolean> {
    try {
      const updateData: Partial<TravelPackage> = {}
      
      switch (pdfType) {
        case 'tarifario':
          updateData.tarifario_pdf_url = url
          break
        case 'flyer':
          updateData.flyer_pdf_url = url
          break
        case 'piezas_redes':
          updateData.piezas_redes_pdf_url = url
          break
      }

      const { error } = await supabase
        .from('travel_packages')
        .update(updateData)
        .eq('id', packageId)

      return !error
    } catch (error) {
      console.error('Error updating PDF URL:', error)
      return false
    }
  },

  // Función completa: upload + actualizar BD
  async uploadAndUpdatePDF(packageId: number, pdfType: PDFType, file: File): Promise<FileUploadResult> {
    const uploadResult = await this.uploadPDF(packageId, pdfType, file)
    
    if (uploadResult.success && uploadResult.url) {
      const updateSuccess = await this.updatePDFUrl(packageId, pdfType, uploadResult.url)
      
      if (!updateSuccess) {
        return {
          success: false,
          error: 'PDF subido pero no se pudo actualizar la base de datos'
        }
      }
    }

    return uploadResult
  },

  // Función para verificar si un PDF existe y es accesible
  async verifyPDFAccess(packageId: number, pdfType: PDFType): Promise<boolean> {
    try {
      const filePath = `packages/${packageId}/${pdfType}.pdf`
      
      // Verificar si el archivo existe
      const { data, error } = await supabase.storage
        .from('pdfs_expertos')
        .list(`packages/${packageId}`, {
          search: `${pdfType}.pdf`
        })
      
      if (error) {
        console.error('❌ Error verificando acceso al PDF:', error)
        return false
      }
      
      const fileExists = data && data.length > 0
      console.log(`🔍 PDF ${pdfType} existe para paquete ${packageId}:`, fileExists)
      
      return fileExists
    } catch (error) {
      console.error('❌ Error en verificación de PDF:', error)
      return false
    }
  },

  // Función para generar URL de descarga (signed URL para mayor seguridad)
  async getDownloadUrl(packageId: number, pdfType: PDFType): Promise<string | null> {
    try {
      const filePath = `packages/${packageId}/${pdfType}.pdf`
      
      // Intentar crear una signed URL para descarga segura
      const { data, error } = await supabase.storage
        .from('pdfs_expertos')
        .createSignedUrl(filePath, 3600) // 1 hora de expiración
      
      if (error) {
        console.error('❌ Error creando signed URL:', error)
        
        // Fallback a URL pública
        const { data: publicData } = supabase.storage
          .from('pdfs_expertos')
          .getPublicUrl(filePath)
        
        console.log('🔄 Usando URL pública como fallback:', publicData.publicUrl)
        return publicData.publicUrl
      }
      
      console.log('✅ Signed URL creada:', data.signedUrl)
      return data.signedUrl
    } catch (error) {
      console.error('❌ Error generando URL de descarga:', error)
      return null
    }
  }
}

export const getFileIcon = (fileType: string, fileName?: string): string => {
  // PDFs
  if (fileType === 'application/pdf') return 'FileText'
  
  // Imágenes
  if (fileType.startsWith('image/')) return 'Image'
  
  // Videos
  if (fileType.startsWith('video/')) return 'Video'
  
  // Audio
  if (fileType.startsWith('audio/')) return 'Music'
  
  // Documentos de texto
  if (fileType === 'text/plain' || 
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'FileText'
  }
  
  // Hojas de cálculo
  if (fileType === 'application/vnd.ms-excel' || 
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'text/csv') {
    return 'Sheet'
  }
  
  // Presentaciones
  if (fileType === 'application/vnd.ms-powerpoint' || 
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return 'Presentation'
  }
  
  // Archivos comprimidos
  if (fileType === 'application/zip' || 
      fileType === 'application/x-rar-compressed' || 
      fileType === 'application/x-7z-compressed') {
    return 'Archive'
  }
  
  // Por defecto
  return 'File'
}

export const getFileTypeLabel = (fileType: string): string => {
  if (fileType === 'application/pdf') return 'PDF'
  if (fileType.startsWith('image/')) return 'Imagen'
  if (fileType.startsWith('video/')) return 'Video'
  if (fileType.startsWith('audio/')) return 'Audio'
  if (fileType === 'text/plain') return 'Texto'
  if (fileType === 'text/csv') return 'CSV'
  if (fileType.includes('word')) return 'Word'
  if (fileType.includes('excel')) return 'Excel'
  if (fileType.includes('powerpoint')) return 'PowerPoint'
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'Comprimido'
  
  return 'Archivo'
}
