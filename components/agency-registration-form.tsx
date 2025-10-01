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
    razon_social: '',
    cuit: '',
    numero_legajo: '',
    nombre_fantasia: '',
    telefono_contacto_1: '',
    telefono_contacto_2: '',
    telefono_contacto_3: '',
    domicilio: '',
    ciudad: '',
    provincia: '',
    pais: 'Argentina',
    email_contacto_1: '',
    email_contacto_2: '',
    email_administracion: '',
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
    
    // Validar campos obligatorios
    if (!formData.razon_social || !formData.cuit || !formData.numero_legajo || 
        !formData.nombre_fantasia || !formData.telefono_contacto_1 || 
        !formData.domicilio || !formData.ciudad || !formData.provincia || 
        !formData.pais || !formData.email_contacto_1 || !formData.email_administracion || 
        !formData.password) {
      setMessage({ type: 'error', text: 'Todos los campos marcados con * son obligatorios' })
      return
    }

    // Validar formato de CUIT
    if (!/^\d{2}-\d{8}-\d{1}$/.test(formData.cuit)) {
      setMessage({ type: 'error', text: 'El CUIT debe tener el formato XX-XXXXXXXX-X' })
      return
    }

    // Validar emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email_contacto_1) || !emailRegex.test(formData.email_administracion)) {
      setMessage({ type: 'error', text: 'Por favor ingrese emails válidos' })
      return
    }

    if (formData.email_contacto_2 && !emailRegex.test(formData.email_contacto_2)) {
      setMessage({ type: 'error', text: 'El email de contacto 2 no tiene un formato válido' })
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
      console.log('Datos del formulario:', formData)
      
      // Registrar agencia en la base de datos
      const result = await agencyService.registerAgency({
        razon_social: formData.razon_social,
        cuit: formData.cuit,
        numero_legajo: formData.numero_legajo,
        nombre_fantasia: formData.nombre_fantasia,
        telefono_contacto_1: formData.telefono_contacto_1,
        telefono_contacto_2: formData.telefono_contacto_2 || null,
        telefono_contacto_3: formData.telefono_contacto_3 || null,
        domicilio: formData.domicilio,
        ciudad: formData.ciudad,
        provincia: formData.provincia,
        pais: formData.pais,
        email_contacto_1: formData.email_contacto_1,
        email_contacto_2: formData.email_contacto_2 || null,
        email_administracion: formData.email_administracion,
        password: formData.password
      })
      
      console.log('Agencia registrada:', result)

      // Enviar email de notificación al admin
      await sendAgencyNotification({
        agency_name: formData.nombre_fantasia,
        agency_email: formData.email_contacto_1,
        agency_phone: formData.telefono_contacto_1
      })

      setMessage({ 
        type: 'success', 
        text: 'Registro exitoso. Su solicitud ha sido enviada al administrador para revisión. Le notificaremos por email cuando sea aprobada.' 
      })
      
      // Limpiar formulario
      setFormData({
        razon_social: '',
        cuit: '',
        numero_legajo: '',
        nombre_fantasia: '',
        telefono_contacto_1: '',
        telefono_contacto_2: '',
        telefono_contacto_3: '',
        domicilio: '',
        ciudad: '',
        provincia: '',
        pais: 'Argentina',
        email_contacto_1: '',
        email_contacto_2: '',
        email_administracion: '',
        password: '',
        confirmPassword: ''
      })

    } catch (error: any) {
      console.error('Error en registro details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        fullError: error
      })
      setMessage({ 
        type: 'error', 
        text: error.message?.includes('duplicate') 
          ? 'Ya existe una agencia registrada con este email' 
          : `Error al procesar el registro: ${error.message || 'Error desconocido'}. Intente nuevamente.` 
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
            {/* Información Legal */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Información Legal</h3>
              
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón Social *</Label>
                <Input
                  id="razon_social"
                  name="razon_social"
                  type="text"
                  value={formData.razon_social}
                  onChange={handleInputChange}
                  placeholder="Ej: Viajes del Sur S.A."
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT *</Label>
                  <Input
                    id="cuit"
                    name="cuit"
                    type="text"
                    value={formData.cuit}
                    onChange={handleInputChange}
                    placeholder="XX-XXXXXXXX-X"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_legajo">N° Legajo *</Label>
                  <Input
                    id="numero_legajo"
                    name="numero_legajo"
                    type="text"
                    value={formData.numero_legajo}
                    onChange={handleInputChange}
                    placeholder="123456"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_fantasia">Nombre de Fantasía *</Label>
                <Input
                  id="nombre_fantasia"
                  name="nombre_fantasia"
                  type="text"
                  value={formData.nombre_fantasia}
                  onChange={handleInputChange}
                  placeholder="Ej: Viajes del Sur"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Información de Contacto</h3>
              
              <div className="space-y-2">
                <Label htmlFor="telefono_contacto_1">Teléfono Principal *</Label>
                <Input
                  id="telefono_contacto_1"
                  name="telefono_contacto_1"
                  type="tel"
                  value={formData.telefono_contacto_1}
                  onChange={handleInputChange}
                  placeholder="+54 9 11 1234-5678"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono_contacto_2">Teléfono 2</Label>
                  <Input
                    id="telefono_contacto_2"
                    name="telefono_contacto_2"
                    type="tel"
                    value={formData.telefono_contacto_2}
                    onChange={handleInputChange}
                    placeholder="+54 9 11 1234-5678"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono_contacto_3">Teléfono 3</Label>
                  <Input
                    id="telefono_contacto_3"
                    name="telefono_contacto_3"
                    type="tel"
                    value={formData.telefono_contacto_3}
                    onChange={handleInputChange}
                    placeholder="+54 9 11 1234-5678"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Información de Domicilio */}
            <div className="space-y-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Domicilio</h3>
              
              <div className="space-y-2">
                <Label htmlFor="domicilio">Dirección *</Label>
                <Input
                  id="domicilio"
                  name="domicilio"
                  type="text"
                  value={formData.domicilio}
                  onChange={handleInputChange}
                  placeholder="Ej: Av. Corrientes 1234"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad *</Label>
                  <Input
                    id="ciudad"
                    name="ciudad"
                    type="text"
                    value={formData.ciudad}
                    onChange={handleInputChange}
                    placeholder="Ej: Buenos Aires"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provincia">Provincia *</Label>
                  <Input
                    id="provincia"
                    name="provincia"
                    type="text"
                    value={formData.provincia}
                    onChange={handleInputChange}
                    placeholder="Ej: Buenos Aires"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pais">País *</Label>
                <Input
                  id="pais"
                  name="pais"
                  type="text"
                  value={formData.pais}
                  onChange={handleInputChange}
                  placeholder="Argentina"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Información de Email */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Correos Electrónicos</h3>
              
              <div className="space-y-2">
                <Label htmlFor="email_contacto_1">Email Principal *</Label>
                <Input
                  id="email_contacto_1"
                  name="email_contacto_1"
                  type="email"
                  value={formData.email_contacto_1}
                  onChange={handleInputChange}
                  placeholder="contacto@agencia.com"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_contacto_2">Email Secundario</Label>
                <Input
                  id="email_contacto_2"
                  name="email_contacto_2"
                  type="email"
                  value={formData.email_contacto_2}
                  onChange={handleInputChange}
                  placeholder="ventas@agencia.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_administracion">Email Administración *</Label>
                <Input
                  id="email_administracion"
                  name="email_administracion"
                  type="email"
                  value={formData.email_administracion}
                  onChange={handleInputChange}
                  placeholder="admin@agencia.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Credenciales de Acceso</h3>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
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
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
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