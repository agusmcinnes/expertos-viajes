"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"
import { PackageCard } from "@/components/package-card"

export function FeaturedSection() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadFeaturedPackages()
  }, [])

  const loadFeaturedPackages = async () => {
    try {
      setIsLoading(true)
      
      // Cargar paquetes destacados
      const featuredPackages = await packageService.getFeaturedPackages()
      setPackages(featuredPackages.slice(0, 3)) // Mostrar máximo 3 paquetes
    } catch (error) {
      console.error("Error loading featured packages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Paquetes <span className="text-primary">Destacados</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Descubre nuestros paquetes más populares, seleccionados especialmente para ti.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
              >
                <div className="w-full h-48 bg-gray-300"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // No mostrar la sección si no hay paquetes destacados
  if (!packages || packages.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-3xl font-bold">
              Paquetes <span className="text-primary">Destacados</span>
            </h2>
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Descubre nuestros paquetes más populares, cuidadosamente seleccionados para brindarte las mejores experiencias de viaje.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                {/* Badge de destacado */}
                <div className="absolute top-4 left-4 z-10 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 fill-white" />
                  Destacado
                </div>
                <PackageCard package={pkg} />
              </div>
            </motion.div>
          ))}
        </div>

        {packages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link href="/paquete">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Ver Todos los Paquetes
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}