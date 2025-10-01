# Template de EmailJS para Solicitudes de Agencias

## Configuración necesaria en EmailJS

### Variables de entorno requeridas:

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=tu_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=tu_template_id_contacto
NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID=tu_template_id_agencias
NEXT_PUBLIC_EMAILJS_USER_ID=tu_user_id
NEXT_PUBLIC_ADMIN_EMAIL=admin@expertosenvajes.com
```

### Template para notificaciones de agencias (EmailJS)

**Nombre del template:** `agency_approval_request`

**Parámetros del template:**

- `{{agency_name}}` - Nombre de la agencia
- `{{agency_email}}` - Email de la agencia
- `{{agency_phone}}` - Teléfono de la agencia
- `{{to_name}}` - Nombre del destinatario (admin)
- `{{admin_email}}` - Email del admin
- `{{subject}}` - Asunto del email

### Contenido sugerido para el template:

**Subject:** Nueva solicitud de agencia para aprobación

**Body:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Nueva Solicitud de Agencia</title>
  </head>
  <body>
    <h2>Nueva Solicitud de Agencia</h2>

    <p>Se ha registrado una nueva agencia que requiere aprobación:</p>

    <div
      style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;"
    >
      <h3>Datos de la Agencia:</h3>
      <p><strong>Nombre:</strong> {{agency_name}}</p>
      <p><strong>Email:</strong> {{agency_email}}</p>
      <p><strong>Teléfono:</strong> {{agency_phone}}</p>
    </div>

    <p>
      Para aprobar o rechazar esta solicitud, ingrese al panel de
      administración:
    </p>
    <p>
      <a
        href="https://su-dominio.com/admin"
        style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
        >Ir al Panel de Admin</a
      >
    </p>

    <hr />
    <p>
      <small
        >Este es un mensaje automático del sistema de Expertos en Viajes.</small
      >
    </p>
  </body>
</html>
```

### Configuración en EmailJS Dashboard:

1. **Crear un nuevo template** en EmailJS con el ID: `agency_approval_request`
2. **Configurar los parámetros** mencionados arriba
3. **Establecer el destinatario** como el email del administrador
4. **Probar el template** con datos de prueba
5. **Copiar el Template ID** y agregarlo a las variables de entorno como `NEXT_PUBLIC_EMAILJS_AGENCY_TEMPLATE_ID`

### Pasos para configurar:

1. Ir a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Seleccionar tu servicio de email
3. Ir a "Email Templates"
4. Crear nuevo template
5. Usar el contenido HTML de arriba
6. Configurar los parámetros
7. Guardar y obtener el Template ID
8. Actualizar las variables de entorno

### Notas importantes:

- El sistema enviará una notificación cada vez que una agencia se registre
- El admin debe revisar y aprobar/rechazar desde el panel administrativo
- Las agencias no podrán acceder hasta ser aprobadas
