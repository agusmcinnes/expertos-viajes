"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { agencyService } from '@/lib/supabase'
import { sendAgencyNotification } from '@/lib/emailjs'

export default function AgencyRegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
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
    
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' })
      return
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Registrar agencia en la base de datos
      await agencyService.registerAgency({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      })

      // Enviar email de notificación al admin
      await sendAgencyNotification({
        agency_name: formData.name,
        agency_email: formData.email,
        agency_phone: formData.phone
      })

      setMessage({ 
        type: 'success', 
        text: 'Registro exitoso. Su solicitud ha sido enviada al administrador para revisión. Le notificaremos por email cuando sea aprobada.' 
      })
      
      // Limpiar formulario
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' })

    } catch (error: any) {
      console.error('Error en registro:', error)
      setMessage({ 
        type: 'error', 
        text: error.message?.includes('duplicate') 
          ? 'Ya existe una agencia registrada con este email' 
          : 'Error al procesar el registro. Intente nuevamente.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Registro de Agencia</CardTitle>
          <CardDescription className="text-center">
            Complete el formulario para solicitar acceso al módulo para agencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Agencia</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Viajes del Sur S.A."
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+54 9 11 1234-5678"
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
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repetir contraseña"
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
              {loading ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>¿Ya tienes una cuenta aprobada?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/agencias/login')}
                  className="text-blue-600 hover:underline"
                >
                  Iniciar sesión
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}