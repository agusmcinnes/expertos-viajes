import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NovedadesCategoryPage } from "@/components/novedades-category-page"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function NovedadesRoute({ params }: PageProps) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <NovedadesCategoryPage slug={slug} />
      <Footer />
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return {
    title: `${title} - Novedades - Expertos en Turismo`,
    description: `Descubri las novedades y paquetes de ${title} en Expertos en Turismo.`,
    openGraph: {
      title: `${title} - Novedades - Expertos en Turismo`,
      description: `Descubri las novedades y paquetes de ${title} en Expertos en Turismo.`,
      url: `https://www.expertosenturismo.com.ar/novedades/${slug}`,
      type: "website",
    },
    alternates: {
      canonical: `https://www.expertosenturismo.com.ar/novedades/${slug}`,
    },
  }
}
