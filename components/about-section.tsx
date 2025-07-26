"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Heart, Users, Award, Globe } from "lucide-react"
import Image from "next/image"

export function AboutSection() {
  const values = [
    {
      icon: Heart,
      title: "Pasión por viajar",
      description: "Cada destino es una nueva aventura que vivimos con la misma emoción que nuestros clientes.",
    },
    {
      icon: Users,
      title: "Atención personalizada",
      description: "Cada viaje es único, por eso diseñamos experiencias a medida de tus sueños y necesidades.",
    },
    {
      icon: Award,
      title: "Experiencia comprobada",
      description: "Más de 10 años creando momentos inolvidables y construyendo confianza con nuestros viajeros.",
    },
    {
      icon: Globe,
      title: "Destinos exclusivos",
      description: "Acceso a lugares únicos y experiencias auténticas que no encontrarás en otros lados.",
    },
  ]

  return (
    <section id="nosotros" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Sobre <span className="text-primary">Nosotros</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Somos una agencia de viajes apasionada por crear experiencias extraordinarias. Nuestro equipo de expertos
              trabaja incansablemente para hacer realidad tus sueños de viaje.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Nuestra Historia</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Fundada en 2014, Expertos Viajes nació del sueño de compartir la magia de viajar. Comenzamos como un
                pequeño equipo de aventureros que creía que cada persona merece vivir experiencias únicas e
                inolvidables.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Hoy, después de más de una década, hemos ayudado a miles de viajeros a descubrir destinos increíbles,
                desde las playas más paradisíacas hasta las culturas más fascinantes del mundo.
              </p>
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border-l-4 border-primary shadow-lg">
                <p className="text-primary font-semibold italic">
                  "Creemos que viajar no es solo visitar lugares, sino coleccionar momentos que duran para toda la
                  vida."
                </p>
              </div>
            </div>

            <div className="relative">
              <Image
                src="/travel-team-office.png"
                alt="Equipo de Expertos Viajes"
                width={600}
                height={500}
                className="rounded-lg shadow-lg"
              />
              <div className="absolute -bottom-6 -right-6 bg-secondary p-4 rounded-lg shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">10+</div>
                  <div className="text-sm text-gray-600">Años de experiencia</div>
                </div>
              </div>
            </div>
          </div>

          {/* Values Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{value.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
