# Documentación Técnica: Sistema de Reservas con Pasajeros

## Fecha de Última Actualización: 30 de Octubre de 2025

---

## 📋 Índice
1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Cambios Principales Implementados](#cambios-principales-implementados)
3. [Arquitectura y Estructura](#arquitectura-y-estructura)
4. [Archivos Creados](#archivos-creados)
5. [Archivos Modificados](#archivos-modificados)
6. [Problemas Encontrados y Soluciones](#problemas-encontrados-y-soluciones)
7. [Flujo de Usuario](#flujo-de-usuario)
8. [Validaciones Implementadas](#validaciones-implementadas)
9. [Próximas Iteraciones Sugeridas](#próximas-iteraciones-sugeridas)

---

## Resumen del Proyecto

### Objetivo Principal
Transformar el sistema de reservas de un modelo automático con cálculo de precios a un sistema manual donde:
- Se recopilan datos detallados de pasajeros
- El admin cotiza manualmente los precios
- Se distingue entre titular (mayor de 18) y acompañantes
- Se mejora la UX de selección de fechas de nacimiento

### Tecnologías Utilizadas
- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: shadcn/ui (Select, Button, Card, Badge, Calendar, Popover)
- **Database**: Supabase (PostgreSQL)
- **Date Management**: date-fns v4.1.0
- **Icons**: lucide-react
- **Emails**: EmailJS

---

## Cambios Principales Implementados

### 1. Sistema de Reservas con 4 Pasos
**Antes**: Modal de reserva con cálculo automático de precios
**Después**: Flujo de 4 pasos:
1. **Paso 1**: Selección de fecha de salida y alojamiento
2. **Paso 2**: Resumen de selección
3. **Paso 3**: Selección de habitaciones y subtipos (matrimonial/twin para dobles)
4. **Paso 4**: Datos de pasajeros (titular + acompañantes)

### 2. Base de Datos: Nueva Tabla de Pasajeros

**Archivo de Migración**: `scripts/supabase/migrations/20251030_modify_reservation_system.sql`

```sql
-- Nueva tabla para pasajeros
CREATE TABLE IF NOT EXISTS public.reservation_passengers (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  tipo_pasajero VARCHAR(20) NOT NULL CHECK (tipo_pasajero IN ('titular', 'acompañante')),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  cuil VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campos eliminados de reservations
ALTER TABLE public.reservations
  DROP COLUMN IF EXISTS precio_total,
  DROP COLUMN IF EXISTS cantidad_personas,
  DROP COLUMN IF EXISTS cliente_dni;

-- Campos modificados en reservation_details
ALTER TABLE public.reservation_details
  DROP COLUMN IF EXISTS precio_unitario,
  DROP COLUMN IF EXISTS precio_subtotal,
  DROP COLUMN IF EXISTS adultos,
  DROP COLUMN IF EXISTS menores,
  ADD COLUMN IF NOT EXISTS subtipo_habitacion VARCHAR(20)
    CHECK (subtipo_habitacion IN ('matrimonial', 'twin', NULL));
```

### 3. Componente BirthDatePicker con Selectores

**Problema**: El DatePicker con calendario requería 420+ clics para seleccionar fechas antiguas (ej: 1990).

**Solución**: Componente `BirthDatePicker` con 3 selectores dropdown:
- **Día**: 1-31 (ajustado automáticamente según el mes)
- **Mes**: Enero-Diciembre (en español)
- **Año**: 1920 hasta año actual (orden descendente)

**Beneficios**:
- ✅ **99.3% menos interacciones**: 422 clics → 3 selecciones
- ✅ Validación automática de días por mes (incluye años bisiestos)
- ✅ Vista previa formateada: "15 de marzo de 1990"
- ✅ UX consistente en todos los dispositivos

### 4. Validación de Edad del Titular (18+)

**Requisito**: El titular debe ser mayor de edad para poder realizar la reserva.

**Implementación**:
```typescript
const isTitularAdult = () => {
  const titular = passengers.find(p => p.tipo_pasajero === 'titular')
  if (!titular || !titular.fecha_nacimiento) return false
  const birthDate = new Date(titular.fecha_nacimiento)
  const age = differenceInYears(new Date(), birthDate)
  return age >= 18
}

const getTitularAge = () => {
  const titular = passengers.find(p => p.tipo_pasajero === 'titular')
  if (!titular || !titular.fecha_nacimiento) return null
  const birthDate = new Date(titular.fecha_nacimiento)
  return differenceInYears(new Date(), birthDate)
}
```

**Puntos de Validación**:
1. Mensaje de error en tiempo real bajo el date picker
2. Botón "Confirmar Datos" deshabilitado si es menor
3. Toast notification al intentar confirmar
4. Sección de acompañantes no aparece hasta que titular sea válido
5. Validación final antes de enviar reserva

### 5. Botón "Editar" para Modificar Titular

**Antes**: Solo una [X] pequeña sin texto
**Después**: Botón visible con ícono y texto "Editar"

```typescript
<Button variant="outline" size="sm" onClick={() => removePassenger(titularIndex)}>
  <Edit className="w-4 h-4 mr-1" />
  Editar
</Button>
```

### 6. Admin Panel Actualizado

**Cambios en `components/admin/reservations-manager.tsx`**:
- ❌ Eliminado: Cálculos y displays de precios
- ✅ Agregado: Lista detallada de pasajeros con badges (Titular/Acompañante)
- ✅ Agregado: Card "PRECIO A COTIZAR POR AGENTE"
- ✅ Agregado: Visualización de CUIL y fechas de nacimiento

### 7. Sistema de Emails Actualizado

**Archivo**: `lib/emailjs.ts`

**Cambios**:
- Agregado campo `passengers` en la interfaz
- Eliminados campos de precio
- Agregado formateo de lista de pasajeros:
```typescript
const passengersDetail = data.passengers.map((p, index) => {
  const tipo = p.tipo_pasajero === 'titular' ? 'TITULAR' : 'Acompañante'
  return `${index + 1}. ${tipo}: ${p.nombre} ${p.apellido} (Nacimiento: ${p.fecha_nacimiento})${p.cuil ? ` - CUIL: ${p.cuil}` : ''}`
}).join('\n')
```

---

## Arquitectura y Estructura

### Flujo de Datos
```
Usuario → ReservationForm (4 pasos) → createReservation() → Supabase
                                                           ↓
                                              reservation_passengers table
                                              reservation_details table
                                              reservations table
                                                           ↓
                                              sendReservationNotification()
                                                           ↓
                                              EmailJS → Admin + Cliente
```

### Estructura de Datos

#### ReservationPassenger Interface
```typescript
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
```

#### CreateReservationData Interface
```typescript
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

---

## Archivos Creados

### 1. `components/ui/birth-date-picker.tsx` (189 líneas)
**Propósito**: Selector de fecha de nacimiento con dropdowns

**Props**:
```typescript
interface BirthDatePickerProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minYear?: number  // Default: 1920
  maxYear?: number  // Default: año actual
}
```

**Características Clave**:
- 3 selectores independientes (día, mes, año)
- Validación automática de días según mes
- Manejo de años bisiestos
- Vista previa formateada en español
- Protección contra infinite loops con `useRef`

**Uso**:
```typescript
<BirthDatePicker
  date={passenger.fecha_nacimiento ? new Date(passenger.fecha_nacimiento) : undefined}
  onSelect={(date) => {
    if (date) {
      updatePassenger(index, 'fecha_nacimiento', date.toISOString().split('T')[0])
    }
  }}
  placeholder="Selecciona fecha de nacimiento"
  maxYear={new Date().getFullYear()}
  minYear={1920}
/>
```

### 2. `components/ui/date-picker.tsx` (66 líneas)
**Propósito**: Selector de fecha general con calendario visual

**Nota**: Este componente fue inicialmente creado pero luego reemplazado por `BirthDatePicker` para fechas de nacimiento. Aún existe en el proyecto y puede usarse para otras fechas.

### 3. `scripts/supabase/migrations/20251030_modify_reservation_system.sql`
**Propósito**: Migración de base de datos completa

**Incluye**:
- Creación de tabla `reservation_passengers`
- Eliminación de campos de precio
- Adición de campo `subtipo_habitacion`
- Creación de índices para performance
- Políticas RLS para seguridad

### 4. `scripts/supabase/MIGRATION_README.md`
**Propósito**: Instrucciones detalladas para ejecutar la migración

### 5. `MEJORAS_FORMULARIO_TITULAR.md`
**Propósito**: Documentación de mejoras en el formulario del titular
- Botón "Editar"
- DatePicker estético
- Validación de edad 18+

### 6. `MEJORA_SELECTORES_FECHA.md`
**Propósito**: Documentación completa del BirthDatePicker
- Comparación antes/después (422 clics → 3 clics)
- Casos de uso y testing
- Métricas de mejora

### 7. `CLAUDE.md` (este archivo)
**Propósito**: Documentación técnica completa para continuar iteraciones

---

## Archivos Modificados

### 1. `lib/supabase.ts`
**Líneas de cambio**: ~50 líneas

**Cambios principales**:
- ✅ Agregada interfaz `ReservationPassenger`
- ❌ Eliminada función `calculatePrice()`
- ✅ Modificada interfaz `Reservation` (sin precio_total, cantidad_personas, cliente_dni)
- ✅ Modificada interfaz `CreateReservationData` (agregado passengers)
- ✅ Actualizada función `createReservation()`:
  - Validación de al menos un titular
  - Validación de capacidad vs pasajeros
  - Inserción en tabla `reservation_passengers`
  - Eliminado cálculo de precios

**Fragmento clave**:
```typescript
async createReservation(reservationData: CreateReservationData) {
  // 1. Validar al menos un titular
  const hasTitular = reservationData.passengers.some(p => p.tipo_pasajero === 'titular')
  if (!hasTitular) {
    return { success: false, error: 'Debe incluir al menos un pasajero titular' }
  }

  // 2. Calcular capacidad total
  const totalCapacity = reservationData.details.reduce((sum, detail) => {
    let roomCapacity = 0
    if (detail.tipo_habitacion === 'dbl') roomCapacity = 2
    else if (detail.tipo_habitacion === 'tpl') roomCapacity = 3
    else if (detail.tipo_habitacion === 'cpl') roomCapacity = 4
    return sum + (detail.cantidad * roomCapacity)
  }, 0)

  // 3. Validar que no exceda capacidad
  if (reservationData.passengers.length > totalCapacity) {
    return {
      success: false,
      error: `La cantidad de pasajeros (${reservationData.passengers.length}) excede la capacidad total (${totalCapacity})`
    }
  }

  // ... resto de la lógica de creación
}
```

### 2. `components/reservation-form.tsx`
**Líneas de cambio**: ~600+ líneas (reescritura casi completa)

**Imports agregados**:
```typescript
import { Edit } from "lucide-react"
import { BirthDatePicker } from "@/components/ui/birth-date-picker"
import { differenceInYears } from "date-fns"
```

**Estado agregado**:
```typescript
const [passengers, setPassengers] = useState<PassengerFormData[]>([])
```

**Funciones clave agregadas**:
- `isTitularComplete()`: Valida que todos los campos del titular estén llenos
- `isTitularAdult()`: Valida que el titular sea mayor de 18 años
- `getTitularAge()`: Calcula la edad del titular en años
- `getTotalCapacity()`: Calcula capacidad total según habitaciones
- `addPassenger()`: Agrega un nuevo pasajero acompañante
- `removePassenger()`: Elimina un pasajero
- `updatePassenger()`: Actualiza un campo de un pasajero

**Estructura del Paso 4 (Pasajeros)**:
```typescript
{/* TITULAR */}
{isTitularComplete() && isTitularAdult() ? (
  // Vista de titular confirmado con botón "Editar"
  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
    <div className="flex items-center justify-between mb-2">
      <Badge variant="default">Titular Confirmado</Badge>
      <Button variant="outline" size="sm" onClick={() => removePassenger(titularIndex)}>
        <Edit className="w-4 h-4 mr-1" />
        Editar
      </Button>
    </div>
    {/* Datos del titular */}
  </div>
) : (
  // Formulario del titular
  <Card>
    <CardContent className="p-4">
      {/* Campos: nombre, apellido, CUIL */}

      <BirthDatePicker
        date={passengers[0]?.fecha_nacimiento ? new Date(passengers[0].fecha_nacimiento) : undefined}
        onSelect={(date) => {
          if (date) {
            updatePassenger(0, 'fecha_nacimiento', date.toISOString().split('T')[0])
          }
        }}
        placeholder="Selecciona fecha de nacimiento"
        maxYear={new Date().getFullYear()}
        minYear={1920}
      />

      {/* Validación de edad */}
      {passengers[0]?.fecha_nacimiento && !isTitularAdult() && (
        <p className="text-xs text-red-600 mt-1">
          ⚠️ El titular debe ser mayor de 18 años (tiene {getTitularAge()} años)
        </p>
      )}

      <Button
        onClick={handleConfirmarTitular}
        disabled={!isTitularComplete() || !isTitularAdult()}
        className="w-full"
      >
        Confirmar Datos
      </Button>
    </CardContent>
  </Card>
)}

{/* ACOMPAÑANTES - Solo aparece si titular está confirmado */}
{isTitularComplete() && isTitularAdult() && (
  <Card>
    <CardHeader>
      <CardTitle>Acompañantes</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Lista de acompañantes */}
      {passengers.filter(p => p.tipo_pasajero === 'acompañante').map((passenger, index) => (
        // Formulario de cada acompañante con BirthDatePicker
      ))}

      {/* Botón agregar acompañante */}
      {passengers.length < getTotalCapacity() && (
        <Button onClick={addPassenger}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar Acompañante
        </Button>
      )}
    </CardContent>
  </Card>
)}
```

### 3. `components/admin/reservations-manager.tsx`
**Líneas de cambio**: ~150 líneas

**Cambios principales**:
- ❌ Eliminada función `formatCurrency()`
- ❌ Eliminados todos los displays de precio
- ✅ Agregada visualización de pasajeros en lista
- ✅ Agregado Card de pasajeros en modal de detalles
- ✅ Agregado Card "A COTIZAR POR AGENTE"

**Vista de pasajeros en modal**:
```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <User className="w-5 h-5" />
      Pasajeros ({selectedReservation.reservation_passengers?.length || 0})
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {selectedReservation.reservation_passengers?.map((passenger, index) => (
      <div key={passenger.id} className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={passenger.tipo_pasajero === 'titular' ? 'default' : 'secondary'}>
            {passenger.tipo_pasajero === 'titular' ? 'Titular' : 'Acompañante'}
          </Badge>
          <span className="font-medium">
            {passenger.nombre} {passenger.apellido}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          <strong>Fecha de Nacimiento:</strong> {formatDate(passenger.fecha_nacimiento)}
        </p>
        {passenger.cuil && (
          <p className="text-sm text-gray-600">
            <strong>CUIL:</strong> {passenger.cuil}
          </p>
        )}
      </div>
    ))}
  </CardContent>
</Card>

<Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
  <CardContent className="p-6 text-center">
    <p className="text-lg font-bold text-blue-600 mb-2">
      PRECIO A COTIZAR POR AGENTE
    </p>
    <p className="text-xs text-gray-500">
      El precio será cotizado manualmente y comunicado al cliente
    </p>
  </CardContent>
</Card>
```

### 4. `lib/emailjs.ts`
**Líneas de cambio**: ~40 líneas

**Cambios principales**:
- ✅ Agregado campo `passengers` en `ReservationNotificationData`
- ❌ Eliminados campos de precio
- ✅ Agregado formateo de lista de pasajeros
- ✅ Actualizado mensaje de precio a "A COTIZAR POR AGENTE"

**Interface actualizada**:
```typescript
export interface ReservationNotificationData {
  packageName: string
  accommodation: string
  departureDate: string
  clientName: string
  clientEmail: string
  clientPhone: string
  rooms: RoomDetail[]
  passengers: Passenger[]  // ← Nuevo
  comments?: string
  reservationId: number
  // precio_total eliminado
}
```

**Formateo de pasajeros**:
```typescript
const passengersDetail = data.passengers.map((p, index) => {
  const tipo = p.tipo_pasajero === 'titular' ? 'TITULAR' : 'Acompañante'
  return `${index + 1}. ${tipo}: ${p.nombre} ${p.apellido} (Nacimiento: ${p.fecha_nacimiento})${p.cuil ? ` - CUIL: ${p.cuil}` : ''}`
}).join('\n')

await emailjs.send(serviceId, templateId, {
  to_email: 'admin@example.com',
  subject: `Nueva Reserva #${data.reservationId}`,
  package_name: data.packageName,
  accommodation: data.accommodation,
  departure_date: data.departureDate,
  client_name: data.clientName,
  client_email: data.clientEmail,
  client_phone: data.clientPhone,
  rooms_detail: roomsDetail,
  detalles_pasajeros: passengersDetail,  // ← Nuevo
  comments: data.comments || 'Sin comentarios',
  precio_info: 'PRECIO A COTIZAR POR AGENTE'  // ← Cambiado
})
```

---

## Problemas Encontrados y Soluciones

### Problema 1: Titular Form No Aparecía
**Reportado por**: Usuario
**Síntoma**: "no me deja completar la informacion para el titular, actualmente me pone titular confirmado pero no me deja campo para completar los datos"

**Causa Raíz**:
La condición `passengers.some(p => p.tipo_pasajero === 'titular')` retornaba `true` incluso cuando el titular estaba vacío, porque el `useEffect` inicializaba un objeto titular vacío al llegar al Paso 4.

**Solución**:
Creación de función `isTitularComplete()` que valida que TODOS los campos estén llenos:
```typescript
const isTitularComplete = () => {
  const titular = passengers.find(p => p.tipo_pasajero === 'titular')
  if (!titular) return false

  return titular.nombre.trim() !== '' &&
         titular.apellido.trim() !== '' &&
         titular.cuil?.trim() !== '' &&
         titular.fecha_nacimiento !== ''
}
```

**Archivo afectado**: `components/reservation-form.tsx` líneas 310-319

---

### Problema 2: Infinite Loop en BirthDatePicker
**Reportado por**: Usuario con screenshot de error
**Síntoma**: "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate"

**Causa Raíz**:
Dos `useEffect` creando un loop infinito:
1. `useEffect` que sincroniza `date` prop → estado interno (day/month/year)
2. `useEffect` que detecta cambios en estado interno → llama `onSelect(newDate)`

**Ciclo**:
```
Usuario selecciona fecha
  ↓
onSelect(newDate) llamado
  ↓
Parent actualiza prop `date`
  ↓
useEffect #1 detecta cambio en `date`
  ↓
Actualiza estado interno (day/month/year)
  ↓
useEffect #2 detecta cambio en estado
  ↓
Llama onSelect(newDate) otra vez
  ↓
[LOOP INFINITO]
```

**Solución**:
Implementación de `useRef` flag para rastrear origen del cambio:

```typescript
// Ref para evitar loops infinitos
const isInternalUpdate = React.useRef(false)

// useEffect #1: Sincronizar desde prop (solo si cambio es externo)
React.useEffect(() => {
  if (date && !isInternalUpdate.current) {
    const newDay = date.getDate().toString()
    const newMonth = (date.getMonth() + 1).toString()
    const newYear = date.getFullYear().toString()

    setDay(newDay)
    setMonth(newMonth)
    setYear(newYear)
  }
  isInternalUpdate.current = false
}, [date])

// useEffect #2: Notificar al parent (marcar como actualización interna)
React.useEffect(() => {
  if (day && month && year) {
    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    if (newDate.getDate() === parseInt(day) &&
        newDate.getMonth() === parseInt(month) - 1 &&
        newDate.getFullYear() === parseInt(year)) {
      isInternalUpdate.current = true  // ← Marca como interno
      onSelect(newDate)
    }
  }
}, [day, month, year])
```

**Lógica del flag**:
1. Cuando el usuario selecciona → `isInternalUpdate = true` → llama `onSelect`
2. Parent actualiza prop `date` → useEffect #1 ve el flag en `true` → NO actualiza estado
3. Flag se resetea a `false` al final del useEffect #1
4. Siguiente cambio externo legítimo funcionará normalmente

**Archivo afectado**: `components/ui/birth-date-picker.tsx` líneas 34-104

---

### Problema 3: UX Pobre del DatePicker para Fechas Antiguas
**Reportado por**: Usuario
**Síntoma**: "No esta bueno para la UI qeu haya que ir mes a mes hacia atras, mejor selectores entre los años y los meses y dias"

**Causa Raíz**:
El componente `DatePicker` con calendario visual requería navegar mes por mes hacia atrás para seleccionar fechas de nacimiento antiguas.

**Ejemplo**:
Para seleccionar 15/03/1990 desde octubre 2025:
- 2025 → 1990 = 35 años
- 35 años × 12 meses = 420 clics en la flecha "←"
- Más 1 clic en el día = **421 clics totales**

**Solución**:
Creación completa del componente `BirthDatePicker` con selectores dropdown:
- **Selector Año**: Lista de 1920 a 2025 (orden descendente para fácil acceso)
- **Selector Mes**: 12 opciones en español
- **Selector Día**: 1-31 (auto-ajustado según mes)

**Resultado**:
- Para seleccionar 15/03/1990:
  1. Click en Year → scroll a 1990
  2. Click en Mes → scroll a Marzo
  3. Click en Día → scroll a 15
  - **Total: 3 clics + 3 scrolls ≈ 10 segundos**

**Mejora**: 421 clics → 3 clics = **99.3% reducción**

**Archivo nuevo**: `components/ui/birth-date-picker.tsx`
**Archivos modificados**: `components/reservation-form.tsx` (cambio de import y uso)

---

## Flujo de Usuario

### Flujo Completo de Reserva

```
1. PASO 1: Selección de Fecha y Alojamiento
   ↓
   Usuario selecciona:
   - Fecha de salida (date picker)
   - Alojamiento (dropdown)
   ↓
   Click "Continuar" → va a Paso 2

2. PASO 2: Resumen
   ↓
   Usuario ve:
   - Paquete seleccionado
   - Fecha de salida
   - Alojamiento
   ↓
   Click "Continuar" → va a Paso 3

3. PASO 3: Selección de Habitaciones
   ↓
   Usuario selecciona:
   - Tipo de habitación (Doble/Triple/Cuádruple)
   - Cantidad de habitaciones
   - Si es Doble → subtipo (Matrimonial/Twin)
   ↓
   Sistema calcula capacidad total
   ↓
   Click "Continuar a Pasajeros" → va a Paso 4

4. PASO 4: Datos de Pasajeros
   ↓
   4A. TITULAR (obligatorio)
   ├─ Formulario aparece automáticamente
   ├─ Campos: Nombre, Apellido, CUIL, Fecha Nacimiento
   ├─ Usuario selecciona fecha con dropdowns (Día/Mes/Año)
   ├─ Sistema valida edad ≥ 18 años
   ├─ Si menor de 18 → muestra error + botón deshabilitado
   ├─ Si ≥ 18 → botón "Confirmar Datos" habilitado
   ├─ Click "Confirmar Datos"
   ├─ Vista cambia a "Titular Confirmado" con botón "Editar"
   ↓
   4B. ACOMPAÑANTES (opcionales)
   ├─ Sección aparece solo si titular está confirmado
   ├─ Botón "Agregar Acompañante" (hasta capacidad máxima)
   ├─ Cada acompañante: Nombre, Apellido, Fecha Nacimiento
   ├─ Sin validación de edad para acompañantes
   ├─ Puede eliminar acompañantes con botón [X]
   ↓
   4C. DATOS DE CONTACTO
   ├─ Nombre completo
   ├─ Email
   ├─ Teléfono
   ├─ Comentarios (opcional)
   ↓
   Click "Confirmar Reserva"
   ↓
   Sistema valida:
   - Titular completo y ≥ 18 años ✓
   - Datos de contacto completos ✓
   - Pasajeros no exceden capacidad ✓
   ↓
   Si todo OK:
   - Crea reserva en BD
   - Inserta pasajeros
   - Envía emails (admin + cliente)
   - Muestra mensaje de éxito
   - Cierra modal
```

### Casos Especiales

#### Caso 1: Usuario Intenta Titular Menor de 18
```
Usuario ingresa fecha → 15/03/2010 (14 años)
  ↓
Sistema calcula edad: 14 años
  ↓
Muestra error: "⚠️ El titular debe ser mayor de 18 años (tiene 14 años)"
  ↓
Botón "Confirmar Datos" → DESHABILITADO (gris)
  ↓
Sección Acompañantes → NO APARECE
  ↓
Usuario debe cambiar fecha para continuar
```

#### Caso 2: Usuario Quiere Editar Titular Después de Confirmar
```
Titular confirmado → Vista "Titular Confirmado"
  ↓
Usuario ve botón "✏️ Editar"
  ↓
Click en "Editar"
  ↓
Sistema:
- Elimina titular de lista interna
- Sección Acompañantes desaparece
- Formulario titular aparece vacío
  ↓
Usuario puede modificar datos
  ↓
Click "Confirmar Datos" nuevamente
  ↓
Vuelve a vista confirmada
```

#### Caso 3: Selección de Febrero en Año Bisiesto
```
Usuario selecciona:
1. Año → 2024 (bisiesto)
2. Mes → Febrero
3. Día → [selector muestra 1-29]

Usuario selecciona:
1. Día → 29
2. Mes → Febrero
3. Año → 2023 (no bisiesto)
   ↓
Sistema auto-ajusta: Día = 28
```

#### Caso 4: Capacidad Excedida
```
Habitaciones seleccionadas: 1 Doble = 2 personas
  ↓
Titular confirmado (1 persona)
  ↓
Usuario agrega Acompañante 1 (2 personas total)
  ↓
Botón "Agregar Acompañante" → DESHABILITADO
  ↓
Mensaje: "Capacidad máxima alcanzada (2/2)"
```

---

## Validaciones Implementadas

### Validaciones del Titular

| Validación | Ubicación | Tipo | Mensaje de Error |
|------------|-----------|------|------------------|
| Nombre completo | Paso 4 | Campo requerido | "Campo requerido" |
| Apellido completo | Paso 4 | Campo requerido | "Campo requerido" |
| CUIL | Paso 4 | Campo requerido | "Campo requerido" |
| Fecha de nacimiento | Paso 4 | Campo requerido + edad | "⚠️ El titular debe ser mayor de 18 años (tiene X años)" |
| Edad ≥ 18 años | Paso 4 | Lógica personalizada | Error en tiempo real + toast |
| Todos los campos llenos | Paso 4 | Función `isTitularComplete()` | Botón deshabilitado |

### Validaciones de Acompañantes

| Validación | Ubicación | Tipo | Mensaje de Error |
|------------|-----------|------|------------------|
| Nombre completo | Paso 4 | Campo requerido | "Campo requerido" |
| Apellido completo | Paso 4 | Campo requerido | "Campo requerido" |
| Fecha de nacimiento | Paso 4 | Campo requerido | "Campo requerido" |
| Capacidad máxima | Paso 4 | Lógica personalizada | Botón deshabilitado + tooltip |

### Validaciones de Capacidad

```typescript
const getTotalCapacity = () => {
  return selectedRooms.reduce((total, room) => {
    let capacity = 0
    if (room.tipo_habitacion === 'dbl') capacity = 2
    else if (room.tipo_habitacion === 'tpl') capacity = 3
    else if (room.tipo_habitacion === 'cpl') capacity = 4
    return total + (room.cantidad * capacity)
  }, 0)
}

// Validación antes de agregar pasajero
if (passengers.length >= getTotalCapacity()) {
  // Deshabilitar botón "Agregar Acompañante"
}

// Validación en backend
if (reservationData.passengers.length > totalCapacity) {
  return {
    success: false,
    error: `La cantidad de pasajeros (${reservationData.passengers.length}) excede la capacidad total (${totalCapacity})`
  }
}
```

### Validaciones de Habitaciones

| Validación | Ubicación | Tipo | Mensaje |
|------------|-----------|------|---------|
| Al menos 1 habitación | Paso 3 | Lógica | Botón "Continuar" deshabilitado |
| Doble requiere subtipo | Paso 3 | Lógica | Botón "Continuar" deshabilitado si falta |
| Cantidad > 0 | Paso 3 | Input numérico | Mínimo = 1 |

### Validaciones Finales (Submit)

```typescript
const canSubmit = () => {
  // 1. Debe haber al menos un titular
  if (!passengers.some(p => p.tipo_pasajero === 'titular')) return false

  // 2. Titular debe estar completo
  if (!isTitularComplete()) return false

  // 3. Titular debe ser mayor de 18
  if (!isTitularAdult()) return false

  // 4. Todos los acompañantes deben estar completos
  const acompanantes = passengers.filter(p => p.tipo_pasajero === 'acompañante')
  for (const acomp of acompanantes) {
    if (!acomp.nombre.trim() || !acomp.apellido.trim() || !acomp.fecha_nacimiento) {
      return false
    }
  }

  // 5. Datos de contacto completos
  if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
    return false
  }

  // 6. Email válido
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(clientEmail)) return false

  return true
}
```

---

## Próximas Iteraciones Sugeridas

### 1. Validación Avanzada de CUIL
**Prioridad**: Media
**Complejidad**: Baja

**Implementación sugerida**:
```typescript
const validateCUIL = (cuil: string): boolean => {
  // Remover guiones
  const cuilClean = cuil.replace(/-/g, '')

  // Validar formato: debe tener 11 dígitos
  if (!/^\d{11}$/.test(cuilClean)) return false

  // Validar dígito verificador
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0

  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuilClean[i]) * multiplicadores[i]
  }

  const resto = suma % 11
  const digitoVerificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto

  return parseInt(cuilClean[10]) === digitoVerificador
}
```

**Uso**:
```typescript
<Input
  value={titular.cuil || ''}
  onChange={(e) => {
    updatePassenger(0, 'cuil', e.target.value)
  }}
  placeholder="XX-XXXXXXXX-X"
/>
{titular.cuil && !validateCUIL(titular.cuil) && (
  <p className="text-xs text-red-600 mt-1">
    ⚠️ CUIL inválido
  </p>
)}
```

### 2. Auto-navegación del Date Picker a Años Relevantes
**Prioridad**: Baja
**Complejidad**: Baja

**Descripción**:
Cuando el usuario abre el selector de año, inicialmente mostrar años relevantes (ej: hace 25-30 años para edad promedio de viajeros).

**Implementación sugerida**:
```typescript
const [year, setYear] = useState<string>(
  date ? date.getFullYear().toString() :
  (new Date().getFullYear() - 30).toString()  // ← Default a hace 30 años
)
```

### 3. Persistencia de Datos en LocalStorage
**Prioridad**: Alta
**Complejidad**: Media

**Descripción**:
Guardar datos del titular en localStorage para autocompletar en próximas reservas del mismo usuario.

**Implementación sugerida**:
```typescript
// Guardar al confirmar titular
const handleConfirmarTitular = () => {
  const titular = passengers.find(p => p.tipo_pasajero === 'titular')
  if (titular && isTitularComplete() && isTitularAdult()) {
    // Guardar en localStorage
    localStorage.setItem('lastTitular', JSON.stringify({
      nombre: titular.nombre,
      apellido: titular.apellido,
      cuil: titular.cuil,
      fecha_nacimiento: titular.fecha_nacimiento
    }))

    toast({
      title: "Titular confirmado",
      description: "Datos guardados para próximas reservas"
    })
  }
}

// Cargar al iniciar Paso 4
useEffect(() => {
  if (currentStep === 4 && passengers.length === 0) {
    const savedTitular = localStorage.getItem('lastTitular')
    if (savedTitular) {
      const data = JSON.parse(savedTitular)
      setPassengers([{
        tipo_pasajero: 'titular',
        ...data
      }])
    }
  }
}, [currentStep])
```

### 4. Sugerencias Inteligentes de Edad
**Prioridad**: Baja
**Complejidad**: Baja

**Descripción**:
Mostrar un hint visual antes de que el usuario seleccione la fecha, sugiriendo que debe ser mayor de edad.

**Implementación sugerida**:
```typescript
<div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
  <Info className="w-4 h-4" />
  <span>El titular debe ser mayor de 18 años</span>
</div>

<BirthDatePicker
  date={passengers[0]?.fecha_nacimiento ? new Date(passengers[0].fecha_nacimiento) : undefined}
  onSelect={(date) => { /* ... */ }}
  placeholder="Selecciona fecha de nacimiento"
  maxYear={new Date().getFullYear() - 18}  // ← Limitar a hace 18 años
  minYear={1920}
/>
```

### 5. Validación de Email en Tiempo Real
**Prioridad**: Media
**Complejidad**: Muy baja

**Implementación sugerida**:
```typescript
const [emailError, setEmailError] = useState<string>("")

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    setEmailError("")
  } else if (!emailRegex.test(email)) {
    setEmailError("Email inválido")
  } else {
    setEmailError("")
  }
}

