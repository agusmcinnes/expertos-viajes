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
