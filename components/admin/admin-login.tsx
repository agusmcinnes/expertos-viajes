"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, User, Plane } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdminLoginProps {
  onLogin: () => void
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const { toast } = useToast()
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("🔐 Intentando autenticación con:", credentials.username)
      
      // Usar email en lugar de username para Supabase Auth
      const email = credentials.username.includes('@') 
        ? credentials.username 
        : `${credentials.username}@expertos-viajes.com`
      
      const { authenticateAdmin } = await import('@/lib/supabase-admin')
      await authenticateAdmin(email, credentials.password)
      
      console.log("✅ Autenticación exitosa")
      onLogin()
    } catch (error: any) {
      console.error("❌ Error de autenticación:", error)
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas. Verifica tu usuario y contraseña.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary to-secondary-400 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/90 border-0 shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center mx-auto mb-4">
            <Plane className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl text-primary-950">Panel de Administración</CardTitle>
          <p className="text-primary-600 font-medium">Expertos en Turismo</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-2">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-400" />
                <Input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                  className="pl-10 border-primary-200 focus:border-primary-500 focus:ring-primary-500/20"
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-900 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-400" />
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                  className="pl-10 border-primary-200 focus:border-primary-500 focus:ring-primary-500/20"
                  placeholder="Contraseña"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-300 h-12 text-base font-semibold" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
