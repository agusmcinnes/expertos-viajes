# Migraciones de Supabase

Este directorio contiene los scripts de migración para la base de datos de Supabase.

## Cómo ejecutar las migraciones

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a la sección **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo de migración
5. Ejecuta el script

### Opción 2: Usando Supabase CLI

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O ejecuta el script directamente
supabase db execute --file scripts/supabase/migrations/20251030_modify_reservation_system.sql
```

## Migraciones disponibles

### `20251030_modify_reservation_system.sql`

**Descripción:** Modifica el sistema de reservas para incluir datos detallados de pasajeros.

**Cambios:**
- ✅ Crea tabla `reservation_passengers` para almacenar datos de cada pasajero
- ✅ Elimina campos de precio de `reservations` y `reservation_details`
- ✅ Agrega campo `subtipo_habitacion` (matrimonial/twin) para habitaciones dobles
- ✅ Elimina campos `cantidad_personas`, `adultos`, `menores`
- ✅ Incluye funciones helper para validación de capacidad

**⚠️ IMPORTANTE:** Esta migración elimina columnas. Hacer backup antes de ejecutar.

## Backup antes de ejecutar

Antes de ejecutar cualquier migración que elimine o modifique datos:

```bash
# Opción 1: Desde Supabase Dashboard
# Database > Backups > Create backup

# Opción 2: Exportar a SQL
# Database > Database > Export to SQL
```

## Verificación post-migración

Después de ejecutar la migración, verifica:

1. **Tablas creadas correctamente:**
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'reservation_passengers';
```

2. **Columnas modificadas:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('reservations', 'reservation_details');
```

3. **Funciones helper:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'get_reservation%'
   OR routine_name LIKE 'validate_reservation%';
```

## Rollback

Si necesitas revertir los cambios:

1. Restaura desde el backup creado antes de la migración
2. O crea un script de reversión manual (las columnas eliminadas no se pueden recuperar sin backup)

## Soporte

Si encuentras problemas con las migraciones, verifica:
- Que tienes permisos de administrador en Supabase
- Que no hay datos que dependan de las columnas a eliminar
- Los logs de error en Supabase Dashboard
