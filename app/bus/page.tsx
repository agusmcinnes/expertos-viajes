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
  title: "Viajes en Bus - Expertos Viajes",
  description: "Descubrí destinos increíbles viajando en bus. Comodidad, economía y aventura en cada kilómetro. Paquetes turísticos terrestres con la mejor relación calidad-precio.",
  keywords: ["viajes en bus", "turismo terrestre", "paquetes económicos", "viajes cómodos", "destinos nacionales", "aventura en carretera"],
  openGraph: {
    title: "Viajes en Bus - Expertos Viajes", 
    description: "Descubrí destinos increíbles viajando en bus. Comodidad, economía y aventura en cada kilómetro.",
    url: "https://expertos-viajes.vercel.app/bus",
    type: "website",
  },
  alternates: {
    canonical: "https://expertos-viajes.vercel.app/bus",
  },
}
