"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, X, Home, Users, Phone, ChevronDown, ChevronRight, Bus, Plane, Sparkles, Ship } from "lucide-react"
import { motion } from "framer-motion"
import { destinationService } from "@/lib/supabase"
import type { Destination } from "@/lib/supabase"
import { isAgencyAuthenticated, getCurrentAgency, logoutAgency } from "@/lib/agency-auth"

interface HeaderProps {
  position?: "fixed" | "sticky"
}

export function Header({ position = "fixed" }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [specialSectionTitle, setSpecialSectionTitle] = useState("Sección Especial")
  const [isAgencyLoggedIn, setIsAgencyLoggedIn] = useState(false)
  const [agencyName, setAgencyName] = useState("")

  useEffect(() => {
    loadDestinations()
    loadSpecialSectionTitle()
    checkAgencySession()
  }, [])

  const loadDestinations = async () => {
    try {
      const data = await destinationService.getAllDestinations()
      setDestinations(data)
    } catch (error) {
      console.error("Error loading destinations:", error)
    }
  }

  const loadSpecialSectionTitle = async () => {
    try {
      const { siteConfigService } = await import("@/lib/supabase")
      const config = await siteConfigService.getConfig('special_section_title')
      setSpecialSectionTitle(config.config_value)
    } catch (error) {
      console.log("Special section title not found, using default")
    }
  }

  const checkAgencySession = () => {
    const authenticated = isAgencyAuthenticated()
    setIsAgencyLoggedIn(authenticated)
    
    if (authenticated) {
      const agency = getCurrentAgency()
      setAgencyName(agency?.name || "Agencia")
    }
  }

  const handleAgencyLogout = () => {
    logoutAgency()
    setIsAgencyLoggedIn(false)
    setAgencyName("")
    window.location.reload()
  }

  const navigation = [
    { name: "Inicio", href: "/#", icon: Home },
    { name: "Nosotros", href: "/#nosotros", icon: Users },
    { name: specialSectionTitle, href: "/seccion-especial", icon: Sparkles },
  ]

  // Definir destinos específicos para cada tipo de transporte
  const destinosAvion = [
    { code: "argentina", name: "Argentina" },
    { code: "brasil", name: "Brasil" },
    { code: "caribe", name: "Caribe y Centro América" },
    { code: "eeuu-canada", name: "EEUU / Canadá" },
    { code: "europa-clasicos", name: "Europa y Clásicos" },
    { code: "exoticos-mundo", name: "Exóticos y Resto del Mundo" },
    { code: "grupales", name: "Salidas Grupales Acompañadas" },
  ]

  const destinosBus = [
    { code: "brasil", name: "Brasil" },
    { code: "argentina", name: "Argentina" },
    { code: "grupales", name: "Salidas Especiales" },
  ]

  const destinosCrucero = [
    { code: "brasil", name: "Brasil" },
    { code: "caribe", name: "Caribe" },
    { code: "mediterraneo", name: "Mediterráneo" },
    { code: "grupales", name: "Especiales" },
  ]

  const getDestinationIcon = (code: string) => {
    const icons: Record<string, string> = {
      argentina: "🇦🇷",
      brasil: "🇧🇷",
      caribe: "🏝️",
      grupales: "👥",
      "eeuu-canada": "🏙️",
      "europa-clasicos": "🏛️", 
      "exoticos-mundo": "🌍",
      "mediterraneo": "🚢",
    }
    return icons[code] || "✈️"
  }

  const handleNavigation = (href: string) => {
    setIsMenuOpen(false)
    setExpandedSection(null)

    // Si es una navegación interna (con #), verificar si estamos en la página correcta
    if (href.includes("#")) {
      const targetSection = href.split("#")[1]
      
      // Si estamos en la página principal, hacer scroll
      if (window.location.pathname === "/" || window.location.pathname === "") {
        const element = document.querySelector(targetSection ? `#${targetSection}` : "#inicio")
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      } else {
        // Si estamos en otra página, navegar a la página principal con el hash
        window.location.href = href
      }
    } else {
      // Para navegación a otras páginas (como /contacto), usar window.location.href
      if (href !== window.location.pathname) {
        window.location.href = href
      }
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`${position} top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100 py-4`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Principal */}
          <Link href="/" onClick={() => handleNavigation("/")} className="flex items-center space-x-2">
            <Image
              src="/logo-expertos-viajes.png"
              alt="Expertos en Viajes"
              width={180}
              height={50}
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              // Para el enlace de contacto, usar navegación normal de Next.js
              if (item.name === "Contacto") {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors duration-200"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              }
              
              // Para otros enlaces, usar el manejador personalizado
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigation(item.href)
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors duration-200"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Destinos Aéreos Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors duration-200 p-0 h-auto font-normal"
                >
                  <Plane className="w-4 h-4" />
                  <span>En Avión</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem asChild>
                  <Link
                    href="/#destinos"
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigation("/avion")
                    }}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Ver Todos los Destinos</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t my-1"></div>
                {destinosAvion.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild>
                    <Link
                      href={`/destinos/${destination.code}?transport=aereo`}
                      onClick={() => handleNavigation(`/destinos/${destination.code}?transport=aereo`)}
                      className="flex items-center space-x-2 w-full"
                    >
                      <span className="text-lg ml-3">{getDestinationIcon(destination.code)}</span>
                      <span>{destination.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* En Bus! - Vete de Viaje */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-bus hover:text-bus-600 transition-colors duration-200 p-0 h-auto font-normal"
                >
                  <Bus className="w-4 h-4" />
                  <span className="font-semibold">¡En Bus!</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <div className="p-2 border-b">
                  <Image
                    src="/logo_vdv.png"
                    alt="Vete de Viaje"
                    width={120}
                    height={40}
                    className="h-8 w-auto mx-auto"
                  />
                </div>
                <DropdownMenuItem asChild>
                  <Link
                    href="/bus"
                    onClick={() => handleNavigation("/bus")}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Bus className="w-4 h-4" />
                    <span>Ver Todos los Viajes en Bus</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t my-1"></div>
                {destinosBus.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild>
                    <Link
                      href={`/destinos/${destination.code}?transport=bus`}
                      onClick={() => handleNavigation(`/destinos/${destination.code}?transport=bus`)}
                      className="flex items-center space-x-2 w-full"
                    >
                      <span className="text-lg">{getDestinationIcon(destination.code)}</span>
                      <span>{destination.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* En Crucero */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200 p-0 h-auto font-normal"
                >
                  <Ship className="w-4 h-4" />
                  <span className="font-semibold">En Crucero</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem asChild>
                  <Link
                    href="/crucero"
                    onClick={() => handleNavigation("/crucero")}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Ship className="w-4 h-4" />
                    <span>Ver Todos los Cruceros</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t my-1"></div>
                {destinosCrucero.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild>
                    <Link
                      href={`/destinos/${destination.code}?transport=crucero`}
                      onClick={() => handleNavigation(`/destinos/${destination.code}?transport=crucero`)}
                      className="flex items-center space-x-2 w-full"
                    >
                      <span className="text-lg">{getDestinationIcon(destination.code)}</span>
                      <span>{destination.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              asChild
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white transition-all duration-300 hover:scale-105"
            >
              <Link
                href="/#destinos"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation("/contacto")
                }}
              >
                Contactanos
              </Link>
            </Button>
            {/* Login button for agencies when not logged in */}
            {!isAgencyLoggedIn && (
              <Button
                variant="outline"
                asChild
                className="border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 hover:text-white bg-transparent transition-all duration-300 hover:scale-105"
              >
                <Link href="/agencias/login">
                  Ingreso Agencias
                </Link>
              </Button>
            )}
            
            {/* Agency Dropdown */}
            {isAgencyLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white bg-transparent transition-all duration-300 hover:scale-105"
                  >
                    {agencyName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/agencias/modulo">
                      Módulo de Agencias
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAgencyLogout}>
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-md shadow-lg"
          >
            <div className="max-h-[80vh] overflow-y-auto">
              <nav className="flex flex-col px-4 py-4 space-y-2">
                {/* Navegación Principal */}
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    {item.name === "Contacto" ? (
                      <Link
                        href={item.href}
                        className="flex items-center space-x-3 text-gray-700 hover:text-primary transition-all duration-200 p-3 rounded-lg hover:bg-primary/5 group"
                        onClick={() => {
                          setIsMenuOpen(false)
                          setExpandedSection(null)
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    ) : (
                      <Link
                        href={item.href}
                        className="flex items-center space-x-3 text-gray-700 hover:text-primary transition-all duration-200 p-3 rounded-lg hover:bg-primary/5 group"
                        onClick={(e) => {
                          e.preventDefault()
                          handleNavigation(item.href)
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    )}
                  </motion.div>
                ))}

                {/* Separador */}
                <div className="border-t border-gray-200 my-2"></div>

                {/* En Avión Section - Colapsable */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="space-y-2"
                >
                  <button
                    onClick={() => toggleSection('avion')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-blue-50 rounded-lg hover:from-primary/10 hover:to-blue-100 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Plane className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-gray-800">En Avión</span>
                    </div>
                    <ChevronRight 
                      className={`w-4 h-4 text-primary transition-transform duration-200 ${
                        expandedSection === 'avion' ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSection === 'avion' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 space-y-1 overflow-hidden"
                    >
                      <Link
                        href="/#destinos"
                        className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-all duration-200 p-2 rounded-lg hover:bg-primary/5"
                        onClick={(e) => {
                          e.preventDefault()
                          handleNavigation("/#destinos")
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <Plane className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium">Ver Todos los Destinos</span>
                      </Link>
                      {destinosAvion.map((destination) => (
                        <Link
                          key={destination.code}
                          href={`/destinos/${destination.code}?transport=aereo`}
                          className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-all duration-200 p-2 rounded-lg hover:bg-primary/5"
                          onClick={() => handleNavigation(`/destinos/${destination.code}?transport=aereo`)}
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs">{getDestinationIcon(destination.code)}</span>
                          </div>
                          <span className="text-sm font-medium">{destination.name}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                {/* En Bus Section - Colapsable */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="space-y-2"
                >
                  <button
                    onClick={() => toggleSection('bus')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-bus/5 to-orange-50 rounded-lg hover:from-bus/10 hover:to-orange-100 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-bus/20 flex items-center justify-center">
                        <Bus className="w-4 h-4 text-bus" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-bus">¡En Bus!</span>
                        <Image src="/logo_vdv.png" alt="Vete de Viaje" width={60} height={18} className="h-4 w-auto opacity-80" />
                      </div>
                    </div>
                    <ChevronRight 
                      className={`w-4 h-4 text-bus transition-transform duration-200 ${
                        expandedSection === 'bus' ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSection === 'bus' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 space-y-1 overflow-hidden"
                    >
                      <Link
                        href="/bus"
                        className="flex items-center space-x-2 text-bus hover:text-bus-600 transition-all duration-200 p-2 rounded-lg hover:bg-bus/5"
                        onClick={() => handleNavigation("/bus")}
                      >
                        <div className="w-6 h-6 rounded-full bg-bus/10 flex items-center justify-center">
                          <Bus className="w-3 h-3 text-bus" />
                        </div>
                        <span className="text-sm font-medium">Ver Todos los Viajes en Bus</span>
                      </Link>
                      {destinosBus.map((destination) => (
                        <Link
                          key={destination.code}
                          href={`/destinos/${destination.code}?transport=bus`}
                          className="flex items-center space-x-2 text-bus hover:text-bus-600 transition-all duration-200 p-2 rounded-lg hover:bg-bus/5"
                          onClick={() => handleNavigation(`/destinos/${destination.code}?transport=bus`)}
                        >
                          <div className="w-6 h-6 rounded-full bg-bus/10 flex items-center justify-center">
                            <span className="text-xs">{getDestinationIcon(destination.code)}</span>
                          </div>
                          <span className="text-sm font-medium">{destination.name}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                {/* En Crucero Section - Colapsable */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                  className="space-y-2"
                >
                  <button
                    onClick={() => toggleSection('crucero')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-600/5 to-cyan-50 rounded-lg hover:from-blue-600/10 hover:to-cyan-100 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <Ship className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-blue-600">En Crucero</span>
                    </div>
                    <ChevronRight 
                      className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${
                        expandedSection === 'crucero' ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSection === 'crucero' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 space-y-1 overflow-hidden"
                    >
                      <Link
                        href="/crucero"
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-all duration-200 p-2 rounded-lg hover:bg-blue-600/5"
                        onClick={() => handleNavigation("/crucero")}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center">
                          <Ship className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">Ver Todos los Cruceros</span>
                      </Link>
                      {destinosCrucero.map((destination) => (
                        <Link
                          key={destination.code}
                          href={`/destinos/${destination.code}?transport=crucero`}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-all duration-200 p-2 rounded-lg hover:bg-blue-600/5"
                          onClick={() => handleNavigation(`/destinos/${destination.code}?transport=crucero`)}
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center">
                            <span className="text-xs">{getDestinationIcon(destination.code)}</span>
                          </div>
                          <span className="text-sm font-medium">{destination.name}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                {/* Separador */}
                <div className="border-t border-gray-200 my-2"></div>

                {/* Botones CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                  className="flex flex-col space-y-2 pt-1"
                >
                  <Button
                    asChild
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <Link
                      href="/#destinos"
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigation("/contacto")
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contactanos
                    </Link>
                  </Button>

                  {/* Login button for agencies when not logged in - Mobile */}
                  {!isAgencyLoggedIn && (
                    <Button
                      variant="outline"
                      asChild
                      className="border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 hover:text-white bg-transparent transition-all duration-300"
                    >
                      <Link
                        href="/agencias/login"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Iniciar Sesión
                      </Link>
                    </Button>
                  )}

                  {/* Agency dropdown for mobile when logged in */}
                  {isAgencyLoggedIn && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        asChild
                        className="w-full border-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white bg-transparent transition-all duration-300"
                      >
                        <Link
                          href="/agencias/modulo"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {agencyName}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-red-500 text-red-700 hover:bg-red-500 hover:text-white bg-transparent transition-all duration-300"
                        onClick={handleAgencyLogout}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </Button>
                    </div>
                  )}
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}
