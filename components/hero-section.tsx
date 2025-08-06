"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/hero.webp')`,
        }}
      >
        <div className="absolute inset-0 bg-primary/70"></div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 container mx-auto px-4 text-center text-white mt-10"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            Descubrí tu próximo
            <span className="block text-secondary"> destino soñado</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-md sm:text-xl md:text-2xl mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-4"
          >
            Creamos experiencias únicas e inolvidables. Desde playas paradisíacas hasta aventuras culturales, tu viaje
            perfecto te está esperando.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 md:mb-12 px-4"
          >
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-gray-900 font-semibold px-6 md:px-8 py-3 md:py-4 text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              <Link href="#destinos" className="flex items-center gap-2 justify-center">
                Explorar Destinos
                <ArrowRight className="w-4 md:w-5 h-4 md:h-5" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-2 border-white text-white hover:bg-white hover:text-primary px-6 md:px-8 py-3 md:py-4 text-base md:text-lg bg-transparent transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              <Link href="#nosotros" className="justify-center">
                Conocé más
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <div className="max-w-2xl mx-auto mt-20 md:mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary mb-2">500+</div>
                <div className="text-white/80">Viajes realizados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary mb-2">50+</div>
                <div className="text-white/80">Destinos únicos</div>
              </div>
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-3xl font-bold text-secondary mb-2">98%</div>
                <div className="text-white/80">Clientes satisfechos</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
