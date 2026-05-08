import { useMemo } from 'react'
import {
  Grid, Typography, MenuItem, Select, FormControl, InputLabel,
  Box, CircularProgress, useTheme, alpha, Chip, Stack,
} from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import ThunderstormIcon from '@mui/icons-material/Thunderstorm'
import AirlinesIcon from '@mui/icons-material/Airlines'
import SecurityIcon from '@mui/icons-material/Security'
import FlightIcon from '@mui/icons-material/Flight'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { DelayCause } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'

// Couleurs Minimal UI par cause
const CAUSES = [
  { key: 'avg_carrier_delay',       label: 'Compagnie',       color: '#00A76F', gradId: 'gc1' },
  { key: 'avg_weather_delay',       label: 'Météo',           color: '#00B8D9', gradId: 'gc2' },
  { key: 'avg_nas_delay',           label: 'NAS',             color: '#FFAB00', gradId: 'gc3' },
  { key: 'avg_late_aircraft_delay', label: 'Avion en retard', color: '#FF5630', gradId: 'gc4' },
  { key: 'avg_security_delay',      label: 'Sécurité',        color: '#8E33FF', gradId: 'gc5' },
]

function useChartStyle() {
  const theme = useTheme()
  return {
    grid:  { strokeDasharray: '3 3', stroke: theme.palette.divider },
    axis:  { tick: { fontSize: 11, fill: theme.palette.text.disabled }, axisLine: false as const, tickLine: false as const },
    tooltip: {
      contentStyle: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
        fontSize: 12,
      },
    },
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.fill || p.color }} />
          <Typography variant="caption">{p.name} : <strong>{p.value} min</strong></Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function DelayCauses() {
  const { data, loading } = useCSV<DelayCause>(dataUrl('delay_causes'))
  const { filters, setFilter } = useFilters()
  const theme = useTheme()
  const cs = useChartStyle()

  const years    = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const carriers = useMemo(() => [...new Set(data.map(d => d.carrier_name))].sort(), [data])

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.year    || d.Year         === Number(filters.year)) &&
      (!filters.carrier || d.carrier_name === filters.carrier)
    ), [data, filters])

  const byCarrier = useMemo(() => {
    const map = new Map<string, DelayCause & { count: number }>()
    filtered.forEach(d => {
      const prev = map.get(d.carrier_name)
      if (!prev) { map.set(d.carrier_name, { ...d, count: 1 }); return }
      map.set(d.carrier_name, {
        ...prev,
        delayed_flights:         prev.delayed_flights + d.delayed_flights,
        avg_carrier_delay:       prev.avg_carrier_delay + d.avg_carrier_delay,
        avg_weather_delay:       prev.avg_weather_delay + d.avg_weather_delay,
        avg_nas_delay:           prev.avg_nas_delay + d.avg_nas_delay,
        avg_late_aircraft_delay: prev.avg_late_aircraft_delay + d.avg_late_aircraft_delay,
        avg_security_delay:      prev.avg_security_delay + d.avg_security_delay,
        count:                   prev.count + 1,
      })
    })
    return [...map.entries()].map(([, v]) => ({
      carrier_name:            v.carrier_name,
      delayed_flights:         v.delayed_flights,
      avg_carrier_delay:       parseFloat((v.avg_carrier_delay / v.count).toFixed(2)),
      avg_weather_delay:       parseFloat((v.avg_weather_delay / v.count).toFixed(2)),
      avg_nas_delay:           parseFloat((v.avg_nas_delay / v.count).toFixed(2)),
      avg_late_aircraft_delay: parseFloat((v.avg_late_aircraft_delay / v.count).toFixed(2)),
      avg_security_delay:      parseFloat((v.avg_security_delay / v.count).toFixed(2)),
    })).sort((a, b) => b.avg_carrier_delay - a.avg_carrier_delay)
  }, [filtered])

  const globalAvg = useMemo(() => {
    if (!byCarrier.length) return null
    const n = byCarrier.length
    return {
      carrier:       byCarrier.reduce((s, d) => s + d.avg_carrier_delay, 0) / n,
      weather:       byCarrier.reduce((s, d) => s + d.avg_weather_delay, 0) / n,
      nas:           byCarrier.reduce((s, d) => s + d.avg_nas_delay, 0) / n,
      late_aircraft: byCarrier.reduce((s, d) => s + d.avg_late_aircraft_delay, 0) / n,
      security:      byCarrier.reduce((s, d) => s + d.avg_security_delay, 0) / n,
    }
  }, [byCarrier])

  // Sparkline par année pour chaque cause
  const kpiYears = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const byYear = useMemo(() =>
    kpiYears.map(y => {
      const rows = data.filter(d => d.Year === y)
      const n = rows.length || 1
      return {
        y,
        carrier:  rows.reduce((s, d) => s + d.avg_carrier_delay, 0) / n,
        weather:  rows.reduce((s, d) => s + d.avg_weather_delay, 0) / n,
        nas:      rows.reduce((s, d) => s + d.avg_nas_delay, 0) / n,
        aircraft: rows.reduce((s, d) => s + d.avg_late_aircraft_delay, 0) / n,
        security: rows.reduce((s, d) => s + d.avg_security_delay, 0) / n,
      }
    })
  , [data, kpiYears])

  const pctChange = (arr: number[]) => {
    if (arr.length < 2) return 0
    const last = arr[arr.length - 1], prev = arr[arr.length - 2]
    return prev === 0 ? 0 : ((last - prev) / prev) * 100
  }

  const columns: GridColDef[] = [
    { field: 'carrier_name',            headerName: 'Compagnie',       flex: 2 },
    { field: 'avg_carrier_delay',       headerName: 'Compagnie (min)', flex: 1, type: 'number' },
    { field: 'avg_weather_delay',       headerName: 'Météo (min)',     flex: 1, type: 'number' },
    { field: 'avg_nas_delay',           headerName: 'NAS (min)',       flex: 1, type: 'number' },
    { field: 'avg_late_aircraft_delay', headerName: 'Avion ret. (min)', flex: 1, type: 'number' },
    { field: 'avg_security_delay',      headerName: 'Sécurité (min)',  flex: 1, type: 'number' },
  ]

  if (loading) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />
      <CircularProgress size={32} color="warning" />
      <Typography variant="body2" color="text.secondary">Chargement des données…</Typography>
    </Box>
  )

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box sx={{
        mb: 4, p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #B76E00 60%, #7A4100 100%)',
        color: 'white',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#FFD666', 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#FFD666', 0.07), pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box sx={{ bgcolor: alpha('#FFD666', 0.2), borderRadius: 2, p: 1.2, display: 'flex' }}>
            <WarningIcon sx={{ fontSize: 32, color: '#FFD666' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Causes des retards</Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>
              Météo, compagnie, NAS, avion en retard ou sécurité ?
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {CAUSES.map(c => (
            <Chip key={c.key} label={c.label} size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#FFF5CC', fontWeight: 600 }} />
          ))}
        </Stack>
      </Box>

      {/* ── Filtres ── */}
      <Box sx={{
        mb: 3, p: 2, borderRadius: 2, bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>Filtrer par :</Typography>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Année</InputLabel>
          <Select label="Année" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
            <MenuItem value=""><em>Toutes</em></MenuItem>
            {years.map(y => (
              <MenuItem key={y} value={y}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FFAB00' }} /> {y}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Compagnie</InputLabel>
          <Select label="Compagnie" value={filters.carrier} onChange={e => setFilter('carrier', e.target.value)}>
            <MenuItem value=""><em>Toutes</em></MenuItem>
            {carriers.map(c => (
              <MenuItem key={c} value={c}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#B76E00' }} /> {c}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(filters.year || filters.carrier) && (
          <Chip label="Réinitialiser" onDelete={() => { setFilter('year', ''); setFilter('carrier', '') }}
            size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontWeight: 600 }} />
        )}
      </Box>

      {/* ── KPI widgets — 5 causes ── */}
      {globalAvg && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md>
            <AppWidgetSummary title="Compagnie (min)" total={globalAvg.carrier}
              percent={pctChange(byYear.map(d => d.carrier))} color="primary" icon={<AirlinesIcon />}
              chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.carrier) }} />
          </Grid>
          <Grid item xs={12} sm={6} md>
            <AppWidgetSummary title="Météo (min)" total={globalAvg.weather}
              percent={pctChange(byYear.map(d => d.weather))} color="info" icon={<ThunderstormIcon />}
              chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.weather) }} />
          </Grid>
          <Grid item xs={12} sm={6} md>
            <AppWidgetSummary title="NAS (min)" total={globalAvg.nas}
              percent={pctChange(byYear.map(d => d.nas))} color="warning" icon={<WarningIcon />}
              chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.nas) }} />
          </Grid>
          <Grid item xs={12} sm={6} md>
            <AppWidgetSummary title="Avion en retard (min)" total={globalAvg.late_aircraft}
              percent={pctChange(byYear.map(d => d.aircraft))} color="error" icon={<FlightIcon />}
              chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.aircraft) }} />
          </Grid>
          <Grid item xs={12} sm={6} md>
            <AppWidgetSummary title="Sécurité (min)" total={globalAvg.security}
              percent={pctChange(byYear.map(d => d.security))} color="secondary" icon={<SecurityIcon />}
              chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.security) }} />
          </Grid>
        </Grid>
      )}

      {/* ── Charts ── */}
      <Grid container spacing={2}>
        {/* Stacked horizontal — causes par compagnie */}
        <Grid item xs={12}>
          <ChartCard title="Causes de retard par compagnie — barres empilées (min)" height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 130, right: 20, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} label={{ value: 'Minutes', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                <YAxis type="category" dataKey="carrier_name" {...cs.axis} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => <span style={{ color: '#637381' }}>{v}</span>} />
                {CAUSES.map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={color} name={label}
                    radius={key === 'avg_security_delay' ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Barres groupées verticales */}
        <Grid item xs={12}>
          <ChartCard title="Comparaison des causes par compagnie (min)" height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} margin={{ left: 0, right: 20, top: 8, bottom: 64 }}>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="carrier_name" {...cs.axis} angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis {...cs.axis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => <span style={{ color: '#637381' }}>{v}</span>} />
                {CAUSES.map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} fill={color} name={label} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* DataGrid */}
        <Grid item xs={12}>
          <ChartCard title="Détail par compagnie" height={380}>
            <DataGrid
              rows={byCarrier.map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{
                border: 'none', fontSize: 13,
                '& .MuiDataGrid-row:hover': { bgcolor: alpha('#FFAB00', 0.04) },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f4f6f8', borderRadius: 1 },
              }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
