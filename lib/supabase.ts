import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { sortPackagesForDisplay } from "./date-utils"
import { RATE_FIELDS, monthYearOfDeparture, rateValue, toDepartureISO, type RateField } from "./rates"
import {
  getRoomStock,
  getRoomTypeName,
  roomsCapacity,
  validateRoomDetails,
  type RoomDetailInput,
  type RoomType,
} from "./room-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create supabase client - will work at runtime, gracefully handle missing env during build
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

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
  is_featured: boolean
  is_grupal: boolean
  priority_order: number
  transport_type?: "aereo" | "bus" | "crucero"
  ciudades?: string[] | null
  servicios_incluidos?: string[] | null
  servicios_adicionales?: string[] | null
  tarifario_pdf_url?: string | null
  flyer_pdf_url?: string | null
  piezas_redes_pdf_url?: string | null
  url?: string | null
  novedades_category_id?: number | null
  cuotas?: string | null
  price_label?: string | null
  price_sublabel?: string | null
  created_at: string
  updated_at: string
  destinations?: {
    id: number
    name: string
    code: string
  }
}

export interface NovedadesCategory {
  id: number
  name: string
  slug: string
  is_active: boolean
  display_order: number
  image_url?: string | null
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
  /** 'YYYY-MM-DD' → tarifa de esa salida (mes/anio son los de la fecha). null → tarifa del mes. */
  fecha_salida: string | null
  // null o 0 = sin tarifa (las columnas viejas tienen default 0; sgl/qpl, NULL)
  tarifa_sgl: number | null
  tarifa_dbl: number | null
  tarifa_tpl: number | null
  tarifa_cpl: number | null
  tarifa_qpl: number | null
  tarifa_menor: number | null
  currency?: string | null
  created_at: string
  updated_at: string
}

/** Montos y moneda que se guardan en una tarifa. Lo que no viene (undefined) no se toca al actualizar. */
export type AccommodationRateValues = Partial<Pick<AccommodationRate, RateField>> & { currency?: string | null }

/** Fila para insertar a mano (createMultipleRates). sgl/qpl/fecha_salida opcionales para los llamados viejos. */
export type AccommodationRateInput = Omit<
  AccommodationRate,
  "id" | "created_at" | "updated_at" | "fecha_salida" | "tarifa_sgl" | "tarifa_qpl"
