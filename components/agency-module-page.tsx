"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Package, FileText, Bus, Plane, Settings, CreditCard, Building2, FileCheck, File, Star, Users, Globe, Shield, MapPin, Clock, Eye, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { agencyService, pdfService, getFileIcon, getFileTypeLabel, supabase } from '@/lib/supabase'
import { isAgencyAuthenticated, getCurrentAgency } from '@/lib/agency-auth'
import type { TravelPackage } from '@/lib/supabase'
import { motion } from "framer-motion"

export default function AgencyModulePage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [agency, setAgency] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<'bus' | 'avion' | 'administracion'>('bus')
  const router = useRouter()

  useEffect(() => {
    // Verificar autenticación
    if (!isAgencyAuthenticated()) {
      router.push('/agencias/login')
      return
    }

    const currentAgency = getCurrentAgency()
    setAgency(currentAgency)
    loadPackagesWithPDF()
  }, [router])

  const loadPackagesWithPDF = async () => {
    try {
      setLoading(true)
      const packagesData = await agencyService.getPackagesWithPDF()
      setPackages(packagesData)
    } catch (error) {
      console.error('Error loading packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (pdfUrl: string, packageName: string, packageId?: number, pdfType?: 'tarifario' | 'flyer' | 'piezas_redes') => {
    console.log('🔗 Intentando descargar PDF:', { pdfUrl, packageName, packageId, pdfType })
    
    // Si tenemos packageId y pdfType, intentar generar una nueva URL
    if (packageId && pdfType) {
      try {
        const downloadUrl = await pdfService.getDownloadUrl(packageId, pdfType)
        if (downloadUrl) {
          console.log('✅ Nueva URL generada:', downloadUrl)
          window.open(downloadUrl, '_blank')
          return
        }
      } catch (error) {
        console.error('❌ Error generando nueva URL:', error)
      }
    }
    
    // Fallback a la URL original
    console.log('🔄 Usando URL original como fallback')
    window.open(pdfUrl, '_blank')
  }

  const handleLogout = () => {
    localStorage.removeItem('agency_session')
    router.push('/agencias/login')
  }

  const handleAdminDownload = (fileName: string) => {
    try {
      console.log(`🔗 Descargando ${fileName}...`)
      
      // Mapear nombre a archivo en la carpeta public/pdfs
      const fileMapping: Record<string, string> = {
        'Tarjetas de Crédito': '/pdfs/tarjetas.pdf',
        'Bancos': '/pdfs/bancos.pdf', 
        'Contrato de Reserva': '/pdfs/reserva.pdf'
      }
      
      const filePath = fileMapping[fileName]
      if (!filePath) {
        console.error('❌ Archivo no encontrado:', fileName)
        alert('Archivo no disponible')
        return
      }
      
      console.log('✅ Descargando archivo desde:', filePath)
      // Abrir el archivo directamente desde la carpeta public
      window.open(filePath, '_blank')
      
    } catch (error) {
      console.error('❌ Error en descarga:', error)
      alert(`Error descargando ${fileName}`)
    }
  }

  const getBusPackages = () => packages.filter(pkg => pkg.transport_type === 'bus')
  const getAvionPackages = () => packages.filter(pkg => pkg.transport_type === 'aereo')

  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case 'aereo':
        return '✈️'
      case 'bus':
        return '🚌'
      case 'crucero':
        return '🚢'
      default:
        return '✈️'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando módulo de agencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
            {/* Title and Agency Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <Building2 className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
                  <div>
                    <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800">
                      Portal de Agencias
                    </h1>
                    {agency && (
                      <p className="text-sm lg:text-base text-gray-600">
                        Bienvenido, <span className="font-semibold text-blue-600">{agency.name}</span>
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={handleLogout}
                  variant="outline" 
                  size="sm"
                  className="self-start sm:self-auto text-gray-600 hover:text-red-600 hover:border-red-300"
                >
                  Cerrar Sesión
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
              <Button
                onClick={() => setActiveSection('bus')}
                variant="ghost"
                size="sm"
                className={`flex items-center justify-center px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base font-medium rounded-lg transition-all duration-300 ${
                  activeSection === 'bus'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Bus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                En Bus
              </Button>
              <Button
                onClick={() => setActiveSection('avion')}
                variant="ghost"
                size="sm"
                className={`flex items-center justify-center px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base font-medium rounded-lg transition-all duration-300 ${
                  activeSection === 'avion'
                    ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-violet-500 hover:bg-violet-50'
                }`}
              >
                <Plane className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                En Avión
              </Button>
              <Button
                onClick={() => setActiveSection('administracion')}
                variant="ghost"
                size="sm"
                className={`flex items-center justify-center px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base font-medium rounded-lg transition-all duration-300 ${
                  activeSection === 'administracion'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-purple-500 hover:bg-purple-50'
                }`}
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                Administración
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {activeSection === 'bus' && (
          <motion.div
            key="bus"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                <Bus className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 text-red-500" />
                Paquetes de Viaje en Bus
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto px-4">
                Descubre nuestros increíbles paquetes de viaje en bus. Cómodos, seguros y llenos de aventuras para tus clientes.
              </p>
            </div>
            
            {getBusPackages().length === 0 ? (
              <div className="text-center py-12 lg:py-16">
                <Bus className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-gray-300 mx-auto mb-4 lg:mb-6" />
                <h3 className="text-xl md:text-2xl font-semibold text-gray-500 mb-4">
                  No hay paquetes en bus disponibles
                </h3>
                <p className="text-gray-400 px-4">
                  Los paquetes de viaje en bus aparecerán aquí cuando estén disponibles
                </p>
              </div>
            ) : (
              <PackageGrid packages={getBusPackages()} onDownloadPDF={handleDownloadPDF} router={router} />
            )}
          </motion.div>
        )}

        {activeSection === 'avion' && (
          <motion.div
            key="avion"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                <Plane className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 text-violet-500" />
                Paquetes de Viaje en Avión
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto px-4">
                Vuela hacia destinos extraordinarios con nuestros paquetes aéreos exclusivos. Rapidez, comodidad y experiencias únicas.
              </p>
            </div>
            
            {getAvionPackages().length === 0 ? (
              <div className="text-center py-12 lg:py-16">
                <Plane className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-gray-300 mx-auto mb-4 lg:mb-6" />
                <h3 className="text-xl md:text-2xl font-semibold text-gray-500 mb-4">
                  No hay paquetes aéreos disponibles
                </h3>
                <p className="text-gray-400 px-4">
                  Los paquetes de viaje en avión aparecerán aquí cuando estén disponibles
                </p>
              </div>
            ) : (
              <PackageGrid packages={getAvionPackages()} onDownloadPDF={handleDownloadPDF} router={router} />
            )}
          </motion.div>
        )}

        {activeSection === 'administracion' && (
          <motion.div
            key="administracion"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                <Settings className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 text-purple-500" />
                Centro de Administración
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto px-4">
                Accede a documentos importantes, contratos modelo y recursos administrativos para gestionar tu agencia de manera eficiente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:-translate-y-1">
                  <CardContent className="p-4 lg:p-6 text-center">
                    <CreditCard className="w-10 h-10 lg:w-12 lg:h-12 text-blue-600 mx-auto mb-3 lg:mb-4" />
                    <h3 className="text-base lg:text-lg font-bold text-gray-800 mb-2">
                      Tarjetas de Crédito
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">
                      Información sobre medios de pago con tarjetas
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Tarjetas de Crédito')}
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm"
                    >
                      <Download className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                      Descargar
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:-translate-y-1">
                  <CardContent className="p-4 lg:p-6 text-center">
                    <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-green-600 mx-auto mb-3 lg:mb-4" />
                    <h3 className="text-base lg:text-lg font-bold text-gray-800 mb-2">
                      Bancos
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">
                      Información bancaria y transferencias
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Bancos')}
                      size="sm" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs lg:text-sm"
                    >
                      <Download className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                      Descargar
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:-translate-y-1">
                  <CardContent className="p-4 lg:p-6 text-center">
                    <FileCheck className="w-10 h-10 lg:w-12 lg:h-12 text-purple-600 mx-auto mb-3 lg:mb-4" />
                    <h3 className="text-base lg:text-lg font-bold text-gray-800 mb-2">
                      Contrato de Reserva
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">
                      Modelo de contrato para reservas de viajes
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Contrato de Reserva')}
                      size="sm" 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs lg:text-sm"
                    >
                      <Download className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                      Descargar
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Componente separado para la grilla de paquetes
function PackageGrid({ 
  packages, 
  onDownloadPDF, 
  router 
}: { 
  packages: TravelPackage[], 
  onDownloadPDF: (url: string, name: string, id?: number, type?: 'tarifario' | 'flyer' | 'piezas_redes') => void,
  router: any
}) {
  const [expandedDates, setExpandedDates] = useState<Record<number, boolean>>({})

  const toggleDates = (packageId: number) => {
    setExpandedDates(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }))
  }

  const truncateDescription = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const TRANSPORT_COLORS = {
    bus: {
      bg: "bg-red-100", 
      text: "text-red-800",
      gradient: "from-red-600 to-rose-600",
      accent: "text-red-600",
      button: "bg-red-600 hover:bg-red-700",
    },
    aereo: {
      bg: "bg-purple-100",
      text: "text-purple-800", 
      gradient: "from-purple-600 to-violet-600",
      accent: "text-purple-600",
      button: "bg-purple-600 hover:bg-purple-700",
    }
  }

  const TRANSPORT_LABELS = {
    bus: 'Bus',
    aereo: 'Avión'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
      {packages.map((pkg, index) => {
        const transportType = pkg.transport_type as 'bus' | 'aereo'
        const colors = TRANSPORT_COLORS[transportType] || TRANSPORT_COLORS.aereo
        const Icon = transportType === 'bus' ? Bus : Plane
        
        // Procesar fechas disponibles
        const availableDates = pkg.available_dates || []
        const showExpandButton = availableDates.length > 2
        const isExpanded = expandedDates[pkg.id] || false
        const datesToShow = isExpanded ? availableDates : availableDates.slice(0, 2)

        return (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col overflow-hidden group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg bg-white hover:-translate-y-2">
              {/* Imagen con overlays */}
              <div className="relative h-48 overflow-hidden">
                {pkg.image_url ? (
                  <img 
                    src={pkg.image_url} 
                    alt={pkg.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <Icon className="w-16 h-16 text-white/80" />
                  </div>
                )}
                
                {/* Badges superiores */}
                <div className="absolute top-4 left-4 space-y-2">
                  <Badge className={`${colors.bg} ${colors.text} shadow-md`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {TRANSPORT_LABELS[transportType]}
                  </Badge>
                  {pkg.duration && (
                    <Badge variant="outline" className="bg-white/90 text-gray-900 border-white flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {pkg.duration}
                    </Badge>
                  )}
                </div>
                
                {/* Precio destacado */}
                <div className={`absolute bottom-0 right-0 bg-gradient-to-r ${colors.gradient} text-white px-4 py-2 rounded-tl-lg`}>
                  <div className="text-right">
                    <p className="text-xs opacity-90">Desde</p>
                    <p className="text-lg font-bold">{pkg.price}</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 flex-1 flex flex-col">
                {/* Título y descripción */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {truncateDescription(pkg.description)}
                  </p>
                </div>

                {/* Información básica del paquete */}
                <div className="space-y-3 mb-6 flex-1">
                  {/* Duración */}
                  {pkg.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{pkg.duration}</span>
                    </div>
                  )}
                  
                  {/* Destino */}
                  {pkg.destinations && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>{pkg.destinations.name}</span>
                    </div>
                  )}

                  {/* Fechas disponibles */}
                  <div className="space-y-2">
                    {availableDates.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">Fechas disponibles:</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {datesToShow.map((date: string, idx: number) => (
                            <p key={idx} className="text-sm text-gray-600">• {date}</p>
                          ))}
                          {showExpandButton && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDates(pkg.id)}
                              className="text-xs p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Ver menos fechas
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Ver todas las fechas ({availableDates.length - 2} más)
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Consultar fechas disponibles</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Botones de descarga - siempre al final */}
                <div className="border-t pt-4 mt-auto space-y-2">
                  {pkg.tarifario_pdf_url && (
                    <Button
                      onClick={() => onDownloadPDF(pkg.tarifario_pdf_url!, `${pkg.name} - Tarifario`, pkg.id, 'tarifario')}
                      className={`w-full ${colors.button} text-white transition-colors duration-200`}
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Tarifario
                    </Button>
                  )}

                  {pkg.flyer_pdf_url && (
                    <Button
                      onClick={() => onDownloadPDF(pkg.flyer_pdf_url!, `${pkg.name} - Flyer`, pkg.id, 'flyer')}
                      className={`w-full ${colors.button} text-white transition-colors duration-200`}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Flyer
                    </Button>
                  )}

                  {pkg.piezas_redes_pdf_url && (
                    <Button
                      onClick={() => onDownloadPDF(pkg.piezas_redes_pdf_url!, `${pkg.name} - Material Redes`, pkg.id, 'piezas_redes')}
                      className={`w-full ${colors.button} text-white transition-colors duration-200`}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Material Redes
                    </Button>
                  )}

                  {/* Mensaje si no hay archivos */}
                  {!pkg.tarifario_pdf_url && !pkg.flyer_pdf_url && !pkg.piezas_redes_pdf_url && (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      <FileText className="w-4 h-4 mx-auto mb-1 opacity-50" />
                      No hay archivos disponibles
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}