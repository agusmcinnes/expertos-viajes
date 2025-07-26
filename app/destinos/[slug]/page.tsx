import { notFound } from "next/navigation"
import { DestinationPage } from "@/components/destination-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

// Definir los destinos disponibles
const destinations = {
  argentina: {
    name: "Argentina",
    description:
      "Descubrí la diversidad única de Argentina, desde la vibrante Buenos Aires hasta los glaciares de la Patagonia. Un país que combina cultura urbana sofisticada, paisajes naturales impresionantes y una gastronomía mundialmente reconocida.",
    highlights: [
      "Buenos Aires: La París de Sudamérica",
      "Cataratas del Iguazú: Una de las 7 maravillas naturales",
      "Patagonia: Glaciares y montañas imponentes",
      "Mendoza: Capital mundial del vino Malbec",
      "Bariloche: Paisajes alpinos y aventura",
    ],
    heroImage: "/argentina-hero.png",
    code: "argentina",
  },
  brasil: {
    name: "Brasil",
    description:
      "Experimentá la alegría contagiosa de Brasil, donde playas paradisíacas se encuentran con la selva amazónica. Un destino que combina naturaleza exuberante, cultura vibrante y la calidez incomparable de su gente.",
    highlights: [
      "Río de Janeiro: Cristo Redentor y playas icónicas",
      "Amazonas: La selva tropical más grande del mundo",
      "Salvador de Bahía: Cuna de la cultura afrobrasileña",
      "Iguazú brasileño: Vista panorámica de las cataratas",
      "Fernando de Noronha: Paraíso ecológico",
    ],
    heroImage: "/brasil-hero.png",
    code: "brasil",
  },
  caribe: {
    name: "Caribe & Centroamérica",
    description:
      "Sumérgete en aguas cristalinas y descubrí culturas milenarias en el paraíso caribeño. Desde las ruinas mayas hasta volcanes activos, esta región ofrece aventura, relajación y experiencias únicas.",
    highlights: [
      "Cancún y Riviera Maya: Playas de ensueño",
      "Chichén Itzá: Maravilla del mundo maya",
      "Costa Rica: Biodiversidad y ecoturismo",
      "Cenotes: Piscinas naturales sagradas",
      "Volcanes activos y selvas tropicales",
    ],
    heroImage: "/caribe-hero.png",
    code: "caribe",
  },
  especiales: {
    name: "Viajes Especiales",
    description:
      "Embarcate en aventuras extraordinarias hacia destinos únicos del mundo. Experiencias exclusivas diseñadas para viajeros que buscan algo más allá de lo convencional, desde safaris africanos hasta templos milenarios.",
    highlights: [
      "Japón: Tradición milenaria y tecnología futurista",
      "Safari Africano: Los Big Five en su hábitat natural",
      "Islas Maldivas: Lujo sobre el océano Índico",
      "Machu Picchu: Ciudadela inca en las nubes",
      "Aurora Boreal: Espectáculo natural único",
    ],
    heroImage: "/especiales-hero.png",
    code: "especiales",
  },
}

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function DestinationPageRoute({ params }: PageProps) {
  const { slug } = await params
  const destination = destinations[slug as keyof typeof destinations]

  if (!destination) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <DestinationPage destination={destination} />
      <Footer />
    </div>
  )
}

// Generar páginas estáticas para cada destino
export function generateStaticParams() {
  return Object.keys(destinations).map((slug) => ({
    slug,
  }))
}

// Metadata para SEO
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const destination = destinations[slug as keyof typeof destinations]

  if (!destination) {
    return {
      title: "Destino no encontrado - Expertos Viajes",
    }
  }

  return {
    title: `${destination.name} - Expertos Viajes`,
    description: destination.description,
  }
}
