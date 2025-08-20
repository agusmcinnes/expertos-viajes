import { CruceroPackagesPage } from "@/components/crucero-packages-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function CruceroPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <CruceroPackagesPage />
      <Footer />
    </div>
  )
}

export const metadata = {
  title: "Viajes en Crucero - Expertos en Viajes",
  description: "Descubrí los mejores cruceros con Expertos en Viajes. Navega por destinos increíbles con el máximo confort y lujo. Experiencias únicas en alta mar.",
  keywords: ["cruceros", "viajes marítimos", "cruceros de lujo", "turismo náutico", "destinos marítimos", "vacaciones en barco"],
  openGraph: {
    title: "Viajes en Crucero - Expertos en Viajes",
    description: "Descubrí los mejores cruceros con Expertos en Viajes. Navega por destinos increíbles con el máximo confort y lujo.",
    url: "https://expertos-viajes.vercel.app/crucero",
    type: "website",
  },
  alternates: {
    canonical: "https://expertos-viajes.vercel.app/crucero",
  },
}
