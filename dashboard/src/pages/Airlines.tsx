import { useMemo } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  Grid, Typography, MenuItem, TextField, Box, CircularProgress,
  useTheme, alpha, Chip, Stack,
} from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import AirlinesIcon from '@mui/icons-material/Airlines'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Defs, LinearGradient, Stop,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { CarrierPerformance, MonthlyTrend } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function useChartStyle() {
  const theme = useTheme()
  return {
    grid:    { strokeDasharray: '3 3', stroke: theme.palette.divider, vertical: false },
    axis:    { tick: { fontSize: 11, fill: theme.palette.text.disabled }, axisLine: false as const, tickLine: false as const },
    tooltip: {
      contentStyle: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        boxShadow: '0 8px 16px 0 rgba(0,0,0,0.12)',
        fontSize: 12,
      },
    },
    colors: ['#00A76F', '#FF5630', '#FFAB00', '#00B8D9', '#8E33FF'],
  }
}

// Tooltip personnalisé artistique
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{
      bgcolor: 'white', p: 1.5,
      border: '1px solid #DFE3E8',
      borderRadius: 2,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 140,
    }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
      {payload.map((p: any) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.fill || p.stroke }} />
          <Typography variant="caption">{p.name} : <strong>{p.value}{unit}</strong></Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function Airlines() {
  const { data: carrierData, loading: l1 } = useCSV<CarrierPerformance>(dataUrl('carrier_performance'))
  const { data: monthlyData, loading: l2 }  = useCSV<MonthlyTrend>(dataUrl('monthly_trends'))
  const { filters, setFilter } = useFilters()
  const cs = useChartStyle()
  const theme = useTheme()

  const loading = l1 || l2

  const years    = useMemo(() => [...new Set(carrierData.map(d => d.Year))].sort(), [carrierData])
  const carriers = useMemo(() => [...new Set(carrierData.map(d => d.carrier_name))].sort(), [carrierData])

  const filtered = useMemo(() =>
    carrierData.filter(d =>
      (!filters.year    || d.Year         === Number(filters.year)) &&
      (!filters.carrier || d.carrier_name === filters.carrier)
    ), [carrierData, filters])

  const byCarrier = useMemo(() => {
    const map = new Map<string, { total: number; delayed: number; delay_rate: number; avg_delay: number; count: number }>()
    filtered.forEach(d => {
      const prev = map.get(d.carrier_name) ?? { total: 0, delayed: 0, delay_rate: 0, avg_delay: 0, count: 0 }
      map.set(d.carrier_name, {
        total:      prev.total + d.total_flights,
        delayed:    prev.delayed + d.delayed_flights,
        delay_rate: prev.delay_rate + d.delay_rate_pct,
        avg_delay:  prev.avg_delay + d.avg_arr_delay_min,
        count:      prev.count + 1,
      })
    })
    return [...map.entries()].map(([name, v]) => ({
      carrier_name:      name,
      total_flights:     v.total,
      delayed_flights:   v.delayed,
      delay_rate_pct:    parseFloat((v.delay_rate / v.count).toFixed(2)),
      avg_arr_delay_min: parseFloat((v.avg_delay / v.count).toFixed(2)),
    })).sort((a, b) => b.delay_rate_pct - a.delay_rate_pct)
  }, [filtered])

  const byMonth = useMemo(() => {
    const filteredMonthly = monthlyData.filter(d => !filters.year || d.Year === Number(filters.year))
    const map = new Map<number, { sum: number; count: number }>()
    filteredMonthly.forEach(d => {
      const prev = map.get(d.Month) ?? { sum: 0, count: 0 }
      map.set(d.Month, { sum: prev.sum + d.avg_arr_delay_min, count: prev.count + 1 })
    })
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const v = map.get(m)
      return { month: MONTH_LABELS[i], avg_delay: v ? parseFloat((v.sum / v.count).toFixed(2)) : 0 }
    })
  }, [monthlyData, filters.year])

  const kpiYears = useMemo(() => [...new Set(carrierData.map(d => d.Year))].sort(), [carrierData])
  const byYear = useMemo(() =>
    kpiYears.map(y => {
      const rows = filtered.filter(d => d.Year === y)
      return {
        y,
        total: rows.reduce((s, d) => s + d.total_flights, 0),
        rate:  rows.length ? rows.reduce((s, d) => s + d.delay_rate_pct, 0) / rows.length : 0,
        delay: rows.length ? rows.reduce((s, d) => s + d.avg_arr_delay_min, 0) / rows.length : 0,
      }
    })
  , [filtered, kpiYears])

  const totalVols  = filtered.reduce((s, d) => s + d.total_flights, 0)
  const avgRate    = byYear.length ? byYear.reduce((s, d) => s + d.rate, 0)  / byYear.length : 0
  const avgDelay   = byYear.length ? byYear.reduce((s, d) => s + d.delay, 0) / byYear.length : 0
  const nbCarriers = new Set(filtered.map(d => d.carrier_name)).size

  const pctChange = (arr: number[]) => {
    if (arr.length < 2) return 0
    const last = arr[arr.length - 1], prev = arr[arr.length - 2]
    return prev === 0 ? 0 : ((last - prev) / prev) * 100
  }

  const yearValue: Dayjs | null = filters.year ? dayjs().year(Number(filters.year)) : null

  const columns: GridColDef[] = [
    { field: 'carrier_name',      headerName: 'Compagnie',         flex: 2 },
    { field: 'total_flights',     headerName: 'Total vols',        flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delayed_flights',   headerName: 'Vols en retard',    flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delay_rate_pct',    headerName: 'Taux retard (%)',   flex: 1, type: 'number' },
    { field: 'avg_arr_delay_min', headerName: 'Retard moy. (min)', flex: 1, type: 'number' },
  ]

  if (loading) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <FlightTakeoffIcon sx={{ fontSize: 48, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">Chargement des données…</Typography>
    </Box>
  )

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box
        sx={{
          mb: 4, p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, #0d1b2a 0%, #1565c0 60%, #1e3a5f 100%)`,
          color: 'white',
        }}
      >
        {/* Cercles décoratifs */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#4fc3f7', 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80,  width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#4fc3f7', 0.07), pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box sx={{ bgcolor: alpha('#4fc3f7', 0.2), borderRadius: 2, p: 1.2, display: 'flex' }}>
            <FlightTakeoffIcon sx={{ fontSize: 32, color: '#4fc3f7' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
              Performance des compagnies
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>
              Analyse des retards et de la ponctualité — vols domestiques USA
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${kpiYears[0]} – ${kpiYears[kpiYears.length - 1]}`} size="small"
            sx={{ bgcolor: alpha('#fff', 0.1), color: '#90caf9', fontWeight: 600 }} />
          <Chip label={`${carriers.length} compagnies`} size="small"
            sx={{ bgcolor: alpha('#fff', 0.1), color: '#90caf9', fontWeight: 600 }} />
          <Chip label={`~30M vols`} size="small"
            sx={{ bgcolor: alpha('#fff', 0.1), color: '#90caf9', fontWeight: 600 }} />
        </Stack>
      </Box>

      {/* ── Filtres ── */}
      <Box
        sx={{
          mb: 3, p: 2, borderRadius: 2,
          bgcolor: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>Filtrer par :</Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Année"
            views={['year']}
            openTo="year"
            minDate={dayjs().year(years[0] ?? 2003)}
            maxDate={dayjs().year(years[years.length - 1] ?? 2008)}
            value={yearValue}
            onChange={(val: Dayjs | null) => setFilter('year', val ? String(val.year()) : '')}
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 120 } },
              field: { clearable: true, onClear: () => setFilter('year', '') },
            }}
          />
        </LocalizationProvider>

        <TextField
          select label="Compagnie" size="small"
          value={filters.carrier}
          onChange={e => setFilter('carrier', e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Toutes les compagnies</MenuItem>
          {carriers.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>

        {(filters.year || filters.carrier) && (
          <Chip
            label="Réinitialiser"
            onDelete={() => { setFilter('year', ''); setFilter('carrier', '') }}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* ── KPI widgets ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Total vols" total={totalVols}
            percent={pctChange(byYear.map(d => d.total))} color="primary" icon={<FlightIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.total) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Taux de retard moyen" total={avgRate}
            percent={pctChange(byYear.map(d => d.rate))} color="error" icon={<WarningAmberIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.rate) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Retard moyen (min)" total={avgDelay}
            percent={pctChange(byYear.map(d => d.delay))} color="warning" icon={<AccessTimeIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.delay) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Compagnies" total={nbCarriers}
            percent={0} color="success" icon={<AirlinesIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(() => nbCarriers) }} />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2}>

        {/* Bar chart taux retard — barres dégradées */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Taux de retard par compagnie (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 120, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradRate" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#00A76F" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#00A76F" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} />
                <YAxis type="category" dataKey="carrier_name" {...cs.axis} width={120} />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Bar dataKey="delay_rate_pct" fill="url(#gradRate)" name="Taux retard" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Line chart retard par mois */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Retard moyen à l'arrivée par mois (min)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byMonth} margin={{ left: 0, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#FFAB00" />
                    <stop offset="100%" stopColor="#FF5630" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="month" {...cs.axis} />
                <YAxis {...cs.axis} />
                <Tooltip content={<CustomTooltip unit=" min" />} />
                <Line
                  type="monotone" dataKey="avg_delay" name="Retard moy."
                  stroke="url(#gradLine)" strokeWidth={3} strokeLinecap="round"
                  dot={{ r: 4, fill: '#FF5630', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#FF5630' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Scatter volume vs retard */}
        <Grid item xs={12}>
          <ChartCard title="Volume de vols vs taux de retard" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 30, bottom: 24, left: 10 }}>
                <defs>
                  <radialGradient id="gradDot" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#00A76F" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#007867" stopOpacity={0.4} />
                  </radialGradient>
                </defs>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis dataKey="total_flights"  name="Total vols"      {...cs.axis}
                  label={{ value: 'Total vols', position: 'insideBottom', offset: -14, fontSize: 11, fill: theme.palette.text.disabled }} />
                <YAxis dataKey="delay_rate_pct" name="Taux retard (%)" {...cs.axis}
                  label={{ value: 'Taux retard (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: theme.palette.text.disabled }} />
                <ZAxis dataKey="delayed_flights" range={[60, 600]} name="Vols retardés" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload as typeof byCarrier[0]
                    return (
                      <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 2, boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" fontWeight={700}>{d.carrier_name}</Typography><br />
                        <Typography variant="caption">Vols : {d.total_flights?.toLocaleString()}</Typography><br />
                        <Typography variant="caption">Taux retard : {d.delay_rate_pct}%</Typography>
                      </Box>
                    )
                  }}
                />
                <Scatter data={byCarrier} fill="url(#gradDot)" opacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* DataGrid */}
        <Grid item xs={12}>
          <ChartCard title="Classement des compagnies" height={400}>
            <DataGrid
              rows={byCarrier.map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{
                border: 'none', fontSize: 13,
                '& .MuiDataGrid-row:hover': { bgcolor: alpha('#00A76F', 0.04) },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f4f6f8', borderRadius: 1 },
              }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
