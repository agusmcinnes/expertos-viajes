# Cambios en el Sistema de Reservas - Resumen Completo

## Fecha de Implementación
30 de Octubre de 2025

## Descripción General
Se ha modificado completamente el sistema de reservas para:
- Eliminar el cálculo automático de precios (cotización manual por admin)
- Capturar datos detallados de cada pasajero
- Permitir selección de subtipo de habitación doble (matrimonial/twin)
- Mejorar el flujo de reserva a 4 pasos

---

## 📋 Cambios Realizados

### 1. Base de Datos (Supabase)

#### Nueva Tabla: `reservation_passengers`
```sql
- id (serial, PK)
- reservation_id (integer, FK a reservations)
- tipo_pasajero ('titular' | 'acompañante')
- nombre (varchar)
- apellido (varchar)
- fecha_nacimiento (date)
- cuil (varchar, solo para titular)
- created_at (timestamp)
```

#### Tabla `reservations` - Columnas Eliminadas:
- ❌ `precio_total`
- ❌ `cantidad_personas`
- ❌ `cliente_dni`

#### Tabla `reservation_details` - Cambios:
**Columnas Eliminadas:**
- ❌ `precio_unitario`
- ❌ `precio_subtotal`
- ❌ `adultos`
- ❌ `menores`

**Columnas Agregadas:**
- ✅ `subtipo_habitacion` (varchar: 'matrimonial' | 'twin' | null)

#### Script de Migración:
📁 **Ubicación:** `scripts/supabase/migrations/20251030_modify_reservation_system.sql`

**Incluye:**
- Creación de tablas
- Modificación de columnas
- Políticas de seguridad (RLS)
- Funciones helper para validaciones

---

### 2. Backend (lib/supabase.ts)

#### Interfaces TypeScript Actualizadas:

```typescript
// Nueva interfaz
export interface ReservationPassenger {
  id: number
  reservation_id: number
  tipo_pasajero: 'titular' | 'acompañante'
  nombre: string
  apellido: string
  fecha_nacimiento: string
  cuil?: string | null
  created_at: string
}

// Actualizada
export interface Reservation {
  // Eliminados: precio_total, cantidad_personas, cliente_dni
  id: number
  package_id: number
  accommodation_id: number
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  comentarios?: string | null
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  created_at: string
  updated_at: string
}

// Actualizada
export interface ReservationDetail {
  id: number
  reservation_id: number
  tipo_habitacion: 'dbl' | 'tpl' | 'cpl'
  cantidad: number
  subtipo_habitacion?: 'matrimonial' | 'twin' | null
  created_at: string
}

// Actualizada
export interface CreateReservationData {
  package_id: number
  accommodation_id: number
  fecha_salida: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  comentarios?: string
  details: {
    tipo_habitacion: 'dbl' | 'tpl' | 'cpl'
    cantidad: number
    subtipo_habitacion?: 'matrimonial' | 'twin' | null
  }[]
  passengers: {
    tipo_pasajero: 'titular' | 'acompañante'
    nombre: string
    apellido: string
    fecha_nacimiento: string
    cuil?: string
  }[]
}
```

#### Funciones del Servicio Modificadas:

- **❌ Eliminada:** `calculatePrice()`
- **✅ Actualizada:** `createReservation()` - ahora valida capacidad y crea pasajeros
- **✅ Actualizada:** `getAllReservations()` - incluye `reservation_passengers`
- **✅ Actualizada:** `getReservationsByStatus()` - incluye `reservation_passengers`
- **✅ Actualizada:** `getReservationById()` - incluye `reservation_passengers`

---

### 3. Formulario de Reservas (components/reservation-form.tsx)

#### Nuevo Flujo de 4 Pasos:

**Paso 1: Fecha y Alojamiento**
- Selección de alojamiento
- Selección de fecha (flexible o fija)

**Paso 2: Resumen**
- Vista de confirmación de datos seleccionados

**Paso 3: Habitaciones**
- Agregar habitaciones por tipo (DBL, TPL, CPL)
- Para habitaciones dobles: elegir matrimonial o twin
- Validación de stock en tiempo real
- Muestra capacidad total calculada

**Paso 4: Pasajeros**
- **Datos de contacto:** nombre, email, teléfono, comentarios
- **Agregar pasajeros:**
  - Botón "Agregar Titular" (obligatorio, con CUIL)
  - Botón "Agregar Acompañante" (nombre, apellido, fecha nacimiento)
