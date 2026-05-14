"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Newspaper, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { novedadesCategoryService } from "@/lib/supabase"
import type { TravelPackage, NovedadesCategory } from "@/lib/supabase"
import { PackageCard } from "@/components/package-card"

interface NovedadesCategoryPageProps {
  slug: string
}

export function NovedadesCategoryPage({ slug }: NovedadesCategoryPageProps) {
  const [category, setCategory] = useState<NovedadesCategory | null>(null)
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    loadData()
  }, [slug])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const cat = await novedadesCategoryService.getCategoryBySlug(slug)
      if (!cat) {
        setNotFound(true)
        return
      }
      setCategory(cat)
      const pkgs = await novedadesCategoryService.getPackagesByCategory(cat.id)
      setPackages(pkgs)
    } catch (error) {
      console.error("Error loading novedades category:", error)
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-r from-primary/20 to-primary-100/20">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-pulse">
              <div className="h-16 bg-white/20 rounded w-96 mx-auto mb-6"></div>
              <div className="h-6 bg-white/20 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </section>
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-64 rounded-t-lg"></div>
                    <div className="bg-white p-6 rounded-b-lg shadow-lg">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Newspaper className="w-24 h-24 mx-auto mb-6 text-gray-300" />
          <h2 className="text-2xl font-bold mb-4">Sección no encontrada</h2>
          <Button asChild variant="outline">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        {category?.image_url ? (
          <div className="absolute inset-0">
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4 text-center text-white"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <Link
                href="/"
                className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al Inicio
              </Link>
            </motion.div>

            <div className="flex items-center justify-center mb-6">
              <Newspaper className="w-12 h-12 text-primary-300 mr-4" />
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight"
              >
                {category?.name}
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto"
            >
              Descubri las mejores opciones para esta temporada
            </motion.p>
          </div>
        </motion.div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {packages.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {packages.map((pkg, index) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="h-full"
                  >
                    <PackageCard package={pkg} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-gray-500"
              >
                <Newspaper className="w-24 h-24 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-semibold mb-4">Proximamente nuevos paquetes</h3>
                <p className="text-lg mb-6">Estamos preparando opciones increibles para vos</p>
                <Button asChild variant="outline">
                  <Link href="/">Explorar Otros Destinos</Link>
                </Button>
              </motion.div>
            )}

            {packages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mt-20"
              >
                <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl p-8 md:p-12 text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Te interesa alguno de estos paquetes?</h3>
                  <p className="text-lg mb-6 text-white/90">
                    Contactanos y te armamos el viaje perfecto para vos.
                  </p>
                  <Button
                    size="lg"
                    asChild
                    className="bg-white hover:bg-white/90 text-primary font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                  >
                    <Link href="/contacto">Contactanos</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
