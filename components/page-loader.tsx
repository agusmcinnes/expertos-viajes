"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Suspense } from "react"

function PageLoaderInner() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300) // Simular un poco de carga

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-secondary/40 mx-auto"></div>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 font-medium"
            >
              Cargando...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PageLoader() {
  return (
    <Suspense fallback={null}>
      <PageLoaderInner />
    </Suspense>
  )
}
