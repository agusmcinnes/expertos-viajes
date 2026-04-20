import { Metadata } from 'next'
import AgencyRegistrationForm from '@/components/agency-registration-form'

export const metadata: Metadata = {
  title: 'Registro de Agencia | Expertos en Turismo',
  description: 'Registre su agencia para acceder a nuestro módulo exclusivo con PDFs y recursos especiales.',
}

export default function AgencyRegistrationPage() {
  return <AgencyRegistrationForm />
}