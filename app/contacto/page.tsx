"use client"

import { ContactFormSection } from "@/components/contact-form-section"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

// Note: Since this is a client component, metadata should be moved to a separate layout or parent component
// For now, we'll add it via head tag

export default function ContactPage() {
  return (
    <>
      <head>
        <title>Contacto - Expertos en Viajes</title>
        <meta name="description" content="Contacta con Expertos en Viajes. Estamos aquí para ayudarte a planificar tu próxima aventura. Consulta sobre nuestros paquetes turísticos y destinos." />
        <meta name="keywords" content="contacto, consultas, información turística, asesoramiento viajes, agencia de viajes Chubut" />
        <meta property="og:title" content="Contacto - Expertos en Viajes" />
        <meta property="og:description" content="Contacta con Expertos en Viajes. Estamos aquí para ayudarte a planificar tu próxima aventura." />
        <meta property="og:url" content="https://expertos-viajes.vercel.app/contacto" />
        <link rel="canonical" href="https://expertos-viajes.vercel.app/contacto" />
      </head>
      <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-primary via-primary/90 to-primary/80 py-20">
          <div className="container mx-auto px-4 mt-20">
            <div className="max-w-4xl mx-auto text-center text-white">
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Contacto
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
                Estamos aquí para ayudarte a planificar tu próxima aventura
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <ContactFormSection 
          showTitle={false}
          className="py-20 bg-gray-50"
        />
      </main>
      <Footer />
    </div>
    </>
  )
}
