"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react"

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Gladis",
      text: "Hola, estamos súper bien. La experiencia de este viaje nos dejó conformes en todo sentido. Tuvimos buena gente como compañeros de viaje, con la única consigna de pasarla súper bien, y eso se logró con el acompañamiento de una coordinadora con una empatía total para solucionar cualquier tipo de inconveniente, la atención en el hotel y la comida, que fue excelente en variedad y gustos. Lo recomendaría totalmente, y nosotros volveríamos a realizar el mismo viaje. Gracias a la empresa y a todo su personal. Saludos al equipo.",
      rating: 5,
    },
    {
      name: "Raquel",
      text: "¡Excelente viaje! El servicio, los coordinadores y el hotel... todo muy bien. Recomendado desde ya. Es más, ya estoy hablando con algunas amistades. Para el próximo año me gustaría Jujuy. ¡Gracias por todo!",
      rating: 5,
    },
    {
      name: "Isabel",
      text: "Buen día, estoy muy bien y contenta por el excelente viaje que hicimos. Ya lo comenté en el grupo. Muy conforme con el coordinador que es un 10. El transporte, y el servicio en Gramado y Canela fueron muy buenos.",
      rating: 5,
    },
    {
      name: "Aníbal Julio",
      text: "¡Felicitaciones a la coordinadora por la excelente atención! A los dos conductores, mis felicitaciones por su excelente trabajo en la conducción del colectivo. A la coordinadora, felicitaciones por la higiene del coche y por la responsabilidad de cumplir con los programas establecidos. ¡Felicitaciones a la empresa Vete Viajes! Y Expertos",
      rating: 5,
    },
    {
      name: "Victoria",
      text: "Los coordinadores y el servicio de la empresa, de diez. Sí, recomendaría a otras personas.",
      rating: 5,
    },
    {
      name: "Ale",
      text: "Muy buena experiencia, la verdad, cumplieron con todo.",
      rating: 5,
    },
    {
      name: "Griselda",
      text: "Hola chicos, muy buenos días, disculpen la demora en responder. El viaje fue excelente, me encantó. Por supuesto que recomendaría a conocidos esta empresa. ¡Mil gracias!",
      rating: 5,
    },
    {
      name: "Noemí",
      text: "Hola, buenas tardes. Me gustó mucho el viaje, el grupo, los coordinadores y el guía. La verdad, muy linda experiencia. Desde ya, muy agradecida por los servicios. Otra cosa, ¡los choferes son un éxito!",
      rating: 5,
    },
    {
      name: "Nilda",
      text: "Hola, buenísimo todo. Gracias, nos vemos pronto.",
      rating: 5,
    },
    {
      name: "Jorge B.",
      text: "Gracias totales. Excelente experiencia.",
      rating: 5,
    },
    {
      name: "Barrios",
      text: "¡Muchas gracias! Hermosa experiencia... Muy buena atención.",
      rating: 5,
    },
    {
      name: "Santy",
      text: "Muy agradecida, excelente el viaje. Gracias por todo.",
      rating: 5,
    },
    {
      name: "Silvi",
      text: "Muchas gracias por todo, por guiarnos, por las atenciones que nos diste y por hacernos cumplir un sueño tan anhelado, como conocer esos maravillosos paisajes.",
      rating: 5,
    },
    {
      name: "Valu, Julia y Raúl",
      text: "Mariano, gracias por tu carisma. Hizo que todo fuera muy alegre y lleno de risas. Nos gustó mucho cumplir nuestro deseo de ir a esos lugares, pero también tu forma de ser tan divertida. Gracias, gracias.",
      rating: 5,
    },
    {
      name: "Alicia",
      text: "¡Muchas gracias, equipo de Vete de Viaje. ¡Hasta la próxima aventura, gente linda!",
      rating: 5,
    },
    {
      name: "Natividad",
      text: "Todo salió muy bien y la experiencia fue excelente. ¡Muchas gracias, ¡Hasta el próximo viaje!",
      rating: 5,
    },
    {
      name: "Esteban",
      text: "Muchas gracias por todo y a todos. Amabilidad, cordialidad y compañía de viaje... lindo viaje, disfrutado junto a ustedes. Gracias, saludos y hasta la próxima.",
      rating: 5,
    },
    {
      name: "Marie",
      text: "Gracias, excelente todo. Todo un lujo, miles de bendiciones.",
      rating: 5,
    },
    {
      name: "Juanita",
      text: "Hola, todo fue muy hermoso.",
      rating: 5,
    },
    {
      name: "Acevedo",
      text: "Muchas gracias por todo. Hermosa experiencia.",
      rating: 5,
    }
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const testimonialsPerPage = 3

  const nextTestimonials = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + testimonialsPerPage >= testimonials.length 
        ? 0 
        : prevIndex + testimonialsPerPage
    )
  }

  const prevTestimonials = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 
        ? Math.max(0, testimonials.length - testimonialsPerPage)
        : Math.max(0, prevIndex - testimonialsPerPage)
    )
  }

  const currentTestimonials = testimonials.slice(currentIndex, currentIndex + testimonialsPerPage)

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Lo que dicen nuestros <span className="text-primary">viajeros</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Miles de viajeros han confiado en nosotros para crear sus mejores recuerdos. 
              Estas son sus experiencias reales.
            </p>
            
            {/* Stats */}
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{testimonials.length}+</div>
                <div className="text-gray-600">Testimonios</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="text-gray-600">5 estrellas</div>
              </div>
            </div>
          </div>

          {/* Testimonials Carousel */}
          <div className="relative">
            {/* Fixed Navigation Buttons */}
            <Button
              onClick={prevTestimonials}
              variant="outline"
              size="lg"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full border-2 border-primary bg-white hover:bg-primary hover:text-white transition-colors duration-200 shadow-lg -ml-6"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={nextTestimonials}
              variant="outline"
              size="lg"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full border-2 border-primary bg-white hover:bg-primary hover:text-white transition-colors duration-200 shadow-lg -mr-6"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 px-8">
              {currentTestimonials.map((testimonial, index) => (
                <Card 
                  key={`${currentIndex}-${index}`}
                  className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full"
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex-1">
                      <Quote className="w-8 h-8 text-primary mb-4 opacity-60" />
                      <p className="text-gray-700 mb-6 leading-relaxed line-clamp-6">
                        "{testimonial.text}"
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                        <p className="text-sm text-gray-500">Viajero verificado</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center space-x-2">
              {Array.from({ length: Math.ceil(testimonials.length / testimonialsPerPage) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * testimonialsPerPage)}
                  className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                    Math.floor(currentIndex / testimonialsPerPage) === index
                      ? 'bg-primary'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
