"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Settings, RefreshCw } from "lucide-react"
import { siteConfigService } from "@/lib/supabase"
import type { SiteConfig } from "@/lib/supabase"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

// Claves que el admin siempre puede editar aunque todavía no existan en site_config
const EDITABLE_KEYS = ['special_section_title', 'legal_terms_button_text', 'legal_terms_content']
const MULTILINE_KEYS = ['legal_terms_content']
// Claves que se administran desde otras pantallas
const HIDDEN_KEY_PREFIXES = ['agency_file_']

export function SiteConfigManager() {
  const { toast } = useToast()
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
      const data: SiteConfig[] = await siteConfigService.getAllConfigs()
      const visible = data.filter(c => !HIDDEN_KEY_PREFIXES.some(prefix => c.config_key.startsWith(prefix)))
      const missing = EDITABLE_KEYS
        .filter(key => !visible.some(c => c.config_key === key))
        .map((key, i) => ({
          id: -(i + 1),
          config_key: key,
          config_value: '',
          description: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      setConfigs([...visible, ...missing])
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
      await siteConfigService.setConfig(key, tempValue, getConfigDescription(key))
      
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
      toast({
        title: "Configuración guardada",
        description: "Los cambios se guardaron exitosamente.",
      })
    } catch (error) {
      console.error("Error saving config:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getConfigDisplayName = (key: string) => {
    const displayNames: Record<string, string> = {
      'special_section_title': 'Título de Sección Especial',
      'legal_terms_button_text': 'Términos Legales: texto del botón',
      'legal_terms_content': 'Términos Legales: contenido'
    }
    return displayNames[key] || key
  }

  const getConfigDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      'special_section_title': 'El título que aparece en la sección especial de la página principal',
      'legal_terms_button_text': 'El texto del botón del pie de página que abre los términos legales',
      'legal_terms_content': 'El texto completo que se muestra en la ventana de términos legales. Si está vacío, el botón no aparece.'
    }
    return descriptions[key] || 'Configuración del sitio'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading text-primary-900">
            <Settings className="w-5 h-5 text-primary-600" />
            <span>Configuración del Sitio</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-primary-100 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-primary-100 rounded"></div>
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
          <CardTitle className="flex items-center space-x-2 font-heading text-primary-900">
            <Settings className="w-5 h-5 text-primary-600" />
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
              className="border border-primary-100 rounded-xl p-5 space-y-3 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-primary-900">
                    {getConfigDisplayName(config.config_key)}
                  </Label>
                  <p className="text-xs text-primary-400 mt-1">
                    {getConfigDescription(config.config_key)}
                  </p>
                </div>
                <div className="text-xs text-primary-300">
                  {config.id > 0 && <>Actualizado: {new Date(config.updated_at).toLocaleDateString()}</>}
                </div>
              </div>

              {editingConfig === config.config_key ? (
                <div className="space-y-3">
                  {MULTILINE_KEYS.includes(config.config_key) ? (
                    <Textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="Ingresa el nuevo valor..."
                      className="w-full min-h-[300px]"
                    />
                  ) : (
                    <Input
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="Ingresa el nuevo valor..."
                      className="w-full"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveConfig(config.config_key)}
                      disabled={isSaving || (!tempValue.trim() && !MULTILINE_KEYS.includes(config.config_key))}
                      className="bg-primary hover:bg-primary-700 text-white"
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
                  <div className={`p-3 bg-primary-50/50 rounded-lg border border-primary-100 text-primary-900 font-medium ${MULTILINE_KEYS.includes(config.config_key) ? 'whitespace-pre-line max-h-40 overflow-y-auto text-sm font-normal' : ''}`}>
                    {config.config_value || <span className="text-primary-300 font-normal">Sin definir</span>}
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
            <div className="text-center py-8 text-primary-400">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-300" />
              <p>No hay configuraciones disponibles</p>
              <p className="text-sm">Ejecuta el script de configuración para comenzar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
