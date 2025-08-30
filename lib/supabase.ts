import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para TypeScript
export interface TravelPackage {
  id: number
  name: string
  description: string
  price: number
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
  created_at: string
  updated_at: string
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
