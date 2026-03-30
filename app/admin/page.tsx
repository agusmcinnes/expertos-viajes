"use client"

import { useState, useEffect } from "react"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminDashboardSimple } from "@/components/admin/admin-dashboard-simple"
import { isAdminAuthenticated } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const isAuth = await isAdminAuthenticated()
      setIsAuthenticated(isAuth)
      setIsLoading(false)
    }
    checkSession()
  }, [])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Verificando sesión...</p>
    </div>
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  return <AdminDashboardSimple />
}
