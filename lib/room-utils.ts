export type RoomType = 'dbl' | 'tpl' | 'cpl' | 'qpl'
export type RoomSubtype = 'matrimonial' | 'twin' | null | undefined

export function getRoomTypeName(tipo: RoomType | string): string {
  if (tipo === 'dbl') return 'Doble'
  if (tipo === 'tpl') return 'Triple'
  if (tipo === 'cpl') return 'Cuádruple'
  if (tipo === 'qpl') return 'Quíntuple'
  return tipo
}

export function getRoomCapacity(tipo: RoomType | string): number {
  if (tipo === 'dbl') return 2
  if (tipo === 'tpl') return 3
  if (tipo === 'cpl') return 4
  if (tipo === 'qpl') return 5
  return 0
}

export function getSubtypeLabel(subtipo: RoomSubtype): string {
  if (subtipo === 'matrimonial') return 'Matrimonial'
  if (subtipo === 'twin') return 'Twin'
  return ''
}

export function formatRoomDetail(
  tipo: RoomType | string,
  cantidad: number,
  subtipo?: RoomSubtype,
): string {
  const parts = [`${cantidad} ${getRoomTypeName(tipo)}`]
  if (subtipo) parts.push(`(${getSubtypeLabel(subtipo)})`)
  return parts.join(' ')
}
