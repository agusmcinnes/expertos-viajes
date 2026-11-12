export type RoomType = 'sgl' | 'dbl' | 'tpl' | 'cpl' | 'qpl'
export type RoomSubtype = 'matrimonial' | 'twin' | null | undefined

/** Orden canónico: Single, Doble, Triple, Cuádruple, Quíntuple. */
export const ROOM_TYPES: readonly RoomType[] = ['sgl', 'dbl', 'tpl', 'cpl', 'qpl']

/** Menores que puede sumar cada habitación (además de su base), según el tipo. */
export const MAX_MENORES_POR_HABITACION: Readonly<Record<RoomType, number>> = {
  sgl: 0,
  dbl: 2,
  tpl: 2,
  cpl: 2,
  qpl: 0,
}

/**
 * Techo de habitaciones de un tipo cuando el cupo no se controla (stock ilimitado o columna en NULL).
 * Es sólo un límite razonable para el formulario, no un cupo real.
 */
export const UNCONTROLLED_ROOM_LIMIT = 10

/** Una fila de habitaciones tal como la arma el formulario y la guarda `reservation_details`. */
export interface RoomDetailInput {
  tipo_habitacion: RoomType
  cantidad: number
  subtipo_habitacion?: RoomSubtype
  /** Menores que comparten la habitación pagando tarifa de menor, además de la base. */
  menores?: number | null
}

export function isRoomType(value: unknown): value is RoomType {
  return typeof value === 'string' && (ROOM_TYPES as readonly string[]).includes(value)
}

export function getRoomTypeName(tipo: RoomType | string): string {
  if (tipo === 'sgl') return 'Single'
  if (tipo === 'dbl') return 'Doble'
  if (tipo === 'tpl') return 'Triple'
  if (tipo === 'cpl') return 'Cuádruple'
  if (tipo === 'qpl') return 'Quíntuple'
  return tipo
}

export function getRoomCapacity(tipo: RoomType | string): number {
  if (tipo === 'sgl') return 1
  if (tipo === 'dbl') return 2
  if (tipo === 'tpl') return 3
  if (tipo === 'cpl') return 4
  if (tipo === 'qpl') return 5
  return 0
}

/** Menores que admite UNA habitación de ese tipo: 2 en doble, triple y cuádruple; 0 en single y quíntuple. */
export function maxMenores(tipo: RoomType | string): number {
  return isRoomType(tipo) ? MAX_MENORES_POR_HABITACION[tipo] : 0
}

/**
 * Capacidad total (pasajeros) de una lista de habitaciones: Σ (cantidad × capacidad + menores).
 * Es la única cuenta de capacidad que tiene que usar el front.
 */
export function roomsCapacity(
  rooms: ReadonlyArray<{ tipo_habitacion: RoomType | string; cantidad: number; menores?: number | null }> | null | undefined,
): number {
  if (!rooms) return 0
  return rooms.reduce(
    (sum, room) => sum + (room.cantidad || 0) * getRoomCapacity(room.tipo_habitacion) + (room.menores || 0),
    0,
  )
}

/**
 * Valida tipos, cantidades y menores de una reserva (contrato §2.4).
 * Devuelve el primer error en español, listo para mostrar, o null si está todo bien.
 */
export function validateRoomDetails(
  rooms: ReadonlyArray<{ tipo_habitacion: string; cantidad: number; menores?: number | null }> | null | undefined,
): string | null {
  if (!rooms || rooms.length === 0) return 'Seleccioná al menos una habitación.'
  for (const room of rooms) {
    if (!isRoomType(room.tipo_habitacion)) {
      return `Tipo de habitación no válido: ${room.tipo_habitacion}.`
    }
    const nombre = getRoomTypeName(room.tipo_habitacion)
    if (!Number.isInteger(room.cantidad) || room.cantidad < 1) {
      return `La cantidad de habitaciones ${nombre} tiene que ser al menos 1.`
    }
    const menores = room.menores ?? 0
    if (!Number.isInteger(menores) || menores < 0) {
      return `La cantidad de menores en la habitación ${nombre} no es válida.`
    }
    const porHabitacion = maxMenores(room.tipo_habitacion)
    if (porHabitacion === 0 && menores > 0) {
      return `La habitación ${nombre} no admite menores.`
    }
    const max = porHabitacion * room.cantidad
    if (menores > max) {
      return room.cantidad === 1
        ? `Una habitación ${nombre} admite hasta ${max} menores.`
        : `${room.cantidad} habitaciones ${nombre} admiten hasta ${max} menores.`
    }
  }
  return null
}

