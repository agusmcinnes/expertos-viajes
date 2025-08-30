"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { siteConfigService, packageService } from "@/lib/supabase"
import type { TravelPackage } from "@/lib/supabase"
import { PackageCard } from "@/components/package-card"

export function SpecialSection() {
  const [sectionTitle, setSectionTitle] = useState("Verano 2026") // Default fallback
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Cargar título de la sección especial
      try {
        const config = await siteConfigService.getConfig('special_section_title')
        setSectionTitle(config.config_value)
      } catch (error) {
        console.log("Config not found, using default title")
        // Mantener el valor por defecto si no se encuentra la configuración
      }

      // Cargar algunos paquetes destacados especiales
      try {
        const specialPackages = await packageService.getSpecialPackages()
        setPackages(specialPackages.slice(0, 3)) // Mostrar máximo 3 paquetes
      } catch (error) {
        console.error("Error loading special packages:", error)
        // Fallback: usar paquetes de alto precio
        const allPackages = await packageService.getActivePackages()
        const fallbackPackages = allPackages
          .filter(pkg => pkg.price >= 2000)
          .slice(0, 3)
        setPackages(fallbackPackages)
      }
    } catch (error) {
      console.error("Error loading special section data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Loading Header */}
            <div className="text-center mb-16">
              <div className="h-12 bg-gray-200 rounded w-64 mx-auto mb-6 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
            </div>
            
            {/* Loading Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-t-lg"></div>
                  <div className="bg-white p-6 rounded-b-lg shadow-lg">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-secondary mr-3" />
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                <span className="text-primary">{sectionTitle}</span>
              </h2>
              <Sparkles className="w-8 h-8 text-secondary ml-3" />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubrí nuestras experiencias más exclusivas y especiales, diseñadas para hacer de tu viaje 
              algo verdaderamente único e inolvidable.
            </p>
          </motion.div>

          {/* Packages Grid */}
          {packages.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
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
              className="text-center py-12 text-gray-500"
            >
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Próximamente nuevas experiencias especiales</p>
              <p className="text-sm">Estamos preparando algo increíble para vos</p>
            </motion.div>
          )}

          {/* CTA */}
          {packages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-16"
            >
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Buscás algo aún más exclusivo?</h3>
                <p className="text-lg mb-6 text-white/90">
                  Creamos experiencias completamente personalizadas y únicas. 
                  Contanos tu sueño y lo convertimos en el viaje perfecto.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-gray-900 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Link href="/contacto">
                    Crear Experiencia Única
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
