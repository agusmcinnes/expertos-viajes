# Contexto para el agente IA — Enriquecimiento de fechas

> **Para qué sirve este doc:** que el agente IA que arma embeddings de paquetes de viaje sepa qué cambió en la BDD el 5 de mayo de 2026 y cómo usar el campo nuevo.

---

## TL;DR

En la tabla `travel_packages` de Supabase ahora hay una **columna nueva**: `available_dates_enriched`. Es como `available_dates` pero con cada fecha expandida a una descripción rica en lenguaje natural. **Usá esa columna en lugar de `available_dates`** cuando armes los embeddings.

---

## Por qué se hizo este cambio

El agente traía paquetes incorrectos cuando el usuario preguntaba por períodos relativos:

> "dame viajes para la primera semana de julio"

El embedding matcheaba contra `"19 Jul 2026"` porque comparte tokens ("julio"), aunque el 19 NO es la primera semana. Los embeddings no entienden semántica temporal — sólo similitud léxica.

La solución: que cada fecha venga acompañada de **rangos numéricos explícitos** y **etiquetas semánticas** (estación, vacaciones escolares, quincena, etc.), de modo que el embedding tenga más superficie de match.

---

## Qué cambió en la BDD

### Nueva columna

| Tabla | Columna | Tipo | Mantenimiento |
|---|---|---|---|
| `travel_packages` | `available_dates_enriched` | `text[]` | `GENERATED ALWAYS AS ... STORED` (Postgres la recalcula sola al insertar/actualizar `available_dates`) |

### Lo que NO cambió

- `available_dates` sigue intacta (la usa el frontend).
- No se creó ninguna vista ni tabla nueva.
- Cero impacto en el resto del sistema.

---

## Diferencia visible

### Antes — `available_dates`
```json
["19 Jul 2026"]
```

### Ahora — `available_dates_enriched`
```json
[
  "19 Jul 2026 — domingo 19 de julio de 2026 — tercera semana de julio (días 15 al 21) — segunda quincena de julio — mediados de julio — mes 7/2026 — invierno en Argentina — vacaciones de invierno escolares"
]
```

Cada elemento del array contiene:
- El string original (para no perder nada)
- Día de la semana (lunes, martes, ...)
- Día/mes/año en español completo
- Semana del mes con rango numérico explícito (ej: "tercera semana de julio (días 15 al 21)")
- Quincena (primera/segunda)
- Tercio del mes (comienzos / mediados / fines)
- Mes y año en formato MM/YYYY
- Estación en Argentina (verano, otoño, invierno, primavera)
- Etiquetas culturales: "vacaciones de invierno escolares", "temporada alta", etc.

---

## Cómo usar el campo desde el agente

### Cambio en el GET a Supabase

**Antes:**
```
GET /travel_packages?select=id,name,description,price,duration,transport_type,available_dates,servicios_incluidos,image_url,url,ciudades,destinations(name),accommodations(regimen)&is_active=eq.true
```

**Ahora:**
```
GET /travel_packages?select=id,name,description,price,duration,transport_type,available_dates_enriched,servicios_incluidos,image_url,url,ciudades,destinations(name),accommodations(regimen)&is_active=eq.true
```

> **Diferencia única:** `available_dates` → `available_dates_enriched`.

### Cambio en el template Jinja del embedding

**Antes:**
```jinja
{% if available_dates %}Fechas de salida disponibles:
{% for f in available_dates %}- {{ f }}
{% endfor %}{% endif %}
```

**Ahora:**
```jinja
{% if available_dates_enriched %}Fechas de salida disponibles:
{% for f in available_dates_enriched %}- {{ f }}
{% endfor %}{% endif %}
```

### Después de aplicar los cambios: **re-indexar los embeddings**

El cambio sólo tiene efecto si los embeddings se regeneran con el contenido nuevo.

---

## Robustez del parser

La columna se calcula con un parser que tolera estos formatos del campo `available_dates`:

| Formato en `available_dates` | Resultado en `available_dates_enriched` |
|---|---|
| `"19 Jul 2026"` | enriquecido |
| `"19 JUL 2026"` (mayúsculas) | enriquecido |
| `"23 Jul 26"` (año 2 dígitos) | enriquecido (asume 2026) |
| `"1 Mayo 2026"` (mes en español completo) | enriquecido |
| `"5 Dec 2026"` (mes en inglés) | enriquecido |
| `"Desde 01 Mayo hasta 30 Sept 2026"` (texto libre) | **se devuelve tal cual, sin enriquecer** |
| `NULL` o `[]` | `NULL` o `[]` |

Si el parser no entiende el string, no falla: lo devuelve sin tocar.

---

## Queries que ahora deberían funcionar bien

Ejemplos que antes confundían al agente y ahora deberían matchear correctamente:

- `"viajes para la primera semana de julio"` → debería traer paquetes con salidas días 1-7 de julio
- `"escapadas a fines de mayo"` → días 22-31 de mayo
- `"vacaciones de invierno"` → paquetes en junio/julio
- `"viajes en temporada alta"` → diciembre/enero/febrero
- `"salidas de mediados de octubre"` → días 11-20 de octubre

---

## Limitaciones honestas

**Esto sigue siendo un parche de embeddings.** Los embeddings no razonan numéricamente: "primera semana de julio" y "tercera semana de julio" siguen siendo vecinos en el espacio vectorial. El rango explícito ("días 15 al 21") **mejora** el match pero no lo hace 100% determinístico.

Si querés cobertura total (ej: "viajes entre el 5 y el 15 de julio") la solución óptima es:
1. El agente extrae rango de fechas de la query usando function calling.
2. Filtra por SQL: `WHERE EXISTS (SELECT 1 FROM unnest(available_dates_enriched) d WHERE ...)` o, mejor todavía, un join contra `package_stock.fecha_salida` (que ya está en formato `DATE`).

Eso requiere lógica en el agente, no sólo en la BDD. Queda como mejora futura.

---

## Archivo de migración

`scripts/supabase/migrations/20260505_agent_date_enrichment.sql`

Aplicada el 5 de mayo de 2026 sobre el proyecto `expertos-database` (`ajtmqdkiklhffsgdwmzg`). Incluye instrucciones de rollback al final del archivo si alguna vez hace falta deshacerla.
