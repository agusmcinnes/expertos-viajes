import { Suspense } from "react"
import { PackageDetailPage } from "@/components/package-detail-page"
import { Header } from "@/components/header"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = await params
  
  return {
    title: "Detalle del Paquete - Expertos en Viajes",
    description: "Descubrí todos los detalles de este increíble paquete turístico. Itinerario completo, precios, servicios incluidos y más información.",
    keywords: ["paquete turístico", "itinerario de viaje", "detalles del viaje", "precios de viajes"],
    openGraph: {
      title: "Detalle del Paquete - Expertos en Viajes",
      description: "Descubrí todos los detalles de este increíble paquete turístico.",
      url: `https://expertos-viajes.vercel.app/paquete/${id}`,
      type: "website",
    },
    alternates: {
      canonical: `https://expertos-viajes.vercel.app/paquete/${id}`,
    },
  }
}

export default async function PaquetePage({ params }: { params: { id: string } }) {
  const { id } = await params
  
  return (

    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-secondary/40 mx-auto"></div>
          </div>
          <p className="text-gray-600 font-medium">Cargando detalles del paquete...</p>
          <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</p>
        </div>
      </div>
    }>
      <Header position="sticky" />
      <PackageDetailPage packageId={id} />
    </Suspense>
  )
}
