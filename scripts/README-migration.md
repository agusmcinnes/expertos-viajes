# Scripts de Migración para Tabla Agencies

## Descripción

Estos scripts actualizan la tabla `agencies` en Supabase para incluir todos los campos requeridos del nuevo formulario de registro de agencias.

## Archivos

### 1. `update-agencies-table.sql`

Script principal que:

- Agrega 13 nuevos campos a la tabla agencies
- Migra datos existentes a los nuevos campos (con valores temporales para campos faltantes)
- Establece constraints NOT NULL para campos obligatorios
- Crea índices para mejorar performance
- **NO incluye constraints únicos** (se agregan después)

### 2. `update-temporary-data.sql`

Script para identificar y actualizar registros con datos temporales

### 3. `add-unique-constraints.sql`

Script para agregar constraints únicos después de actualizar datos temporales

### 4. `rollback-agencies-table.sql`

Script de rollback para revertir todos los cambios (usar con precaución)

## Campos Agregados

### Información Legal

- `razon_social` (VARCHAR(255), NOT NULL)
- `cuit` (VARCHAR(15), NOT NULL, UNIQUE)
- `numero_legajo` (VARCHAR(50), NOT NULL, UNIQUE)
- `nombre_fantasia` (VARCHAR(255), NOT NULL)

### Información de Contacto

- `telefono_contacto_1` (VARCHAR(20), NOT NULL)
- `telefono_contacto_2` (VARCHAR(20))
- `telefono_contacto_3` (VARCHAR(20))

### Información de Domicilio

- `domicilio` (VARCHAR(500), NOT NULL)
- `ciudad` (VARCHAR(100), NOT NULL)
- `provincia` (VARCHAR(100), NOT NULL)
- `pais` (VARCHAR(100), NOT NULL)

### Información de Emails

- `email_contacto_1` (VARCHAR(255), NOT NULL)
- `email_contacto_2` (VARCHAR(255))
- `email_administracion` (VARCHAR(255), NOT NULL)

## Instrucciones de Ejecución

### Paso 1: Backup

Antes de ejecutar cualquier script, crear un backup de la base de datos:

```sql
-- En Supabase Dashboard > Database > Backups
-- O exportar los datos existentes
SELECT * FROM agencies;
```

### Paso 2: Ejecutar Migración Principal

1. Ir a Supabase Dashboard
2. Navegar a SQL Editor
3. Copiar y pegar el contenido de `update-agencies-table.sql`
4. Ejecutar el script

### Paso 3: Identificar Datos Temporales

1. Ejecutar `update-temporary-data.sql` para ver qué registros necesitan actualización
2. Los registros con datos temporales tendrán:
   - CUIT: `00-00000000-X`
   - Legajo: `LEG-X`
   - Razón Social: `Agencia Sin Nombre`

### Paso 4: Actualizar Datos Reales

Usar las consultas del paso 3 para actualizar cada agencia con datos reales:

```sql
UPDATE agencies SET
  razon_social = 'Nombre Real de la Agencia',
  cuit = '30-12345678-9',
  numero_legajo = 'EVT001',
  -- ... otros campos
WHERE id = X;
```

### Paso 5: Agregar Constraints Únicos

Una vez actualizados todos los datos temporales:

1. Ejecutar `add-unique-constraints.sql`
2. Esto agregará los constraints únicos para CUIT y número de legajo

### Paso 6: Verificar Resultados

El script incluye consultas de verificación para confirmar que todo está correcto.

## Migración de Datos Existentes

El script automáticamente migra los datos existentes:

- `name` → `razon_social` y `nombre_fantasia`
- `phone` → `telefono_contacto_1`
- `email` → `email_contacto_1` y `email_administracion`
- `pais` se establece como 'Argentina' por defecto

## Campos Legacy

Los campos originales (`name`, `email`, `phone`) se mantienen por compatibilidad. Si quieres eliminarlos después de verificar que todo funciona:

```sql
-- CUIDADO: Solo ejecutar después de verificar que la migración fue exitosa
ALTER TABLE agencies
DROP COLUMN name,
DROP COLUMN email,
DROP COLUMN phone;
```

## Rollback

En caso de problemas, ejecutar `rollback-agencies-table.sql` para revertir todos los cambios.

⚠️ **ADVERTENCIA**: El rollback eliminará todos los datos de los nuevos campos.

## Notas Importantes

1. **CUIT**: Debe seguir el formato XX-XXXXXXXX-X
2. **Emails**: Se validan automáticamente por el tipo VARCHAR
3. **Teléfonos**: Formato libre, se recomienda incluir código de país
4. **Constraints Únicos**: CUIT y número de legajo deben ser únicos
5. **Performance**: Se crearon índices en campos de búsqueda frecuente

## Testing

Después de la migración, probar:

1. Registro de nueva agencia
2. Login con agencias existentes
3. Búsqueda por CUIT/legajo
4. Actualización de datos de agencia
