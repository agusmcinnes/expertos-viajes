# 📧 Template de Auto-Respuesta para EmailJS

## Template HTML para Auto-Respuesta al Cliente

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Confirmación de Consulta - Expertos en Viajes</title>
  </head>
  <body>
    <div
      style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;"
    >
      <!-- Header -->
      <div
        style="text-align: center; background-color: #2563eb; color: white; padding: 30px; border-radius: 10px 10px 0 0;"
      >
        <h1 style="margin: 0; font-size: 28px;">🌍 {{company_name}}</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
          Tu próximo destino soñado
        </p>
      </div>

      <!-- Body -->
      <div
        style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
      >
        <h2 style="color: #1e40af; margin-top: 0;">
          ¡Hola {{client_name}}! 👋
        </h2>

        <p style="color: #374151; line-height: 1.6; font-size: 16px;">
          Gracias por contactarte con nosotros. Hemos recibido tu
          <strong>{{inquiry_type}}</strong> y queremos confirmarte que nos
          pondremos en contacto contigo en las próximas
          <strong>24 horas</strong>.
        </p>

        <div
          style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #2563eb; margin: 25px 0; border-radius: 0 8px 8px 0;"
        >
          <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">
            ¿Qué sigue ahora?
          </h3>
          <ul style="color: #374151; line-height: 1.8; margin: 10px 0;">
            <li>📋 Revisaremos tu consulta detalladamente</li>
            <li>🎯 Prepararemos una propuesta personalizada</li>
            <li>📞 Te contactaremos para conversar sobre tu viaje</li>
            <li>✈️ ¡Comenzaremos a planificar tu aventura!</li>
          </ul>
        </div>

        <div
          style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 25px 0;"
        >
          <h3 style="color: #059669; margin-top: 0; font-size: 18px;">
            💡 Mientras tanto...
          </h3>
          <p style="color: #065f46; line-height: 1.6; margin: 10px 0;">
            Te invitamos a seguirnos en nuestras redes sociales para ver los
            destinos más increíbles y ofertas especiales que tenemos para ti.
          </p>
        </div>

        <!-- Contact Info -->
        <div
          style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;"
        >
          <h3 style="color: #1e40af; margin-bottom: 15px;">
            📞 Si tienes alguna duda urgente:
          </h3>
          <div style="display: flex; flex-wrap: wrap; gap: 20px;">
            <div style="flex: 1; min-width: 200px;">
              <p style="margin: 5px 0; color: #374151;">
                <strong>📱 WhatsApp:</strong><br />
                <a
                  href="https://wa.me/5493794030711"
                  style="color: #2563eb; text-decoration: none;"
                >
                  {{contact_phone}}
                </a>
              </p>
              <p style="margin: 5px 0; color: #374151;">
                <strong>📧 Email:</strong><br />
                <a
                  href="mailto:{{contact_email}}"
                  style="color: #2563eb; text-decoration: none;"
                >
                  {{contact_email}}
                </a>
              </p>
            </div>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a
            href="https://wa.me/5493794030711?text=Hola,%20recibí%20su%20email%20de%20confirmación%20y%20me%20gustaría%20conversar%20sobre%20mi%20consulta"
            style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; transition: background-color 0.3s;"
          >
            💬 Escribinos por WhatsApp
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div
        style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 14px;"
      >
        <p style="margin: 0;">
          {{company_name}} - Creando experiencias únicas e inolvidables<br />
          📍 Bolivar Nº 1543, Corrientes, ARGENTINA<br />
          🕒 Lun-Vie: 09:00-21:00 | Sáb: 09:00-13:00 y 17:30-21:00
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
          Este es un email automático. Por favor, no respondas a este
          mensaje.<br />
          Para consultas, utiliza nuestros canales de contacto oficiales.
        </p>
      </div>
    </div>
  </body>
</html>
```

## Configuración en EmailJS

### Subject del Template:

```
✈️ ¡Confirmamos tu consulta, {{client_name}}! - Expertos en Viajes
```

### Settings del Template:

- **To Email**: {{to_email}}
- **To Name**: {{client_name}}
- **From Email**: Tu email comercial (ej: expertosenviajes.info@gmail.com)
- **From Name**: Expertos en Viajes
- **Reply To**: Tu email comercial

### Variables disponibles:

- `{{client_name}}`: Nombre del cliente
- `{{to_email}}`: Email del cliente
- `{{inquiry_type}}`: Tipo de consulta
- `{{company_name}}`: Nombre de la empresa
- `{{contact_phone}}`: Teléfono de contacto
- `{{contact_email}}`: Email de contacto

## Variable de Entorno Adicional

Agregar a tu `.env.local`:

```env
NEXT_PUBLIC_EMAILJS_AUTOREPLY_TEMPLATE_ID=tu_template_id_autorespuesta
```

## Implementación Opcional en el Formulario

Si quieres activar la auto-respuesta, modifica el archivo `contact-form-functional.tsx` agregando:

```typescript
import { sendAutoReply } from "@/lib/emailjs-autoreply";

// En la función handleSubmit, después de enviar el email principal:
if (emailSent) {
  // Enviar auto-respuesta al cliente (opcional)
  try {
    await sendAutoReply({
      client_name: formData.name,
      client_email: formData.email,
      inquiry_type: packageName
        ? `paquete "${packageName}"`
        : "consulta general",
    });
  } catch (autoReplyError) {
    console.warn("No se pudo enviar la auto-respuesta:", autoReplyError);
  }
}
```
