# 📧 Guía Completa de Configuración de EmailJS

## 📋 Índice
1. [Crear cuenta en EmailJS](#1-crear-cuenta-en-emailjs)
2. [Configurar servicio de email](#2-configurar-servicio-de-email)
3. [Crear templates de email](#3-crear-templates-de-email)
4. [Obtener credenciales](#4-obtener-credenciales)
5. [Configurar variables de entorno](#5-configurar-variables-de-entorno)
6. [Probar configuración](#6-probar-configuración)
7. [Solución de problemas](#7-solución-de-problemas)

---

## 1. Crear cuenta en EmailJS

### Paso 1.1: Registrarse
1. Ve a https://www.emailjs.com/
2. Haz clic en **"Sign Up"** (arriba a la derecha)
3. Completa el formulario:
   - Email (usa un email que puedas verificar)
   - Contraseña
4. Haz clic en **"Sign Up"**
5. Revisa tu email y verifica tu cuenta

### Paso 1.2: Confirmar email
1. Abre el email de verificación
2. Haz clic en el link de confirmación
3. Inicia sesión en EmailJS

✅ **Cuenta creada correctamente**

---

## 2. Configurar servicio de email

EmailJS necesita conectarse a un proveedor de email (Gmail, Outlook, etc.).

### Paso 2.1: Agregar servicio de email

1. En el dashboard de EmailJS, ve a **"Email Services"** (menú lateral)
2. Haz clic en **"Add New Service"**
3. Selecciona tu proveedor de email:
   - **Gmail** (recomendado)
   - Outlook
   - Yahoo
   - Otros

### Paso 2.2: Configurar Gmail (Recomendado)

**IMPORTANTE**: Necesitas una cuenta de Gmail con "Contraseñas de aplicación" habilitadas.

#### Opción A: Usar OAuth (Más fácil)
1. Selecciona **"Gmail"**
2. Haz clic en **"Connect Account"**
3. Sigue las instrucciones para autorizar EmailJS
4. Dale un nombre al servicio: `"Expertos en Viajes"`
5. Haz clic en **"Create Service"**

#### Opción B: Usar SMTP (Más control)
1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Ve a **Seguridad** → **Verificación en 2 pasos** (debes habilitarla)
3. Ve a **Seguridad** → **Contraseñas de aplicaciones**
4. Genera una nueva contraseña de aplicación:
   - Aplicación: **Correo**
   - Dispositivo: **Otro (nombre personalizado)** → Escribe "EmailJS"
   - Copia la contraseña de 16 caracteres generada
5. Vuelve a EmailJS
6. Selecciona **"Gmail"** → **"SMTP"**
7. Completa:
   - **Service ID**: Se genera automáticamente (guárdalo)
   - **Service Name**: "Expertos en Viajes Gmail"
   - **User ID**: Tu email de Gmail
   - **Password**: Pega la contraseña de aplicación de 16 caracteres
8. Haz clic en **"Create Service"**

### Paso 2.3: Guardar Service ID

Después de crear el servicio, verás un **Service ID** (algo como `service_abc123`).

⚠️ **IMPORTANTE**: Copia este ID, lo necesitarás para las variables de entorno.

✅ **Servicio de email configurado**

---

## 3. Crear templates de email

Tu aplicación necesita **3 templates** diferentes.

### 📨 Template 1: Notificación de Reserva al Admin

Este email se envía al administrador cuando hay una nueva reserva.

#### Paso 3.1: Crear template
1. Ve a **"Email Templates"** en el menú lateral
2. Haz clic en **"Create New Template"**
3. Dale un nombre: **"Admin - Nueva Reserva"**

#### Paso 3.2: Configurar template
En el editor del template:

**Subject (Asunto):**
```
{{subject}}
```

**Body (Cuerpo):**
```html
<h2>🎉 Nueva Reserva Recibida</h2>

<div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #0369a1; margin-top: 0;">Información del Paquete</h3>
  <p><strong>📦 Paquete:</strong> {{package_name}}</p>
  <p><strong>🏨 Alojamiento:</strong> {{accommodation_name}}</p>
  <p><strong>📅 Fecha de salida:</strong> {{fecha_salida}}</p>
  <p><strong>🛏️ Habitaciones:</strong> {{detalles_habitaciones}}</p>
  <p><strong>🔢 Número de Reserva:</strong> #{{reservation_id}}</p>
</div>

<div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #92400e; margin-top: 0;">Datos del Cliente</h3>
  <p><strong>👤 Nombre:</strong> {{cliente_nombre}}</p>
  <p><strong>📧 Email:</strong> {{cliente_email}}</p>
  <p><strong>📱 Teléfono:</strong> {{cliente_telefono}}</p>
  <p><strong>👥 Cantidad de personas:</strong> {{cantidad_personas}}</p>
</div>

<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">👥 Detalles de Pasajeros</h3>
  <pre style="white-space: pre-wrap; font-family: monospace; background: white; padding: 10px; border-radius: 4px;">{{detalles_pasajeros}}</pre>
</div>

<div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #1e40af; margin-top: 0;">💬 Comentarios</h3>
  <p>{{comentarios}}</p>
</div>

<div style="background-color: #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <h3 style="color: #991b1b; margin-top: 0;">💰 IMPORTANTE</h3>
  <p style="font-size: 18px; font-weight: bold;">{{precio_info}}</p>
  <p style="color: #7f1d1d;">El agente debe cotizar el precio y contactar al cliente</p>
</div>

<hr style="margin: 30px 0; border: none; border-top: 2px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px; text-align: center;">
  Reserva gestionada desde Expertos en Viajes<br>
  Email automático - No responder
</p>
```

#### Paso 3.3: Configurar destinatario
En **"Settings"** del template:
- **To Email**: Pon el email del admin (ej: `admin@expertosenvajes.com`)
- O deja el campo vacío y usa la variable `{{admin_email}}`

#### Paso 3.4: Guardar Template ID
1. Haz clic en **"Save"**
2. Copia el **Template ID** (algo como `template_xyz789`)
3. Guárdalo como `NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID`

---

### 📧 Template 2: Confirmación al Cliente

Este email se envía al cliente confirmando su pre-reserva.

#### Paso 3.5: Crear segundo template
1. Ve a **"Email Templates"**
2. Haz clic en **"Create New Template"**
3. Nombre: **"Cliente - Confirmación de Reserva"**

#### Paso 3.6: Configurar template

**Subject:**
```
{{subject}}
```

**Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">✅ ¡Reserva Confirmada!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Hemos recibido tu solicitud</p>
  </div>

  <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

    <p style="font-size: 16px; color: #374151;">Estimado/a <strong>{{cliente_nombre}}</strong>,</p>

    <p style="color: #6b7280;">¡Gracias por confiar en <strong>Expertos en Viajes</strong>! 🎉</p>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0284c7;">
      <h3 style="color: #0369a1; margin-top: 0;">📋 Detalles de tu Pre-Reserva</h3>
      <p style="margin: 8px 0;"><strong>📦 Paquete:</strong> {{package_name}}</p>
      <p style="margin: 8px 0;"><strong>🏨 Alojamiento:</strong> {{accommodation_name}}</p>
      <p style="margin: 8px 0;"><strong>📅 Fecha de salida:</strong> {{fecha_salida}}</p>
      <p style="margin: 8px 0;"><strong>🛏️ Habitaciones:</strong> {{detalles_habitaciones}}</p>
      <p style="margin: 8px 0;"><strong>🔢 Número de reserva:</strong> <span style="background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">#{{reservation_id}}</span></p>
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin-top: 0;">💰 Información de Precio</h3>
      <p style="color: #78350f; margin: 0;">Nuestro equipo cotizará el precio de tu reserva y te lo enviará <strong>a la brevedad</strong>.</p>
    </div>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #374151; margin-top: 0;">📞 Próximos pasos</h3>
      <ul style="color: #6b7280; line-height: 1.8;">
        <li>✓ Nuestro equipo revisará tu solicitud</li>
        <li>✓ Te enviaremos la cotización detallada</li>
        <li>✓ Confirmaremos la disponibilidad</li>
        <li>✓ Coordinaremos los detalles del pago</li>
      </ul>
    </div>

    <p style="color: #6b7280; margin-top: 30px;">Si tienes alguna consulta, no dudes en contactarnos.</p>

    <p style="color: #374151; margin-top: 25px;">
      Saludos cordiales,<br>
      <strong>Equipo de Expertos en Viajes</strong>
    </p>

  </div>

  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 30px;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Este es un correo automático, por favor no responder.<br>
      Para consultas, contáctanos a través de nuestros canales oficiales.
    </p>
  </div>

</div>
```

#### Paso 3.7: Configurar destinatario
En **"Settings"**:
- **To Email**: Usa la variable `{{to_email}}` (se enviará al email del cliente)
- **Reply-To**: Pon tu email de soporte (ej: `info@expertosenvajes.com`)

#### Paso 3.8: Guardar Template ID
1. Haz clic en **"Save"**
2. Copia el **Template ID**
3. Guárdalo como `NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID`

---

### 🏢 Template 3: Notificación de Agencia (OPCIONAL)

Este email se envía cuando una agencia se registra.

#### Paso 3.9: Crear tercer template
1. Ve a **"Email Templates"**
2. Haz clic en **"Create New Template"**
3. Nombre: **"Admin - Nueva Agencia"**

**Subject:**
```
{{subject}}
```

**Body:**
```html
<h2>🏢 Nueva Solicitud de Agencia</h2>

<div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #166534;">Datos de la Agencia</h3>
  <p><strong>🏢 Nombre:</strong> {{agency_name}}</p>
  <p><strong>📧 Email:</strong> {{agency_email}}</p>
  <p><strong>📱 Teléfono:</strong> {{agency_phone}}</p>
</div>

<p style="background-color: #fef3c7; padding: 15px; border-radius: 8px;">
  ⚠️ <strong>Acción requerida:</strong> Revisa la solicitud y aprueba o rechaza la agencia desde el panel de administración.
</p>
```

#### Paso 3.10: Guardar Template ID
1. Haz clic en **"Save"**
2. Copia el **Template ID**
3. Guárdalo como `NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID`

✅ **Todos los templates creados**

---

## 4. Obtener credenciales

Necesitas 4 valores para configurar EmailJS:

### Paso 4.1: Obtener Public Key (User ID)
1. En EmailJS, ve a **"Account"** (ícono de usuario arriba a la derecha)
2. Ve a la pestaña **"General"**
3. Busca **"Public Key"** (o "User ID")
4. Copia el valor (algo como `xPqR7sT8uVwXyZ12`)
5. Este es tu `NEXT_PUBLIC_EMAILJS_USER_ID`

### Paso 4.2: Resumen de IDs necesarios

Deberías tener ahora:

| Variable | Dónde encontrarla | Ejemplo |
|----------|-------------------|---------|
| `NEXT_PUBLIC_EMAILJS_USER_ID` | Account → General → Public Key | `xPqR7sT8uVwXyZ12` |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | Email Services → Tu servicio | `service_abc123` |
| `NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID` | Email Templates → Template Admin | `template_xyz789` |
| `NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID` | Email Templates → Template Cliente | `template_def456` |
| `NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID` | Email Templates → Template Agencia | `template_ghi789` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Tu email de admin | `admin@expertosenvajes.com` |

---

## 5. Configurar variables de entorno

### Paso 5.1: Crear archivo .env.local

1. En la raíz de tu proyecto, crea un archivo llamado `.env.local`
2. Si ya existe, ábrelo

### Paso 5.2: Agregar las variables

Pega esto en el archivo `.env.local`:

```bash
# ===================================
# EMAILJS CONFIGURATION
# ===================================

# Public Key (User ID) de EmailJS
NEXT_PUBLIC_EMAILJS_USER_ID=xPqR7sT8uVwXyZ12

# Service ID (Gmail, Outlook, etc.)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123

# Template para notificación de reserva al admin
NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID=template_xyz789

# Template para confirmación al cliente
NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID=template_def456

# Template para notificación de nueva agencia
NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID=template_ghi789

# Email del administrador
NEXT_PUBLIC_ADMIN_EMAIL=admin@expertosenvajes.com
```

### Paso 5.3: Reemplazar valores

⚠️ **IMPORTANTE**: Reemplaza todos los valores de ejemplo con tus IDs reales de EmailJS.

### Paso 5.4: Guardar y reiniciar servidor

1. Guarda el archivo `.env.local`
2. **Detén tu servidor de desarrollo** (Ctrl+C)
3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

✅ **Variables de entorno configuradas**

---

## 6. Probar configuración

### Paso 6.1: Verificar en consola del navegador

1. Abre tu aplicación en el navegador
2. Abre la consola (F12)
3. Intenta crear una reserva de prueba
4. Busca en la consola mensajes como:
   ```
   ✅ Email sent successfully: OK
   ```

### Paso 6.2: Verificar en EmailJS Dashboard

1. Ve a EmailJS → **"Email Log"**
2. Deberías ver los emails enviados
3. Verifica que el estado sea **"Sent"** ✅

### Paso 6.3: Verificar emails recibidos

1. Revisa el inbox del **admin** (debería recibir notificación de reserva)
2. Revisa el inbox del **cliente** (debería recibir confirmación)

✅ **Configuración funcionando correctamente**

---

## 7. Solución de problemas

### ❌ Error: "Public key required"

**Causa**: No se está inicializando EmailJS correctamente.

**Solución**:
1. Verifica que `NEXT_PUBLIC_EMAILJS_USER_ID` esté en `.env.local`
2. Reinicia el servidor de desarrollo
3. Verifica que la variable tenga el prefijo `NEXT_PUBLIC_`

---

### ❌ Error: "Service ID not found"

**Causa**: El Service ID es incorrecto.

**Solución**:
1. Ve a EmailJS → **"Email Services"**
2. Copia el Service ID correcto
3. Actualiza `NEXT_PUBLIC_EMAILJS_SERVICE_ID` en `.env.local`
4. Reinicia el servidor

---

### ❌ Error: "Template ID not found"

**Causa**: El Template ID es incorrecto.

**Solución**:
1. Ve a EmailJS → **"Email Templates"**
2. Abre cada template y copia su ID correcto
3. Actualiza las variables en `.env.local`:
   - `NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID`
   - `NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID`
4. Reinicia el servidor

---

### ❌ Error: "Failed to send email (401)"

**Causa**: Credenciales incorrectas o cuenta no verificada.

**Solución**:
1. Verifica que tu email en EmailJS esté confirmado
2. Verifica que el Public Key sea correcto
3. Prueba regenerar el Public Key en EmailJS → Account

---

### ❌ No llegan los emails

**Causa**: Posibles problemas con el servicio de email o spam.

**Solución**:
1. Revisa el **Email Log** en EmailJS Dashboard
2. Si el estado es "Sent" pero no recibes el email:
   - ✅ Revisa tu carpeta de **SPAM**
   - ✅ Revisa la **bandeja de correo no deseado**
   - ✅ Agrega `noreply@emailjs.com` a tus contactos
3. Si el estado es "Failed":
   - Verifica la configuración del servicio de email
   - Prueba volver a conectar tu cuenta de Gmail

---

### ❌ Error: "Template parameters missing"

**Causa**: Faltan variables en el template o se envían con nombre incorrecto.

**Solución**:
1. Revisa que el template tenga todas las variables necesarias
2. Compara los nombres de variables en el código con los del template
3. Asegúrate de usar `{{variable_name}}` en el template

**Variables requeridas por template:**

**Template Admin (Reserva):**
- `package_name`
- `accommodation_name`
- `fecha_salida`
- `cliente_nombre`
- `cliente_email`
- `cliente_telefono`
- `cantidad_personas`
- `detalles_habitaciones`
- `detalles_pasajeros`
- `comentarios`
- `reservation_id`
- `subject`
- `precio_info`

**Template Cliente (Confirmación):**
- `package_name`
- `accommodation_name`
- `fecha_salida`
- `cliente_nombre`
- `detalles_habitaciones`
- `reservation_id`
- `to_email`
- `subject`

---

### 🔍 Debug: Ver qué se está enviando

Para ver exactamente qué datos se están enviando a EmailJS, agrega esto temporalmente en `lib/emailjs.ts`:

```typescript
// En sendReservationNotification, antes de emailjs.send:
console.log('📧 Enviando email con estos datos:', {
  package_name: data.packageName,
  accommodation_name: data.accommodation,
  // ... resto de campos
})
```

Esto te ayudará a identificar si faltan datos o si los nombres no coinciden.

---

## 📊 Límites del plan gratuito de EmailJS

EmailJS tiene un **plan gratuito** con límites:

| Característica | Plan Gratuito |
|----------------|---------------|
| Emails por mes | 200 emails |
| Templates | Ilimitados |
| Servicios | 2 servicios |
| Soporte | Community |

Si necesitas más emails, considera actualizar a un plan pago.

---

## ✅ Checklist final

Antes de dar por terminada la configuración, verifica:

- [ ] Cuenta de EmailJS creada y verificada
- [ ] Servicio de email conectado (Gmail/Outlook)
- [ ] 3 templates creados (Admin, Cliente, Agencia)
- [ ] Todas las variables en `.env.local` configuradas
- [ ] Servidor de desarrollo reiniciado
- [ ] Email de prueba enviado correctamente
- [ ] Email recibido en inbox del admin
- [ ] Email recibido en inbox del cliente
- [ ] Logs en consola del navegador sin errores

---

## 📞 Soporte adicional

Si después de seguir todos los pasos aún tienes problemas:

1. **Revisa la consola del navegador** (F12) para ver errores específicos
2. **Revisa el Email Log de EmailJS** para ver el estado de los envíos
3. **Comparte el error exacto** que aparece en consola
4. **Verifica que TODAS las variables** empiecen con `NEXT_PUBLIC_`

---

## 🎉 ¡Configuración completa!

Si llegaste hasta aquí y todos los checks están en verde, tu sistema de emails debería estar funcionando perfectamente.

Los usuarios ahora recibirán:
- ✅ Confirmación de su reserva inmediatamente
- ✅ El admin recibirá notificación de cada nueva reserva
- ✅ Todo quedará registrado en EmailJS para auditoría

**¡Felicitaciones!** 🚀
