import { Suspense } from "react"
import { PackageDetailPage } from "@/components/package-detail-page"

export default function PaquetePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando paquete...</p>
        </div>
      </div>
    }>
      <PackageDetailPage packageId={params.id} />
    </Suspense>
  )
}
