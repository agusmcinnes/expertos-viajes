import { Metadata } from 'next'
import AgencyModulePage from '@/components/agency-module-page'

export const metadata: Metadata = {
  title: 'Módulo Agencias | Expertos en Viajes',
  description: 'Acceso exclusivo para agencias: descarga PDFs y accede a recursos especiales de nuestros paquetes de viajes.',
}

export default function AgencyModule() {
  return <AgencyModulePage />
}