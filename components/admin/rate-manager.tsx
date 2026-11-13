"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm"
import { AlertTriangle, DollarSign, Edit, Info, RefreshCw, Save, Trash2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { toISODateLocal } from "@/lib/date-utils"
import {
  accommodationRateService,
  type AccommodationRate,
  type AccommodationRateInput,
  type AccommodationRateValues,
} from "@/lib/supabase"
import {
  RATE_FIELDS,
  departureISODates,
  packageDepartureISO,
  findRateForDeparture,
  formatDepartureDates,
  formatMonthList,
  formatPrice,
  groupRates,
  hasRate,
  isEmptyRate,
  monthYearOfDeparture,
  parseRateInput,
  rateCoverage,
  rateYearOptions,
  suggestRateYear,
  toDepartureISO,
  type RateField,
  type RateGroup,
  type RateValues,
} from "@/lib/rates"

// ---------------------------------------------------------------------------
// Tarifas de un hotel nuevo (todavía sin id real): viven en memoria hasta guardar el paquete.
// ---------------------------------------------------------------------------

/** Tarifa de un hotel nuevo, en memoria. `id` es temporal (negativo). */
export interface DraftRate {
  id: number
  mes: number
  anio: number
  /** 'YYYY-MM-DD' si es la tarifa de una salida; null si es la del mes. */
  fecha_salida: string | null
  tarifa_sgl: number | null
  tarifa_dbl: number | null
  tarifa_tpl: number | null
  tarifa_cpl: number | null
  tarifa_qpl: number | null
  tarifa_menor: number | null
  currency: string
}

/** Filas para insertar las tarifas en memoria de un hotel recién creado (`accommodationRateService.createMultipleRates`). */
export function draftRatesToInput(rows: ReadonlyArray<DraftRate>, accommodationId: number): AccommodationRateInput[] {
  return rows.map((r) => ({
    accommodation_id: accommodationId,
    mes: r.mes,
    anio: r.anio,
    fecha_salida: r.fecha_salida,
    tarifa_sgl: r.tarifa_sgl,
    tarifa_dbl: r.tarifa_dbl,
    tarifa_tpl: r.tarifa_tpl,
    tarifa_cpl: r.tarifa_cpl,
    tarifa_qpl: r.tarifa_qpl,
    tarifa_menor: r.tarifa_menor,
    currency: r.currency || "USD",
  }))
}

let draftSeq = 0
function nextDraftId(): number {
  draftSeq = (draftSeq + 1) % 1000
  return -(Date.now() * 1000 + draftSeq)
}

type Amounts = Record<RateField, number | null>

function draftRow(base: { mes: number; anio: number; fecha_salida: string | null }, values: Amounts, currency: string): DraftRate {
  return { id: nextDraftId(), ...base, ...values, currency }
}

/** Igual que `saveMonthlyRate`: una sola tarifa del mes por mes/año; `replaceIds` se saca (edición). */
function draftSaveMonthly(
  rows: ReadonlyArray<DraftRate>,
  mes: number,
  anio: number,
  values: Amounts,
  currency: string,
  replaceIds: ReadonlyArray<number>,
): DraftRate[] {
  const kept = rows.filter((r) => !replaceIds.includes(r.id) && !(r.fecha_salida == null && r.mes === mes && r.anio === anio))
  return [...kept, draftRow({ mes, anio, fecha_salida: null }, values, currency)]
}

/** Igual que `replaceDepartureRates`: una fila por salida; pisa las de esas salidas y saca `previousIds`. */
function draftSaveDepartures(
  rows: ReadonlyArray<DraftRate>,
  dates: ReadonlyArray<string>,
  values: Amounts,
  currency: string,
  previousIds: ReadonlyArray<number>,
): DraftRate[] {
  const set = new Set(dates)
  const kept = rows.filter((r) => {
    if (previousIds.includes(r.id)) return false
    const iso = r.fecha_salida ? toDepartureISO(r.fecha_salida) : null
    return !(iso && set.has(iso))
  })
  const added = dates.map((iso) => draftRow({ ...monthYearOfDeparture(iso)!, fecha_salida: iso }, values, currency))
  return [...kept, ...added]
}

// ---------------------------------------------------------------------------
// Utilidades de pantalla
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

type AmountInputs = Record<RateField, string>

const EMPTY_INPUTS: AmountInputs = {
  tarifa_sgl: "",
  tarifa_dbl: "",
  tarifa_tpl: "",
  tarifa_cpl: "",
  tarifa_qpl: "",
  tarifa_menor: "",
}

function inputsFrom(values: RateValues): AmountInputs {
  const out = { ...EMPTY_INPUTS }
  for (const f of RATE_FIELDS) {
    const v = values[f.field]
    out[f.field] = hasRate(v) ? String(v) : ""
  }
  return out
}

function sameInputs(a: AmountInputs, b: AmountInputs): boolean {
  return RATE_FIELDS.every((f) => a[f.field] === b[f.field])
}

function isBlankInputs(a: AmountInputs): boolean {
  return RATE_FIELDS.every((f) => a[f.field].trim() === "")
}

/** Montos precargados por el formulario (la tarifa que usan hoy las salidas tildadas). */
interface Prefill {
  inputs: AmountInputs
  currency: string
}

/** "DBL USD 720 · TPL USD 699 · MENOR USD 489": sólo los montos con tarifa, en orden canónico. */
function summarize(values: RateValues, currency: string | null | undefined): string {
  const parts = RATE_FIELDS.filter((f) => hasRate(values[f.field])).map(
    (f) => `${f.short} ${formatPrice(values[f.field], currency)}`,
  )
  return parts.length > 0 ? parts.join(" · ") : "Sin montos"
}

function monthLabel(mes: number, anio: number): string {
  return `${MONTH_NAMES[mes - 1] ?? mes} ${anio}`
}

/** Mensaje entendible para un error de Supabase o de `accommodationRateService`. */
function describeRateError(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string }
  const message = e.message ?? ""
  if (e.code === "23505") {
    return "Ya hay una tarifa para ese mes o esa salida. Cerrá y volvé a abrir las tarifas para ver la última versión."
  }
  if (e.code === "PGRST204" || e.code === "42703" || /fecha_salida|tarifa_sgl|tarifa_qpl/.test(message)) {
    return "La base todavía no tiene las columnas nuevas de tarifas (falta aplicar la migración). Avisale al desarrollador."
  }
  if (e.code === "42501" || e.code === "PGRST116") {
    return "La base no dejó guardar el cambio: puede que la sesión de administrador haya vencido. Volvé a iniciar sesión."
  }
  if (/failed to fetch|network/i.test(message)) {
    return "No hay conexión con la base. Revisá internet y volvé a intentar."
  }
  return message || "Error desconocido. Intentá de nuevo."
}

