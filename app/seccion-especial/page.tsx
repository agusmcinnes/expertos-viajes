import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SpecialSectionPage } from "@/components/special-section-page"

export default function SpecialSectionRoute() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SpecialSectionPage />
      <Footer />
    </div>
  )
}

// Metadata para SEO
export async function generateMetadata() {
  return {
    title: "Sección Especial - Expertos Viajes",
    description: "Descubrí nuestras experiencias más exclusivas y especiales, diseñadas para hacer de tu viaje algo verdaderamente único e inolvidable.",
  }
}
