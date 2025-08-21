import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { WhyChooseUsSection } from "@/components/why-choose-us-section"
import { DestinationsSectionDynamic } from "@/components/destinations-section-dynamic"
import { TestimonialsSection } from "@/components/testimonials-section"
import { SpecialSection } from "@/components/special-section"
import { ContactSection } from "@/components/contact-section"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <main>
        <HeroSection />
        <DestinationsSectionDynamic />
        <TestimonialsSection />
        <SpecialSection />
        <WhyChooseUsSection />
        <AboutSection />
        <ContactSection />
        <WhatsAppButton />
      </main>
      <Footer />
    </div>
  )
}
