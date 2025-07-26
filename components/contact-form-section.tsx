"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, Clock, MapPin } from "lucide-react"
import { ContactFormFunctional } from "./contact-form-functional"
import { motion } from "framer-motion"

interface ContactFormSectionProps {
  id?: string
  showTitle?: boolean
  title?: string
  subtitle?: string
  className?: string
}

export function ContactFormSection({ 
  id, 
  showTitle = true, 
  title = "Hablemos de tu próximo viaje",
  subtitle = "Estamos aquí para ayudarte a planificar la aventura perfecta. Contactanos y comenzá a vivir experiencias inolvidables.",
  className = "py-20 bg-white"
}: ContactFormSectionProps) {
  const contactInfo = [
    {
      icon: MapPin,
      title: "Ubicación",
      details: ["Av. Corrientes 1234, Piso 5", "Buenos Aires, Argentina"],
      color: "text-blue-600",
    },
    {
      icon: Phone,
      title: "Teléfono",
      details: ["+54 11 4567-8900", "WhatsApp: +54 9 11 2345-6789"],
      color: "text-green-600",
    },
    {
      icon: Mail,
      title: "Email",
      details: ["info@expertosviajes.com", "reservas@expertosviajes.com"],
      color: "text-purple-600",
    },
    {
      icon: Clock,
      title: "Horarios",
      details: ["Lun - Vie: 9:00 - 18:00", "Sáb: 9:00 - 13:00"],
      color: "text-orange-600",
    },
  ]

  return (
    <section id={id} className={className}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          {showTitle && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {title.includes('viaje') ? (
                  <>
                    Hablemos de tu próximo <span className="text-primary">viaje</span>
                  </>
                ) : (
                  <span className="text-primary">{title}</span>
                )}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {subtitle}
              </p>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900">Envianos tu consulta</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactFormFunctional />
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center ${info.color}`}
                        >
                          <info.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.title}</h3>
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-gray-600">
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Seguinos en redes sociales</h3>
            <div className="flex justify-center space-x-6">
              {["Facebook", "Instagram"].map((social, index) => (
                <motion.a
                  key={social}
                  href="#"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.1 }}
                  className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center text-white hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span className="text-sm font-semibold">{social[0]}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
