import { useMemo } from 'react'
import {
  Grid, Typography, MenuItem, Select, FormControl, InputLabel,
  TextField, Box, CircularProgress, useTheme, alpha, Chip, Stack,
} from '@mui/material'
import LocalAirportIcon from '@mui/icons-material/LocalAirport'
import FlightLandIcon from '@mui/icons-material/FlightLand'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { AirportPerformance } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'

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

function CustomTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.fill || p.stroke }} />
          <Typography variant="caption">{p.name} : <strong>{p.value}{unit}</strong></Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function Airports() {
  const { data, loading } = useCSV<AirportPerformance>(dataUrl('airport_performance'))
  const { filters, setFilter } = useFilters()
  const theme = useTheme()
  const cs = useChartStyle()

  const years  = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const states = useMemo(() => [...new Set(data.map(d => d.origin_state).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.year   || d.Year         === Number(filters.year)) &&
      (!filters.state  || d.origin_state === filters.state) &&
      (!filters.origin || d.Origin       === filters.origin.toUpperCase())
    ), [data, filters])

  const byAirport = useMemo(() => {
    const map = new Map<string, { name: string; city: string; state: string; total: number; delayed: number; delay_rate: number; dep_delay: number; taxi: number; count: number }>()
    filtered.forEach(d => {
      const prev = map.get(d.Origin) ?? { name: d.origin_name, city: d.origin_city, state: d.origin_state, total: 0, delayed: 0, delay_rate: 0, dep_delay: 0, taxi: 0, count: 0 }
      map.set(d.Origin, {
        ...prev,
        total:      prev.total + d.total_flights,
        delayed:    prev.delayed + d.delayed_flights,
        delay_rate: prev.delay_rate + d.delay_rate_pct,
        dep_delay:  prev.dep_delay + d.avg_dep_delay_min,
        taxi:       prev.taxi + d.avg_taxi_out_min,
        count:      prev.count + 1,
      })
    })
    return [...map.entries()].map(([origin, v]) => ({
      Origin:            origin,
      origin_name:       v.name,
      origin_city:       v.city,
      origin_state:      v.state,
      total_flights:     v.total,
      delayed_flights:   v.delayed,
      delay_rate_pct:    parseFloat((v.delay_rate / v.count).toFixed(2)),
      avg_dep_delay_min: parseFloat((v.dep_delay  / v.count).toFixed(2)),
      avg_taxi_out_min:  parseFloat((v.taxi       / v.count).toFixed(2)),
    })).sort((a, b) => b.delay_rate_pct - a.delay_rate_pct)
  }, [filtered])

  const top10 = byAirport.slice(0, 10)

  // KPIs globaux
  const kpiYears = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const byYear = useMemo(() =>
    kpiYears.map(y => {
      const rows = filtered.filter(d => d.Year === y)
      return {
        y,
        total:    rows.reduce((s, d) => s + d.total_flights, 0),
        delayed:  rows.reduce((s, d) => s + d.delayed_flights, 0),
        rate:     rows.length ? rows.reduce((s, d) => s + d.delay_rate_pct, 0) / rows.length : 0,
        taxi:     rows.length ? rows.reduce((s, d) => s + d.avg_taxi_out_min, 0) / rows.length : 0,
      }
    })
  , [filtered, kpiYears])

  const totalVols   = filtered.reduce((s, d) => s + d.total_flights, 0)
  const totalDelayed = filtered.reduce((s, d) => s + d.delayed_flights, 0)
  const avgRate     = byYear.length ? byYear.reduce((s, d) => s + d.rate, 0) / byYear.length : 0
  const avgTaxi     = byYear.length ? byYear.reduce((s, d) => s + d.taxi, 0) / byYear.length : 0
  const nbAirports  = new Set(filtered.map(d => d.Origin)).size

  const pctChange = (arr: number[]) => {
    if (arr.length < 2) return 0
    const last = arr[arr.length - 1], prev = arr[arr.length - 2]
    return prev === 0 ? 0 : ((last - prev) / prev) * 100
  }

  const columns: GridColDef[] = [
    { field: 'Origin',            headerName: 'Code',        width: 70 },
    { field: 'origin_name',       headerName: 'Aéroport',    flex: 2 },
    { field: 'origin_city',       headerName: 'Ville',       flex: 1 },
    { field: 'origin_state',      headerName: 'État',        width: 70 },
    { field: 'total_flights',     headerName: 'Total vols',  flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delay_rate_pct',    headerName: 'Taux retard', flex: 1, type: 'number', valueFormatter: v => `${v.value}%` },
    { field: 'avg_dep_delay_min', headerName: 'Ret. dép.',   flex: 1, type: 'number' },
    { field: 'avg_taxi_out_min',  headerName: 'Taxi-out',    flex: 1, type: 'number' },
  ]

  if (loading) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <LocalAirportIcon sx={{ fontSize: 48, color: 'info.main' }} />
      <CircularProgress size={32} color="info" />
      <Typography variant="body2" color="text.secondary">Chargement des données…</Typography>
    </Box>
  )

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box sx={{
        mb: 4, p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #006C9C 60%, #003768 100%)',
        color: 'white',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#61F3F3', 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#61F3F3', 0.07), pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box sx={{ bgcolor: alpha('#61F3F3', 0.2), borderRadius: 2, p: 1.2, display: 'flex' }}>
            <LocalAirportIcon sx={{ fontSize: 32, color: '#61F3F3' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Aéroports</Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>
              Taux de retard, retards au départ et temps de taxi-out par aéroport
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${nbAirports} aéroports`} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#CAFDF5', fontWeight: 600 }} />
          <Chip label="Vols domestiques USA" size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#CAFDF5', fontWeight: 600 }} />
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
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00B8D9' }} />
                  {y}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>État</InputLabel>
          <Select label="État" value={filters.state} onChange={e => setFilter('state', e.target.value)}>
            <MenuItem value=""><em>Tous</em></MenuItem>
            {states.map(s => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#006C9C' }} />
                  {s}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Code IATA (ex: ATL)" size="small"
          value={filters.origin}
          onChange={e => setFilter('origin', e.target.value)}
          sx={{ minWidth: 180 }}
        />

        {(filters.year || filters.state || filters.origin) && (
          <Chip
            label="Réinitialiser"
            onDelete={() => { setFilter('year', ''); setFilter('state', ''); setFilter('origin', '') }}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* ── KPI widgets ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Total vols" total={totalVols}
            percent={pctChange(byYear.map(d => d.total))} color="info" icon={<FlightLandIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.total) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Vols en retard" total={totalDelayed}
            percent={pctChange(byYear.map(d => d.delayed))} color="error" icon={<AccessTimeIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.delayed) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Taux de retard moy." total={avgRate}
            percent={pctChange(byYear.map(d => d.rate))} color="warning" icon={<SpeedIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.rate) }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Taxi-out moyen (min)" total={avgTaxi}
            percent={pctChange(byYear.map(d => d.taxi))} color="secondary" icon={<LocalAirportIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.taxi) }} />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 10 aéroports — taux de retard (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 160, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradRateApt" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF5630" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#B71D18" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} />
                <YAxis type="category" dataKey="origin_name" {...cs.axis} width={160} />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Bar dataKey="delay_rate_pct" fill="url(#gradRateApt)" name="Taux retard" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Top 10 aéroports — taxi-out moyen (min)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 160, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradTaxi" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00B8D9" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#006C9C" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} />
                <YAxis type="category" dataKey="origin_name" {...cs.axis} width={160} />
                <Tooltip content={<CustomTooltip unit=" min" />} />
                <Bar dataKey="avg_taxi_out_min" fill="url(#gradTaxi)" name="Taxi-out moy." radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Détail par aéroport" height={420}>
            <DataGrid
              rows={byAirport.map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{
                border: 'none', fontSize: 13,
                '& .MuiDataGrid-row:hover': { bgcolor: alpha('#00B8D9', 0.04) },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f4f6f8', borderRadius: 1 },
              }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
