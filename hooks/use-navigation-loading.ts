"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function useNavigationLoading() {
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const router = useRouter()

  const setLoading = (path: string) => {
    setLoadingPath(path)
    
    // Reset loading state after navigation completes
    setTimeout(() => {
      setLoadingPath(null)
    }, 1000)
  }

  const navigateWithLoading = (path: string) => {
    setLoading(path)
    router.push(path)
  }

  const isLoading = (path: string) => loadingPath === path

  return {
    setLoading,
    navigateWithLoading,
    isLoading,
    loadingPath
  }
}
