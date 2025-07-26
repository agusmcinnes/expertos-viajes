"use client"
import { ContactFormSection } from "./contact-form-section"

export function ContactSection() {
  return (
    <ContactFormSection 
      id="contacto"
      showTitle={true}
      title="Hablemos de tu próximo viaje"
      subtitle="Estamos aquí para ayudarte a planificar la aventura perfecta. Contactanos y comenzá a vivir experiencias inolvidables."
      className="py-20 bg-white"
    />
  )
}
