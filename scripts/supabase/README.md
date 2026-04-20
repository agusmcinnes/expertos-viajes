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

### `20260420_atomic_reservations.sql` ⚠️ REQUERIDA POR EL CÓDIGO ACTUAL

**Descripción:** Crea RPCs transaccionales para crear y cancelar reservas.

**Cambios:**
- ✅ RPC `create_reservation_atomic` — inserta reserva + detalles + pasajeros en una sola transacción, con `SELECT FOR UPDATE` sobre `package_stock` para evitar overbooking.
- ✅ RPC `cancel_reservation_atomic` — cancela reserva y repone stock si aplica. Idempotente.
- ✅ **Cambio de semántica:** el stock ahora se descuenta **al crear** la reserva, no al confirmarla.

**⚠️ REQUISITO:** El código TypeScript (`lib/supabase.ts`) ya llama a estas RPCs. Sin ejecutar esta migración, **el flujo de creación de reservas desde el cliente deja de funcionar**.

**Antes de correr:** verificar que `public.package_stock` tenga los campos `stock_dbl, stock_tpl, stock_cpl`. Si tiene también `stock_qpl`, agregar el caso en la función (ver comentarios en el archivo).

### `20260420_tighten_rls_and_indexes.sql`

**Descripción:** Endurece RLS para que los clientes anónimos solo puedan crear reservas vía la RPC, e incorpora índices de performance.

**Cambios:**
- ✅ Revoca INSERT/SELECT/UPDATE/DELETE directo de `anon` sobre `reservations`, `reservation_details`, `reservation_passengers`.
- ✅ `authenticated` (admin) mantiene acceso completo.
- ✅ Agrega índices sobre `reservation_id`, `estado`, `fecha_salida`, y lookup compuesto de `package_stock`.

**⚠️ IMPORTANTE:** Ejecutar **después** de `20260420_atomic_reservations.sql`. Si se corre antes, los clientes se quedan sin forma de crear reservas (la RPC `create_reservation_atomic` es el único camino desde `anon`).

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
