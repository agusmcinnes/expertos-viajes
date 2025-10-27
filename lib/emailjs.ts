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

// Función para notificar nueva reserva al admin
export interface ReservationNotificationData {
  package_name: string
  accommodation_name: string
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  cliente_dni?: string
  cantidad_personas: number
  precio_total: number
  detalles_habitaciones: string // Formato: "2x Dobles (4 adultos), 1x Triple (2 adultos, 1 menor)"
  comentarios?: string
  reservation_id: number
}

export const sendReservationNotification = async (data: ReservationNotificationData): Promise<boolean> => {
  try {
    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        package_name: data.package_name,
        accommodation_name: data.accommodation_name,
        fecha_salida: data.fecha_salida,
        cliente_nombre: data.cliente_nombre,
        cliente_email: data.cliente_email,
        cliente_telefono: data.cliente_telefono,
        cliente_dni: data.cliente_dni || 'No proporcionado',
        cantidad_personas: data.cantidad_personas.toString(),
        precio_total: `USD ${data.precio_total.toLocaleString()}`,
        detalles_habitaciones: data.detalles_habitaciones,
        comentarios: data.comentarios || 'Sin comentarios adicionales',
        reservation_id: data.reservation_id.toString(),
        to_name: 'Administrador - Expertos en Viajes',
        admin_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@expertosenvajes.com',
        subject: `Nueva Reserva #${data.reservation_id} - ${data.package_name}`
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
  package_name: string
  accommodation_name: string
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cantidad_personas: number
  precio_total: number
  detalles_habitaciones: string
  reservation_id: number
}

export const sendReservationConfirmation = async (data: ReservationConfirmationData): Promise<boolean> => {
  try {
    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      {
        package_name: data.package_name,
        accommodation_name: data.accommodation_name,
        fecha_salida: data.fecha_salida,
        cliente_nombre: data.cliente_nombre,
        cantidad_personas: data.cantidad_personas.toString(),
        precio_total: `USD ${data.precio_total.toLocaleString()}`,
        detalles_habitaciones: data.detalles_habitaciones,
        reservation_id: data.reservation_id.toString(),
        to_email: data.cliente_email,
        subject: `Confirmación de Reserva #${data.reservation_id} - ${data.package_name}`,
        message: `
Estimado/a ${data.cliente_nombre},

¡Gracias por confiar en Expertos en Viajes!

Hemos recibido tu pre-reserva con los siguientes detalles:

📦 Paquete: ${data.package_name}
🏨 Alojamiento: ${data.accommodation_name}
📅 Fecha de salida: ${data.fecha_salida}
👥 Personas: ${data.cantidad_personas}
🛏️ Habitaciones: ${data.detalles_habitaciones}
💰 Precio Total: USD ${data.precio_total.toLocaleString()}

Número de reserva: #${data.reservation_id}

Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo a la brevedad para confirmar la disponibilidad y coordinar los detalles del pago.

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

