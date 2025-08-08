import { notFound } from "next/navigation"
import { Suspense } from "react"
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
  grupales: {
    name: "Salidas Grupales Acompañadas",
    description:
      "En nuestras Salidas Grupales Acompañadas no solo visitás destinos increíbles, también compartís el viaje con personas que disfrutan del turismo tanto como vos. Un coordinador experto te acompaña desde el primer momento, ocupándose de cada detalle para que vos solo te dediques a disfrutar.",
    highlights: [
      "Japón: Tradición milenaria y tecnología futurista",
      "Safari Africano: Los Big Five en su hábitat natural",
      "Islas Maldivas: Lujo sobre el océano Índico",
      "Machu Picchu: Ciudadela inca en las nubes",
      "Aurora Boreal: Espectáculo natural único",
    ],
    heroImage: "/grupales-hero.jpg",
    code: "grupales",
  },
  "eeuu-canada": {
    name: "EEUU / Canadá",
    description:
      "Descubrí la grandeza de América del Norte, donde rascacielos icónicos se encuentran con paisajes naturales impresionantes. Desde las luces de Broadway hasta las Montañas Rocosas, una experiencia que combina modernidad, naturaleza y diversidad cultural.",
    highlights: [
      "Nueva York: La ciudad que nunca duerme",
      "San Francisco: Golden Gate y cultura californiana",
      "Las Vegas: Capital mundial del entretenimiento",
      "Cataratas del Niágara: Espectáculo natural fronterizo",
      "Montañas Rocosas: Naturaleza salvaje canadiense",
    ],
    heroImage: "/hero-ee-uu.webp",
    code: "eeuu-canada",
  },
  "europa-clasicos": {
    name: "Europa y Clásicos",
    description:
      "Sumérgete en la historia, arte y cultura de Europa, donde cada ciudad cuenta milenios de civilización. Desde los museos del Louvre hasta las costas mediterráneas, un viaje a través del legado cultural más rico del mundo.",
    highlights: [
      "París: La ciudad de la luz y el amor",
      "Roma: Capital del mundo antiguo",
      "Londres: Tradición británica y modernidad",
      "Barcelona: Gaudí y el Mediterráneo catalán",
      "Venecia: Romance en los canales",
    ],
    heroImage: "/hero-europa.webp",
    code: "europa-clasicos",
  },
  "exoticos-mundo": {
    name: "Exóticos y Resto del Mundo",
    description:
      "Aventúrate hacia destinos remotos y culturas fascinantes que despiertan todos los sentidos. Experiencias auténticas en lugares donde la tradición milenaria se mantiene viva y los paisajes desafían la imaginación.",
    highlights: [],
    heroImage: "/hero-japon.webp",
    code: "exoticos-mundo",
  },
  "mediterraneo": {
    name: "Mediterráneo",
    description:
      "Navega por las aguas cristalinas del Mediterráneo y descubre la cuna de la civilización occidental. Desde las islas griegas hasta las costas españolas, un crucero por destinos que han marcado la historia de la humanidad.",
    highlights: [
      "Islas Griegas: Santorini y Mykonos",
      "Costa Amalfitana: Belleza italiana incomparable",
      "Barcelona: Gaudí y el Mediterráneo catalán",
      "Dubrovnik: La perla del Adriático",
      "Malta: Historia milenaria en el centro del mar",
    ],
    heroImage: "/tropical-beach-paradise.png",
    code: "mediterraneo",
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
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
        <DestinationPage destination={destination} />
      </Suspense>
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
      description: "El destino que buscas no está disponible.",
    }
  }

  const keywords = [
    destination.name.toLowerCase(),
    "viajes",
    "turismo",
    "paquetes turísticos",
    "destinos",
    ...destination.highlights.slice(0, 3).map(h => h.split(':')[0].toLowerCase())
  ]

  return {
    title: `${destination.name} - Expertos Viajes`,
    description: destination.description,
    keywords: keywords.join(", "),
    openGraph: {
      title: `${destination.name} - Expertos Viajes`,
      description: destination.description,
      url: `https://expertos-viajes.vercel.app/destinos/${slug}`,
      type: "website",
      images: [
        {
          url: destination.heroImage,
          width: 1200,
          height: 630,
          alt: `${destination.name} - Viajes y Turismo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${destination.name} - Expertos Viajes`,
      description: destination.description,
      images: [destination.heroImage],
    },
    alternates: {
      canonical: `https://expertos-viajes.vercel.app/destinos/${slug}`,
    },
  }
}
