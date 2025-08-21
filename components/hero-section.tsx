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
        className="relative z-10 container mx-auto px-4 text-center text-white mt-32"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            Viajes
            <span className="block text-secondary">que te marcan</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-md sm:text-xl md:text-2xl mb-6 md:mb-8 text-white/90 max-w-4xl mx-auto px-4"
          >
            Tu próxima experiencia empieza acá. Somos expertos en convertir sueños en realidad. Te ayudamos a crear recuerdos inolvidables. Tu historia de viaje comienza con un solo clic.
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
          <div className="max-w-4xl mx-auto md:mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 lg:gap-12">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-secondary mb-2">98%</div>
                <div className="text-white/80 text-sm">de clientes satisfechos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-secondary mb-2">+ 10.000</div>
                <div className="text-white/80 text-sm">viajeros felices en los últimos 3 años</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-secondary mb-2">+ 75%</div>
                <div className="text-white/80 text-sm">de nuestros clientes viajan de nuevo con nosotros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-secondary mb-2">+ 20</div>
                <div className="text-white/80 text-sm">años de experiencia</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-secondary mb-2">100%</div>
                <div className="text-white/80 text-sm">Staff altamente capacitado</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
