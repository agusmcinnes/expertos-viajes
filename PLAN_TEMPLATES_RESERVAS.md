# 📋 Plan: Configurar Templates de Reservas en EmailJS

## ✅ Ya tienes configurado:
- [x] Cuenta de EmailJS
- [x] Servicio de email (Gmail/Outlook)
- [x] Variables básicas:
  - `NEXT_PUBLIC_EMAILJS_USER_ID`
  - `NEXT_PUBLIC_EMAILJS_SERVICE_ID`

---

## 🎯 Lo que necesitas hacer:

### Paso 1: Crear Template para Admin (Notificación de Reserva)
**Tiempo estimado: 5 minutos**

1. Ve a EmailJS → **"Email Templates"**
2. Click en **"Create New Template"**
3. Nombre: `Admin - Nueva Reserva`

#### Configuración del Template:

**Subject:**
```
Nueva Reserva #{{reservation_id}} - {{package_name}}
```

**Body (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9fafb; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 26px;">🎉 Nueva Reserva Recibida</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Reserva #{{reservation_id}}</p>
  </div>

  <div style="background: white; padding: 25px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- INFORMACIÓN DEL PAQUETE -->
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
      <h3 style="color: #0369a1; margin: 0 0 15px 0;">📦 Información del Paquete</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0;"><strong>Paquete:</strong></td>
          <td style="padding: 5px 0;">{{package_name}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Alojamiento:</strong></td>
          <td style="padding: 5px 0;">{{accommodation_name}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Fecha de salida:</strong></td>
          <td style="padding: 5px 0;">{{fecha_salida}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Habitaciones:</strong></td>
          <td style="padding: 5px 0;">{{detalles_habitaciones}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Total personas:</strong></td>
          <td style="padding: 5px 0;">{{cantidad_personas}}</td>
        </tr>
      </table>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin: 0 0 15px 0;">👤 Datos del Cliente (Titular)</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0;"><strong>Nombre:</strong></td>
          <td style="padding: 5px 0;">{{cliente_nombre}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Email:</strong></td>
          <td style="padding: 5px 0;"><a href="mailto:{{cliente_email}}">{{cliente_email}}</a></td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Teléfono:</strong></td>
          <td style="padding: 5px 0;"><a href="tel:{{cliente_telefono}}">{{cliente_telefono}}</a></td>
        </tr>
      </table>
    </div>

    <!-- DETALLES DE PASAJEROS -->
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #374151; margin: 0 0 15px 0;">👥 Lista de Pasajeros</h3>
      <div style="background: white; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-wrap; overflow-x: auto;">{{detalles_pasajeros}}</div>
    </div>

    <!-- COMENTARIOS -->
    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0;">💬 Comentarios del Cliente</h3>
      <p style="color: #1e3a8a; margin: 0;">{{comentarios}}</p>
    </div>

    <!-- PRECIO A COTIZAR -->
    <div style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #dc2626;">
      <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">💰 ACCIÓN REQUERIDA</h3>
      <p style="color: #7f1d1d; margin: 0; font-size: 18px; font-weight: bold;">{{precio_info}}</p>
      <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 14px;">El agente debe cotizar y contactar al cliente</p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">Reserva gestionada desde <strong>Expertos en Viajes</strong></p>
    <p style="margin: 5px 0;">Email automático - No responder directamente</p>
    <p style="margin: 5px 0;">Contacta al cliente usando los datos proporcionados arriba</p>
  </div>

</div>
```

**Settings del Template:**
- **To Email**: Pon `{{admin_email}}` o directamente tu email de admin
- **From Name**: `Sistema de Reservas`

**Guardar y copiar Template ID:**
- Click en **"Save"**
- Copia el **Template ID** (ej: `template_abc123`)
- Guárdalo, lo usarás en el paso 3

---

### Paso 2: Crear Template para Cliente (Confirmación)
**Tiempo estimado: 5 minutos**

1. En **"Email Templates"**, click en **"Create New Template"**
2. Nombre: `Cliente - Confirmación de Reserva`

#### Configuración del Template:

**Subject:**
```
Confirmación de Reserva #{{reservation_id}} - {{package_name}}
```

**Body (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f9fafb;">

  <!-- HEADER -->
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 35px 25px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 32px;">✅ ¡Reserva Confirmada!</h1>
    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Hemos recibido tu solicitud correctamente</p>
  </div>

  <!-- CONTENT -->
  <div style="background: white; padding: 30px 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <p style="font-size: 17px; color: #374151; margin: 0 0 10px 0;">Estimado/a <strong>{{cliente_nombre}}</strong>,</p>

    <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
      ¡Gracias por confiar en <strong style="color: #059669;">Expertos en Viajes</strong>! 🎉
      <br>Tu pre-reserva ha sido registrada exitosamente.
    </p>

    <!-- DETALLES DE LA RESERVA -->
    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border: 2px solid #0284c7;">
      <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #bae6fd; padding-bottom: 10px;">
        📋 Detalles de tu Reserva
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #475569;"><strong>📦 Paquete:</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">{{package_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;"><strong>🏨 Alojamiento:</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">{{accommodation_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;"><strong>📅 Fecha de salida:</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">{{fecha_salida}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;"><strong>🛏️ Habitaciones:</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">{{detalles_habitaciones}}</td>
        </tr>
        <tr style="background: #f0f9ff;">
          <td style="padding: 12px 0; color: #0369a1;"><strong>🔢 Número de reserva:</strong></td>
          <td style="padding: 12px 0;">
            <span style="background: white; color: #0c4a6e; padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-weight: bold; font-size: 16px; border: 2px solid #0284c7;">
              #{{reservation_id}}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- INFORMACIÓN DE PRECIO -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #f59e0b;">
      <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">💰 Información de Precio</h3>
      <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6;">
        Nuestro equipo cotizará el <strong>precio de tu reserva</strong> y te lo enviará <strong style="color: #92400e;">a la brevedad</strong>.
      </p>
    </div>

    <!-- PRÓXIMOS PASOS -->
    <div style="background: #f3f4f6; padding: 25px; border-radius: 10px; margin: 25px 0;">
      <h3 style="color: #374151; margin: 0 0 18px 0; font-size: 18px;">📞 ¿Qué sigue ahora?</h3>
      <div style="color: #6b7280; font-size: 15px; line-height: 1.9;">
        <div style="display: flex; align-items: start; margin-bottom: 12px;">
          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
          <span>Nuestro equipo <strong>revisará tu solicitud</strong></span>
        </div>
        <div style="display: flex; align-items: start; margin-bottom: 12px;">
          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
          <span>Te enviaremos la <strong>cotización detallada</strong></span>
        </div>
        <div style="display: flex; align-items: start; margin-bottom: 12px;">
          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
          <span>Confirmaremos la <strong>disponibilidad exacta</strong></span>
        </div>
        <div style="display: flex; align-items: start;">
          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
          <span>Coordinaremos los <strong>detalles del pago</strong></span>
        </div>
      </div>
    </div>

    <!-- CONTACTO -->
    <div style="background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
      <p style="color: #3730a3; margin: 0; font-size: 15px;">
        💬 Si tienes alguna consulta, <strong>no dudes en contactarnos</strong>
      </p>
    </div>

    <p style="color: #6b7280; margin: 30px 0 10px 0; font-size: 15px;">Saludos cordiales,</p>
    <p style="color: #059669; margin: 0; font-size: 17px; font-weight: bold;">Equipo de Expertos en Viajes</p>

  </div>

  <!-- FOOTER -->
  <div style="background: #f3f4f6; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
    <p style="color: #9ca3af; font-size: 13px; margin: 5px 0;">
      Este es un correo automático de confirmación
    </p>
    <p style="color: #9ca3af; font-size: 13px; margin: 5px 0;">
      Para consultas, responde a este email o contáctanos por nuestros canales oficiales
    </p>
    <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">
      © 2025 Expertos en Viajes - Todos los derechos reservados
    </p>
  </div>

</div>
```

**Settings del Template:**
- **To Email**: Pon `{{to_email}}`
- **From Name**: `Expertos en Viajes`
- **Reply-To**: Tu email de soporte (ej: `info@expertosenvajes.com`)

**Guardar y copiar Template ID:**
- Click en **"Save"**
- Copia el **Template ID** (ej: `template_xyz789`)
- Guárdalo, lo usarás en el paso 3

---

### Paso 3: Agregar variables de entorno
**Tiempo estimado: 2 minutos**

1. Abre tu archivo `.env.local`
2. Agrega estas nuevas líneas (conserva las que ya tienes):

```bash
# ===================================
# EMAILJS - TEMPLATES DE RESERVAS
# ===================================

# Template para notificación de reserva al admin
NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID=template_abc123

# Template para confirmación al cliente
NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID=template_xyz789

# Email del administrador que recibirá las notificaciones
NEXT_PUBLIC_ADMIN_EMAIL=tu-email-admin@gmail.com
```

3. **Reemplaza** los valores:
   - `template_abc123` → El Template ID del paso 1 (Admin)
   - `template_xyz789` → El Template ID del paso 2 (Cliente)
   - `tu-email-admin@gmail.com` → Tu email real de admin

4. **Guarda el archivo**

5. **Reinicia el servidor**:
   ```bash
   # Detén el servidor (Ctrl+C)
   # Reinícialo
   npm run dev
   ```

---

### Paso 4: Probar que funciona
**Tiempo estimado: 3 minutos**

1. Abre tu aplicación
2. Crea una reserva de prueba con datos reales
3. Revisa la consola del navegador (F12) - deberías ver:
   ```
   ✅ Reservation notification sent successfully: OK
   ✅ Reservation confirmation sent successfully: OK
   ```

4. Revisa tu email de **admin** → Deberías recibir la notificación
5. Revisa el email del **cliente** → Debería recibir la confirmación

---

## 📊 Resumen de lo que necesitas

| Paso | Qué hacer | Tiempo |
|------|-----------|--------|
| 1 | Crear template "Admin - Nueva Reserva" | 5 min |
| 2 | Crear template "Cliente - Confirmación" | 5 min |
| 3 | Agregar 3 variables al `.env.local` | 2 min |
| 4 | Probar con una reserva real | 3 min |
| **TOTAL** | | **15 min** |

---

## ✅ Checklist

- [ ] Template "Admin - Nueva Reserva" creado
- [ ] Template ID del admin copiado
- [ ] Template "Cliente - Confirmación" creado
- [ ] Template ID del cliente copiado
- [ ] Variable `NEXT_PUBLIC_EMAILJS_RESERVATION_TEMPLATE_ID` agregada
- [ ] Variable `NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE_ID` agregada
- [ ] Variable `NEXT_PUBLIC_ADMIN_EMAIL` agregada con tu email real
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Reserva de prueba creada
- [ ] Email recibido en inbox del admin ✅
- [ ] Email recibido en inbox del cliente ✅

---

## 🆘 Si algo no funciona

### Error común: "Template ID not found"

**Solución:**
1. Ve a EmailJS → Email Templates
2. Abre cada template
3. Copia el ID EXACTO (incluye el `template_`)
4. Pégalo en `.env.local`
5. Reinicia el servidor

### No llega el email

**Solución:**
1. Revisa EmailJS → **Email Log**
2. Si dice "Sent" → Revisa SPAM
3. Si dice "Failed" → Revisa el Service ID y que el servicio esté activo

---

## 🎯 Resultado final

Cuando todo esté configurado:

1. Usuario completa reserva → ✅
2. Admin recibe email con:
   - Datos del paquete
   - Lista de pasajeros (con DNI, email, teléfono)
   - Indicación de quién tiene datos pendientes
   - Alerta de "PRECIO A COTIZAR"
3. Cliente recibe email con:
   - Confirmación de su reserva
   - Número de reserva
   - Detalles del paquete
   - Información de próximos pasos

---

**¿Necesitas ayuda?** Comparte el error específico y te ayudo a solucionarlo.
