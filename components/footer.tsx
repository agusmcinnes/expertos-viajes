import Link from "next/link"
import { Plane, MapPin, Phone, Mail } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Expertos Viajes</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Tu agencia de confianza para crear experiencias de viaje inolvidables. Más de 10 años haciendo realidad
              los sueños de nuestros viajeros.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-gray-300">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Av. Corrientes 1234, Buenos Aires</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-2" />
                <span>+54 11 4567-8900</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-2" />
                <span>info@expertosviajes.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#inicio" className="text-gray-300 hover:text-secondary transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="#nosotros" className="text-gray-300 hover:text-secondary transition-colors">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="#destinos" className="text-gray-300 hover:text-secondary transition-colors">
                  Destinos
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-gray-300 hover:text-secondary transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gray-300 hover:text-secondary transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Destinations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Destinos Populares</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-300 hover:text-secondary transition-colors">
                  Argentina
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-secondary transition-colors">
                  Brasil
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-secondary transition-colors">
                  Caribe
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-secondary transition-colors">
                  Viajes Especiales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">© {currentYear} Expertos Viajes. Todos los derechos reservados.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-gray-400 hover:text-secondary text-sm transition-colors">
              Términos y Condiciones
            </Link>
            <Link href="#" className="text-gray-400 hover:text-secondary text-sm transition-colors">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
