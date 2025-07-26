"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Solo hacer scroll to top si no hay hash en la URL
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [pathname])

  return null
}
