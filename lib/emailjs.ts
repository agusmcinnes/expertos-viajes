import emailjs from '@emailjs/browser'
import { getRoomTypeName, getSubtypeLabel } from '@/lib/room-utils'

// Inicializar EmailJS con tu USER_ID
export const initEmailJS = () => {
  // Reemplaza 'YOUR_USER_ID' con tu User ID de EmailJS
  emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_USER_ID || '')
}

export interface EmailData {
  from_name: string
  from_email: string
  phone?: string
  message: string
  to_name?: string
}

export const sendEmail = async (data: EmailData): Promise<boolean> => {
  try {
    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        from_name: data.from_name,
        from_email: data.from_email,
        phone: data.phone || 'No proporcionado',
        message: data.message,
        to_name: data.to_name || 'Expertos en Turismo',
        reply_to: data.from_email,
      }
    )

    console.log('Email sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// Función específica para notificar registro de agencias
export interface AgencyNotificationData {
  agency_name: string
  agency_email: string
  agency_phone: string
}

export const sendAgencyNotification = async (data: AgencyNotificationData): Promise<boolean> => {
  try {
    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        agency_name: data.agency_name,
        agency_email: data.agency_email,
        agency_phone: data.agency_phone,
        to_name: 'Administrador - Expertos en Turismo',
        admin_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@expertosenvajes.com',
        subject: 'Nueva solicitud de agencia para aprobación'
      }
    )

    console.log('Agency notification sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending agency notification:', error)
    return false
  }
}

// Interfaces para el sistema de reservas
interface RoomDetail {
  tipo_habitacion: 'dbl' | 'tpl' | 'cpl' | 'qpl'
  cantidad: number
  subtipo_habitacion?: 'matrimonial' | 'twin' | null
}

interface Passenger {
  tipo_pasajero: 'titular' | 'acompañante'
  nombre: string
  apellido: string
  fecha_nacimiento: string
  dni?: string
  email?: string
  telefono?: string
  edad_al_viajar?: number
  datos_pendientes?: boolean
}

export interface ReservationNotificationData {
  packageName: string
  accommodation: string
  departureDate: string
  clientName: string
  clientEmail: string
  clientPhone: string
  rooms: RoomDetail[]
  passengers: Passenger[]
  comments?: string
  reservationId: number
}

export const sendReservationNotification = async (data: ReservationNotificationData): Promise<boolean> => {
  try {
    const roomDetails = data.rooms.map(room => {
      let detail = getRoomTypeName(room.tipo_habitacion)
      if (room.subtipo_habitacion) detail += ` (${getSubtypeLabel(room.subtipo_habitacion)})`
      return `${room.cantidad}× ${detail}`
    }).join(', ')

    const passengersDetail = data.passengers.map((p, index) => {
      const tipo = p.tipo_pasajero === 'titular' ? 'TITULAR' : 'Acompañante'
      let detail = `${index + 1}. ${tipo}: ${p.nombre} ${p.apellido}`
      if (p.edad_al_viajar) detail += ` (${p.edad_al_viajar} años al viajar)`
      detail += ` - Nac: ${p.fecha_nacimiento}`

      if (p.datos_pendientes) {
        detail += ' — ⚠️ DATOS PENDIENTES'
      } else {
        if (p.dni) detail += ` - DNI: ${p.dni}`
        if (p.email) detail += ` - ${p.email}`
        if (p.telefono) detail += ` - ${p.telefono}`
      }
      return detail
    }).join('\n')

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        package_name: data.packageName,
        accommodation_name: data.accommodation,
        fecha_salida: data.departureDate,
        cliente_nombre: data.clientName,
        cliente_email: data.clientEmail,
        cliente_telefono: data.clientPhone,
        cantidad_personas: data.passengers.length.toString(),
        detalles_habitaciones: roomDetails,
        detalles_pasajeros: passengersDetail,
        comentarios: data.comments || 'Sin comentarios adicionales',
        reservation_id: data.reservationId.toString(),
        to_name: 'Administrador - Expertos en Turismo',
        admin_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@expertosenvajes.com',
        subject: `Nueva Reserva #${data.reservationId} - ${data.packageName}`,
        precio_info: 'PRECIO A COTIZAR POR AGENTE'
      }
    )

    console.log('Reservation notification sent successfully:', result.text)
    return true
  } catch (error) {
    console.warn('Reservation notification failed:', error)
    return false
  }
}
