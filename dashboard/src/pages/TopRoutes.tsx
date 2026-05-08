import { useMemo } from 'react'
import {
  Grid, Typography, TextField, Box, CircularProgress,
  useTheme, alpha, Chip, Stack, InputAdornment,
} from '@mui/material'
import RouteIcon from '@mui/icons-material/Route'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import FlightLandIcon from '@mui/icons-material/FlightLand'
import StraightenIcon from '@mui/icons-material/Straighten'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SearchIcon from '@mui/icons-material/Search'
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { TopRoute } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'
import { fNumber } from '../utils/formatNumber'

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

export default function TopRoutes() {
  const { data, loading } = useCSV<TopRoute>(dataUrl('top_routes'))
  const { filters, setFilter } = useFilters()
  const theme = useTheme()
  const cs = useChartStyle()

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.origin || d.Origin === filters.origin.toUpperCase()) &&
      (!filters.dest   || d.Dest   === filters.dest.toUpperCase())
    ), [data, filters])

  const top20Traffic = useMemo(() =>
    [...filtered].sort((a, b) => b.total_flights - a.total_flights).slice(0, 20)
  , [filtered])

  const top20Delay = useMemo(() =>
    [...filtered].sort((a, b) => b.delay_rate_pct - a.delay_rate_pct).slice(0, 20)
  , [filtered])

  // KPIs globaux
  const totalVols   = filtered.reduce((s, d) => s + d.total_flights, 0)
  const avgDelay    = filtered.length ? filtered.reduce((s, d) => s + d.avg_arr_delay_min, 0) / filtered.length : 0
  const avgDistance = filtered.length ? filtered.reduce((s, d) => s + d.distance_miles, 0) / filtered.length : 0
  const avgRate     = filtered.length ? filtered.reduce((s, d) => s + d.delay_rate_pct, 0) / filtered.length : 0

  const columns: GridColDef[] = [
    { field: 'route',             headerName: 'Route',           flex: 1 },
    { field: 'origin_city',       headerName: 'Départ',          flex: 1 },
    { field: 'dest_city',         headerName: 'Arrivée',         flex: 1 },
    { field: 'total_flights',     headerName: 'Total vols',      flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'distance_miles',    headerName: 'Distance (mi)',   flex: 1, type: 'number' },
    { field: 'avg_arr_delay_min', headerName: 'Retard moy.(min)', flex: 1, type: 'number' },
    { field: 'delay_rate_pct',    headerName: 'Taux retard (%)', flex: 1, type: 'number' },
  ]

  if (loading) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <RouteIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
      <CircularProgress size={32} color="secondary" />
      <Typography variant="body2" color="text.secondary">Chargement des données…</Typography>
    </Box>
  )

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box sx={{
        mb: 4, p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #5119B7 60%, #27097A 100%)',
        color: 'white',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#C684FF', 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#C684FF', 0.07), pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box sx={{ bgcolor: alpha('#C684FF', 0.2), borderRadius: 2, p: 1.2, display: 'flex' }}>
            <RouteIcon sx={{ fontSize: 32, color: '#C684FF' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Top 200 Routes</Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>
              Routes les plus fréquentées — trafic, distance et retards
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${data.length} routes`} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#EFD6FF', fontWeight: 600 }} />
          <Chip label={`${fNumber(totalVols)} vols`} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#EFD6FF', fontWeight: 600 }} />
        </Stack>
      </Box>

      {/* ── Filtres ── */}
      <Box sx={{
        mb: 3, p: 2, borderRadius: 2, bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>Filtrer par :</Typography>

        <TextField
          label="Départ" size="small" placeholder="ex: ATL"
          value={filters.origin} onChange={e => setFilter('origin', e.target.value)}
          sx={{ minWidth: 160 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
        />
        <TextField
          label="Arrivée" size="small" placeholder="ex: LAX"
          value={filters.dest} onChange={e => setFilter('dest', e.target.value)}
          sx={{ minWidth: 160 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
        />

        {(filters.origin || filters.dest) && (
          <Chip label="Réinitialiser" onDelete={() => { setFilter('origin', ''); setFilter('dest', '') }}
            size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontWeight: 600 }} />
        )}
      </Box>

      {/* ── KPI widgets ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Total vols (filtre)" total={totalVols}
            percent={0} color="secondary" icon={<FlightTakeoffIcon />}
            chart={{ categories: [''], series: [totalVols] }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Taux de retard moy." total={avgRate}
            percent={0} color="error" icon={<WarningAmberIcon />}
            chart={{ categories: [''], series: [avgRate] }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Retard moy. (min)" total={avgDelay}
            percent={0} color="warning" icon={<FlightLandIcon />}
            chart={{ categories: [''], series: [avgDelay] }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Distance moy. (mi)" total={avgDistance}
            percent={0} color="info" icon={<StraightenIcon />}
            chart={{ categories: [''], series: [avgDistance] }} />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2}>
        {/* Top 20 trafic */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 20 routes par trafic">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20Traffic} layout="vertical" margin={{ left: 90, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradTraffic" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8E33FF" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#5119B7" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="route" {...cs.axis} width={90} />
                <Tooltip
                  {...cs.tooltip}
                  formatter={(v: any) => [Number(v).toLocaleString(), 'Vols']}
                />
                <Bar dataKey="total_flights" fill="url(#gradTraffic)" name="Total vols" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Top 20 retard */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 20 routes par taux de retard (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20Delay} layout="vertical" margin={{ left: 90, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradDelayRoute" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF5630" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#B71D18" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} />
                <YAxis type="category" dataKey="route" {...cs.axis} width={90} />
                <Tooltip {...cs.tooltip} formatter={(v: any) => [`${v}%`, 'Taux retard']} />
                <Bar dataKey="delay_rate_pct" fill="url(#gradDelayRoute)" name="Taux retard (%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Scatter distance vs retard */}
        <Grid item xs={12}>
          <ChartCard title="Distance vs taux de retard" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 30, bottom: 24, left: 10 }}>
                <defs>
                  <radialGradient id="gradDotRoute" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#8E33FF" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#5119B7" stopOpacity={0.3} />
                  </radialGradient>
                </defs>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis dataKey="distance_miles" name="Distance (mi)" {...cs.axis}
                  label={{ value: 'Distance (miles)', position: 'insideBottom', offset: -14, fontSize: 11, fill: theme.palette.text.disabled }} />
                <YAxis dataKey="delay_rate_pct" name="Taux retard (%)" {...cs.axis}
                  label={{ value: 'Taux retard (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: theme.palette.text.disabled }} />
                <ZAxis dataKey="total_flights" range={[40, 400]} name="Total vols" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload as TopRoute
                    return (
                      <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 2, boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" fontWeight={700}>{d.route}</Typography><br />
                        <Typography variant="caption">Distance : {d.distance_miles} mi</Typography><br />
                        <Typography variant="caption">Taux retard : {d.delay_rate_pct}%</Typography><br />
                        <Typography variant="caption">Vols : {d.total_flights?.toLocaleString()}</Typography>
                      </Box>
                    )
                  }}
                />
                <Scatter data={filtered} fill="url(#gradDotRoute)" opacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* DataGrid */}
        <Grid item xs={12}>
          <ChartCard title="Classement des routes" height={420}>
            <DataGrid
              rows={filtered.map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{
                border: 'none', fontSize: 13,
                '& .MuiDataGrid-row:hover': { bgcolor: alpha('#8E33FF', 0.04) },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f4f6f8', borderRadius: 1 },
              }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
