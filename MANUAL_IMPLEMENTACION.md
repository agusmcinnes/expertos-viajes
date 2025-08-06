# Manual de Implementación - Expertos Viajes

## 📋 Tareas Pendientes de Completar

### 🖼️ Imágenes Necesarias

#### Imágenes de Hero para Destinos

- [ ] `eeuu-canada-hero.png` - Imagen principal para la página de EEUU/Canadá
- [ ] `europa-clasicos-hero.png` - Imagen principal para la página de Europa y Clásicos
- [ ] `exoticos-mundo-hero.png` - Imagen principal para la página de Exóticos y Resto del Mundo
- [ ] `grupales-hero.jpg` - Imagen principal para Salidas Grupales Acompañadas
- [ ] `mediterráneo-hero.png` - Imagen principal para la página del Mediterráneo

#### Imágenes para Cruceros

- [ ] `crucero-mediterraneo.jpg` - Imagen para cruceros por el Mediterráneo
- [ ] `crucero-caribe.jpg` - Imagen para cruceros por el Caribe
- [ ] `crucero-brasil.jpg` - Imagen para cruceros por Brasil

#### Logos y Marcas

- [ ] `logo-cruceros.png` - Logo para la sección de cruceros (opcional)

### 🗃️ Base de Datos y Contenido

#### Configuración de Transporte en Base de Datos

```sql
-- Agregar tabla para tipos de transporte
CREATE TABLE transport_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar tipos de transporte
INSERT INTO transport_types (code, name, description, icon) VALUES
('aereo', 'En Avión', 'Viajes con transporte aéreo', 'plane'),
('bus', 'En Bus', 'Viajes en bus con Vete de Viaje', 'bus'),
('crucero', 'En Crucero', 'Viajes en crucero por diferentes mares', 'ship');

-- Agregar columna transport_type a la tabla packages
ALTER TABLE packages ADD COLUMN transport_type VARCHAR(50) REFERENCES transport_types(code);
```

#### Paquetes de Cruceros

```sql
-- Insertar paquetes de cruceros de ejemplo
INSERT INTO packages (name, description, price, original_price, duration, destination_id, transport_type, features, dates) VALUES
('Crucero por el Caribe', 'Navega por las aguas cristalinas del Caribe visitando las islas más paradisíacas.', 1200, 1500, '7 días', (SELECT id FROM destinations WHERE code = 'caribe'), 'crucero', '["Todo incluido", "Entretenimiento", "Spa", "Casino"]', '["2024-03-15", "2024-04-20", "2024-05-25"]'),
('Crucero Mediterráneo', 'Explora la historia y cultura del Mediterráneo visitando puertos icónicos.', 1800, 2200, '10 días', (SELECT id FROM destinations WHERE code = 'mediterráneo'), 'crucero', '["Excursiones incluidas", "Gastronomía gourmet", "WiFi", "Balcón"]', '["2024-06-10", "2024-07-15", "2024-08-20"]'),
('Crucero Brasil Especial', 'Descubre las costas brasileñas con paradas en las ciudades más vibrantes.', 2500, 3000, '12 días', (SELECT id FROM destinations WHERE code = 'brasil'), 'crucero', '["Espectáculos brasileños", "Clases de samba", "Caipirinha bar", "Excursiones"]', '["2024-09-05", "2024-10-10", "2024-11-15"]');
```

#### Destino Mediterráneo

```sql
-- Agregar destino Mediterráneo a la base de datos
INSERT INTO destinations (name, code, description) VALUES
('Mediterráneo', 'mediterráneo', 'Navega por las aguas cristalinas del Mediterráneo y descubre la cuna de la civilización occidental.');
```

### 🔧 Funcionalidades a Implementar

#### 1. Filtrado de Paquetes por Transporte

- [ ] Modificar `destination-page.tsx` para filtrar paquetes según el parámetro `transport`
- [ ] Actualizar la consulta de base de datos para incluir filtro por `transport_type`
- [ ] Agregar indicadores visuales del tipo de transporte en cada paquete