> & {
  fecha_salida?: string | null
  tarifa_sgl?: number | null
  tarifa_qpl?: number | null
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
  password?: string // solo se envía al registrarse; nunca se lee
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
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return sortPackagesForDisplay<TravelPackage>(data ?? [])
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
      .eq("is_active", true)

    if (destinationCode === "grupales") {
      query = query.eq("is_grupal", true)
    } else {
      query = query.eq("destinations.code", destinationCode)
    }

    // Only filter by transport_type if the column exists and transportType is specified
    if (transportType) {
      try {
        query = query.eq("transport_type", transportType)
      } catch (error) {
        console.warn("transport_type column might not exist yet, skipping filter")
      }
    }

    const { data, error } = await query
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return sortPackagesForDisplay<TravelPackage>(data ?? [])
  },

  // Obtener paquetes por tipo de transporte
  async getPackagesByTransport(transportType: "aereo" | "bus" | "crucero") {
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
        .order("priority_order", { ascending: false })
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
              .order("priority_order", { ascending: false })
              .order("created_at", { ascending: false })

            if (allError) throw allError
            return sortPackagesForDisplay<TravelPackage>(allData ?? [])
          }
        }
        throw error
      }
      return sortPackagesForDisplay<TravelPackage>(data ?? [])
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
          .order("priority_order", { ascending: false })
          .order("created_at", { ascending: false })

        if (fallbackError) throw fallbackError
        return sortPackagesForDisplay<TravelPackage>(data ?? [])
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
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return sortPackagesForDisplay<TravelPackage>(data ?? [])
  },

  // Obtener paquetes destacados
  async getFeaturedPackages() {
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
      .eq("is_featured", true)
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return sortPackagesForDisplay<TravelPackage>(data ?? [])
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
    // Sin .select(): el público puede enviar consultas pero no leerlas
    const { error } = await supabase.from("contact_inquiries").insert([inquiryData])

    if (error) throw error
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

  // Actualizar o crear si la clave todavía no existe
  async setConfig(key: string, value: string, description?: string) {
    const updated = await this.updateConfig(key, value)
    if (updated) return updated
    return this.createConfig(key, value, description)
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

// Servicio para categorías de novedades
export const novedadesCategoryService = {
  async getAllActiveCategories(): Promise<NovedadesCategory[]> {
    const { data, error } = await supabase
      .from("novedades_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) throw error
    return data || []
  },

  async getAllCategories(): Promise<NovedadesCategory[]> {
    const { data, error } = await supabase
      .from("novedades_categories")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) throw error
    return data || []
  },

  async getCategoryBySlug(slug: string): Promise<NovedadesCategory | null> {
    const { data, error } = await supabase
      .from("novedades_categories")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data
  },

  async getPackagesByCategory(categoryId: number) {
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
      .eq("novedades_category_id", categoryId)
      .eq("is_active", true)
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return sortPackagesForDisplay<TravelPackage>(data ?? [])
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

// Servicio para tarifas de alojamientos.
// Desde las tarifas por salida (contrato §2.1) ya no hay UNIQUE (accommodation_id, mes, anio): hay dos índices
// únicos parciales (mes/año con fecha_salida NULL, y accommodation_id + fecha_salida). Por eso no se usa
// upsert(onConflict): guardar = buscar la fila por su clave y hacer update o insert.
// Las escrituras aceptan un cliente opcional (p. ej. `supabaseAdmin`); por defecto usan `supabase`.

/** Montos normalizados para escribir: sólo las claves presentes; 0 y NaN → null. */
function rateValuesPayload(values: AccommodationRateValues): Record<string, number | string | null> {
  const payload: Record<string, number | string | null> = {}
  for (const f of RATE_FIELDS) {
    const value = values[f.field]
    if (value !== undefined) payload[f.field] = rateValue(value)
  }
  if (values.currency) payload.currency = values.currency.toUpperCase()
  return payload
}

/** La base filtró las filas en vez de dar error: pasa cuando la sesión de administrador venció. */
const RATE_WRITE_BLOCKED =
  "La base no guardó el cambio: puede que la sesión de administrador haya vencido. Volvé a iniciar sesión e intentá de nuevo."

export const accommodationRateService = {
  // Obtener tarifas por alojamiento (las del mes y las por salida)
  async getRatesByAccommodation(accommodationId: number): Promise<AccommodationRate[]> {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })

    if (error) throw error
    return (data || []) as AccommodationRate[]
  },

  // Obtener la tarifa DEL MES (fecha_salida NULL) de un mes y año
  async getRatesByMonthYear(accommodationId: number, mes: number, anio: number) {
    const { data, error } = await supabase
      .from("accommodation_rates")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .eq("mes", mes)
      .eq("anio", anio)
      .is("fecha_salida", null)
      .single()

    if (error) throw error
    return data as AccommodationRate
  },

  /**
   * Guarda la tarifa DEL MES de un hotel (fecha_salida NULL): update si ya existe la del mes/año, insert si no.
   * `replaceId`: al editar una fila y cambiarle el mes, se borra la fila original si no es la que quedó guardada.
   */
  async saveMonthlyRate(
    accommodationId: number,
    mes: number,
    anio: number,
    values: AccommodationRateValues,
    options: { replaceId?: number | null; client?: SupabaseClient } = {},
  ): Promise<AccommodationRate> {
    const db = options.client ?? supabase
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error("Seleccioná un mes válido.")
    if (!Number.isInteger(anio)) throw new Error("Seleccioná un año válido.")

    const { data: found, error: findError } = await db
      .from("accommodation_rates")
      .select("id")
      .eq("accommodation_id", accommodationId)
      .eq("mes", mes)
      .eq("anio", anio)
      .is("fecha_salida", null)
      .limit(1)
    if (findError) throw findError

    const payload = rateValuesPayload(values)
    const existingId = (found as { id: number }[] | null)?.[0]?.id
    const { data, error } = existingId
      ? await db
          .from("accommodation_rates")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existingId)
          .select()
          .single()
      : await db
          .from("accommodation_rates")
          .insert([{ accommodation_id: accommodationId, mes, anio, fecha_salida: null, ...payload }])
          .select()
          .single()
    if (error) throw error

    const saved = data as AccommodationRate
    if (options.replaceId != null && options.replaceId !== saved.id) {
      await this.deleteRates([options.replaceId], { client: db })
    }
    return saved
  },

  /**
   * Guarda la MISMA tarifa para varias salidas de un hotel: una fila por fecha, con mes/anio de la fecha.
   * Update si ya existe la fila de esa salida, insert si no. `fechas`: 'YYYY-MM-DD', «3 Ene 2027» o Date.
   * Devuelve las filas guardadas, ordenadas por fecha.
   */
  async saveDepartureRates(
    accommodationId: number,
    fechas: ReadonlyArray<string | Date>,
    values: AccommodationRateValues,
    options: { client?: SupabaseClient } = {},
  ): Promise<AccommodationRate[]> {
    const db = options.client ?? supabase
    const isos: string[] = []
    for (const fecha of fechas) {
      const iso = toDepartureISO(fecha)
      if (!iso) throw new Error(`Fecha de salida inválida: ${String(fecha)}`)
      if (!isos.includes(iso)) isos.push(iso)
    }
    if (isos.length === 0) throw new Error("Seleccioná al menos una salida.")

    const { data: found, error: findError } = await db
      .from("accommodation_rates")
      .select("id, fecha_salida")
      .eq("accommodation_id", accommodationId)
      .in("fecha_salida", isos)
    if (findError) throw findError

    const existing = (found || []) as { id: number; fecha_salida: string }[]
    const existingDates = new Set(existing.map((r) => toDepartureISO(r.fecha_salida)))
    const payload = rateValuesPayload(values)
    const saved: AccommodationRate[] = []

    if (existing.length > 0) {
      const { data, error } = await db
        .from("accommodation_rates")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .in("id", existing.map((r) => r.id))
        .select()
      if (error) throw error
      // Sin sesión de admin, la base no da error: filtra las filas y no cambia nada.
      if ((data || []).length !== existing.length) throw new Error(RATE_WRITE_BLOCKED)
      saved.push(...((data || []) as AccommodationRate[]))
    }

    const toInsert = isos
      .filter((iso) => !existingDates.has(iso))
      .map((iso) => ({ accommodation_id: accommodationId, fecha_salida: iso, ...monthYearOfDeparture(iso)!, ...payload }))
    if (toInsert.length > 0) {
      const { data, error } = await db.from("accommodation_rates").insert(toInsert).select()
      if (error) throw error
      saved.push(...((data || []) as AccommodationRate[]))
    }

    return saved.sort((a, b) => (a.fecha_salida ?? "").localeCompare(b.fecha_salida ?? ""))
  },

  /**
   * Edita un grupo de tarifas por salida: guarda `values` para `fechas` (como saveDepartureRates) y borra las
   * filas de `previousIds` que no quedaron entre las guardadas (salidas que se sacaron del grupo).
   */
  async replaceDepartureRates(
    accommodationId: number,
    previousIds: ReadonlyArray<number>,
    fechas: ReadonlyArray<string | Date>,
    values: AccommodationRateValues,
    options: { client?: SupabaseClient } = {},
  ): Promise<AccommodationRate[]> {
    const saved = await this.saveDepartureRates(accommodationId, fechas, values, options)
    const keep = new Set(saved.map((r) => r.id))
    await this.deleteRates(previousIds.filter((id) => !keep.has(id)), options)
    return saved
  },

  /** Borra un conjunto de filas por id (p. ej. un grupo entero). Sin ids no hace nada. */
  async deleteRates(ids: ReadonlyArray<number>, options: { client?: SupabaseClient } = {}): Promise<void> {
    if (ids.length === 0) return
    const db = options.client ?? supabase
    const { data, error } = await db
      .from("accommodation_rates")
      .delete()
      .in("id", [...ids])
      .select("id")

    if (error) throw error
    // Sin sesión de admin, la base no da error: filtra las filas y no borra nada.
    if ((data || []).length !== new Set(ids).size) throw new Error(RATE_WRITE_BLOCKED)
  },

  /**
   * Compatibilidad: guarda una tarifa. Con `fecha_salida` → tarifa de esa salida; sin → tarifa del mes.
   * Ya no usa upsert(onConflict: "accommodation_id,mes,anio"), que dejó de existir.
   */
  async upsertRate(rateData: AccommodationRateInput, options: { client?: SupabaseClient } = {}): Promise<AccommodationRate> {
    const { accommodation_id, mes, anio, fecha_salida, ...values } = rateData
    if (fecha_salida) {
      const [saved] = await this.saveDepartureRates(accommodation_id, [fecha_salida], values, options)
      return saved
    }
    return this.saveMonthlyRate(accommodation_id, mes, anio, values, options)
  },

  // Crear múltiples tarifas (insert directo: no pisa nada; falla si ya existe la del mes o la de la salida)
  async createMultipleRates(rates: AccommodationRateInput[], options: { client?: SupabaseClient } = {}) {
    const db = options.client ?? supabase
    const { data, error } = await db
      .from("accommodation_rates")
      .insert(rates)
      .select()

    if (error) throw error
    return data as AccommodationRate[]
  },

  // Eliminar tarifa
  async deleteRate(id: number, options: { client?: SupabaseClient } = {}) {
    await this.deleteRates([id], options)
  },

  // Eliminar todas las tarifas de un alojamiento
  async deleteRatesByAccommodation(accommodationId: number, options: { client?: SupabaseClient } = {}) {
    const db = options.client ?? supabase
    const { error } = await db
      .from("accommodation_rates")
      .delete()
      .eq("accommodation_id", accommodationId)

    if (error) throw error
  },
}

// Servicios para agencias
export const agencyService = {
  // Registrar nueva agencia (la RPC hashea la contraseña con bcrypt y la deja pendiente)
  async registerAgency(agencyData: Omit<Agency, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    const { data, error } = await supabase.rpc('register_agency', { p_data: agencyData })

    if (error) {
      console.error('Error en registerAgency:', error)
      throw new Error(error.message || 'Error desconocido')
    }
    return data as number
  },

  // Validar login de agencia en la base (nunca se lee la tabla desde el navegador)
  async validateAgencyLogin(email: string, password: string): Promise<{ success: boolean; agency?: Agency; message?: string }> {
    const { data, error } = await supabase.rpc('agency_login', { p_email: email, p_password: password })

    if (error) {
      console.error('Error in validateAgencyLogin:', error)
      return { success: false, message: 'Error interno del servidor. Intente nuevamente.' }
    }
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
      .select("id, razon_social, cuit, numero_legajo, nombre_fantasia, telefono_contacto_1, telefono_contacto_2, telefono_contacto_3, domicilio, ciudad, provincia, pais, email_contacto_1, email_contacto_2, email_administracion, status, created_at, updated_at")
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

// Documentos del Centro de Administración del portal de agencias.
// La ruta en Storage vive en site_config (agency_file_<key>); si está vacía se usa el archivo de /public.
export const AGENCY_DOCUMENTS = [
  { key: 'tarjetas', title: 'Tarjetas de Crédito', fallbackUrl: '/pdfs/tarjetas.pdf' },
  { key: 'bancos', title: 'Bancos', fallbackUrl: '/pdfs/bancos.pdf' },
  { key: 'reserva', title: 'Contrato de Reserva', fallbackUrl: '/pdfs/reserva.pdf' },
] as const

export type AgencyDocumentKey = typeof AGENCY_DOCUMENTS[number]['key']

const agencyDocumentConfigKey = (key: AgencyDocumentKey) => `agency_file_${key}`

export const agencyDocumentService = {
  // Rutas en Storage de los archivos cargados desde el admin (solo las que existen)
  async getCustomPaths(): Promise<Partial<Record<AgencyDocumentKey, string>>> {
    const { data, error } = await supabase
      .from("site_config")
      .select("config_key, config_value")
      .like("config_key", "agency_file_%")

    if (error) throw error
    const paths: Partial<Record<AgencyDocumentKey, string>> = {}
    for (const doc of AGENCY_DOCUMENTS) {
      const row = data?.find((r: { config_key: string }) => r.config_key === agencyDocumentConfigKey(doc.key))
      if (row?.config_value) paths[doc.key] = row.config_value
    }
    return paths
  },

  // El bucket es privado: se descarga con signed URL; sin archivo propio, el original de /public
  async getDownloadUrl(key: AgencyDocumentKey, customPath?: string): Promise<string | null> {
    const doc = AGENCY_DOCUMENTS.find(d => d.key === key)
    if (!customPath) return doc?.fallbackUrl ?? null

    const { data, error } = await supabase.storage
      .from('pdfs_expertos')
      .createSignedUrl(customPath, 3600)

    if (error) {
      console.error('❌ Error creando signed URL:', error)
      return doc?.fallbackUrl ?? null
    }
    return data.signedUrl
  },

  async upload(key: AgencyDocumentKey, file: File, previousPath?: string): Promise<FileUploadResult> {
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'pdf'
    // Nombre único por subida para que nunca se sirva una versión cacheada
    const filePath = `agencias/${key}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('pdfs_expertos')
      .upload(filePath, file, { cacheControl: '3600' })

    if (error) return { success: false, error: `Error de upload: ${error.message}` }

    await siteConfigService.setConfig(agencyDocumentConfigKey(key), filePath, 'Archivo del portal de agencias')
    if (previousPath) await supabase.storage.from('pdfs_expertos').remove([previousPath])
    return { success: true, url: filePath }
  },

  // Vuelve al archivo original de /public
  async reset(key: AgencyDocumentKey, previousPath?: string) {
    await siteConfigService.setConfig(agencyDocumentConfigKey(key), '', 'Archivo del portal de agencias')
    if (previousPath) await supabase.storage.from('pdfs_expertos').remove([previousPath])
  },
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

// =====================================================
// SISTEMA DE RESERVAS Y GESTIÓN DE STOCK
// =====================================================

// Tipos para el sistema de reservas
export interface PackageStock {
  id: number
  package_id: number
  accommodation_id: number
  fecha_salida: string | null // ISO date string, null para fechas flexibles
  // Cupo por tipo. sgl/qpl en NULL = no se controla ese tipo (se reserva «a confirmar»); número = cupo (0 = sin cupo).
  // Las filas leídas antes de la migración no traen sgl/qpl: tratar undefined como null (getRoomStock lo hace).
  stock_sgl: number | null
  stock_dbl: number
  stock_tpl: number
  stock_cpl: number
  stock_qpl: number | null
  is_available: boolean
  flexible_dates?: boolean // Indica si el stock tiene fechas flexibles
  is_unlimited?: boolean // Si true, la RPC no valida ni decrementa cupos
  created_at: string
  updated_at: string
}

/** Fila para crear/actualizar stock: sgl/qpl opcionales (si no vienen, no se tocan; en un insert quedan NULL). */
export type PackageStockInput = Omit<PackageStock, 'id' | 'created_at' | 'updated_at' | 'stock_sgl' | 'stock_qpl'> & {
  stock_sgl?: number | null
  stock_qpl?: number | null
}

export type PackageStockStatus = 'none' | 'loaded' | 'unlimited'

export interface PackageWithStockStatus extends TravelPackage {
  stockStatus: PackageStockStatus
  stockRecordsCount: number
}

export interface Reservation {
  id: number
  package_id: number
  accommodation_id: number
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  comentarios?: string | null
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  created_at: string
  updated_at: string
}

export interface ReservationDetail {
  id: number
  reservation_id: number
  tipo_habitacion: RoomType
  cantidad: number
  subtipo_habitacion?: 'matrimonial' | 'twin' | null
  /** Menores que comparten la habitación pagando tarifa de menor (además de la base). En la base: NOT NULL DEFAULT 0. */
  menores?: number
  created_at: string
}

export interface ReservationPassenger {
  id: number
  reservation_id: number
  tipo_pasajero: 'titular' | 'acompañante'
  nombre: string
  apellido: string
  fecha_nacimiento: string // ISO date string
  dni?: string | null // DNI del pasajero (formato texto)
  email?: string | null // Email del pasajero
  telefono?: string | null // Teléfono del pasajero
  edad_al_viajar?: number | null // Edad que tendrá al momento del viaje
  datos_pendientes?: boolean | null // Si marcó "lo completo después"
  created_at: string
}

export interface ReservationWithDetails extends Reservation {
  details: ReservationDetail[]
  reservation_details: ReservationDetail[]
  passengers?: ReservationPassenger[]
  reservation_passengers?: ReservationPassenger[]
  travel_packages?: TravelPackage
  accommodations?: Accommodation
}

export interface CreateReservationData {
  package_id: number
  accommodation_id: number
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  comentarios?: string
  /** Una fila por habitación (el formulario usa cantidad = 1). `menores` 0 a 2 en dbl/tpl/cpl; 0 en sgl/qpl. */
  details: RoomDetailInput[]
  passengers: {
    tipo_pasajero: 'titular' | 'acompañante'
    nombre: string
    apellido: string
    fecha_nacimiento: string
    dni?: string
    email?: string
    telefono?: string
    edad_al_viajar?: number
    datos_pendientes?: boolean
  }[]
}

// Servicio para gestión de stock
export const stockService = {
  // Obtener stock disponible para un paquete/alojamiento/fecha
  async getStock(packageId: number, accommodationId: number, fechaSalida: string) {
    const { data, error } = await supabase
      .from('package_stock')
      .select('*')
      .eq('package_id', packageId)
      .eq('accommodation_id', accommodationId)
      .eq('fecha_salida', fechaSalida)
      .eq('is_available', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Obtener todo el stock de un paquete
  async getStockByPackage(packageId: number) {
    const { data, error } = await supabase
      .from('package_stock')
      .select(`
        *,
        accommodations (
          id,
          name,
          stars
        )
      `)
      .eq('package_id', packageId)
      .order('fecha_salida', { ascending: true })

    if (error) throw error
    return data
  },

  // Crear o actualizar stock
  async upsertStock(stockData: PackageStockInput) {
    const { data, error } = await supabase
      .from('package_stock')
      .upsert([stockData], {
        onConflict: 'package_id,accommodation_id,fecha_salida,flexible_dates'
      })
      .select()

    if (error) throw error
    return data[0]
  },

  // Actualizar stock existente
  async updateStock(id: number, updates: Partial<PackageStockInput>) {
    const { data, error } = await supabase
      .from('package_stock')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Eliminar stock
  async deleteStock(id: number) {
    const { error } = await supabase
      .from('package_stock')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Marcar (o desmarcar) un paquete como stock ilimitado en todos sus registros.
  // Si el paquete no tiene registros, crea uno por cada alojamiento con
  // flexible_dates=true, is_available=true, stocks en 0 y is_unlimited=unlimited.
  async setPackageUnlimited(packageId: number, unlimited: boolean) {
    // 1. Buscar registros existentes
    const { data: existing, error: selectError } = await supabase
      .from('package_stock')
      .select('id')
      .eq('package_id', packageId)

    if (selectError) throw selectError

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from('package_stock')
        .update({ is_unlimited: unlimited, updated_at: new Date().toISOString() })
        .eq('package_id', packageId)

      if (updateError) throw updateError
      return { created: 0, updated: existing.length }
    }

    // 2. Sin registros: crear uno por cada alojamiento
    if (!unlimited) {
      // Desactivar ilimitado cuando no hay registros: no hay nada que hacer
      return { created: 0, updated: 0 }
    }

    const { data: accommodations, error: accomError } = await supabase
      .from('accommodations')
      .select('id')
      .eq('paquete_id', packageId)

    if (accomError) throw accomError

    if (!accommodations || accommodations.length === 0) {
      throw new Error('El paquete no tiene alojamientos cargados. Creá uno antes de marcar stock ilimitado.')
    }

    const rows = accommodations.map((a: { id: number }) => ({
      package_id: packageId,
      accommodation_id: a.id,
      fecha_salida: null,
      stock_dbl: 0,
      stock_tpl: 0,
      stock_cpl: 0,
      is_available: true,
      flexible_dates: true,
      is_unlimited: true,
    }))

    const { error: insertError } = await supabase
      .from('package_stock')
      .insert(rows)

    if (insertError) throw insertError

    return { created: rows.length, updated: 0 }
  },

  // Listado de paquetes activos con su estado de stock agregado.
  async getPackagesWithStockStatus(): Promise<PackageWithStockStatus[]> {
    const { data: pkgs, error: pkgError } = await supabase
      .from('travel_packages')
      .select('*, destinations(id, name, code)')
      .eq('is_active', true)
      .order('name')

    if (pkgError) throw pkgError

    const { data: stocks, error: stockError } = await supabase
      .from('package_stock')
      .select('package_id, is_unlimited')

    if (stockError) throw stockError

    const statusByPackage = new Map<number, { unlimited: boolean; count: number }>()
    for (const s of stocks || []) {
      const pkgId = s.package_id as number
      const curr = statusByPackage.get(pkgId) || { unlimited: false, count: 0 }
      curr.count += 1
      if (s.is_unlimited) curr.unlimited = true
      statusByPackage.set(pkgId, curr)
    }

    return (pkgs || []).map((pkg: { id: number }) => {
      const info = statusByPackage.get(pkg.id)
      let status: PackageStockStatus = 'none'
      if (info) status = info.unlimited ? 'unlimited' : 'loaded'
      return {
        ...pkg,
        stockStatus: status,
        stockRecordsCount: info?.count || 0,
      } as PackageWithStockStatus
    })
  },

  // Verificar disponibilidad de stock para una reserva
  async checkAvailability(
    packageId: number,
    accommodationId: number,
    fechaSalida: string,
    details: { tipo_habitacion: RoomType, cantidad: number }[]
  ): Promise<{ available: boolean, message?: string }> {
    console.log('🔍 Buscando stock para:', { packageId, accommodationId, fechaSalida })

    // Primero buscar stock específico para esa fecha
    let stock = await this.getStock(packageId, accommodationId, fechaSalida)

    if (stock) {
      console.log('✅ Stock específico encontrado:', stock)
    }

    // Si no hay stock específico, buscar stock flexible
    if (!stock) {
      console.log('⚠️ No hay stock específico, buscando stock flexible...')
      const { data: flexibleStock, error } = await supabase
        .from('package_stock')
        .select('*')
        .eq('package_id', packageId)
        .eq('accommodation_id', accommodationId)
        .eq('flexible_dates', true)
        .eq('is_available', true)
        .single()

      if (error) {
        console.error('❌ Error buscando stock flexible:', error)
      }

      if (!error && flexibleStock) {
        stock = flexibleStock as PackageStock
        console.log('🎯 Usando stock flexible para validación:', stock)
      }
    }

    if (!stock) {
      console.error('❌ No se encontró stock (ni específico ni flexible)')
      return { available: false, message: 'No hay stock configurado para esta fecha' }
    }

    // Misma regla que la reserva: ilimitado o columna en NULL no se controla (queda «a confirmar»)
    const requested = new Map<RoomType, number>()
    for (const detail of details) {
      requested.set(detail.tipo_habitacion, (requested.get(detail.tipo_habitacion) || 0) + detail.cantidad)
    }
    for (const [tipo, cantidad] of requested) {
      const availableStock = getRoomStock(stock, tipo)
      if (availableStock !== null && availableStock < cantidad) {
        return {
          available: false,
          message: `Cupo insuficiente para habitaciones ${getRoomTypeName(tipo)}. Disponible: ${availableStock}, solicitado: ${cantidad}`
        }
      }
    }

    console.log('✅ Disponibilidad confirmada')
    return { available: true }
  }
}

// Servicio para gestión de reservas
export const reservationService = {
  // Crear una reserva de forma atómica (vía RPC con lock de stock)
  async createReservation(reservationData: CreateReservationData) {
    // Validaciones del cliente (la RPC vuelve a validar capacidad y cupo)
    const roomsError = validateRoomDetails(reservationData.details)
    if (roomsError) return { success: false, error: roomsError }
    if (!reservationData.passengers.some(p => p.tipo_pasajero === 'titular')) {
      return { success: false, error: 'Debe incluir al menos un pasajero titular.' }
    }
    const capacity = roomsCapacity(reservationData.details)
    if (reservationData.passengers.length > capacity) {
      return {
        success: false,
        error: `La cantidad de pasajeros (${reservationData.passengers.length}) excede la capacidad de las habitaciones (${capacity}).`
      }
    }

    try {
      const { data, error } = await supabase.rpc('create_reservation_atomic', {
        p_package_id: reservationData.package_id,
        p_accommodation_id: reservationData.accommodation_id,
        p_fecha_salida: reservationData.fecha_salida,
        p_cliente_nombre: reservationData.cliente_nombre,
        p_cliente_email: reservationData.cliente_email,
        p_cliente_telefono: reservationData.cliente_telefono,
        p_comentarios: reservationData.comentarios || null,
        // `menores` viaja dentro del JSON de cada detalle (la firma de la RPC no cambia)
        p_details: reservationData.details.map(d => ({
          tipo_habitacion: d.tipo_habitacion,
          cantidad: d.cantidad,
          subtipo_habitacion: d.subtipo_habitacion ?? null,
          menores: d.menores ?? 0,
        })),
        p_passengers: reservationData.passengers.map(p => ({
          ...p,
          datos_pendientes: p.datos_pendientes || false
        }))
      })

      if (error) {
        console.error('createReservation RPC error:', error)
        return {
          success: false,
          error: error.message || 'Error al crear la reserva'
        }
      }

      const reservationId = data as number
      return { success: true, reservation: { id: reservationId } as Reservation }
    } catch (error) {
      console.error('createReservation unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear la reserva'
      }
    }
  },

  // Obtener todas las reservas
  async getAllReservations() {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        travel_packages (
          id,
          name,
          image_url
        ),
        accommodations (
          id,
          name,
          stars
        ),
        reservation_details (*),
        reservation_passengers (*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ReservationWithDetails[]
  },

  // Obtener reservas por estado
  async getReservationsByStatus(estado: Reservation['estado']) {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        travel_packages (
          id,
          name,
          image_url
        ),
        accommodations (
          id,
          name,
          stars
        ),
        reservation_details (*),
        reservation_passengers (*)
      `)
      .eq('estado', estado)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ReservationWithDetails[]
  },

  // Obtener reserva por ID
  async getReservationById(id: number) {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        travel_packages (
          id,
          name,
          image_url,
          description
        ),
        accommodations (
          id,
          name,
          stars,
          regimen
        ),
        reservation_details (*),
        reservation_passengers (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as ReservationWithDetails
  },

  // Actualizar estado de reserva
  async updateReservationStatus(id: number, estado: Reservation['estado']) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ estado })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Confirmar reserva vía RPC: lockea stock, valida cupo y decrementa atómicamente.
  async confirmReservation(id: number) {
    const { error } = await supabase.rpc('confirm_reservation_atomic', {
      p_reservation_id: id
    })
    if (error) {
      console.error('confirmReservation RPC error:', error)
      throw error
    }
    return await this.getReservationById(id)
  },

  // Cancelar reserva vía RPC (repone stock si aplica, idempotente)
  async cancelReservation(id: number) {
    const { error } = await supabase.rpc('cancel_reservation_atomic', {
      p_reservation_id: id
    })
    if (error) {
      console.error('cancelReservation RPC error:', error)
      throw error
    }
    return await this.getReservationById(id)
  }
}
