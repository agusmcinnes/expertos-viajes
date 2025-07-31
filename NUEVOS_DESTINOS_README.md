# Actualización: Nuevos Destinos

Este documento describe la actualización realizada para agregar 3 nuevos destinos al sitio web de Expertos Viajes.

## 🎯 Nuevos Destinos Agregados

1. **EEUU / Canadá** (`eeuu-canada`)

   - Página: `/destinos/eeuu-canada`
   - Incluye: Nueva York, San Francisco, Las Vegas, Cataratas del Niágara, Montañas Rocosas

2. **Europa y Clásicos** (`europa-clasicos`)

   - Página: `/destinos/europa-clasicos`
   - Incluye: París, Roma, Londres, Barcelona, Venecia

3. **Exóticos y Resto del Mundo** (`exoticos-mundo`)
   - Página: `/destinos/exoticos-mundo`
   - Incluye: India, Tailandia, Marruecos, Egipto, Nepal

## 📋 Archivos Modificados

### Base de Datos

- `scripts/add-new-destinations.sql` - ✅ NUEVO: Script SQL para agregar destinos y paquetes

### Páginas y Componentes

- `app/destinos/[slug]/page.tsx` - ✅ ACTUALIZADO: Agregados los 3 nuevos destinos
- `components/header.tsx` - ✅ ACTUALIZADO: Iconos para nuevos destinos
- `components/destinations-section-dynamic.tsx` - ✅ ACTUALIZADO: Iconos para nuevos destinos

### Imágenes Necesarias

- `public/IMAGENES_NECESARIAS.md` - ✅ NUEVO: Guía de imágenes requeridas

### Scripts de Automatización

- `scripts/apply-destinations-update.sh` - ✅ NUEVO: Script para Linux/Mac
- `scripts/apply-destinations-update.ps1` - ✅ NUEVO: Script para Windows
- `NUEVOS_DESTINOS_README.md` - ✅ NUEVO: Este archivo

## 🚀 Cómo Aplicar los Cambios

### Opción 1: Script Automático (Windows)

```powershell
# Desde la raíz del proyecto en PowerShell
./scripts/apply-destinations-update.ps1
```

### Opción 2: Script Automático (Linux/Mac)

```bash
# Desde la raíz del proyecto
chmod +x scripts/apply-destinations-update.sh
./scripts/apply-destinations-update.sh
```

### Opción 3: Manual

1. **Aplicar cambios en la base de datos:**

   - Ve a tu dashboard de Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido de `scripts/add-new-destinations.sql`

2. **Agregar las imágenes (ver `public/IMAGENES_NECESARIAS.md`):**

   - `public/eeuu-canada-hero.png`
   - `public/europa-clasicos-hero.png`
   - `public/exoticos-mundo-hero.png`

3. **Construir el proyecto:**

   ```bash
   # Con pnpm
   pnpm run build

   # Con npm
   npm run build

   # Con yarn
   yarn build
   ```

## 🔍 Verificación

Después de aplicar los cambios, verifica que:

- [ ] Los nuevos destinos aparezcan en el menú de navegación
- [ ] Las páginas `/destinos/eeuu-canada`, `/destinos/europa-clasicos`, y `/destinos/exoticos-mundo` funcionen
- [ ] Los paquetes de cada destino se muestren correctamente
- [ ] Las imágenes se visualicen bien (o usa placeholders temporales)

## 📊 Datos Agregados

### Destinos (3 nuevos)

- EEUU / Canadá
- Europa y Clásicos
- Exóticos y Resto del Mundo

### Paquetes (12 nuevos)

**EEUU / Canadá (3 paquetes):**

- Nueva York & Cataratas del Niágara ($2,200)
- Costa Oeste USA: Los Ángeles, San Francisco & Vegas ($2,800)
- Canadá: Toronto, Montreal & Rocosas ($2,400)

**Europa y Clásicos (4 paquetes):**

- España & Portugal: Madrid, Barcelona & Lisboa ($1,900)
- Italia Clásica: Roma, Florencia & Venecia ($2,100)
- Francia: París & Castillos del Loira ($2,300)
- Grecia: Atenas & Islas del Egeo ($1,800)

**Exóticos y Resto del Mundo (4 paquetes):**

- India: Delhi, Agra & Rajastán ($2,600)
- Tailandia: Bangkok, Chiang Mai & Phuket ($2,000)
- Marruecos: Marrakech, Fez & Sahara ($1,700)
- Egipto: El Cairo, Luxor & Crucero por el Nilo ($2,400)

## 🎨 Personalización Adicional

Para personalizar aún más los nuevos destinos:

1. **Cambiar imágenes:** Reemplaza las imágenes en `public/` con imágenes de mejor calidad
2. **Ajustar precios:** Modifica los precios en la base de datos según tus tarifas reales
3. **Actualizar fechas:** Cambia las fechas disponibles por fechas reales de salida
4. **Agregar más paquetes:** Usa el mismo patrón SQL para agregar más opciones

## 💡 Notas Técnicas

- Los códigos de destino usan kebab-case (`eeuu-canada`, `europa-clasicos`, `exoticos-mundo`)
- Las páginas se generan estáticamente con `generateStaticParams()`
- Los iconos de los menús son emojis temporales que puedes reemplazar
- Las imágenes usar rutas placeholder mientras no tengas las imágenes reales

---

✅ **¡Los cambios están listos para implementar!** Ejecuta uno de los scripts o sigue los pasos manuales para activar los nuevos destinos.
