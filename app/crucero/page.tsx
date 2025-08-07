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
  title: "Viajes en Crucero - Expertos Viajes",
  description: "Descubrí los mejores cruceros con Expertos Viajes. Navega por destinos increíbles con el máximo confort y lujo.",
}
