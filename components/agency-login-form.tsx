"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginAgency } from '@/lib/agency-auth'

export default function AgencyLoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'El email y contraseña son obligatorios' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      await loginAgency(formData.email, formData.password)
      
      setMessage({ type: 'success', text: 'Inicio de sesión exitoso. Redirigiendo...' })
      
      // Redirigir al módulo de agencias después de un breve delay
      setTimeout(() => {
        router.push('/agencias/modulo')
      }, 1500)

    } catch (error: any) {
      console.error('Error en login:', error)
      let errorMessage = 'Error al iniciar sesión. Intente nuevamente.'
      
      if (error.message?.includes('Credenciales incorrectas')) {
        errorMessage = 'Email o contraseña incorrectos, o la agencia no está aprobada.'
      }
      
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Acceso para Agencias</CardTitle>
          <CardDescription className="text-center">
            Ingrese el email de su agencia aprobada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de la Agencia</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contacto@agencia.com"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Su contraseña"
                disabled={loading}
                required
              />
            </div>

            {message && (
              <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>¿No tienes una cuenta aprobada?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/agencias/registro')}
                  className="text-blue-600 hover:underline"
                >
                  Solicitar registro
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Nota: Solo las agencias aprobadas por el administrador pueden acceder
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}