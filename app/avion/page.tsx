import { AvionPackagesPage } from "@/components/avion-packages-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AvionPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <AvionPackagesPage />
      <Footer />
    </div>
  )
}

export const metadata = {
  title: "Viajes en Avión - Expertos Viajes",
  description: "Volá hacia tus destinos soñados con Expertos Viajes. Descubrí el mundo con la comodidad y velocidad del transporte aéreo.",
}