type Mode = "departure" | "month"

const CHIP_STATUS_LABEL = {
  own: "con tarifa propia",
  month: "usa la del mes",
  none: "sin tarifa",
} as const
type PanelRate = AccommodationRate | DraftRate

interface Editing {
  kind: Mode
  /** Filas del grupo que se está editando. */
  ids: number[]
  /** Salidas del grupo (sólo en "departure"). */
  dates: string[]
}

interface ConfirmState {
  title: string
  description: string
  onConfirm: () => void
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface RateManagerProps {
  accommodation: { id: number; name: string; isNew?: boolean }
  /** Salidas del paquete tal como están escritas en el formulario («3 Ene 2027»). */
  availableDates: string[]
  /** Hotel nuevo: sus tarifas en memoria (se guardan al guardar el paquete). */
  draftRates?: DraftRate[]
  onDraftRatesChange?: (rates: DraftRate[]) => void
}

export function RateManager({ accommodation, availableDates, draftRates, onDraftRatesChange }: RateManagerProps) {
  const { toast } = useToast()
  const isNew = !!accommodation.isNew

  // Las fechas llegan como array nuevo en cada render del panel: se memoiza por su contenido.
  const datesKey = availableDates.join("|")
  const departures = useMemo(() => departureISODates(datesKey ? datesKey.split("|") : []), [datesKey])
  const today = toISODateLocal(new Date())
  /** Lo escrito en «Fechas disponibles» que no se puede leer como fecha («3 ene. 2027», «3 Enero 2027»). */
  const unreadableDates = useMemo(
    () => (datesKey ? datesKey.split("|") : []).filter((d) => packageDepartureISO(d) === null),
    [datesKey],
  )

  const [dbRates, setDbRates] = useState<AccommodationRate[]>([])
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(isNew ? "ready" : "loading")
  const [loadError, setLoadError] = useState("")

  const [mode, setMode] = useState<Mode>(departures.length > 0 ? "departure" : "month")
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [mes, setMes] = useState("")
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [inputs, setInputs] = useState<AmountInputs>(EMPTY_INPUTS)
  const [currency, setCurrency] = useState("USD")
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState<null | "saving" | "deleting">(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [prefill, setPrefill] = useState<Prefill | null>(null)

  const rates: PanelRate[] = isNew ? draftRates ?? [] : dbRates

  const reload = useCallback(
    async (silent = false) => {
      if (isNew) return
      if (!silent) setLoadState("loading")
      try {
        const data = await accommodationRateService.getRatesByAccommodation(accommodation.id)
        setDbRates(data)
        setLoadState("ready")
      } catch (error) {
        console.error("Error loading rates:", error)
        setLoadError(describeRateError(error))
        setLoadState("error")
      }
    },
    [accommodation.id, isNew],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  // --- Derivados -----------------------------------------------------------

  const grouped = useMemo(() => groupRates(rates), [rates])
  // rateCoverage lee las fechas como están escritas en el paquete («3 Ene 2027»), no las ya normalizadas:
  // con 'YYYY-MM-DD' no lee ninguna y toda tarifa por salida le parece de una fecha que ya no existe.
  const coverage = useMemo(() => rateCoverage(datesKey ? datesKey.split("|") : [], rates), [datesKey, rates])
  const departureSet = useMemo(() => new Set(departures), [departures])

  const ownByDate = useMemo(() => {
    const map = new Map<string, PanelRate>()
    for (const r of rates) {
      const iso = r.fecha_salida ? toDepartureISO(r.fecha_salida) : null
      if (iso) map.set(iso, r)
    }
    return map
  }, [rates])

  const monthlyRows = useMemo(
    () => rates.filter((r) => !r.fecha_salida).sort((a, b) => a.anio - b.anio || a.mes - b.mes),
    [rates],
  )

  const editingIds = useMemo(() => new Set(editing?.ids ?? []), [editing])

  /**
   * Cómo queda una salida si se guarda el formulario sin tildarla: con su tarifa propia (si no es del grupo que
   * se está editando), con la del mes o sin tarifa. Es el color del chip.
   */
  const chipStatus = (iso: string): "own" | "month" | "none" => {
    const own = ownByDate.get(iso)
    if (own && !editingIds.has(own.id)) return "own"
    const my = monthYearOfDeparture(iso)!
    return monthlyRows.some((r) => r.mes === my.mes && r.anio === my.anio) ? "month" : "none"
  }

  /** Chips: las salidas del paquete y, si se edita un grupo, también sus fechas (aunque ya no sean salidas). */
  const chipMonths = useMemo(() => {
    const extra = editing?.kind === "departure" ? editing.dates : []
    const all = [...new Set([...departures, ...extra])].sort()
    const months: { key: string; label: string; dates: string[] }[] = []
    for (const iso of all) {
      const key = iso.slice(0, 7)
      const last = months[months.length - 1]
      if (last && last.key === key) last.dates.push(iso)
      else months.push({ key, label: formatMonthList([monthYearOfDeparture(iso)!]), dates: [iso] })
    }
    return months
  }, [departures, editing])

  /** Salidas tildadas que ya tienen tarifa propia de otro grupo: se van a reemplazar. */
  const replacedRows = useMemo(
    () =>
      mode === "departure"
        ? selectedDates
            .map((iso) => ownByDate.get(iso))
            .filter((r): r is PanelRate => r != null && !editingIds.has(r.id))
        : [],
    [mode, selectedDates, ownByDate, editingIds],
  )
  const replacedGroups = useMemo(() => groupRates(replacedRows).departures, [replacedRows])

  const mesNum = Number(mes)
  const anioNum = Number(anio)
  const monthPicked = mode === "month" && mesNum >= 1 && mesNum <= 12 && Number.isInteger(anioNum)
  const existingMonthly = monthPicked
    ? monthlyRows.find((r) => r.mes === mesNum && r.anio === anioNum && !editingIds.has(r.id))
    : undefined
  const ownInPickedMonth = monthPicked
    ? departures.filter((iso) => {
        const my = monthYearOfDeparture(iso)!
        return my.mes === mesNum && my.anio === anioNum && ownByDate.has(iso)
      })
    : []
  const monthIsPast = monthPicked && new Date(anioNum, mesNum, 0, 23, 59, 59) < new Date()

  // --- Formulario ----------------------------------------------------------

  const resetForm = () => {
    setEditing(null)
    if (departures.length === 0) setMode("month")
    setSelectedDates([])
    setMes("")
    setAnio(String(new Date().getFullYear()))
    setInputs(EMPTY_INPUTS)
    setCurrency("USD")
    setPrefill(null)
  }

  /** Cambia de modo; si los montos eran los precargados (sin tocar), los vacía para no arrastrarlos al otro modo. */
  const switchMode = (next: Mode) => {
    if (next === mode) return
    if (prefill && sameInputs(inputs, prefill.inputs) && currency === prefill.currency) {
      setInputs(EMPTY_INPUTS)
      setCurrency("USD")
    }
    setPrefill(null)
    setMode(next)
  }

  const toggleDate = (iso: string) => {
    setSelectedDates((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()))
  }

  const toggleMonth = (dates: string[]) => {
    const upcoming = dates.filter((d) => d >= today)
    const target = upcoming.length > 0 ? upcoming : dates
    const allSelected = target.every((d) => selectedDates.includes(d))
    setSelectedDates((prev) =>
      allSelected ? prev.filter((d) => !dates.includes(d)) : [...new Set([...prev, ...target])].sort(),
    )
  }

  const startEditDepartures = (group: RateGroup<PanelRate>) => {
    setPrefill(null)
    setEditing({ kind: "departure", ids: group.ids, dates: group.dates })
    setMode("departure")
    setSelectedDates(group.dates)
    setInputs(inputsFrom(group.values))
    setCurrency(group.currency)
  }

  const startEditMonth = (rate: PanelRate) => {
    setPrefill(null)
    setEditing({ kind: "month", ids: [rate.id], dates: [] })
    setMode("month")
    setMes(String(rate.mes))
    setAnio(String(rate.anio))
    setInputs(inputsFrom(rate))
    setCurrency((rate.currency || "USD").toUpperCase())
  }

  /** Tilda las salidas sin tarifa, con el formulario limpio (sale del modo edición: montos y moneda vacíos). */
  const loadMissing = () => {
    resetForm()
    setMode("departure")
    setSelectedDates(coverage.missing)
  }

  /** La tarifa efectiva (los seis montos y la moneda) si TODAS las salidas tildadas tienen hoy la misma; si no, null. */
  const commonEffectiveRate = (dates: ReadonlyArray<string>): Prefill | null => {
    if (dates.length === 0) return null
    let common: Prefill | null = null
    for (const iso of dates) {
      const found = findRateForDeparture(rates, iso)
      if (!found) return null
      const current: Prefill = { inputs: inputsFrom(found.rate), currency: (found.rate.currency || "USD").toUpperCase() }
      if (common && (!sameInputs(common.inputs, current.inputs) || common.currency !== current.currency)) return null
      common = current
    }
    return common
  }

  // Precarga: en «Por salida», sin editar un grupo, al cambiar las salidas tildadas se precarga la tarifa que usan
  // hoy (si es la misma para todas). Sólo si los montos están vacíos o siguen siendo los que precargó el formulario:
  // nunca se pisa lo que escribió la persona. Si lo precargado dejó de valer, se vacía.
  useEffect(() => {
    if (mode !== "departure" || editing) return
    const untouched = prefill !== null && sameInputs(inputs, prefill.inputs) && currency === prefill.currency
    if (!untouched && !isBlankInputs(inputs)) return
    const common = commonEffectiveRate(selectedDates)
    if (common) {
      setInputs(common.inputs)
      setCurrency(common.currency)
      setPrefill(common)
    } else if (untouched) {
      setInputs(EMPTY_INPUTS)
      setCurrency("USD")
      setPrefill(null)
    }
    // Sólo cuando cambia la selección (o el modo): leer los montos actuales es a propósito.
  }, [selectedDates, mode, editing]) // eslint-disable-line

  const handleSave = async () => {
    const values = {} as Amounts
    for (const f of RATE_FIELDS) values[f.field] = parseRateInput(inputs[f.field])

    const unreadable = RATE_FIELDS.filter((f) => {
      const raw = inputs[f.field].trim()
      return raw !== "" && values[f.field] == null && !/^0+([.,]0*)?$/.test(raw)
    })
    if (unreadable.length > 0) {
      toast({
        title: "Monto inválido",
        description: `No se entiende el monto de ${unreadable.map((f) => f.label).join(", ")}. Escribilo como 720, 720,50 u 850.000.`,
        variant: "destructive",
      })
      return
    }
    if (RATE_FIELDS.some((f) => (values[f.field] ?? 0) < 0)) {
      toast({ title: "Monto inválido", description: "Los montos no pueden ser negativos.", variant: "destructive" })
      return
    }
    if (isEmptyRate(values)) {
      toast({
        title: "Falta el monto",
        description: "Cargá al menos un monto (por ejemplo, Doble).",
        variant: "destructive",
      })
      return
    }
    if (mode === "departure" && selectedDates.length === 0) {
      toast({ title: "Faltan las salidas", description: "Tildá al menos una salida.", variant: "destructive" })
      return
    }
    if (mode === "month" && !monthPicked) {
      toast({ title: "Datos incompletos", description: "Elegí mes y año.", variant: "destructive" })
      return
    }

    const target =
      mode === "departure" ? formatDepartureDates(selectedDates) : `todo ${monthLabel(mesNum, anioNum)}`
    const summary = `${target}: ${summarize(values, currency)}`
    const previousIds = editing?.kind === mode ? editing.ids : []

    if (isNew) {
      const rows = draftRates ?? []
      const next =
        mode === "departure"
          ? draftSaveDepartures(rows, selectedDates, values, currency, previousIds)
          : draftSaveMonthly(rows, mesNum, anioNum, values, currency, previousIds)
      onDraftRatesChange?.(next)
      toast({
        title: editing ? "Tarifa actualizada" : "Tarifa agregada",
        description: `${summary}. Se guarda en la base al guardar el paquete.`,
      })
      resetForm()
      return
    }

    const payload: AccommodationRateValues = { ...values, currency }
    setBusy("saving")
    try {
      if (mode === "departure") {
        if (previousIds.length > 0) {
          await accommodationRateService.replaceDepartureRates(accommodation.id, previousIds, selectedDates, payload)
        } else {
          await accommodationRateService.saveDepartureRates(accommodation.id, selectedDates, payload)
        }
      } else {
        await accommodationRateService.saveMonthlyRate(accommodation.id, mesNum, anioNum, payload, {
          replaceId: previousIds[0] ?? null,
        })
      }
      toast({ title: editing ? "Tarifa actualizada" : "Tarifa guardada", description: `${summary}. Ya se ve en la web y en el bot.` })
      resetForm()
    } catch (error) {
      console.error("Error saving rate:", error)
      toast({ title: "Error al guardar tarifa", description: describeRateError(error), variant: "destructive" })
    } finally {
      await reload(true)
      setBusy(null)
    }
  }

  // --- Borrado -------------------------------------------------------------

  const executeDelete = async (ids: number[], what: string) => {
    if (editing && editing.ids.some((id) => ids.includes(id))) resetForm()
    if (isNew) {
      onDraftRatesChange?.((draftRates ?? []).filter((r) => !ids.includes(r.id)))
      toast({ title: "Tarifa eliminada", description: `${what}. Se aplica al guardar el paquete.` })
      return
    }
    setBusy("deleting")
    try {
      await accommodationRateService.deleteRates(ids)
      toast({ title: "Tarifa eliminada", description: `${what}. El cambio ya se ve en la web y en el bot.` })
    } catch (error) {
      console.error("Error deleting rate:", error)
      toast({ title: "Error al eliminar tarifa", description: describeRateError(error), variant: "destructive" })
    } finally {
      await reload(true)
      setBusy(null)
    }
  }

  const askDeleteGroup = (group: RateGroup<PanelRate>) => {
    const n = group.dates.length
    setConfirm({
      title: "Eliminar Tarifa",
      description: `Se va a borrar la tarifa de ${group.label} (${n} ${n === 1 ? "salida" : "salidas"}). Esas salidas van a usar la tarifa de su mes; si no hay, se muestran «a consultar». Esta acción no se puede deshacer.`,
      onConfirm: () => void executeDelete(group.ids, group.label),
    })
  }

  const askDeleteMonth = (rate: PanelRate) => {
    const label = monthLabel(rate.mes, rate.anio)
    setConfirm({
      title: "Eliminar Tarifa",
      description: `Se va a borrar la tarifa de todo ${label}. Las salidas de ese mes sin tarifa propia van a quedar «a consultar». Esta acción no se puede deshacer.`,
      onConfirm: () => void executeDelete([rate.id], `Todo ${label}`),
    })
  }

  const askDeleteOrphans = () => {
    const label = formatDepartureDates(coverage.orphans.map((r) => r.fecha_salida!))
    setConfirm({
      title: "Eliminar tarifas sin salida",
      description: `Se van a borrar las tarifas de ${label}, que ya no son salidas del paquete. Esta acción no se puede deshacer.`,
      onConfirm: () => void executeDelete(coverage.orphans.map((r) => r.id), label),
    })
  }

  // --- Render --------------------------------------------------------------

  // Sin la lista cargada no se puede avisar qué se reemplaza: no se deja guardar.
  const disabled = busy !== null || loadState !== "ready"
  const hasAnyRate = rates.length > 0

  const chipTitle = (iso: string): string => {
    const date = formatDepartureDates([iso])
    if (!departureSet.has(iso)) return `${date}: ya no es salida del paquete`
    const found = findRateForDeparture(rates, iso)
    const past = iso < today ? " (ya pasó)" : ""
    if (!found) return `${date}${past}: sin tarifa («a consultar»)`
    const what = summarize(found.rate, found.rate.currency)
    return found.kind === "departure"
      ? `${date}${past}: tarifa propia (${what})`
      : `${date}${past}: usa la del mes (${what})`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Regla */}
      <div className="flex gap-2 items-start text-sm text-primary-800 bg-primary-50/60 border border-primary-100 rounded-xl p-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary-500" />
        <p>
          <strong>La tarifa de una salida le gana a la del mes, entera:</strong> una salida con tarifa propia muestra sólo
          esos montos. Una salida sin tarifa propia usa la de su mes; si tampoco hay, la web la muestra «a consultar».
        </p>
      </div>

      {/* Avisos de cobertura */}
      {loadState === "ready" && (coverage.missing.length > 0 || coverage.orphans.length > 0) && (
        <div className="space-y-2">
          {coverage.missing.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 hidden sm:block" />
              <p className="flex-1">
                <strong>Salidas sin tarifa:</strong> {formatDepartureDates(coverage.missing)}. En la web se muestran «a
                consultar».
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadMissing}
                disabled={disabled}
                className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
              >
                Cargar tarifa para estas
              </Button>
            </div>
          )}
          {coverage.orphans.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 hidden sm:block" />
              <p className="flex-1">
                <strong>Tarifas de fechas que ya no son salidas del paquete:</strong>{" "}
                {formatDepartureDates(coverage.orphans.map((r) => r.fecha_salida!))}. No se usan en ningún lado.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={askDeleteOrphans}
                disabled={disabled}
                className="border-red-300 text-red-600 hover:bg-red-500 hover:text-white shrink-0"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Borrarlas
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      <div
        className={cn(
          "p-4 sm:p-5 rounded-xl space-y-4",
          editing ? "bg-secondary-50 border-2 border-secondary-300" : "bg-primary-50/50 border border-primary-100",
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-medium">{editing ? "✏️ Editando tarifa" : "➕ Agregar tarifa"}</h3>
          <div className="inline-flex rounded-lg border border-primary-200 bg-white p-0.5 self-start">
            <button
              type="button"
              onClick={() => switchMode("departure")}
              disabled={!!editing || disabled || departures.length === 0}
              aria-pressed={mode === "departure"}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors disabled:cursor-not-allowed",
                mode === "departure" ? "bg-primary text-white" : "text-primary-700 hover:bg-primary-50 disabled:opacity-50",
              )}
            >
              Por salida
            </button>
            <button
              type="button"
              onClick={() => switchMode("month")}
              disabled={!!editing || disabled}
              aria-pressed={mode === "month"}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors disabled:cursor-not-allowed",
                mode === "month" ? "bg-primary text-white" : "text-primary-700 hover:bg-primary-50 disabled:opacity-50",
              )}
            >
              Todo el mes
            </button>
          </div>
        </div>

        {departures.length === 0 && !editing && (
          <p className="text-xs text-primary-700">
            Este paquete no tiene fechas de salida que se puedan leer. Escribilas en «Fechas disponibles» como «3 Ene
            2027», separadas por coma, para cargar tarifas por salida. Por ahora sólo se puede cargar la tarifa de todo
            el mes.
          </p>
        )}

        {unreadableDates.length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            {unreadableDates.length === 1 ? "No se pudo leer esta fecha del paquete" : "No se pudieron leer estas fechas del paquete"}
            : {unreadableDates.map((d) => `«${d}»`).join(", ")}. No aparecen acá ni tienen tarifa por salida. Escribilas
            como «3 Ene 2027» (día, mes con tres letras y la primera en mayúscula, año).
          </p>
        )}

        {mode === "departure" ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary-800">Salidas a las que aplica esta tarifa</label>
            <div className="space-y-2">
              {chipMonths.map((month) => {
                const upcoming = month.dates.filter((d) => d >= today)
                const target = upcoming.length > 0 ? upcoming : month.dates
                const allSelected = target.every((d) => selectedDates.includes(d))
                return (
                  <div key={month.key} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-20 shrink-0 text-sm font-medium text-primary-900">{month.label}</span>
                    {month.dates.map((iso) => {
                      const selected = selectedDates.includes(iso)
                      const status = chipStatus(iso)
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => toggleDate(iso)}
                          disabled={disabled}
                          aria-pressed={selected}
                          aria-label={`${formatDepartureDates([iso])}, ${selected ? "tildada, " : ""}${CHIP_STATUS_LABEL[status]}${iso < today ? ", ya pasó" : ""}${departureSet.has(iso) ? "" : ", ya no es salida del paquete"}`}
                          title={chipTitle(iso)}
                          className={cn(
                            "min-w-[2.5rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors",
                            selected
                              ? "bg-primary text-white border-primary"
                              : status === "own"
                                ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
                                : status === "month"
                                  ? "bg-white border-primary-200 text-primary-800 hover:bg-primary-50"
                                  : "bg-amber-50 border-dashed border-amber-400 text-amber-800 hover:bg-amber-100",
                            iso < today && "opacity-50",
                            !departureSet.has(iso) && "line-through",
                          )}
                        >
                          {Number(iso.slice(8, 10))}
                        </button>
                      )
                    })}
                    {month.dates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleMonth(month.dates)}
                        disabled={disabled}
                        aria-label={`${allSelected ? "Destildar" : "Tildar"} todas las salidas de ${month.label}`}
                        className="inline-flex items-center min-h-8 px-2 text-xs text-primary-600 hover:text-primary-800 underline underline-offset-2"
                      >
                        {allSelected ? "Ninguna" : "Todas"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-50 border border-green-300" /> con tarifa propia
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-white border border-primary-200" /> usa la del mes
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-50 border border-dashed border-amber-400" /> sin tarifa
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary" /> tildada
              </span>
            </div>
            {selectedDates.length > 0 && (
              <p className="text-sm text-primary-900">
                {selectedDates.length} {selectedDates.length === 1 ? "salida tildada" : "salidas tildadas"}:{" "}
                <strong>{formatDepartureDates(selectedDates)}</strong>
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  disabled={disabled}
                  aria-label="Destildar todas las salidas"
                  className="ml-1 inline-flex items-center min-h-8 px-2 align-middle text-xs text-primary-600 hover:text-primary-800 underline underline-offset-2"
                >
                  Limpiar
                </button>
              </p>
            )}
            {replacedGroups.length > 0 && (
              <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 space-y-1">
                <p className="font-medium">Estas salidas ya tienen tarifa propia y se va a reemplazar:</p>
                {replacedGroups.map((g) => (
                  <p key={g.key} className="text-xs">
                    {g.label} — hoy {summarize(g.values, g.currency)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-1">Mes</label>
                <Select
                  value={mes}
                  onValueChange={(value) => {
                    setMes(value)
                    if (editing === null) setAnio(String(suggestRateYear(Number(value))))
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={name} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-1">Año</label>
                <Select value={anio} onValueChange={setAnio} disabled={disabled}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rateYearOptions(new Date(), anioNum || undefined).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {monthIsPast && (
              <p className="text-xs text-amber-700">Ese mes ya pasó: esta tarifa no se va a mostrar en la web.</p>
            )}
            {existingMonthly && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Ya hay una tarifa de todo {monthLabel(mesNum, anioNum)} ({summarize(existingMonthly, existingMonthly.currency)}):
                se va a reemplazar.
              </p>
            )}
            {ownInPickedMonth.length > 0 && (
              <p className="text-xs text-primary-700">
                {formatDepartureDates(ownInPickedMonth)}{" "}
                {ownInPickedMonth.length === 1 ? "tiene tarifa propia y la mantiene" : "tienen tarifa propia y la mantienen"}:
                la de una salida le gana a la del mes.
              </p>
            )}
          </div>
        )}

        {/* Montos */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {RATE_FIELDS.map((f) => (
              <div key={f.field}>
                <label className="block text-sm font-medium text-primary-800 mb-1" htmlFor={`rate-${f.field}`}>
                  {f.label}
                </label>
                <Input
                  id={`rate-${f.field}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={inputs[f.field]}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [f.field]: e.target.value }))}
                  placeholder="—"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
          {mode === "departure" && prefill && !editing && (
            <p className="text-xs text-primary-700 mt-1">
              Precargamos la tarifa que usan hoy esas salidas. Cambiá lo que corresponda.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {mode === "departure"
              ? "Lo que dejes vacío queda «a consultar» en esas salidas: no se completa con la tarifa del mes."
              : "Dejá vacío lo que no tenga tarifa."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:w-[180px]">
            <label className="block text-sm font-medium text-primary-800 mb-1">Moneda</label>
            <Select value={currency} onValueChange={setCurrency} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (dólares)</SelectItem>
                <SelectItem value="ARS">ARS (pesos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={disabled} className="bg-primary hover:bg-primary-700 text-white">
              {busy === "saving" ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {busy === "saving" ? "Guardando..." : editing ? "Actualizar Tarifa" : "Guardar Tarifa"}
            </Button>
            {editing && (
              <Button
                type="button"
                onClick={resetForm}
                variant="outline"
                disabled={disabled}
                className="border-gray-400 text-gray-600 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      {loadState === "loading" ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Cargando tarifas...</span>
        </div>
      ) : loadState === "error" ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-red-600">No se pudieron cargar las tarifas. {loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      ) : !hasAnyRate ? (
        <div className="text-center py-8 text-primary-400">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-300" />
          <p>No hay tarifas cargadas para este hotel</p>
          <p className="text-sm">Agregá la primera arriba</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.departures.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tarifas por salida</h3>
              <div className="space-y-2">
                {grouped.departures.map((group) => {
                  const isEditingThis = editing?.kind === "departure" && group.ids.every((id) => editingIds.has(id))
                  const hasOrphan = group.dates.some((d) => !departureSet.has(d))
                  return (
                    <div
                      key={group.key}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-xl",
                        isEditingThis ? "bg-primary-50 border-primary-300" : "bg-white border-primary-100 hover:bg-primary-50/30",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary-900">{group.label}</p>
                        <p className="text-sm text-gray-700">{summarize(group.values, group.currency)}</p>
                        {hasOrphan && (
                          <p className="text-xs text-amber-700 mt-0.5">Incluye fechas que ya no son salidas del paquete.</p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEditDepartures(group)}
                          disabled={disabled}
                          className="border-primary-300 text-primary-600 hover:bg-primary hover:text-white"
                          aria-label={`Editar tarifa de ${group.label}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => askDeleteGroup(group)}
                          disabled={disabled}
                          className="border-red-300 text-red-500 hover:bg-red-500 hover:text-white"
                          aria-label={`Eliminar tarifa de ${group.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {monthlyRows.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tarifas de todo el mes</h3>
              <div className="space-y-2">
                {monthlyRows.map((rate) => {
                  const monthDepartures = departures.filter((iso) => {
                    const my = monthYearOfDeparture(iso)!
                    return my.mes === rate.mes && my.anio === rate.anio
                  })
                  const usedFor = monthDepartures.filter((iso) => !ownByDate.has(iso))
                  const isEditingThis = editing?.kind === "month" && editingIds.has(rate.id)
                  return (
                    <div
                      key={rate.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-xl",
                        isEditingThis ? "bg-primary-50 border-primary-300" : "bg-white border-primary-100 hover:bg-primary-50/30",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary-900">
                          {monthLabel(rate.mes, rate.anio)} <span className="font-normal text-gray-500">· todo el mes</span>
                        </p>
                        <p className="text-sm text-gray-700">{summarize(rate, rate.currency)}</p>
                        {monthDepartures.length > 0 && usedFor.length === 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Todas las salidas de este mes tienen tarifa propia: esta no se usa.
                          </p>
                        )}
                        {usedFor.length > 0 && usedFor.length < monthDepartures.length && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Se usa sólo para {formatDepartureDates(usedFor)} (las demás tienen tarifa propia).
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEditMonth(rate)}
                          disabled={disabled}
                          className="border-primary-300 text-primary-600 hover:bg-primary hover:text-white"
                          aria-label={`Editar tarifa de ${monthLabel(rate.mes, rate.anio)}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => askDeleteMonth(rate)}
                          disabled={disabled}
                          className="border-red-300 text-red-500 hover:bg-red-500 hover:text-white"
                          aria-label={`Eliminar tarifa de ${monthLabel(rate.mes, rate.anio)}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialogConfirm
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => confirm?.onConfirm()}
        variant="destructive"
      />
    </div>
  )
}
