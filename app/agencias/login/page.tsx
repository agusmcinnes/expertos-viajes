import { Metadata } from 'next'
import AgencyLoginForm from '@/components/agency-login-form'

export const metadata: Metadata = {
  title: 'Acceso Agencias | Expertos en Viajes',
  description: 'Acceso exclusivo para agencias aprobadas al módulo de recursos y PDFs.',
}

export default function AgencyLoginPage() {
  return <AgencyLoginForm />
}