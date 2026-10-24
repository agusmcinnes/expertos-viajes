"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, RotateCcw, Upload } from "lucide-react"
import { agencyDocumentService, AGENCY_DOCUMENTS } from "@/lib/supabase"
import type { AgencyDocumentKey } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Reemplazo de los documentos del Centro de Administración del portal de agencias
export function AgencyFilesManager() {
  const { toast } = useToast()
  const [customPaths, setCustomPaths] = useState<Partial<Record<AgencyDocumentKey, string>>>({})
  const [busyKey, setBusyKey] = useState<AgencyDocumentKey | null>(null)
  const inputRefs = useRef<Partial<Record<AgencyDocumentKey, HTMLInputElement | null>>>({})

  useEffect(() => {
    agencyDocumentService.getCustomPaths()
      .then(setCustomPaths)
      .catch((error) => console.error("Error loading agency documents:", error))
  }, [])

  const handleUpload = async (key: AgencyDocumentKey, file: File | undefined) => {
    if (!file) return
    try {
      setBusyKey(key)
      const result = await agencyDocumentService.upload(key, file, customPaths[key])
      if (!result.success || !result.url) throw new Error(result.error)
      setCustomPaths(prev => ({ ...prev, [key]: result.url }))
      toast({ title: "Archivo actualizado", description: "Las agencias ya ven el nuevo archivo." })
    } catch (error: any) {
      toast({
        title: "Error al subir",
        description: error?.message || "No se pudo subir el archivo.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
      const input = inputRefs.current[key]
      if (input) input.value = ""
    }
  }

  const handleView = async (key: AgencyDocumentKey) => {
    const url = await agencyDocumentService.getDownloadUrl(key, customPaths[key])
    if (url) window.open(url, "_blank")
  }

  const handleReset = async (key: AgencyDocumentKey) => {
    try {
      setBusyKey(key)
      await agencyDocumentService.reset(key, customPaths[key])
      setCustomPaths(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      toast({ title: "Archivo restaurado", description: "Se vuelve a usar el archivo original." })
    } catch (error: any) {
      toast({
        title: "Error al restaurar",
        description: error?.message || "No se pudo restaurar el archivo.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-heading text-primary-900">Archivos del Portal de Agencias</CardTitle>
        <p className="text-sm text-primary-600">
          Documentos que las agencias descargan desde el Centro de Administración. Subí un archivo para reemplazar el actual.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {AGENCY_DOCUMENTS.map((doc) => {
          const customPath = customPaths[doc.key]
          const isBusy = busyKey === doc.key
          return (
            <div
              key={doc.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-primary-100 rounded-xl p-4 bg-white"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary-900">{doc.title}</span>
                <Badge variant={customPath ? "default" : "secondary"}>
                  {customPath ? "Personalizado" : "Original"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleView(doc.key)}>
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <input
                  ref={(el) => { inputRefs.current[doc.key] = el }}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleUpload(doc.key, e.target.files?.[0])}
                />
                <Button
                  size="sm"
                  onClick={() => inputRefs.current[doc.key]?.click()}
                  disabled={isBusy}
                  className="bg-primary hover:bg-primary-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {isBusy ? "Procesando..." : "Reemplazar"}
                </Button>
                {customPath && (
                  <Button size="sm" variant="outline" onClick={() => handleReset(doc.key)} disabled={isBusy}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restaurar original
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
