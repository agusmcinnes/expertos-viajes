import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Número de legajo de la agencia (registro de agencias de viaje)
export const LEGAJO_NUMERO = "20215"
