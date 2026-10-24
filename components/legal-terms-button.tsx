"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { siteConfigService } from "@/lib/supabase"

const DEFAULT_BUTTON_TEXT = "Términos y condiciones"

// Botón configurable desde el admin (site_config) que abre un modal con los términos legales.
// Si no hay contenido cargado no se muestra nada.
export function LegalTermsButton({ className }: { className?: string }) {
  const [buttonText, setButtonText] = useState(DEFAULT_BUTTON_TEXT)
  const [content, setContent] = useState("")

  useEffect(() => {
    Promise.allSettled([
      siteConfigService.getConfig("legal_terms_button_text"),
      siteConfigService.getConfig("legal_terms_content"),
    ]).then(([text, body]) => {
      if (text.status === "fulfilled" && text.value?.config_value?.trim()) {
        setButtonText(text.value.config_value)
      }
      if (body.status === "fulfilled" && body.value?.config_value) {
        setContent(body.value.config_value)
      }
    })
  }, [])

  if (!content.trim()) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {buttonText}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{buttonText}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
