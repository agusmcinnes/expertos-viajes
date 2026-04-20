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
    title: "Sección Especial - Expertos en Turismo",
    description: "Descubrí nuestras experiencias más exclusivas y especiales, diseñadas para hacer de tu viaje algo verdaderamente único e inolvidable.",
    keywords: ["experiencias exclusivas", "viajes especiales", "turismo premium", "experiencias únicas", "viajes personalizados"],
    openGraph: {
      title: "Sección Especial - Expertos en Turismo",
      description: "Descubrí nuestras experiencias más exclusivas y especiales, diseñadas para hacer de tu viaje algo verdaderamente único e inolvidable.",
      url: "https://www.expertosenturismo.com.ar/seccion-especial",
      type: "website",
    },
    alternates: {
      canonical: "https://www.expertosenturismo.com.ar/seccion-especial",
    },
  }
}
