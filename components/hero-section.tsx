"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const stats = [
  { value: "+10.000", label: "Viajeros felices" },
  { value: "+75%", label: "Vuelven a viajar con nosotros" },
  { value: "+20", label: "Años de experiencia" },
  { value: "100%", label: "Staff capacitado" },
]

export function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/hero.webp')`,
        }}
      >
        {/* Multi-layer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/80 via-primary/60 to-primary-900/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/40 via-transparent to-primary-950/40" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 container mx-auto px-4 text-center text-white mt-32"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            Viajes
            <span className="block bg-gradient-to-r from-white via-primary-200 to-white bg-clip-text text-transparent">
              que te marcan
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl md:text-2xl mb-10 md:mb-14 text-white/75 max-w-2xl mx-auto px-4 leading-relaxed font-light"
          >
            Tu proxima experiencia empieza aca. Somos expertos en convertir sueños en realidad.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 md:mb-16 px-4"
          >
            <Button
              size="lg"
              asChild
              className="bg-white text-primary font-semibold px-8 md:px-10 py-4 md:py-5 text-base md:text-lg rounded-full transition-all duration-300 hover:bg-white/90 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 w-full sm:w-auto"
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
              className="border border-white/30 text-white hover:bg-white/10 px-8 md:px-10 py-4 md:py-5 text-base md:text-lg bg-white/5 backdrop-blur-sm rounded-full transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Link href="#nosotros" className="justify-center">
                Conoce mas
              </Link>
            </Button>
          </motion.div>

          {/* Stats - Glass Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-white/10">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center px-4">
                    <div className="text-2xl lg:text-3xl font-bold font-heading text-white mb-1">{stat.value}</div>
                    <div className="text-white/50 text-xs uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