- **Validación:** No exceder capacidad de habitaciones
- **Sin cálculo de precio**

#### Características Destacadas:
- ✅ Validación de capacidad en tiempo real
- ✅ Formularios dinámicos para cada pasajero
- ✅ Diferenciación clara entre titular y acompañantes
- ✅ Subtipo de habitación con botones visuales
- ✅ Badges para identificar tipo de pasajero
- ✅ Mensajes informativos sobre cotización manual

---

### 4. Panel de Administración (components/admin/reservations-manager.tsx)

#### Cambios en la Vista de Lista:
- ❌ Eliminada columna "Precio Total"
- ✅ Agregada columna "Pasajeros" (cantidad)

#### Cambios en el Modal de Detalle:

**Eliminado:**
- ❌ Campo DNI del cliente
- ❌ Card de "Precio Total"
- ❌ Campos de adultos/menores por habitación
- ❌ Precio unitario y subtotal

**Agregado:**
- ✅ **Nueva sección "Pasajeros":**
  - Lista completa de pasajeros
  - Badge según tipo (Titular/Acompañante)
  - Fecha de nacimiento formateada
  - CUIL para titulares
- ✅ **Subtipo de habitación:**
  - Badge mostrando "Matrimonial" o "Twin"
- ✅ **Card informativa:**
  - "PRECIO A COTIZAR POR AGENTE"
  - Mensaje explicativo

---

### 5. Sistema de Emails (lib/emailjs.ts)

#### Email al Admin:
```
Incluye:
- Detalles del paquete y alojamiento
- Lista completa de habitaciones con subtipo
- Lista detallada de TODOS los pasajeros:
  * Tipo (TITULAR/Acompañante)
  * Nombre completo
  * Fecha de nacimiento
  * CUIL (solo titular)
- Comentarios del cliente
- Indicación: "PRECIO A COTIZAR POR AGENTE"
```

#### Email al Cliente:
```
Incluye:
- Confirmación de pre-reserva
- Detalles de paquete y alojamiento
- Habitaciones reservadas
- Número de reserva
- Mensaje: "Nuestro equipo cotizará el precio y te lo enviará a la brevedad"
```

---

## 🚀 Instrucciones de Implementación

### Paso 1: Ejecutar Migración de Base de Datos

