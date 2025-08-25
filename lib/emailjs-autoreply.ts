import emailjs from '@emailjs/browser'

export interface AutoReplyData {
  client_name: string
  client_email: string
  inquiry_type?: string
}

export const sendAutoReply = async (data: AutoReplyData): Promise<boolean> => {
  try {
    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      process.env.NEXT_PUBLIC_EMAILJS_AUTOREPLY_TEMPLATE_ID || '',
      {
        to_name: data.client_name,
        to_email: data.client_email,
        client_name: data.client_name,
        inquiry_type: data.inquiry_type || 'consulta general',
        company_name: 'Expertos en Viajes',
        contact_phone: '+54 9 379 4030711',
        contact_email: 'expertosenviajes.info@gmail.com',
      }
    )
    
    console.log('Auto-reply sent successfully:', result.text)
    return true
  } catch (error) {
    console.error('Error sending auto-reply:', error)
    return false
  }
}
