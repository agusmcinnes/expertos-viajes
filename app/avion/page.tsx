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
  description: "Volá hacia tus destinos soñados con Expertos Viajes. Descubrí el mundo con la comodidad y velocidad del transporte aéreo. Paquetes turísticos con vuelos incluidos a los mejores destinos.",
  keywords: ["viajes en avión", "vuelos", "paquetes aéreos", "turismo aéreo", "destinos internacionales", "viajes rápidos"],
  openGraph: {
    title: "Viajes en Avión - Expertos Viajes",
    description: "Volá hacia tus destinos soñados con Expertos Viajes. Descubrí el mundo con la comodidad y velocidad del transporte aéreo.",
    url: "https://expertos-viajes.vercel.app/avion",
    type: "website",
  },
  alternates: {
    canonical: "https://expertos-viajes.vercel.app/avion",
  },
}
