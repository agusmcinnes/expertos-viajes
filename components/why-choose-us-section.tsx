"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Shield, Clock, Headphones, Star, CreditCard } from "lucide-react"

export function WhyChooseUsSection() {
  const advantages = [
    {
      icon: Shield,
      title: "Viajes 100% Seguros",
      description:
        "Todos nuestros paquetes incluyen seguros de viaje completos y asistencia 24/7 para tu tranquilidad.",
      color: "bg-blue-500",
    },
    {
      icon: Clock,
      title: "Planificación Inteligente",
      description:
        "Optimizamos cada detalle de tu viaje para que ahorres tiempo y disfrutes al máximo. Tu aventura, organizada de forma eficiente.",
      color: "bg-green-500",
    },
    {
      icon: Headphones,
      title: "Soporte Personalizado",
      description:
        "Un asesor dedicado te acompaña desde la planificación hasta tu regreso. Siempre disponible cuando nos necesites.",
      color: "bg-purple-500",
    },
    {
      icon: Star,
      title: "Experiencias Exclusivas",
      description: "Acceso a actividades y lugares únicos que solo nosotros podemos ofrecerte. Vive lo extraordinario.",
      color: "bg-yellow-500",
    },
    {
      icon: CreditCard,
      title: "Precios Transparentes",
      description: "Sin sorpresas ni costos ocultos. Lo que ves es lo que pagas, con las mejores tarifas del mercado.",
      color: "bg-red-500",
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ¿Por qué elegir <span className="text-primary">Expertos en Viajes</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Más que una agencia de viajes, somos tus compañeros de aventura. Descubrí por qué miles de viajeros
              confían en nosotros para crear sus mejores recuerdos.
            </p>
          </div>

          {/* Advantages Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advantages.map((advantage, index) => (
              <Card
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-20 h-20 ${advantage.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <advantage.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{advantage.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{advantage.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
