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
  is_active: boolean
  transport_type?: "aereo" | "bus"
  created_at: string
  updated_at: string
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
    const { error } = await supabase.from("travel_packages").update({ is_active: false }).eq("id", id)

    if (error) throw error
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