#### Opción A: Desde Supabase Dashboard (Recomendado)
1. Ir a [Supabase Dashboard](https://app.supabase.com)
2. Seleccionar tu proyecto
3. Navegar a **SQL Editor**
4. Copiar el contenido de `scripts/supabase/migrations/20251030_modify_reservation_system.sql`
5. Pegar en el editor
6. Clic en **Run**

#### Opción B: Usando Supabase CLI
```bash
supabase db execute --file scripts/supabase/migrations/20251030_modify_reservation_system.sql
```

### Paso 2: Verificar Migración

Ejecutar en SQL Editor:
```sql
-- Verificar nueva tabla
SELECT * FROM information_schema.tables
WHERE table_name = 'reservation_passengers';

-- Verificar columnas actualizadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('reservations', 'reservation_details');
```

### Paso 3: Actualizar Código de la Aplicación

Los cambios en el código ya están implementados. Solo necesitas:

```bash
# Instalar dependencias (si es necesario)
npm install

# Ejecutar en desarrollo
npm run dev

# O construir para producción
npm run build
```

### Paso 4: Verificar Funcionalidad

#### Prueba de Reserva:
1. ✅ Ir a un paquete de viaje
2. ✅ Clic en "Reservar"
3. ✅ Completar Paso 1: seleccionar alojamiento y fecha
4. ✅ Completar Paso 2: revisar resumen
5. ✅ Completar Paso 3: agregar habitaciones y seleccionar subtipo para dobles
6. ✅ Completar Paso 4:
   - Ingresar datos de contacto
   - Agregar pasajero titular (con CUIL)
   - Agregar acompañantes
   - Verificar que no se pueda exceder capacidad
7. ✅ Confirmar reserva
8. ✅ Verificar mensaje de éxito (sin precio)

#### Prueba en Admin Panel:
1. ✅ Ir a `/admin` (o la ruta de tu panel)
2. ✅ Ver lista de reservas
3. ✅ Verificar que muestra "Pasajeros" en lugar de "Precio"
4. ✅ Abrir detalle de una reserva
5. ✅ Verificar que muestra:
   - Lista de pasajeros completa
   - Subtipo de habitación
   - Mensaje "A COTIZAR POR AGENTE"
   - No muestra precios

#### Prueba de Emails:
1. ✅ Crear una reserva
2. ✅ Verificar email al admin con lista de pasajeros
3. ✅ Verificar email al cliente con mensaje de cotización

---

## ⚠️ Notas Importantes

### Datos Existentes
- ⚠️ **Las reservas existentes perderán los campos eliminados**
- ⚠️ **No habrá pasajeros registrados para reservas antiguas**
- ⚠️ **Hacer backup antes de ejecutar la migración**

### Validaciones Implementadas
- ✅ Al menos un pasajero titular obligatorio
- ✅ Capacidad de pasajeros no puede exceder habitaciones
- ✅ Todas las habitaciones dobles deben tener subtipo
- ✅ CUIL obligatorio solo para titular
- ✅ Todos los campos de pasajero son obligatorios

### Funciones Helper Disponibles
```sql
-- Contar pasajeros de una reserva
SELECT get_reservation_passengers_count(reservation_id);

-- Validar capacidad
SELECT validate_reservation_capacity(reservation_id);
```

---

## 📊 Comparación: Antes vs Después

### Antes:
- ❌ Precio calculado automáticamente
- ❌ Solo datos de contacto del cliente
- ❌ Solo cantidad de personas, sin detalles
- ❌ Habitación doble sin subtipo

### Después:
- ✅ Precio cotizado manualmente
- ✅ Datos completos de cada pasajero
- ✅ Validación de capacidad por habitación
- ✅ Habitación doble con matrimonial/twin
- ✅ Formulario de 4 pasos intuitivo
- ✅ Panel admin con información detallada

---

## 🆘 Soporte y Troubleshooting

### Problema: Error al ejecutar migración
**Solución:** Verificar que tienes permisos de administrador en Supabase

### Problema: No se muestran pasajeros en admin
**Solución:** Verificar que la migración se ejecutó correctamente y que las políticas RLS están activas

### Problema: Error al crear reserva
**Solución:** Verificar en consola del navegador. Posiblemente falte alguna validación o campo

### Problema: Emails no se envían
**Solución:** Verificar que las variables de entorno de EmailJS estén configuradas correctamente

---

## 📝 Checklist de Verificación Post-Implementación

- [ ] Migración de base de datos ejecutada sin errores
- [ ] Nueva tabla `reservation_passengers` existe
- [ ] Columnas eliminadas de `reservations` y `reservation_details`
- [ ] Columna `subtipo_habitacion` agregada correctamente
- [ ] Formulario de reserva muestra 4 pasos
- [ ] Se pueden agregar pasajeros (titular y acompañantes)
- [ ] Validación de capacidad funciona
- [ ] Selector de matrimonial/twin funciona
- [ ] No se muestra precio en ningún lugar
- [ ] Panel admin muestra lista de pasajeros
- [ ] Panel admin muestra subtipo de habitación
- [ ] Panel admin muestra mensaje "A COTIZAR"
- [ ] Emails se envían correctamente
- [ ] Emails incluyen lista de pasajeros
- [ ] Emails mencionan cotización manual

---

## 🎯 Próximos Pasos Sugeridos

1. **Agregar campo de precio manual en admin:**
   - Permitir que admin ingrese el precio cotizado
   - Enviar email al cliente con precio

2. **Dashboard de cotizaciones:**
   - Vista específica para reservas pendientes de cotización
   - Herramienta de cálculo de precio

3. **Historial de cambios:**
   - Log de modificaciones en reservas
   - Tracking de cotizaciones

4. **Exportación de datos:**
   - Exportar lista de pasajeros a Excel/CSV
   - Generar manifiesto de viaje

5. **Reportes:**
   - Reporte de reservas por paquete
   - Reporte de ocupación de habitaciones

---

## 📞 Contacto

Si encuentras algún problema durante la implementación, verifica:
- Los logs de Supabase para errores de base de datos
- La consola del navegador para errores de JavaScript
- Los logs del servidor para errores de backend

---

**Implementado por:** Claude Code
**Fecha:** 30 de Octubre de 2025
**Versión:** 2.0
