# 📧 Manual de Configuración de EmailJS para Expertos en Viajes

## 🚀 Pasos para Configurar EmailJS

### 1. Crear una Cuenta en EmailJS

1. Visita [https://www.emailjs.com/](https://www.emailjs.com/)
2. Haz clic en "Sign Up" y crea tu cuenta
3. Confirma tu email

### 2. Configurar el Servicio de Email

1. Una vez logueado, ve a **"Email Services"** en el dashboard
2. Haz clic en **"Add New Service"**
3. Selecciona tu proveedor de email:
   - **Gmail** (recomendado para pruebas)
   - **Outlook/Hotmail**
   - **Yahoo**
   - **Otro proveedor SMTP**

#### Para Gmail:

1. Selecciona "Gmail"
2. Ingresa tu email de Gmail (ej: expertosenviajes.info@gmail.com)
3. Haz clic en "Connect Account"
4. Autoriza el acceso a tu cuenta de Gmail
5. Asigna un **Service ID** (ej: `service_gmail_expertos`)

#### Para otros proveedores:

1. Selecciona "Other"
2. Configura los datos SMTP de tu proveedor
3. Asigna un **Service ID**

### 3. Crear el Template de Email

1. Ve a **"Email Templates"** en el dashboard
2. Haz clic en **"Create New Template"**
3. Usa este template como base:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Nueva Consulta - Expertos en Viajes</title>
  </head>
  <body>
    <div
      style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"
    >
      <h2
        style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;"
      >
        🌍 Nueva Consulta de Viaje
      </h2>

      <div
        style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;"
      >
        <h3 style="color: #1e40af; margin-top: 0;">Datos del Cliente:</h3>
        <p><strong>Nombre:</strong> {{from_name}}</p>
        <p><strong>Email:</strong> {{from_email}}</p>
        <p><strong>Teléfono:</strong> {{phone}}</p>
      </div>

      <div
        style="background-color: #fff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;"
      >
        <h3 style="color: #1e40af; margin-top: 0;">Mensaje:</h3>
        <p style="white-space: pre-line;">{{message}}</p>
      </div>

      <div
        style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 20px;"
      >
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          📧 Email enviado automáticamente desde el sitio web de Expertos en
          Viajes<br />
          📅 Fecha: {{current_date}}<br />
          🔗 Responder a: {{from_email}}
        </p>
      </div>
    </div>
  </body>
</html>
```

4. **Importante**: Configura el **Subject** como: `🌍 Nueva Consulta de {{from_name}} - Expertos en Viajes`
5. En **Settings**:
   - **To Email**: Tu email donde quieres recibir las consultas
   - **To Name**: Expertos en Viajes
   - **From Name**: {{from_name}}
   - **Reply To**: {{from_email}}
6. Guarda y obtén tu **Template ID**

### 4. Configurar las Variables de Entorno

1. Copia el archivo `.env.local.example` como `.env.local`:

```bash
copy .env.local.example .env.local
```

2. Edita el archivo `.env.local` con tus datos reales:

```env
# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_USER_ID=tu_user_id_real
NEXT_PUBLIC_EMAILJS_SERVICE_ID=tu_service_id_real
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=tu_template_id_real
```

### 5. Obtener los IDs Necesarios

#### User ID (Public Key):

1. Ve a **"Account"** en el dashboard de EmailJS
2. Copia tu **Public Key** (User ID)

#### Service ID:

1. Ve a **"Email Services"**
2. Busca el servicio que creaste
3. Copia el **Service ID**

#### Template ID:

1. Ve a **"Email Templates"**
2. Busca el template que creaste
3. Copia el **Template ID**

### 6. Configuración de Seguridad (Recomendado)

1. Ve a **"Account" > "Security"**
2. Activa **"Email Templates"** restriction
3. Agrega tu dominio a la lista blanca:
   - Para desarrollo: `http://localhost:3000`
   - Para producción: `https://tu-dominio.com`

### 7. Probar la Configuración

1. Reinicia tu servidor de desarrollo:

```bash
npm run dev
```

2. Ve a la página de contacto
3. Completa y envía el formulario
4. Verifica que:
   - El formulario muestre "¡Consulta enviada!"
   - Recibas el email en tu bandeja de entrada
   - No haya errores en la consola del navegador

### 8. Configuración Avanzada (Opcional)

#### Límites de Emails:

- Plan gratuito: 200 emails/mes
- Para más emails, considera actualizar tu plan

#### Auto-respuesta al Cliente:

1. Crea un segundo template para respuesta automática
2. Modifica el código para enviar dos emails:
   - Uno a ti con la consulta
   - Uno al cliente confirmando que recibiste su mensaje

#### Filtros Anti-Spam:

1. En tu template, agrega validaciones
2. Considera usar reCAPTCHA si recibes spam

## 🔧 Solución de Problemas Comunes

### Error: "EmailJS is not initialized"

- Verifica que las variables de entorno estén configuradas
- Reinicia el servidor después de cambiar `.env.local`

### No recibo emails:

- Revisa tu carpeta de spam
- Verifica que el Service esté configurado correctamente
- Comprueba que el email en "To Email" sea correcto

### Error 403 (Forbidden):

- Verifica que tu dominio esté en la lista blanca
- Revisa que el Service ID y Template ID sean correctos

### Emails se envían pero están mal formateados:

- Revisa las variables en el template ({{from_name}}, {{message}}, etc.)
- Verifica que los nombres de las variables coincidan

## 📞 Email de Prueba Recomendado

Crea un email específico para las consultas:

- `consultas@expertosenviajes.com`
- `info@expertosenviajes.com`
- O usa un Gmail dedicado: `expertosenviajes.consultas@gmail.com`

## 🎯 Próximos Pasos

1. **Configurar auto-respuestas**: Para confirmar al cliente que recibiste su consulta
2. **Integrar con CRM**: Para gestionar mejor las consultas
3. **Analytics**: Para monitorear las conversiones del formulario
4. **A/B Testing**: Para optimizar la tasa de conversión

¡Con esta configuración tendrás un sistema de formulario de contacto completamente funcional!
