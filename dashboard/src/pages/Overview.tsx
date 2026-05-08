import { useMemo } from 'react'
import { Grid, Typography, MenuItem, TextField, Box, CircularProgress } from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import CancelIcon from '@mui/icons-material/Cancel'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PercentIcon from '@mui/icons-material/Percent'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { MonthlyTrend } from '../types'
import { dataUrl } from '../config/datasource'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/ChartCard'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Overview() {
  const { data, loading } = useCSV<MonthlyTrend>(dataUrl('monthly_trends'))
  const { filters, setFilter } = useFilters()

  const years = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.year  || d.Year  === Number(filters.year)) &&
      (!filters.month || d.Month === Number(filters.month))
    ), [data, filters])

  const kpis = useMemo(() => ({
    total:     filtered.reduce((s, d) => s + d.total_flights, 0),
    cancelled: filtered.reduce((s, d) => s + d.cancelled_flights, 0),
    cancel_rt: filtered.length ? (filtered.reduce((s,d) => s + d.cancellation_rate_pct, 0) / filtered.length).toFixed(2) : '0',
    avg_delay: filtered.length ? (filtered.reduce((s,d) => s + d.avg_arr_delay_min, 0) / filtered.length).toFixed(1) : '0',
  }), [filtered])

  const chartData = useMemo(() =>
    filtered
      .sort((a, b) => a.Year - b.Year || a.Month - b.Month)
      .map(d => ({ ...d, label: `${MONTHS[d.Month - 1]} ${d.Year}` }))
  , [filtered])

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Vue générale des vols</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Saisonnalité et tendances — toutes compagnies confondues
      </Typography>

      {/* Filtres */}
      <Box display="flex" gap={2} mb={3}>
        <TextField select label="Année" size="small" value={filters.year} onChange={e => setFilter('year', e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Toutes</MenuItem>
          {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField select label="Mois" size="small" value={filters.month} onChange={e => setFilter('month', e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Tous</MenuItem>
          {MONTHS.map((m, i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
        </TextField>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <KpiCard title="Total vols" value={kpis.total.toLocaleString()} icon={<FlightIcon />} color="#1565c0" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Vols annulés" value={kpis.cancelled.toLocaleString()} icon={<CancelIcon />} color="#c62828" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Taux annulation" value={`${kpis.cancel_rt}%`} icon={<PercentIcon />} color="#e65100" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Retard moyen arrivée" value={`${kpis.avg_delay} min`} icon={<AccessTimeIcon />} color="#2e7d32" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Retard moyen à l'arrivée par mois (min)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_arr_delay_min" stroke="#1565c0" strokeWidth={2} dot={false} name="Retard moy. (min)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Taux d'annulation par mois (%)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cancellation_rate_pct" stroke="#c62828" strokeWidth={2} dot={false} name="Taux annulation (%)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Catégories de retard par mois" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="on_time_flights"  stackId="a" fill="#2e7d32" name="À l'heure" />
                <Bar dataKey="minor_delays"     stackId="a" fill="#f9a825" name="Léger (<15min)" />
                <Bar dataKey="moderate_delays"  stackId="a" fill="#e65100" name="Modéré (15-60min)" />
                <Bar dataKey="severe_delays"    stackId="a" fill="#c62828" name="Sévère (>60min)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
