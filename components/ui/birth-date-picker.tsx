"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BirthDatePickerProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minYear?: number
  maxYear?: number
}

export function BirthDatePicker({
  date,
  onSelect,
  placeholder = "Selecciona fecha de nacimiento",
  disabled = false,
  minYear = 1920,
  maxYear = new Date().getFullYear()
}: BirthDatePickerProps) {
  const [day, setDay] = React.useState<string>(date ? date.getDate().toString() : "")
  const [month, setMonth] = React.useState<string>(date ? (date.getMonth() + 1).toString() : "")
  const [year, setYear] = React.useState<string>(date ? date.getFullYear().toString() : "")

  // Ref para evitar loops infinitos
  const isInternalUpdate = React.useRef(false)

  // Actualizar los selects cuando cambia la prop date desde el exterior
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

  // Generar arrays de opciones
  const years = React.useMemo(() => {
    const yearsArray = []
    for (let y = maxYear; y >= minYear; y--) {
      yearsArray.push(y)
    }
    return yearsArray
  }, [minYear, maxYear])

  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  // Calcular días disponibles según el mes y año
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  const days = React.useMemo(() => {
    if (!month || !year) return Array.from({ length: 31 }, (_, i) => i + 1)

    const daysInMonth = getDaysInMonth(parseInt(month), parseInt(year))
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [month, year])

  // Actualizar la fecha cuando cambia algún selector
  React.useEffect(() => {
    if (day && month && year) {
      const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

      // Validar que la fecha sea válida
      if (newDate.getDate() === parseInt(day) &&
          newDate.getMonth() === parseInt(month) - 1 &&
          newDate.getFullYear() === parseInt(year)) {
        isInternalUpdate.current = true
        onSelect(newDate)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year])

  // Ajustar el día si es mayor que los días del mes seleccionado
  React.useEffect(() => {
    if (day && month && year) {
      const maxDays = getDaysInMonth(parseInt(month), parseInt(year))
      if (parseInt(day) > maxDays) {
        setDay(maxDays.toString())
      }
    }
  }, [month, year])

  const formatDate = () => {
    if (day && month && year) {
      const monthName = months[parseInt(month) - 1]?.label
      return `${day} de ${monthName} de ${year}`
    }
    return placeholder
  }

  const hasValue = day && month && year

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <CalendarIcon className="w-4 h-4" />
        <span className={hasValue ? "text-gray-900 font-medium" : "text-gray-500"}>
          {formatDate()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Selector de Día */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Día</label>
          <Select
            value={day}
            onValueChange={setDay}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Día" />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Mes */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Mes</label>
          <Select
            value={month}
            onValueChange={setMonth}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Año */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Año</label>
          <Select
            value={year}
            onValueChange={setYear}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