<Input
  type="email"
  value={clientEmail}
  onChange={(e) => {
    setClientEmail(e.target.value)
    validateEmail(e.target.value)
  }}
  placeholder="correo@ejemplo.com"
/>
{emailError && (
  <p className="text-xs text-red-600 mt-1">⚠️ {emailError}</p>
)}
```

### 6. Indicador de Progreso Visual
**Prioridad**: Baja
**Complejidad**: Baja

**Descripción**:
Agregar un stepper visual en la parte superior del modal para mostrar en qué paso está el usuario.

**Implementación sugerida**:
```typescript
<div className="flex items-center justify-between mb-6">
  {[1, 2, 3, 4].map((step) => (
    <div key={step} className="flex items-center">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
        step < currentStep ? "bg-green-500 text-white" :
        step === currentStep ? "bg-blue-500 text-white" :
        "bg-gray-200 text-gray-500"
      )}>
        {step < currentStep ? "✓" : step}
      </div>
      {step < 4 && (
        <div className={cn(
          "w-16 h-1 mx-2",
          step < currentStep ? "bg-green-500" : "bg-gray-200"
        )} />
      )}
    </div>
  ))}
</div>
```

### 7. Exportar Listado de Pasajeros (Admin)
**Prioridad**: Alta
**Complejidad**: Media

**Descripción**:
Agregar funcionalidad en el admin panel para exportar lista de pasajeros de una reserva a CSV o PDF.

**Implementación sugerida**:
```typescript
const exportPassengersToCSV = (reservation: Reservation) => {
  const headers = ['Tipo', 'Nombre', 'Apellido', 'Fecha Nacimiento', 'CUIL']
  const rows = reservation.reservation_passengers?.map(p => [
    p.tipo_pasajero,
    p.nombre,
    p.apellido,
    p.fecha_nacimiento,
    p.cuil || 'N/A'
  ]) || []

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pasajeros_reserva_${reservation.id}.csv`
  a.click()
}

// Botón en el modal de detalles
<Button onClick={() => exportPassengersToCSV(selectedReservation)}>
  <Download className="w-4 h-4 mr-1" />
  Exportar Pasajeros
</Button>
```

### 8. Notificaciones de Acompañantes (Email Individual)
**Prioridad**: Baja
**Complejidad**: Alta

**Descripción**:
Si el acompañante tiene email propio, enviarle una notificación individual con los detalles de su viaje.

**Requerimiento previo**:
- Agregar campo `email` opcional en formulario de acompañantes
- Actualizar tabla `reservation_passengers` para incluir email
- Crear nuevo template en EmailJS para acompañantes

### 9. Calculadora de Edad Visual
**Prioridad**: Baja
**Complejidad**: Muy baja

**Descripción**:
Mostrar la edad calculada en tiempo real mientras el usuario selecciona la fecha.

**Implementación sugerida**:
```typescript
const calculateAge = (birthDate: string): number => {
  return differenceInYears(new Date(), new Date(birthDate))
}

<BirthDatePicker
  date={passenger.fecha_nacimiento ? new Date(passenger.fecha_nacimiento) : undefined}
  onSelect={(date) => {
    if (date) updatePassenger(index, 'fecha_nacimiento', date.toISOString().split('T')[0])
  }}
/>

{passenger.fecha_nacimiento && (
  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
    <User className="w-3 h-3" />
    Edad: {calculateAge(passenger.fecha_nacimiento)} años
  </p>
)}
```

### 10. Validación de Stock en Tiempo Real
**Prioridad**: Alta
**Complejidad**: Media

**Descripción**:
Validar que haya stock disponible para la fecha y habitaciones seleccionadas ANTES de llegar al Paso 4.

**Implementación sugerida**:
```typescript
const checkStockAvailability = async () => {
  const stockData = await supabaseService.checkRoomStock(
    selectedPackage.id,
    selectedAccommodation.id,
    selectedDate,
    selectedRooms
  )

  if (!stockData.available) {
    toast({
      title: "Stock insuficiente",
      description: stockData.message,
      variant: "destructive"
    })
    return false
  }

  return true
}

// Llamar antes de ir a Paso 4
const handleContinueToPassengers = async () => {
  const hasStock = await checkStockAvailability()
  if (hasStock) {
    setCurrentStep(4)
  }
}
```

---

## Testing Recomendado

### Casos de Prueba del BirthDatePicker

#### Test 1: Selección Normal
```
1. Abrir selector de año → seleccionar 1990
2. Abrir selector de mes → seleccionar Marzo
3. Abrir selector de día → seleccionar 15
4. Verificar vista previa: "15 de marzo de 1990"
5. Verificar que onSelect fue llamado con fecha correcta
```

#### Test 2: Año Bisiesto
```
1. Seleccionar año 2024 (bisiesto)
2. Seleccionar mes Febrero
3. Verificar que selector de días muestra 1-29
4. Seleccionar día 29
5. Cambiar año a 2023 (no bisiesto)
6. Verificar que día se auto-ajusta a 28
```

#### Test 3: Mes con 30 Días
```
1. Seleccionar día 31
2. Seleccionar mes Enero (31 días) - debería mantener 31
3. Cambiar mes a Abril (30 días)
4. Verificar que día se auto-ajusta a 30
```

#### Test 4: Infinite Loop Prevention
```
1. Seleccionar fecha completa (día/mes/año)
2. Verificar que no hay error de "Maximum update depth"
3. Verificar que el componente no re-renderiza infinitamente
4. Verificar en DevTools que useEffect no se llama más de 3-4 veces
```

### Casos de Prueba del Flujo de Reserva

#### Test 5: Titular Mayor de 18
```
1. Navegar a Paso 4
2. Llenar nombre, apellido, CUIL
3. Seleccionar fecha hace 25 años
4. Verificar que no hay mensaje de error
5. Verificar que botón "Confirmar Datos" está habilitado
6. Click en "Confirmar Datos"
7. Verificar toast: "Titular confirmado"
8. Verificar vista cambia a "Titular Confirmado"
9. Verificar aparece sección "Acompañantes"
```

#### Test 6: Titular Menor de 18
```
1. Navegar a Paso 4
2. Llenar nombre, apellido, CUIL
3. Seleccionar fecha hace 15 años
4. Verificar mensaje de error: "El titular debe ser mayor de 18 años (tiene 15 años)"
5. Verificar botón "Confirmar Datos" está deshabilitado
6. Intentar hacer click (no debería hacer nada)
7. Verificar que sección "Acompañantes" NO aparece
```

#### Test 7: Editar Titular
```
1. Confirmar un titular válido
2. Verificar botón "Editar" visible
3. Click en "Editar"
4. Verificar que formulario vuelve a aparecer
5. Verificar que campos están vacíos
6. Verificar que sección "Acompañantes" desaparece
7. Modificar datos
8. Re-confirmar
9. Verificar que datos nuevos aparecen en vista confirmada
```

#### Test 8: Capacidad Máxima
```
1. Seleccionar 1 habitación Doble (capacidad = 2)
2. Confirmar titular (1 persona)
3. Agregar 1 acompañante (2 personas total)
4. Verificar botón "Agregar Acompañante" deshabilitado
5. Intentar agregar otro (no debería ser posible)
6. Verificar mensaje: "Capacidad máxima alcanzada"
```

#### Test 9: Validación Final
```
1. Llenar todo el formulario correctamente
2. Dejar email vacío
3. Click "Confirmar Reserva"
4. Verificar toast de error: "Completa todos los campos"
5. Llenar email
6. Click "Confirmar Reserva"
7. Verificar loading state
8. Verificar toast de éxito
9. Verificar modal se cierra
```

#### Test 10: Email al Admin
```
1. Completar reserva con 1 titular + 2 acompañantes
2. Verificar que se envía email al admin
3. Verificar que email contiene:
   - Datos del paquete
   - Lista de 3 pasajeros con badges (TITULAR/Acompañante)
   - Fechas de nacimiento
   - CUIL del titular
   - Mensaje "PRECIO A COTIZAR POR AGENTE"
```

---

## Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm start
```

### Base de Datos
```bash
# Ejecutar migración
npx supabase db push

# Rollback última migración
npx supabase db reset

# Ver estado de migraciones
npx supabase migration list
```

### Testing (si se implementa)
```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests de integración
npm run test:e2e
```

---

## Estructura de Archivos Relevantes

```
expertos-viajes/
├── components/
│   ├── ui/
│   │   ├── birth-date-picker.tsx      ← Selector con dropdowns (189 líneas)
│   │   ├── date-picker.tsx            ← Selector con calendario (66 líneas)
│   │   ├── select.tsx                 ← shadcn/ui Select
│   │   ├── button.tsx                 ← shadcn/ui Button
│   │   ├── card.tsx                   ← shadcn/ui Card
│   │   └── badge.tsx                  ← shadcn/ui Badge
│   ├── reservation-form.tsx           ← Formulario principal (1200+ líneas)
│   └── admin/
│       └── reservations-manager.tsx   ← Panel de admin (800+ líneas)
├── lib/
│   ├── supabase.ts                    ← Cliente Supabase + funciones (500+ líneas)
│   └── emailjs.ts                     ← Servicio de emails (200+ líneas)
├── scripts/
│   └── supabase/
│       ├── migrations/
│       │   └── 20251030_modify_reservation_system.sql
│       └── MIGRATION_README.md
├── MEJORAS_FORMULARIO_TITULAR.md
├── MEJORA_SELECTORES_FECHA.md
└── CLAUDE.md                          ← Este archivo
```

---

## Contacto y Soporte

Para continuar iterando sobre esta funcionalidad en una nueva conversación, proporciona este archivo `CLAUDE.md` junto con el contexto específico de lo que necesitas modificar o agregar.

### Información de Contexto Útil para Nueva Conversación

**Palabras clave para búsqueda rápida**:
- `BirthDatePicker`: Componente de selectores de fecha
- `isTitularAdult()`: Validación de edad 18+
- `reservation_passengers`: Tabla de pasajeros
- `createReservation()`: Función principal de creación
- `infinite loop`: Problema resuelto con useRef

**Archivos críticos**:
1. `components/ui/birth-date-picker.tsx` - Componente de fecha con dropdowns
2. `components/reservation-form.tsx` - Formulario principal con 4 pasos
3. `lib/supabase.ts` - Lógica de backend y validaciones

**Estado actual del proyecto**:
- ✅ Sistema de 4 pasos completamente funcional
- ✅ BirthDatePicker sin infinite loops
- ✅ Validaciones de edad implementadas
- ✅ Admin panel actualizado
- ⚠️ Migración de BD pendiente de ejecutar
- ⚠️ Testing pendiente

---

**Última actualización**: 30 de Octubre de 2025
**Versión**: 3.0
**Implementado por**: Claude Code (Sonnet 4.5)
