"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Package, FileText, Bus, Plane, Settings, CreditCard, Building2, FileCheck, File, Star, Users, Globe, Shield, MapPin, Clock, Eye } from "lucide-react"
import { agencyService, pdfService, getFileIcon, getFileTypeLabel } from '@/lib/supabase'
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
        console.log('🔄 Generando nueva URL de descarga...')
        const newUrl = await pdfService.getDownloadUrl(packageId, pdfType)
        
        if (newUrl) {
          console.log('✅ Nueva URL generada:', newUrl)
          pdfUrl = newUrl
        } else {
          console.warn('⚠️ No se pudo generar nueva URL, usando URL original')
        }
      } catch (error) {
        console.error('❌ Error generando nueva URL:', error)
      }
    }
    
    // Verificar si la URL es válida
    if (!pdfUrl || pdfUrl.trim() === '') {
      console.error('❌ URL de PDF vacía')
      alert('Error: URL del PDF no disponible')
      return
    }
    
    console.log('📥 Iniciando descarga con URL:', pdfUrl)
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${packageName.replace(/\s+/g, '_')}.pdf`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAdminDownload = (fileName: string) => {
    // Aquí implementaremos la descarga de PDFs administrativos desde Supabase Storage
    console.log(`Descargando ${fileName}`)
    alert(`Funcionalidad de descarga para ${fileName} - Se implementará con Supabase Storage`)
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

  const getTransportText = (transport: string) => {
    switch (transport) {
      case 'aereo':
        return 'Aéreo'
      case 'bus':
        return 'Bus'
      case 'crucero':
        return 'Crucero'
      default:
        return 'Aéreo'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Cargando módulo de agencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-300 to-purple-900 text-white">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                Portal Exclusivo para Agencias
              </h1>
            </div>
            <p className="text-lg md:text-xl opacity-90 mb-2">
              Bienvenido/a, <span className="font-bold text-yellow-300">{agency?.name}</span>
            </p>
            <p className="text-sm md:text-lg opacity-80 px-4">
              Accede a recursos exclusivos, PDFs y herramientas especializadas para potenciar tu negocio
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center mt-6 space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-8">
              <div className="flex items-center">
                <Shield className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-green-300" />
                <span className="text-xs md:text-sm">Contenido Exclusivo</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-300" />
                <span className="text-xs md:text-sm">Soporte Premium</span>
              </div>
              <div className="flex items-center">
                <Globe className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-purple-300" />
                <span className="text-xs md:text-sm">Destinos Únicos</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-center overflow-x-auto">
            <div className="flex space-x-1 gap-2 p-2 min-w-max">
              <Button
                onClick={() => setActiveSection('bus')}
                variant={activeSection === 'bus' ? 'default' : 'ghost'}
                className={`px-4 md:px-6 lg:px-8 py-3 md:py-4 rounded-lg transition-all duration-300 text-sm md:text-base whitespace-nowrap ${
                  activeSection === 'bus'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Bus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Paquetes en </span>Bus
              </Button>
              <Button
                onClick={() => setActiveSection('avion')}
                variant={activeSection === 'avion' ? 'default' : 'ghost'}
                className={`px-4 md:px-6 lg:px-8 py-3 md:py-4 rounded-lg transition-all duration-300 text-sm md:text-base whitespace-nowrap ${
                  activeSection === 'avion'
                    ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-violet-500 hover:bg-violet-50'
                }`}
              >
                <Plane className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Paquetes en </span>Avión
              </Button>
              <Button
                onClick={() => setActiveSection('administracion')}
                variant={activeSection === 'administracion' ? 'default' : 'ghost'}
                className={`px-4 md:px-6 lg:px-8 py-3 md:py-4 rounded-lg transition-all duration-300 text-sm md:text-base whitespace-nowrap ${
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 group cursor-pointer h-full">
                  <CardContent className="p-4 lg:p-8 text-center flex flex-col h-full">
                    <div className="bg-red-100 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300">
                      <CreditCard className="w-6 h-6 lg:w-8 lg:h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2 lg:mb-3">Tarjetas de Crédito</h3>
                    <p className="text-gray-600 mb-4 lg:mb-6 text-xs lg:text-sm flex-grow">
                      Información sobre procesamiento de pagos y tarifas de tarjetas de crédito
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Tarjetas de Crédito')}
                      className="w-full bg-red-500 hover:bg-red-600 text-white transition-all duration-300 text-sm lg:text-base"
                      size="sm"
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
                <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 group cursor-pointer h-full">
                  <CardContent className="p-4 lg:p-8 text-center flex flex-col h-full">
                    <div className="bg-green-100 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2 lg:mb-3">Bancos</h3>
                    <p className="text-gray-600 mb-4 lg:mb-6 text-xs lg:text-sm flex-grow">
                      Listado de entidades bancarias autorizadas y procedimientos de transferencias
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Bancos')}
                      className="w-full bg-green-500 hover:bg-green-600 text-white transition-all duration-300 text-sm lg:text-base"
                      size="sm"
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
                <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 group cursor-pointer h-full">
                  <CardContent className="p-4 lg:p-8 text-center flex flex-col h-full">
                    <div className="bg-blue-100 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300">
                      <FileCheck className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2 lg:mb-3">Condiciones Generales</h3>
                    <p className="text-gray-600 mb-4 lg:mb-6 text-xs lg:text-sm flex-grow">
                      Términos y condiciones generales para la venta de paquetes turísticos
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Condiciones Generales')}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 text-sm lg:text-base"
                      size="sm"
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
                transition={{ delay: 0.4 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 group cursor-pointer h-full">
                  <CardContent className="p-4 lg:p-8 text-center flex flex-col h-full">
                    <div className="bg-purple-100 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300">
                      <File className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2 lg:mb-3">Contrato Modelo</h3>
                    <p className="text-gray-600 mb-4 lg:mb-6 text-xs lg:text-sm flex-grow">
                      Plantilla de contrato estándar para servicios turísticos y reservas
                    </p>
                    <Button 
                      onClick={() => handleAdminDownload('Contrato Modelo')}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white transition-all duration-300 text-sm lg:text-base"
                      size="sm"
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
        const availableDates = pkg.available_dates ? pkg.available_dates.split(',').map(date => date.trim()) : []
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
                {pkg.main_image_url ? (
                  <img 
                    src={pkg.main_image_url} 
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

                {/* Información del paquete - con altura mínima fija */}
                <div className="space-y-3 mb-6 flex-1">
                  {/* Duración */}
                  {pkg.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{pkg.duration}</span>
                    </div>
                  )}
                  
                  {/* Tamaño del grupo */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-green-500" />
                    <span>
                      {pkg.max_group_size 
                        ? `Máximo ${pkg.max_group_size} personas`
                        : 'Sin máximo de personas'
                      }
                    </span>
                  </div>

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
                          {datesToShow.map((date, idx) => (
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
                      onClick={() => onDownloadPDF(pkg.flyer_pdf_url!, `${pkg.name} - Flyer`, pkg.id, 'flyer')}
                      className={`w-full text-white transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base ${
                        pkg.transport_type === 'bus'
                          ? 'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600'
                          : 'bg-gradient-to-r from-violet-400 to-violet-500 hover:from-violet-500 hover:to-violet-600'
                      }`}
                      size="sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Descargar </span>Flyer
                    </Button>
                  )}

                  {/* Piezas Redes PDF */}
                  {pkg.piezas_redes_pdf_url && (
                    <Button
                      onClick={() => onDownloadPDF(pkg.piezas_redes_pdf_url!, `${pkg.name} - Piezas Redes`, pkg.id, 'piezas_redes')}
                      className={`w-full text-white transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base ${
                        pkg.transport_type === 'bus'
                          ? 'bg-gradient-to-r from-red-300 to-red-400 hover:from-red-400 hover:to-red-500'
                          : 'bg-gradient-to-r from-violet-300 to-violet-400 hover:from-violet-400 hover:to-violet-500'
                      }`}
                      size="sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Descargar </span>Piezas Redes
                    </Button>
                  )}

                  {/* Package Details Button */}
                  <Button
                    onClick={() => router.push(`/paquete/${pkg.id}`)}
                    variant="outline"
                    className="w-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-all duration-300 border-2 border-gray-200 hover:border-primary text-sm md:text-base"
                    size="sm"
                  >
                    <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Ver Paquete Comercial
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}