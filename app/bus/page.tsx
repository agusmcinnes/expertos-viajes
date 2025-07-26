import { BusPackagesPage } from "@/components/bus-packages-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function BusPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <BusPackagesPage />
      <Footer />
    </div>
  )
}

export const metadata = {
  title: "Vete de Viaje - Viajes en Bus | Expertos Viajes",
  description: "Descubrí destinos increíbles viajando en bus. Comodidad, economía y aventura en cada kilómetro.",
}
