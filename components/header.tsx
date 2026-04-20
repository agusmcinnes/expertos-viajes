"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, X, Users, Phone, ChevronDown, ChevronRight, Bus, Plane, Sparkles, Ship } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { destinationService } from "@/lib/supabase"
import type { Destination } from "@/lib/supabase"
import { isAgencyAuthenticated, getCurrentAgency, logoutAgency } from "@/lib/agency-auth"

interface HeaderProps {
  position?: "fixed" | "sticky"
  solid?: boolean
}

export function Header({ position = "fixed", solid = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [specialSectionTitle, setSpecialSectionTitle] = useState("Seccion Especial")
  const [isAgencyLoggedIn, setIsAgencyLoggedIn] = useState(false)
  const [agencyName, setAgencyName] = useState("")

  useEffect(() => {
    loadDestinations()
    loadSpecialSectionTitle()
    checkAgencySession()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
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
    { name: specialSectionTitle, href: "/seccion-especial", icon: Sparkles },
  ]

  const destinosAvion = [
    { code: "argentina", name: "Argentina" },
    { code: "brasil", name: "Brasil" },
    { code: "caribe", name: "Caribe y Centro America" },
    { code: "eeuu-canada", name: "EEUU / Canada" },
    { code: "europa-clasicos", name: "Europa y Clasicos" },
    { code: "exoticos-mundo", name: "Exoticos y Resto del Mundo" },
    { code: "grupales", name: "Salidas Grupales Acompanadas" },
  ]

  const destinosBus = [
    { code: "brasil", name: "Brasil" },
    { code: "argentina", name: "Argentina" },
    { code: "grupales", name: "Salidas Especiales" },
  ]

  const destinosCrucero = [
    { code: "brasil", name: "Brasil" },
    { code: "caribe", name: "Caribe" },
    { code: "mediterraneo", name: "Mediterraneo" },
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

    if (href.includes("#")) {
      const targetSection = href.split("#")[1]
      if (window.location.pathname === "/" || window.location.pathname === "") {
        const element = document.querySelector(targetSection ? `#${targetSection}` : "#inicio")
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      } else {
        window.location.href = href
      }
    } else {
      if (href !== window.location.pathname) {
        window.location.href = href
      }
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  // Dynamic text colors based on scroll state or menu open
  const isHeaderSolid = solid || scrolled || isMenuOpen
  const navTextColor = isHeaderSolid ? "text-gray-700" : "text-white"
  const navHoverColor = isHeaderSolid ? "hover:text-primary" : "hover:text-white/80"
  const logoFilter = isHeaderSolid ? "" : "brightness-0 invert"

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`${position} top-0 w-full z-50 transition-all duration-500 ${
        isHeaderSolid
          ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100 py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link href="/" onClick={() => handleNavigation("/")} className="flex items-center space-x-2">
            <Image
              src="/logo-expertos-viajes.png"
              alt="Expertos en Turismo"
              width={180}
              height={50}
              className={`h-12 w-auto transition-all duration-500 ${logoFilter}`}
            />
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            {/* En Avion Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-1.5 ${navTextColor} ${navHoverColor} transition-colors duration-200 p-0 h-auto font-medium text-sm tracking-wide bg-transparent hover:bg-transparent`}
                >
                  <Plane className="w-4 h-4" />
                  <span>En Avion</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64 rounded-xl shadow-2xl border border-gray-100/50 bg-white/95 backdrop-blur-xl p-2">
                <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-primary/5">
                  <Link
                    href="/#destinos"
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigation("/avion")
                    }}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Plane className="w-4 h-4 text-primary" />
                    <span className="font-medium">Ver Todos los Destinos</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t border-gray-100 my-1.5 mx-2"></div>
                {destinosAvion.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-primary/5">
                    <Link
                      href={`/destinos/${destination.code}?transport=aereo`}
                      onClick={() => handleNavigation(`/destinos/${destination.code}?transport=aereo`)}
                      className="flex items-center space-x-2 w-full"
                    >
                      <span className="text-lg">{getDestinationIcon(destination.code)}</span>
                      <span>{destination.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* En Bus Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-1.5 ${navTextColor} ${navHoverColor} transition-colors duration-200 p-0 h-auto font-medium text-sm tracking-wide bg-transparent hover:bg-transparent`}
                >
                  <Bus className="w-4 h-4" />
                  <span>En Bus!</span>
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-bus inline-block" />
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64 rounded-xl shadow-2xl border border-gray-100/50 bg-white/95 backdrop-blur-xl p-2">
                <div className="p-3 border-b border-gray-100">
                  <Image
                    src="/logo_vdv.png"
                    alt="Vete de Viaje"
                    width={120}
                    height={40}
                    className="h-8 w-auto mx-auto"
                  />
                </div>
                <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-bus/5 mt-1">
                  <Link
                    href="/bus"
                    onClick={() => handleNavigation("/bus")}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Bus className="w-4 h-4 text-bus" />
                    <span className="font-medium">Ver Todos los Viajes en Bus</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t border-gray-100 my-1.5 mx-2"></div>
                {destinosBus.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-bus/5">
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

            {/* En Crucero Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-1.5 ${navTextColor} ${navHoverColor} transition-colors duration-200 p-0 h-auto font-medium text-sm tracking-wide bg-transparent hover:bg-transparent`}
                >
                  <Ship className="w-4 h-4" />
                  <span>En Crucero</span>
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64 rounded-xl shadow-2xl border border-gray-100/50 bg-white/95 backdrop-blur-xl p-2">
                <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-blue-500/5">
                  <Link
                    href="/crucero"
                    onClick={() => handleNavigation("/crucero")}
                    className="flex items-center space-x-2 w-full"
                  >
                    <Ship className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Ver Todos los Cruceros</span>
                  </Link>
                </DropdownMenuItem>
                <div className="border-t border-gray-100 my-1.5 mx-2"></div>
                {destinosCrucero.map((destination) => (
                  <DropdownMenuItem key={destination.code} asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-blue-500/5">
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

            {/* Seccion Especial */}
            <Link
              href="/seccion-especial"
              onClick={(e) => {
                e.preventDefault()
                handleNavigation("/seccion-especial")
              }}
              className={`text-sm font-medium tracking-wide ${navTextColor} ${navHoverColor} transition-colors duration-200 flex items-center gap-1.5`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {specialSectionTitle}
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button
              asChild
              className="bg-primary hover:bg-primary-600 text-white font-medium px-6 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
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

            {!isAgencyLoggedIn && (
              <Button
                variant="outline"
                asChild
                className={`border ${isHeaderSolid ? "border-primary/30 text-primary" : "border-white/30 text-white"} hover:bg-primary hover:text-white hover:border-primary px-5 py-2.5 rounded-full transition-all duration-300 bg-transparent`}
              >
                <Link href="/agencias/login">
                  Ingreso Agencias
                </Link>
              </Button>
            )}

            {isAgencyLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border border-green-500/50 text-green-700 hover:bg-green-500 hover:text-white bg-transparent rounded-full transition-all duration-300 px-5"
                  >
                    {agencyName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-2xl border border-gray-100/50 bg-white/95 backdrop-blur-xl p-2">
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-primary/5">
                    <Link href="/agencias/modulo">
                      Modulo de Agencias
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAgencyLogout} className="rounded-lg px-3 py-2.5 cursor-pointer hover:bg-red-50 text-red-600">
                    Cerrar Sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden relative w-10 h-10 flex items-center justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className={`transition-transform duration-200 ${isMenuOpen ? "rotate-90" : ""}`}>
              {isMenuOpen ? (
                <X className={`w-6 h-6 ${isHeaderSolid ? "text-gray-700" : "text-white"}`} />
              ) : (
                <Menu className={`w-6 h-6 ${isHeaderSolid ? "text-gray-700" : "text-white"}`} />
              )}
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden bg-white/95 backdrop-blur-2xl shadow-2xl rounded-b-2xl border-t border-gray-100/50 overflow-hidden"
            >
              <div className="max-h-[80vh] overflow-y-auto">
                <nav className="flex flex-col px-4 py-4 space-y-2">
                  {/* En Avion Section */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={() => toggleSection('avion')}
                      className="w-full flex items-center justify-between p-3 bg-primary/5 rounded-xl hover:bg-primary/10 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Plane className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-gray-800">En Avion</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-primary transition-transform duration-200 ${
                          expandedSection === 'avion' ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
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
                            className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-all duration-200 p-2.5 rounded-lg hover:bg-primary/5"
                            onClick={(e) => {
                              e.preventDefault()
                              handleNavigation("/#destinos")
                            }}
                          >
                            <Plane className="w-3.5 h-3.5 text-primary/60" />
                            <span className="text-sm font-medium">Ver Todos los Destinos</span>
                          </Link>
                          {destinosAvion.map((destination) => (
                            <Link
                              key={destination.code}
                              href={`/destinos/${destination.code}?transport=aereo`}
                              className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-all duration-200 p-2.5 rounded-lg hover:bg-primary/5"
                              onClick={() => handleNavigation(`/destinos/${destination.code}?transport=aereo`)}
                            >
                              <span className="text-sm">{getDestinationIcon(destination.code)}</span>
                              <span className="text-sm font-medium">{destination.name}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* En Bus Section */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={() => toggleSection('bus')}
                      className="w-full flex items-center justify-between p-3 bg-bus/5 rounded-xl hover:bg-bus/10 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-bus/10 flex items-center justify-center">
                          <Bus className="w-4 h-4 text-bus" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-bus">En Bus!</span>
                          <Image src="/logo_vdv.png" alt="Vete de Viaje" width={60} height={18} className="h-4 w-auto opacity-80" />
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-bus transition-transform duration-200 ${
                          expandedSection === 'bus' ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
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
                            className="flex items-center space-x-2 text-gray-600 hover:text-bus transition-all duration-200 p-2.5 rounded-lg hover:bg-bus/5"
                            onClick={() => handleNavigation("/bus")}
                          >
                            <Bus className="w-3.5 h-3.5 text-bus/60" />
                            <span className="text-sm font-medium">Ver Todos los Viajes en Bus</span>
                          </Link>
                          {destinosBus.map((destination) => (
                            <Link
                              key={destination.code}
                              href={`/destinos/${destination.code}?transport=bus`}
                              className="flex items-center space-x-2 text-gray-600 hover:text-bus transition-all duration-200 p-2.5 rounded-lg hover:bg-bus/5"
                              onClick={() => handleNavigation(`/destinos/${destination.code}?transport=bus`)}
                            >
                              <span className="text-sm">{getDestinationIcon(destination.code)}</span>
                              <span className="text-sm font-medium">{destination.name}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* En Crucero Section */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={() => toggleSection('crucero')}
                      className="w-full flex items-center justify-between p-3 bg-blue-500/5 rounded-xl hover:bg-blue-500/10 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
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

                    <AnimatePresence>
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
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-all duration-200 p-2.5 rounded-lg hover:bg-blue-500/5"
                            onClick={() => handleNavigation("/crucero")}
                          >
                            <Ship className="w-3.5 h-3.5 text-blue-600/60" />
                            <span className="text-sm font-medium">Ver Todos los Cruceros</span>
                          </Link>
                          {destinosCrucero.map((destination) => (
                            <Link
                              key={destination.code}
                              href={`/destinos/${destination.code}?transport=crucero`}
                              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-all duration-200 p-2.5 rounded-lg hover:bg-blue-500/5"
                              onClick={() => handleNavigation(`/destinos/${destination.code}?transport=crucero`)}
                            >
                              <span className="text-sm">{getDestinationIcon(destination.code)}</span>
                              <span className="text-sm font-medium">{destination.name}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Seccion Especial - Mobile */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                  >
                    <Link
                      href="/seccion-especial"
                      className="flex items-center space-x-3 text-gray-700 hover:text-primary transition-all duration-200 p-3 rounded-xl hover:bg-primary/5 group"
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigation("/seccion-especial")
                      }}
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{specialSectionTitle}</span>
                    </Link>
                  </motion.div>

                  <div className="border-t border-gray-100 my-2"></div>

                  {/* CTA Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex flex-col space-y-2 pt-1"
                  >
                    <Button
                      asChild
                      className="bg-primary hover:bg-primary-600 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
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

                    {!isAgencyLoggedIn && (
                      <Button
                        variant="outline"
                        asChild
                        className="border border-primary/30 text-primary hover:bg-primary hover:text-white bg-transparent rounded-full transition-all duration-300"
                      >
                        <Link
                          href="/agencias/login"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Iniciar Sesion
                        </Link>
                      </Button>
                    )}

                    {isAgencyLoggedIn && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          asChild
                          className="w-full border border-green-500/50 text-green-700 hover:bg-green-500 hover:text-white bg-transparent rounded-full transition-all duration-300"
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
                          className="w-full border border-red-300 text-red-600 hover:bg-red-500 hover:text-white bg-transparent rounded-full transition-all duration-300"
                          onClick={handleAgencyLogout}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cerrar Sesion
                        </Button>
                      </div>
                    )}
                  </motion.div>
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