export function getSubtypeLabel(subtipo: RoomSubtype): string {
  if (subtipo === 'matrimonial') return 'Matrimonial'
  if (subtipo === 'twin') return 'Twin'
  return ''
}

/** "1 menor" / "2 menores"; vacío si no hay. */
export function formatMenores(menores: number | null | undefined): string {
  if (!menores) return ''
  return `${menores} ${menores === 1 ? 'menor' : 'menores'}`
}

/** "1 Doble (Matrimonial)", "1 Doble (Matrimonial) + 1 menor", "1 Triple + 2 menores". */
export function formatRoomDetail(
  tipo: RoomType | string,
  cantidad: number,
  subtipo?: RoomSubtype,
  menores?: number | null,
): string {
  const parts = [`${cantidad} ${getRoomTypeName(tipo)}`]
  if (subtipo) parts.push(`(${getSubtypeLabel(subtipo)})`)
  if (menores) parts.push(`+ ${formatMenores(menores)}`)
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Cupo (stock) por tipo — contrato §2.5
// ---------------------------------------------------------------------------

/** Lo mínimo de una fila de `package_stock` para leer el cupo. Las filas viejas pueden no traer sgl/qpl. */
export interface RoomStockLike {
  stock_sgl?: number | null
  stock_dbl?: number | null
  stock_tpl?: number | null
  stock_cpl?: number | null
  stock_qpl?: number | null
  is_unlimited?: boolean | null
}

/**
 * Cupo de un tipo en una fila de stock.
 * - `null`: no se controla (stock ilimitado, o la columna del tipo está en NULL → «a confirmar»).
 * - número: habitaciones disponibles (0 = sin cupo).
 * - Sin fila de stock: 0 (la reserva no se puede hacer).
 */
export function getRoomStock(stock: RoomStockLike | null | undefined, tipo: RoomType): number | null {
  if (!stock) return 0
  if (stock.is_unlimited) return null
  const value = stock[`stock_${tipo}` as const]
  return value == null ? null : value
}

export type RoomStockKind =
  /** `is_unlimited`: no se controla ningún tipo. Etiqueta «Disponible». */
  | 'unlimited'
  /** Columna del tipo en NULL: se puede reservar y queda a confirmar. Etiqueta «A confirmar». */
  | 'unconfirmed'
  /** Cupo controlado y mayor a 0. Etiqueta «Quedan N» (N = lo que queda después de lo ya elegido). */
  | 'limited'
  /** Cupo controlado en 0 (o sin fila de stock). Etiqueta «Sin cupo». */
  | 'sold_out'

export interface RoomStockStatus {
  kind: RoomStockKind
  /** Cupo cargado; null si no se controla. */
  total: number | null
  /** Lo que queda después de las habitaciones ya elegidas; null si no se controla. */
  remaining: number | null
  /** Si se puede sumar una habitación más de este tipo (con UNCONTROLLED_ROOM_LIMIT como techo si no se controla). */
  canAdd: boolean
  /** «Disponible», «A confirmar», «Quedan N» o «Sin cupo». */
  label: string
}

/**
 * Estado del cupo de un tipo para el formulario de reserva.
 * `selected` es cuántas habitaciones de ese tipo ya eligió la persona.
 */
export function roomStockStatus(
  stock: RoomStockLike | null | undefined,
  tipo: RoomType,
  selected = 0,
): RoomStockStatus {
  const total = getRoomStock(stock, tipo)
  if (total === null) {
    const unlimited = !!stock?.is_unlimited
    return {
      kind: unlimited ? 'unlimited' : 'unconfirmed',
      total: null,
      remaining: null,
      canAdd: selected < UNCONTROLLED_ROOM_LIMIT,
      label: unlimited ? 'Disponible' : 'A confirmar',
    }
  }
  if (total <= 0) {
    return { kind: 'sold_out', total: 0, remaining: 0, canAdd: false, label: 'Sin cupo' }
  }
  const remaining = Math.max(0, total - selected)
  return { kind: 'limited', total, remaining, canAdd: remaining > 0, label: `Quedan ${remaining}` }
}
