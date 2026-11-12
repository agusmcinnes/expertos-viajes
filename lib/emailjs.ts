import emailjs from '@emailjs/browser'
import { getRoomTypeName, getSubtypeLabel, formatMenores, type RoomDetailInput } from '@/lib/room-utils'
import { parseISODateLocal } from '@/lib/date-utils'

// Se pasa en cada envío: init() sólo corría si se montaba el formulario de contacto
const EMAILJS_OPTIONS = { publicKey: process.env.NEXT_PUBLIC_EMAILJS_USER_ID || '' }

const formatFecha = (
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
): string => parseISODateLocal(iso)?.toLocaleDateString('es-AR', options) ?? iso

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
      },
      EMAILJS_OPTIONS
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
      },
      EMAILJS_OPTIONS
    )

    console.log('Agency notification sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending agency notification:', error)
    return false
  }
}

export interface Passenger {
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
  rooms: RoomDetailInput[]
  passengers: Passenger[]
  comments?: string
  reservationId: number
}

export const buildPassengersDetail = (passengers: Passenger[]): string =>
  passengers.map((p, index) => {
    const tipo = p.tipo_pasajero === 'titular' ? 'TITULAR' : 'Acompañante'
    let detail = `${index + 1}. ${tipo}: ${p.nombre} ${p.apellido}`
    if (p.edad_al_viajar != null) detail += ` (${p.edad_al_viajar} años al viajar)`
    detail += ` - Nac: ${formatFecha(p.fecha_nacimiento, { day: '2-digit', month: '2-digit', year: 'numeric' })}`

    if (p.datos_pendientes) {
      detail += ' — ⚠️ DATOS PENDIENTES'
    } else {
      if (p.dni) detail += ` - DNI: ${p.dni}`
      if (p.email) detail += ` - ${p.email}`
      if (p.telefono) detail += ` - ${p.telefono}`
    }
    return detail
  }).join('\n')

// "1× Doble (Matrimonial) + 1 menor, 1× Single". Sin menores, el texto es el de siempre.
export const buildRoomsDetail = (rooms: RoomDetailInput[]): string =>
  rooms.map(room => {
    let detail = `${room.cantidad}× ${getRoomTypeName(room.tipo_habitacion)}`
    if (room.subtipo_habitacion) detail += ` (${getSubtypeLabel(room.subtipo_habitacion)})`
    if (room.menores) detail += ` + ${formatMenores(room.menores)}`
    return detail
  }).join(', ')

export const sendReservationNotification = async (data: ReservationNotificationData): Promise<boolean> => {
  try {
    const roomDetails = buildRoomsDetail(data.rooms)

    const passengersDetail = buildPassengersDetail(data.passengers)

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        package_name: data.packageName,
        accommodation_name: data.accommodation,
        fecha_salida: formatFecha(data.departureDate),
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
      },
      EMAILJS_OPTIONS
    )

    console.log('Reservation notification sent successfully:', result.text)
    return true
  } catch (error) {
    console.warn('Reservation notification failed:', error)
    return false
  }
}
