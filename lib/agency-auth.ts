import { agencyService, Agency } from './supabase'

// Almacenamiento de sesión de agencias en localStorage
const AGENCY_SESSION_KEY = 'agency_session'

export interface AgencySession {
  agency: Agency
  loginTime: string
}

// Simular login de agencia (verificar que esté aprobada y validar contraseña)
export const loginAgency = async (email: string, password: string): Promise<Agency> => {
  const agency = await agencyService.validateAgencyLogin(email, password)
  
  if (!agency) {
    throw new Error("Credenciales incorrectas o agencia no aprobada")
  }

  // Guardar sesión en localStorage
  const session: AgencySession = {
    agency,
    loginTime: new Date().toISOString()
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(AGENCY_SESSION_KEY, JSON.stringify(session))
  }

  return agency
}

// Verificar si una agencia está logueada
export const getAgencySession = (): AgencySession | null => {
  if (typeof window === 'undefined') return null
  
  const sessionData = localStorage.getItem(AGENCY_SESSION_KEY)
  if (!sessionData) return null
  
  try {
    return JSON.parse(sessionData)
  } catch {
    return null
  }
}

// Cerrar sesión de agencia
export const logoutAgency = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AGENCY_SESSION_KEY)
  }
}

// Verificar si la agencia actual está autenticada
export const isAgencyAuthenticated = (): boolean => {
  const session = getAgencySession()
  return !!session?.agency
}

// Obtener agencia actual
export const getCurrentAgency = (): Agency | null => {
  const session = getAgencySession()
  return session?.agency || null
}