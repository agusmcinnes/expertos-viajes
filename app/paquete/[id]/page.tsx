import { Suspense } from "react"
import { PackageDetailPage } from "@/components/package-detail-page"

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
      <PackageDetailPage packageId={id} />
    </Suspense>
  )
}