#### 2. Páginas de Información por Transporte

- [ ] Crear contenido específico para cada tipo de transporte en las páginas de destinos
- [ ] Agregar información sobre los servicios incluidos en cada tipo de viaje
- [ ] Incluir términos y condiciones específicos por tipo de transporte

#### 3. Sistema de Reservas

- [ ] Implementar formulario de consulta específico por tipo de transporte
- [ ] Agregar campos específicos para cruceros (camarote, deck, etc.)
- [ ] Crear sistema de seguimiento de disponibilidad

### 📱 Mejoras de UI/UX

#### Iconografía

- [ ] Agregar íconos específicos para cada tipo de transporte
- [ ] Crear badges diferenciados por tipo de viaje
- [ ] Implementar colores temáticos (azul para cruceros, naranja para bus, etc.)

#### Responsive Design

- [ ] Verificar que todas las nuevas páginas sean responsive
- [ ] Optimizar el menú móvil para los nuevos elementos
- [ ] Asegurar que las imágenes se carguen correctamente en todos los dispositivos

### 🎨 Diseño y Branding

#### Colores Específicos por Transporte

```css
/* Agregar a globals.css o tailwind.config.ts */
:root {
  --bus-color: #ff6b35;
  --bus-color-600: #e55a2b;
  --crucero-color: #0ea5e9;
  --crucero-color-600: #0284c7;
  --avion-color: #3b82f6;
  --avion-color-600: #2563eb;
}
```

#### Tipografía y Espaciado

- [ ] Revisar que los títulos y textos sean consistentes
- [ ] Verificar espaciado entre secciones
- [ ] Asegurar legibilidad en todos los dispositivos

### 🔍 SEO y Metadatos

#### Meta Tags

- [ ] Agregar meta descriptions específicas para cada tipo de transporte
- [ ] Incluir keywords relevantes (cruceros, viajes en bus, etc.)
- [ ] Configurar Open Graph tags para compartir en redes sociales

#### URLs y Navegación

- [ ] Verificar que todas las URLs sean SEO-friendly
- [ ] Implementar breadcrumbs en páginas de destinos
- [ ] Agregar sitemap.xml con las nuevas páginas

### 📊 Analytics y Tracking

#### Eventos de Tracking

- [ ] Configurar eventos para clicks en cada tipo de transporte
- [ ] Trackear conversions por tipo de viaje
- [ ] Monitorear tiempo en página por sección

### 🧪 Testing

#### Funcionalidad

- [ ] Testear navegación entre tipos de transporte
- [ ] Verificar filtrado de paquetes
- [ ] Probar formularios de contacto

#### Performance

- [ ] Optimizar imágenes para web
- [ ] Verificar tiempos de carga
- [ ] Testear en diferentes navegadores

### 📧 Integraciones

#### Sistema de Email

- [ ] Configurar templates específicos por tipo de transporte
- [ ] Implementar autorespuestas diferenciadas
- [ ] Agregar información de contacto específica

#### CRM/Sistema de Gestión

- [ ] Configurar categorización automática por tipo de viaje
- [ ] Implementar tags para segmentación de clientes
- [ ] Agregar campos específicos en formularios

## 🚀 Orden de Implementación Recomendado

1. **Fase 1: Contenido y Base de Datos**

   - Agregar imágenes faltantes
   - Actualizar base de datos con tipos de transporte
   - Crear paquetes de ejemplo para cruceros

2. **Fase 2: Funcionalidad Core**

   - Implementar filtrado por transporte
   - Conectar páginas con base de datos
   - Testear navegación

3. **Fase 3: Mejoras y Optimización**

   - Implementar sistema de reservas
   - Optimizar SEO
   - Agregar analytics

4. **Fase 4: Testing y Launch**
   - Testing exhaustivo
   - Optimización de performance
   - Documentación final

## 📞 Contacto y Soporte

Para cualquier duda sobre la implementación de estas funcionalidades, contactar al equipo de desarrollo.

---

_Documento actualizado: $(date)_
