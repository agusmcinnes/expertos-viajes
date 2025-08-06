"use client"

import { ContactFormSection } from "@/components/contact-form-section"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-primary via-primary/90 to-primary/80 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <div className="mb-6 py-12">
                <Link
                  href="/"
                  className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Volver al Inicio
                </Link>
              </div>
              
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
  )
}
