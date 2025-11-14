# 🔐 Corrección de Políticas RLS - Instrucciones

## Problema
Error al crear reservas: `"new row violates row-level security policy for table reservation_passengers"`

## Causa
Las políticas de seguridad (RLS) solo permitían acceso a usuarios autenticados, pero las reservas se hacen de forma pública (sin login).

## Solución
Ejecutar el script SQL que permite acceso público a las tablas de reservas.

---

## 📋 Pasos para ejecutar la migración

### Opción 1: Supabase Dashboard (Recomendado)

1. **Ir al dashboard de Supabase**
   - Abre https://supabase.com
   - Inicia sesión en tu proyecto

2. **Abrir el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New query"

3. **Copiar y pegar el script**
   - Abre el archivo: `migrations/20251106_fix_rls_policies.sql`
   - Copia TODO el contenido
   - Pégalo en el editor SQL de Supabase

4. **Ejecutar el script**
   - Haz clic en "Run" o presiona Ctrl+Enter
   - Deberías ver un mensaje de éxito

5. **Verificar**
   - Ejecuta esta consulta para verificar las políticas:
   ```sql
   SELECT tablename, policyname, permissive, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('reservation_passengers', 'reservations', 'reservation_details')
   ORDER BY tablename, policyname;
   ```

---

### Opción 2: CLI de Supabase

Si tienes Supabase CLI instalado:

```bash
# Navegar a la carpeta del proyecto
cd C:\Users\Usuario\OneDrive\Escritorio\Proyectos\expertos-viajes

# Ejecutar la migración
supabase db push
```

---

## ✅ Verificación

Después de ejecutar el script:

1. **Probar crear una reserva** desde el frontend
2. **No debería aparecer más el error 401**
3. **La reserva debería crearse correctamente**

---

## 🔍 ¿Qué cambió?

### Antes:
```sql
-- Solo usuarios autenticados podían insertar
CREATE POLICY "Allow authenticated insert access"
  ON public.reservation_passengers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### Después:
```sql
-- Ahora CUALQUIERA puede insertar (incluido anon)
CREATE POLICY "Allow public insert access"
  ON public.reservation_passengers
  FOR INSERT
  WITH CHECK (true);
```

### Seguridad

- ✅ **Lectura**: Todos pueden leer (necesario para mostrar reservas)
- ✅ **Inserción**: Todos pueden insertar (necesario para crear reservas públicas)
- ⚠️ **Actualización**: Solo usuarios autenticados (admin)
- ⚠️ **Eliminación**: Solo usuarios autenticados (admin)

---

## 📝 Notas

- Este cambio es **seguro** porque las reservas deben ser públicas
- Los usuarios solo pueden **crear** reservas, no modificarlas ni eliminarlas
- El admin (autenticado) puede hacer todo
- Si en el futuro quieres restringir más, puedes agregar validaciones adicionales en las políticas

---

## 🆘 Si algo sale mal

Si después de ejecutar el script hay problemas:

1. **Revertir las políticas**:
   ```sql
   -- Volver a las políticas originales
   DROP POLICY IF EXISTS "Allow public read access" ON public.reservation_passengers;
   DROP POLICY IF EXISTS "Allow public insert access" ON public.reservation_passengers;

   CREATE POLICY "Allow authenticated insert access"
     ON public.reservation_passengers
     FOR INSERT
     WITH CHECK (auth.role() = 'authenticated');
   ```

2. **Contactar soporte** con el error exacto que aparece

---

## 📞 Ayuda

Si tienes dudas sobre cómo ejecutar esto, puedes:
- Compartir el error exacto
- Verificar que tienes acceso al dashboard de Supabase
- Compartir captura del panel de SQL Editor
