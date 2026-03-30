"use client"

import { motion } from "framer-motion"
import { Shield, Clock, Headphones, Star, CreditCard, ArrowRight } from "lucide-react"
import Image from "next/image"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const headerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
}

const advantages = [
  {
    icon: Shield,
    title: "Viajes 100% Seguros",
    description:
      "Todos nuestros paquetes incluyen seguros de viaje completos y asistencia 24/7 para tu tranquilidad.",
    image: "/viajes-seguros.webp",
    type: "hero" as const,
  },
  {
    icon: Clock,
    title: "Planificación Inteligente",
    description:
      "Optimizamos cada detalle de tu viaje para que ahorres tiempo y disfrutes al máximo.",
    image: "/planificacion.webp",
    type: "standard" as const,
  },
  {
    icon: Headphones,
    title: "Soporte Personalizado",
    description:
      "Un asesor dedicado te acompaña desde la planificación hasta tu regreso.",
    image: "/soporte-personalizado.webp",
    type: "standard" as const,
  },
  {
    icon: Star,
    title: "Experiencias Exclusivas",
    description:
      "Acceso a actividades y lugares únicos que solo nosotros podemos ofrecerte.",
    image: "/experiencias-exclusivas.webp",
    type: "standard" as const,
  },
  {
    icon: CreditCard,
    title: "Precios Transparentes",
    description:
      "Sin sorpresas ni costos ocultos. Lo que ves es lo que pagas, con las mejores tarifas del mercado.",
    image: "/precios-transparentes.webp",
    type: "banner" as const,
  },
]

function HeroCard({ advantage }: { advantage: typeof advantages[0] }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative h-full min-h-[420px] rounded-2xl overflow-hidden cursor-default shadow-lg hover:shadow-2xl transition-shadow duration-500"
    >
      {/* Image */}
      <Image
        src={advantage.image}
        alt={advantage.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* Gradient overlay - only from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950/95 via-primary-900/50 to-transparent" />

      {/* Content anchored to bottom */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
        <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          <advantage.icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-3">
          {advantage.title}
        </h3>
        <p className="text-white/80 text-base leading-relaxed">
          {advantage.description}
        </p>
      </div>
    </motion.div>
  )
}

function StandardCard({ advantage }: { advantage: typeof advantages[0] }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-2xl overflow-hidden cursor-default shadow-lg hover:shadow-2xl transition-shadow duration-500 bg-white"
    >
      {/* Image area */}
      <div className="relative h-44 overflow-hidden">
        <Image
          src={advantage.image}
          alt={advantage.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 via-primary-950/20 to-transparent group-hover:from-primary-950/40 group-hover:via-primary-950/10 transition-all duration-500" />

        {/* Icon floating on image */}
        <div className="absolute bottom-4 left-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <advantage.icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 lg:p-6">
        <h3 className="font-heading text-lg lg:text-xl font-bold text-gray-900 mb-2">
          {advantage.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          {advantage.description}
        </p>
      </div>
    </motion.div>
  )
}

function BannerCard({ advantage }: { advantage: typeof advantages[0] }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-2xl overflow-hidden cursor-default shadow-lg hover:shadow-2xl transition-shadow duration-500"
    >
      {/* Gradient background with shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" aria-hidden="true" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center h-full p-6 lg:p-8 gap-4">
        <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          <advantage.icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="font-heading text-xl lg:text-2xl font-bold text-white mb-1">
            {advantage.title}
          </h3>
          <p className="text-white/75 text-sm leading-relaxed">
            {advantage.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function WhyChooseUsSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-gradient-to-b from-primary-50/30 via-white to-primary-50/50 overflow-hidden">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />

      {/* Decorative blurred circles */}
      <div
        className="absolute top-20 -right-32 w-96 h-96 bg-primary-300/10 rounded-full blur-3xl hidden lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 -left-32 w-80 h-80 bg-secondary/10 rounded-full blur-3xl hidden lg:block"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-14 lg:mb-20"
          >
            <motion.h2
              variants={headerVariants}
              className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-5"
            >
              ¿Por qué elegir{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Expertos en Viajes
              </span>
              ?
            </motion.h2>

            <motion.p
              variants={{
                ...headerVariants,
                visible: {
                  ...headerVariants.visible,
                  transition: { ...headerVariants.visible.transition, delay: 0.15 },
                },
              }}
              className="text-lg md:text-xl text-gray-500 font-light max-w-3xl mx-auto"
            >
              Más que una agencia de viajes, somos tus compañeros de aventura.
              Descubrí por qué miles de viajeros confían en nosotros.
            </motion.p>

            {/* Decorative line */}
            <motion.div
              variants={lineVariants}
              className="mx-auto mt-8 h-1 w-24 rounded-full bg-gradient-to-r from-primary to-secondary origin-center"
            />
          </motion.div>

          {/* Bento Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-5 lg:gap-6"
          >
            {/* Card 1: Hero - left, spans 2 rows */}
            <div className="md:col-span-2 lg:col-span-2 lg:row-span-2">
              <HeroCard advantage={advantages[0]} />
            </div>

            {/* Card 2: Top right left */}
            <StandardCard advantage={advantages[1]} />

            {/* Card 3: Top right right */}
            <StandardCard advantage={advantages[2]} />

            {/* Card 4: Bottom right left */}
            <StandardCard advantage={advantages[3]} />

            {/* Card 5: Banner - bottom right right (single col on lg) */}
            <BannerCard advantage={advantages[4]} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
