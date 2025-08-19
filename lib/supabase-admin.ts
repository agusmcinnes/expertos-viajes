import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente normal (público)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para admin (se autentica)
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)

// Función para autenticar admin
export const authenticateAdmin = async (email: string, password: string) => {
  try {
    console.log("🔐 Intentando autenticar admin...")
    
    // Usar signInWithPassword para autenticación real
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error("❌ Error de autenticación:", error)
      throw error
    }
    
    console.log("✅ Admin autenticado correctamente:", data.user?.email)
    return data
  } catch (error) {
    console.error("❌ Error en authenticateAdmin:", error)
    throw error
  }
}

// Función para verificar si el admin está autenticado
export const isAdminAuthenticated = async () => {
  const { data: { session } } = await supabaseAdmin.auth.getSession()
  return !!session
}

// Función para cerrar sesión admin
export const signOutAdmin = async () => {
  await supabaseAdmin.auth.signOut()
}

// Servicio de packages con autenticación
export const adminPackageService = {
  async deletePackage(id: number) {
    console.log("🔧 adminPackageService.deletePackage iniciado para ID:", id)
    
    // Verificar autenticación
    const isAuth = await isAdminAuthenticated()
    if (!isAuth) {
      throw new Error("Admin no autenticado")
    }
    
    const { data, error } = await supabaseAdmin
      .from("travel_packages")
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()

    console.log("🔧 adminPackageService resultado:", { data, error })

    if (error) {
      console.error("🔧 adminPackageService error:", error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error(`No se encontró el paquete con ID ${id} o no se pudo actualizar`)
    }

    console.log("🔧 adminPackageService: Paquete eliminado exitosamente:", data[0])
    return data[0]
  },

  async createPackage(packageData: any) {
    const isAuth = await isAdminAuthenticated()
    if (!isAuth) {
      throw new Error("Admin no autenticado")
    }

    const { data, error } = await supabaseAdmin
      .from("travel_packages")
      .insert([packageData])
      .select()

    if (error) throw error
    return data[0]
  },

  async updatePackage(id: number, packageData: any) {
    const isAuth = await isAdminAuthenticated()
    if (!isAuth) {
      throw new Error("Admin no autenticado")
    }

    const { data, error } = await supabaseAdmin
      .from("travel_packages")
      .update({ ...packageData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()

    if (error) throw error
    return data[0]
  }
}

// Re-exportar tipos necesarios
export type { TravelPackage, Destination } from "./supabase"
