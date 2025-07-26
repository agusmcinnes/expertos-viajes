# 📋 Manual de Configuración de Supabase para Expertos Viajes

## 🚀 Paso 1: Crear Cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Crea una cuenta con GitHub, Google o email
4. Verifica tu email si es necesario

## 🏗️ Paso 2: Crear Nuevo Proyecto

1. En el dashboard, haz clic en "New Project"
2. Selecciona tu organización (o crea una nueva)
3. Completa los datos:
   - **Project Name**: `expertos-viajes`
   - **Database Password**: Genera una contraseña segura (¡guárdala!)
   - **Region**: Selecciona la más cercana (ej: South America - São Paulo)
4. Haz clic en "Create new project"
5. Espera 2-3 minutos mientras se configura

## 🔑 Paso 3: Obtener las Credenciales

1. Ve a **Settings** → **API** en el menú lateral
2. Copia estos valores:
   - **Project URL** (algo como: `https://abcdefgh.supabase.co`)
   - **anon public** key (la clave pública)

## 🌍 Paso 4: Configurar Variables de Entorno

1. En tu proyecto, crea un archivo `.env.local` en la raíz:

\`\`\`bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-aqui
\`\`\`

2. Reemplaza los valores con los que copiaste en el paso anterior

## 🗄️ Paso 5: Crear las Tablas

1. Ve a **SQL Editor** en el menú lateral de Supabase
2. Haz clic en "New query"
3. Copia y pega el contenido del archivo `scripts/create-database.sql`
4. Haz clic en "Run" para ejecutar
5. Deberías ver el mensaje "Success. No rows returned"

## 📊 Paso 6: Insertar Datos de Prueba

1. En el SQL Editor, crea una nueva query
2. Copia y pega el contenido del archivo `scripts/seed-data.sql`
3. Haz clic en "Run"
4. Deberías ver mensajes de éxito para cada INSERT

## 🔒 Paso 7: Configurar Políticas de Seguridad (RLS)

1. Ve a **Authentication** → **Policies**
2. Para cada tabla, configura las políticas:

### Para `travel_packages`:
\`\`\`sql
-- Permitir lectura pública de paquetes activos
CREATE POLICY "Public read access for active packages" ON travel_packages
FOR SELECT USING (is_active = true);

-- Permitir todas las operaciones para usuarios autenticados (admin)
CREATE POLICY "Admin full access" ON travel_packages
FOR ALL USING (auth.role() = 'authenticated');
\`\`\`

### Para `destinations`:
\`\`\`sql
-- Permitir lectura pública
CREATE POLICY "Public read access" ON destinations
FOR SELECT USING (true);
\`\`\`

### Para `contact_inquiries`:
\`\`\`sql
-- Permitir inserción pública (formulario de contacto)
CREATE POLICY "Public insert access" ON contact_inquiries
FOR INSERT WITH CHECK (true);

-- Permitir lectura solo para admins
CREATE POLICY "Admin read access" ON contact_inquiries
FOR SELECT USING (auth.role() = 'authenticated');
\`\`\`

## 🧪 Paso 8: Probar la Conexión

1. Inicia tu aplicación: `npm run dev`
2. Ve al panel de admin: `http://localhost:3000/admin`
3. Usa las credenciales: `admin` / `expertos2024`
4. Si ves los paquetes cargados, ¡todo funciona! 🎉

## 🔧 Paso 9: Configuración Adicional (Opcional)

### Habilitar Row Level Security:
1. Ve a **Database** → **Tables**
2. Para cada tabla, haz clic en los 3 puntos → **Edit table**
3. Activa "Enable Row Level Security (RLS)"

### Configurar Storage para Imágenes:
1. Ve a **Storage** → **Buckets**
2. Crea un bucket llamado `travel-images`
3. Configura políticas públicas para lectura

## 🚨 Solución de Problemas Comunes

### Error: "Invalid API key"
- Verifica que las variables de entorno estén correctas
- Asegúrate de que el archivo `.env.local` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo

### Error: "relation does not exist"
- Ejecuta nuevamente el script `create-database.sql`
- Verifica que estés en el proyecto correcto en Supabase

### Error: "Row Level Security policy violation"
- Configura las políticas RLS como se indica en el Paso 7
- O desactiva RLS temporalmente para pruebas

### No se muestran los datos:
- Ejecuta el script `seed-data.sql`
- Verifica en **Database** → **Table Editor** que los datos estén ahí

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador para errores
2. Verifica los logs en Supabase Dashboard → **Logs**
3. Consulta la documentación oficial: [docs.supabase.com](https://docs.supabase.com)

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] Variables de entorno configuradas
- [ ] Tablas creadas correctamente
- [ ] Datos de prueba insertados
- [ ] Políticas RLS configuradas
- [ ] Aplicación conectada y funcionando
- [ ] Panel de admin accesible
- [ ] Formulario de contacto funcional

¡Listo! Tu aplicación de Expertos Viajes está completamente integrada con Supabase. 🎉
