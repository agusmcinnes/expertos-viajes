"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

// Simulamos datos de paquetes (en producción vendrían de Supabase)
const mockPackages = {
  argentina: [
    {
      id: 1,
      name: "Buenos Aires & Cataratas del Iguazú",
      description: "Descubrí la capital argentina y una de las maravillas naturales más impresionantes del mundo.",
      price: 1200,
      dates: ["15 Mar 2024", "22 Abr 2024", "10 May 2024"],
      duration: "7 días",
      image: "/buenos-aires-iguazu.png",
    },
    {
      id: 2,
      name: "Patagonia Aventura",
      description: "Glaciares, montañas y paisajes únicos en el fin del mundo. Una experiencia inolvidable.",
      price: 1800,
      dates: ["5 Abr 2024", "20 May 2024", "15 Jun 2024"],
      duration: "10 días",
      image: "/patagonia-glaciers-mountains.png",
    },
  ],
  brasil: [
    {
      id: 3,
      name: "Río de Janeiro & Salvador",
      description: "Playas paradisíacas, cultura vibrante y la alegría brasileña en su máxima expresión.",
      price: 1400,
      dates: ["12 Mar 2024", "18 Abr 2024", "25 May 2024"],
      duration: "8 días",
      image: "/rio-christ-beaches.png",
    },
    {
      id: 4,
      name: "Amazonas Místico",
      description: "Adentrate en la selva más grande del mundo y conectá con la naturaleza pura.",
      price: 1600,
      dates: ["8 Abr 2024", "15 May 2024", "22 Jun 2024"],
      duration: "9 días",
      image: "/amazon-river-wildlife.png",
    },
  ],
  caribe: [
    {
      id: 5,
      name: "Cancún & Riviera Maya",
      description: "Playas de arena blanca, aguas cristalinas y la cultura maya en un solo viaje.",
      price: 1100,
      dates: ["20 Mar 2024", "25 Abr 2024", "30 May 2024"],
      duration: "6 días",
      image: "/cancun-mayan-beach.png",
    },
    {
      id: 6,
      name: "Costa Rica Pura Vida",
      description: "Volcanes, selvas tropicales y playas en el paraíso centroamericano.",
      price: 1300,
      dates: ["10 Abr 2024", "18 May 2024", "28 Jun 2024"],
      duration: "7 días",
      image: "/costa-rica-volcanoes-beaches.png",
    },
  ],
  grupales: [
    {
      id: 7,
      name: "Japón Tradicional",
      description: "Templos milenarios, tecnología futurista y la cultura más fascinante de Asia.",
      price: 2500,
      dates: ["5 Abr 2024", "20 May 2024", "10 Jul 2024"],
      duration: "12 días",
      image: "/japan-temple-cherry-tokyo.png",
    },
    {
      id: 8,
      name: "Safari Africano",
      description: "Los Big Five, atardeceres únicos y la aventura más salvaje que puedas imaginar.",
      price: 3200,
      dates: ["15 May 2024", "25 Jun 2024", "20 Ago 2024"],
      duration: "14 días",
      image: "/african-safari-elephants-lions-sunset.png",
    },
  ],
}

const destinations = [
  { id: "argentina", name: "Argentina", icon: "" },
  { id: "brasil", name: "Brasil", icon: "" },
  { id: "caribe", name: "Caribe & Centroamérica", icon: "" },
  { id: "grupales", name: "Salidas Grupales Acompañadas", icon: "" },
]

export function DestinationsSection() {
  const [activeDestination, setActiveDestination] = useState("argentina")
  const [packages, setPackages] = useState(mockPackages)

  return (
    <section id="destinos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Nuestros <span className="text-primary">Destinos</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Desde aventuras locales hasta experiencias exóticas, tenemos el viaje perfecto para vos. Explorá nuestros
              destinos más populares y encontrá tu próxima aventura.
            </p>
          </div>

          {/* Destination Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {destinations.map((destination) => (
              <Button
                key={destination.id}
                variant={activeDestination === destination.id ? "default" : "outline"}
                onClick={() => setActiveDestination(destination.id)}
                className={`px-6 py-3 text-lg ${
                  activeDestination === destination.id
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "border-primary text-primary hover:bg-primary hover:text-white"
                }`}
              >
                <span className="mr-2">{destination.icon}</span>
                {destination.name}
              </Button>
            ))}
          </div>

          {/* Packages Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {packages[activeDestination as keyof typeof packages]?.map((pkg, index) => (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                key={pkg.id}
              >
                <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                  <div className="relative overflow-hidden">
                    <Image
                      src={pkg.image || "/placeholder.svg"}
                      alt={pkg.name}
                      width={400}
                      height={300}
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-secondary text-gray-900 font-semibold">${pkg.price}</Badge>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="outline" className="bg-white/90 text-gray-900">
                        {pkg.duration}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{pkg.name}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{pkg.description}</p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Próximas salidas: {pkg.dates.slice(0, 2).join(", ")}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Grupos reducidos (máx. 12 personas)</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                        <span>Calificación 4.9/5</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        asChild
                        className="flex-1 bg-primary hover:bg-primary/90 text-white"
                      >
                        <Link
                          href="/contacto"
                        >
                          Solicitar Información
                        </Link>
                      </Button>

                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">¿No encontrás lo que buscás?</h3>
              <p className="text-lg mb-6 text-white/90">
                Creamos viajes personalizados según tus sueños y presupuesto. Contanos qué tenés en mente y lo hacemos
                realidad.
              </p>
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-gray-900 font-semibold">
                Crear Viaje Personalizado
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
