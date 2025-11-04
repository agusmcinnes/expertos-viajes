import emailjs from '@emailjs/browser'

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
        to_name: data.to_name || 'Expertos en Viajes',
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
        to_name: 'Administrador - Expertos en Viajes',
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

// Interfaces para el nuevo sistema de reservas
interface RoomDetail {
  tipo_habitacion: 'dbl' | 'tpl' | 'cpl'
  cantidad: number
  subtipo_habitacion?: 'matrimonial' | 'twin' | null
}

interface Passenger {
  tipo_pasajero: 'titular' | 'acompañante'
  nombre: string
  apellido: string
  fecha_nacimiento: string
  cuil?: string
}

// Función para notificar nueva reserva al admin
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
    // Formatear habitaciones
    const roomTypeName = (tipo: string) => {
      if (tipo === 'dbl') return 'Doble'
      if (tipo === 'tpl') return 'Triple'
      if (tipo === 'cpl') return 'Cuádruple'
      return tipo
    }

    const roomDetails = data.rooms.map(room => {
      let detail = `${roomTypeName(room.tipo_habitacion)}`
      if (room.subtipo_habitacion) {
        detail += ` (${room.subtipo_habitacion === 'matrimonial' ? 'Matrimonial' : 'Twin'})`
      }
      return detail
    }).join(', ')

    // Formatear pasajeros
    const passengersDetail = data.passengers.map((p, index) => {
      const tipo = p.tipo_pasajero === 'titular' ? 'TITULAR' : 'Acompañante'
      return `${index + 1}. ${tipo}: ${p.nombre} ${p.apellido} (Nacimiento: ${p.fecha_nacimiento})${p.cuil ? ` - CUIL: ${p.cuil}` : ''}`
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
        to_name: 'Administrador - Expertos en Viajes',
        admin_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@expertosenvajes.com',
        subject: `Nueva Reserva #${data.reservationId} - ${data.packageName}`,
        precio_info: 'PRECIO A COTIZAR POR AGENTE'
      }
    )

    console.log('Reservation notification sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending reservation notification:', error)
    return false
  }
}

// Función para enviar confirmación de reserva al cliente
export interface ReservationConfirmationData {
  packageName: string
  accommodation: string
  departureDate: string
  clientName: string
  clientEmail: string
  rooms: RoomDetail[]
  reservationId: number
}

export const sendReservationConfirmation = async (data: ReservationConfirmationData): Promise<boolean> => {
  try {
    // Formatear habitaciones
    const roomTypeName = (tipo: string) => {
      if (tipo === 'dbl') return 'Doble'
      if (tipo === 'tpl') return 'Triple'
      if (tipo === 'cpl') return 'Cuádruple'
      return tipo
    }

    const roomDetails = data.rooms.map(room => {
      let detail = `${roomTypeName(room.tipo_habitacion)}`
      if (room.subtipo_habitacion) {
        detail += ` (${room.subtipo_habitacion === 'matrimonial' ? 'Matrimonial' : 'Twin'})`
      }
      return detail
    }).join(', ')

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        package_name: data.packageName,
        accommodation_name: data.accommodation,
        fecha_salida: data.departureDate,
        cliente_nombre: data.clientName,
        detalles_habitaciones: roomDetails,
        reservation_id: data.reservationId.toString(),
        to_email: data.clientEmail,
        subject: `Confirmación de Reserva #${data.reservationId} - ${data.packageName}`,
        message: `
Estimado/a ${data.clientName},

¡Gracias por confiar en Expertos en Viajes!

Hemos recibido tu pre-reserva con los siguientes detalles:

📦 Paquete: ${data.packageName}
🏨 Alojamiento: ${data.accommodation}
📅 Fecha de salida: ${data.departureDate}
🛏️ Habitaciones: ${roomDetails}

Número de reserva: #${data.reservationId}

💰 PRECIO: Nuestro equipo cotizará el precio de tu reserva y te lo enviará a la brevedad.

Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo para:
✓ Confirmar la disponibilidad
✓ Enviarte la cotización detallada
✓ Coordinar los detalles del pago

Si tienes alguna consulta, no dudes en contactarnos.

Saludos cordiales,
Equipo de Expertos en Viajes
        `.trim()
      }
    )

    console.log('Reservation confirmation sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending reservation confirmation:', error)
    return false
  }
}

