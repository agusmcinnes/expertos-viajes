"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, ExternalLink, Package, FileText, FolderOpen } from "lucide-react"
import { agencyService } from '@/lib/supabase'
import { isAgencyAuthenticated, getCurrentAgency } from '@/lib/agency-auth'
import type { TravelPackage } from '@/lib/supabase'
import { motion } from "framer-motion"

export default function AgencyModulePage() {
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [agency, setAgency] = useState<any>(null)
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

  const handleDownloadPDF = (pdfUrl: string, packageName: string) => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${packageName.replace(/\s+/g, '_')}.pdf`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenDriveFolder = (driveUrl: string) => {
    window.open(driveUrl, '_blank')
  }

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando paquetes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Módulo para Agencias
          </h1>
          <p className="text-gray-600">
            Bienvenido/a, <span className="font-semibold text-primary">{agency?.name}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Aquí puedes descargar PDFs y acceder a recursos exclusivos de nuestros paquetes
          </p>
        </motion.div>

        {/* Packages Grid */}
        {packages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay paquetes con recursos disponibles
            </h3>
            <p className="text-gray-500">
              Los paquetes con PDFs y recursos aparecerán aquí cuando estén disponibles
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-800 line-clamp-2">
                        {pkg.name}
                      </CardTitle>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {getTransportIcon(pkg.transport_type || 'aereo')} {getTransportText(pkg.transport_type || 'aereo')}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Package Info */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {pkg.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            {pkg.price}
                          </span>
                          {pkg.duration && (
                            <span className="text-sm text-gray-500">
                              {pkg.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {/* PDF Download Button */}
                        {pkg.pdf_url && (
                          <Button
                            onClick={() => handleDownloadPDF(pkg.pdf_url!, pkg.name)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar PDF
                          </Button>
                        )}

                        {/* Drive Folder Button */}
                        {pkg.drive_folder_url && (
                          <Button
                            onClick={() => handleOpenDriveFolder(pkg.drive_folder_url!)}
                            variant="outline"
                            className="w-full border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-300"
                            size="sm"
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Ver Flyers en Drive
                          </Button>
                        )}

                        {/* Package Details Button */}
                        <Button
                          onClick={() => router.push(`/paquete/${pkg.id}`)}
                          variant="ghost"
                          className="w-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-all duration-300"
                          size="sm"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Detalles del Paquete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}