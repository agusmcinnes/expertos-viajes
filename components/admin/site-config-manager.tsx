"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Settings, RefreshCw } from "lucide-react"
import { siteConfigService } from "@/lib/supabase"
import type { SiteConfig } from "@/lib/supabase"
import { motion } from "framer-motion"

export function SiteConfigManager() {
  const [configs, setConfigs] = useState<SiteConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingConfig, setEditingConfig] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await siteConfigService.getAllConfigs()
      setConfigs(data)
    } catch (error: any) {
      console.error("Error loading configs:", error)
      setError(`Error cargando configuraciones: ${error.message}`)
      if (error.message.includes('site_config')) {
        setError("La tabla 'site_config' no existe. Ejecuta el script SQL de configuración.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (config: SiteConfig) => {
    setEditingConfig(config.config_key)
    setTempValue(config.config_value)
  }

  const cancelEditing = () => {
    setEditingConfig(null)
    setTempValue("")
  }

  const saveConfig = async (key: string) => {
    try {
      setIsSaving(true)
      await siteConfigService.updateConfig(key, tempValue)
      
      // Actualizar el estado local
      setConfigs(prev => 
        prev.map(config => 
          config.config_key === key 
            ? { ...config, config_value: tempValue, updated_at: new Date().toISOString() }
            : config
        )
      )
      
      setEditingConfig(null)
      setTempValue("")
    } catch (error) {
      console.error("Error saving config:", error)
      alert("Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  const getConfigDisplayName = (key: string) => {
    const displayNames: Record<string, string> = {
      'special_section_title': 'Título de Sección Especial'
    }
    return displayNames[key] || key
  }

  const getConfigDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      'special_section_title': 'El título que aparece en la sección especial de la página principal'
    }
    return descriptions[key] || 'Configuración del sitio'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuración del Sitio</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuración del Sitio</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfigs}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="text-red-800 font-medium mb-2">Error de Base de Datos</h4>
            <p className="text-red-700 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              💡 Ve a la pestaña "Test BD" para más detalles sobre cómo solucionarlo.
            </p>
          </div>
        )}
        <div className="space-y-6">
          {configs.map((config, index) => (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">
                    {getConfigDisplayName(config.config_key)}
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {getConfigDescription(config.config_key)}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  Actualizado: {new Date(config.updated_at).toLocaleDateString()}
                </div>
              </div>

              {editingConfig === config.config_key ? (
                <div className="space-y-3">
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="Ingresa el nuevo valor..."
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveConfig(config.config_key)}
                      disabled={isSaving || !tempValue.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded border text-gray-900 font-medium">
                    {config.config_value}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(config)}
                  >
                    Editar
                  </Button>
                </div>
              )}
            </motion.div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay configuraciones disponibles</p>
              <p className="text-sm">Ejecuta el script de configuración para comenzar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
