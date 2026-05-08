import { useMemo } from 'react'
import {
  Grid, Typography, MenuItem, Select, FormControl, InputLabel,
  Box, CircularProgress, useTheme, alpha, Chip, Stack,
} from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import CancelIcon from '@mui/icons-material/Cancel'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PercentIcon from '@mui/icons-material/Percent'
import PublicIcon from '@mui/icons-material/Public'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { MonthlyTrend } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function useChartStyle() {
  const theme = useTheme()
  return {
    grid:    { strokeDasharray: '3 3', stroke: theme.palette.divider },
    axis:    { tick: { fontSize: 11, fill: theme.palette.text.disabled }, axisLine: false as const, tickLine: false as const },
    tooltip: {
      contentStyle: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        boxShadow: '0 8px 16px 0 rgba(0,0,0,0.12)',
        fontSize: 12,
      },
    },
  }
}

function CustomTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.stroke || p.fill }} />
          <Typography variant="caption">{p.name} : <strong>{p.value}{unit}</strong></Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function Overview() {
  const { data, loading } = useCSV<MonthlyTrend>(dataUrl('monthly_trends'))
  const { filters, setFilter } = useFilters()
  const theme = useTheme()
  const cs = useChartStyle()

  const years = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.year  || d.Year  === Number(filters.year)) &&
      (!filters.month || d.Month === Number(filters.month))
    ), [data, filters])

  // Agrégats par année pour les sparklines KPI
  const byYear = useMemo(() =>
    years.map(y => {
      const rows = data.filter(d => d.Year === y)
      return {
        y,
        total:    rows.reduce((s, d) => s + d.total_flights, 0),
        cancel:   rows.reduce((s, d) => s + d.cancelled_flights, 0),
        cancelRt: rows.length ? rows.reduce((s, d) => s + d.cancellation_rate_pct, 0) / rows.length : 0,
        delay:    rows.length ? rows.reduce((s, d) => s + d.avg_arr_delay_min, 0) / rows.length : 0,
      }
    })
  , [data, years])

  const kpis = useMemo(() => ({
    total:    filtered.reduce((s, d) => s + d.total_flights, 0),
    cancel:   filtered.reduce((s, d) => s + d.cancelled_flights, 0),
    cancelRt: filtered.length ? filtered.reduce((s, d) => s + d.cancellation_rate_pct, 0) / filtered.length : 0,
    delay:    filtered.length ? filtered.reduce((s, d) => s + d.avg_arr_delay_min, 0) / filtered.length : 0,
  }), [filtered])

  const pctChange = (arr: number[]) => {
    if (arr.length < 2) return 0
    const last = arr[arr.length - 1], prev = arr[arr.length - 2]
    return prev === 0 ? 0 : ((last - prev) / prev) * 100
  }

  const chartData = useMemo(() =>
    filtered
      .sort((a, b) => a.Year - b.Year || a.Month - b.Month)
      .map(d => ({ ...d, label: `${MONTHS[d.Month - 1]} ${d.Year}` }))
  , [filtered])

  if (loading) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <PublicIcon sx={{ fontSize: 48, color: 'primary.main' }} />
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">Chargement des données…</Typography>
    </Box>
  )

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box sx={{
        mb: 4, p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #007867 60%, #004B50 100%)',
        color: 'white',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#5BE49B', 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#5BE49B', 0.07), pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box sx={{ bgcolor: alpha('#5BE49B', 0.2), borderRadius: 2, p: 1.2, display: 'flex' }}>
            <FlightIcon sx={{ fontSize: 32, color: '#5BE49B' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
              Vue générale des vols
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>
              Saisonnalité et tendances — toutes compagnies confondues
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="2003 – 2008" size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#C8FAD6', fontWeight: 600 }} />
          <Chip label="~30M vols analysés" size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#C8FAD6', fontWeight: 600 }} />
          <Chip label="Vols domestiques USA" size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#C8FAD6', fontWeight: 600 }} />
        </Stack>
      </Box>

      {/* ── Filtres ── */}
      <Box sx={{
        mb: 3, p: 2, borderRadius: 2,
        bgcolor: 'white',
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
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00A76F' }} />
                  {y}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Mois</InputLabel>
          <Select label="Mois" value={filters.month} onChange={e => setFilter('month', e.target.value)}>
            <MenuItem value=""><em>Tous</em></MenuItem>
            {MONTHS.map((m, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00B8D9' }} />
                  {m}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(filters.year || filters.month) && (
          <Chip
            label="Réinitialiser"
            onDelete={() => { setFilter('year', ''); setFilter('month', '') }}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* ── KPI widgets style Minimal UI ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total vols"
            total={kpis.total}
            percent={pctChange(byYear.map(d => d.total))}
            color="primary"
            icon={<FlightIcon />}
            chart={{ categories: years.map(String), series: byYear.map(d => d.total) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Vols annulés"
            total={kpis.cancel}
            percent={pctChange(byYear.map(d => d.cancel))}
            color="error"
            icon={<CancelIcon />}
            chart={{ categories: years.map(String), series: byYear.map(d => d.cancel) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Taux annulation"
            total={kpis.cancelRt}
            percent={pctChange(byYear.map(d => d.cancelRt))}
            color="warning"
            icon={<PercentIcon />}
            chart={{ categories: years.map(String), series: byYear.map(d => d.cancelRt) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Retard moy. arrivée"
            total={kpis.delay}
            percent={pctChange(byYear.map(d => d.delay))}
            color="info"
            icon={<AccessTimeIcon />}
            chart={{ categories: years.map(String), series: byYear.map(d => d.delay) }}
          />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2}>

        {/* Retard moyen — Area avec dégradé */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Retard moyen à l'arrivée par mois (min)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradDelay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00A76F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00A76F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="label" {...cs.axis} interval={5} />
                <YAxis {...cs.axis} />
                <Tooltip content={<CustomTooltip unit=" min" />} />
                <Area
                  type="monotone" dataKey="avg_arr_delay_min" name="Retard moy."
                  stroke="#00A76F" strokeWidth={2.5} strokeLinecap="round"
                  fill="url(#gradDelay)" dot={false}
                  activeDot={{ r: 5, fill: '#00A76F' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Taux annulation — Area avec dégradé */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Taux d'annulation par mois (%)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradCancel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#FF5630" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF5630" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="label" {...cs.axis} interval={5} />
                <YAxis {...cs.axis} />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Area
                  type="monotone" dataKey="cancellation_rate_pct" name="Taux annulation"
                  stroke="#FF5630" strokeWidth={2.5} strokeLinecap="round"
                  fill="url(#gradCancel)" dot={false}
                  activeDot={{ r: 5, fill: '#FF5630' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Catégories de retard — stacked bar */}
        <Grid item xs={12}>
          <ChartCard title="Catégories de retard par mois" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="label" {...cs.axis} interval={5} />
                <YAxis {...cs.axis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: '#637381' }}>{value}</span>}
                />
                <Bar dataKey="on_time_flights" stackId="a" fill="#00A76F" name="À l'heure"          radius={[0,0,0,0]} />
                <Bar dataKey="minor_delays"    stackId="a" fill="#FFAB00" name="Léger (<15 min)"    radius={[0,0,0,0]} />
                <Bar dataKey="moderate_delays" stackId="a" fill="#FF5630" name="Modéré (15–60 min)" radius={[0,0,0,0]} />
                <Bar dataKey="severe_delays"   stackId="a" fill="#B71D18" name="Sévère (>60 min)"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
