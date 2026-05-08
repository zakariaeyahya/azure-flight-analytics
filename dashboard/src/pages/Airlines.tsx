import { useMemo } from 'react'
import { Grid, Typography, MenuItem, TextField, Box, CircularProgress, useTheme } from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import AirlinesIcon from '@mui/icons-material/Airlines'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { CarrierPerformance, MonthlyTrend } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'
import { AppWidgetSummary } from '../components/AppWidgetSummary'

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// Style global inspiré de Minimal UI use-chart.ts
function useChartStyle() {
  const theme = useTheme()
  return {
    grid:    { strokeDasharray: '3 3', stroke: theme.palette.divider, vertical: false },
    axis:    { tick: { fontSize: 11, fill: theme.palette.text.disabled }, axisLine: false, tickLine: false },
    tooltip: {
      contentStyle: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        boxShadow: '0 8px 16px 0 rgba(0,0,0,0.12)',
        fontSize: 12,
      },
    },
    colors:  [
      theme.palette.primary.main,
      '#FFAB00',   // warning
      '#00B8D9',   // info
      '#FF5630',   // error
      '#22C55E',   // success
    ],
  }
}

export default function Airlines() {
  const { data: carrierData, loading: l1 } = useCSV<CarrierPerformance>(dataUrl('carrier_performance'))
  const { data: monthlyData, loading: l2 } = useCSV<MonthlyTrend>(dataUrl('monthly_trends'))
  const { filters, setFilter } = useFilters()
  const cs = useChartStyle()

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

  // Retard moyen par mois (toutes années filtrées confondues)
  const byMonth = useMemo(() => {
    const filteredMonthly = monthlyData.filter(d =>
      !filters.year || d.Year === Number(filters.year)
    )
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

  // KPIs par année
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

  const columns: GridColDef[] = [
    { field: 'carrier_name',      headerName: 'Compagnie',         flex: 2 },
    { field: 'total_flights',     headerName: 'Total vols',        flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delayed_flights',   headerName: 'Vols en retard',    flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delay_rate_pct',    headerName: 'Taux retard (%)',   flex: 1, type: 'number' },
    { field: 'avg_arr_delay_min', headerName: 'Retard moy. (min)', flex: 1, type: 'number' },
  ]

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Performance des compagnies</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Ponctualité et retards par compagnie aérienne
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField select label="Année" size="small" value={filters.year} onChange={e => setFilter('year', e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Toutes</MenuItem>
          {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField select label="Compagnie" size="small" value={filters.carrier} onChange={e => setFilter('carrier', e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Toutes</MenuItem>
          {carriers.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Box>

      {/* KPI widgets style Minimal UI */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total vols"
            total={totalVols}
            percent={pctChange(byYear.map(d => d.total))}
            color="primary"
            icon={<FlightIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.total) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Taux de retard moyen"
            total={avgRate}
            percent={pctChange(byYear.map(d => d.rate))}
            color="error"
            icon={<WarningAmberIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.rate) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Retard moyen (min)"
            total={avgDelay}
            percent={pctChange(byYear.map(d => d.delay))}
            color="warning"
            icon={<AccessTimeIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(d => d.delay) }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Compagnies"
            total={nbCarriers}
            percent={0}
            color="success"
            icon={<AirlinesIcon />}
            chart={{ categories: kpiYears.map(String), series: byYear.map(() => nbCarriers) }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Taux de retard par compagnie */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Taux de retard par compagnie (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 120, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis type="number" {...cs.axis} />
                <YAxis type="category" dataKey="carrier_name" {...cs.axis} width={120} />
                <Tooltip {...cs.tooltip} formatter={(v) => [`${v}%`, 'Taux retard']} />
                <Bar dataKey="delay_rate_pct" fill={cs.colors[0]} name="Taux retard (%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Retard moyen à l'arrivée par mois */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Retard moyen à l'arrivée par mois (min)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byMonth} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} vertical={false} />
                <XAxis dataKey="month" {...cs.axis} />
                <YAxis {...cs.axis} />
                <Tooltip {...cs.tooltip} formatter={(v) => [`${v} min`, 'Retard moy.']} />
                <Line
                  type="monotone"
                  dataKey="avg_delay"
                  stroke={cs.colors[3]}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  dot={{ r: 3, fill: cs.colors[3], strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="Retard moy. (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Volume vs taux de retard */}
        <Grid item xs={12}>
          <ChartCard title="Volume de vols vs taux de retard" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray={cs.grid.strokeDasharray} stroke={cs.grid.stroke} />
                <XAxis dataKey="total_flights"  name="Total vols"      {...cs.axis} label={{ value: 'Total vols', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                <YAxis dataKey="delay_rate_pct" name="Taux retard (%)" {...cs.axis} label={{ value: 'Taux retard (%)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <ZAxis dataKey="delayed_flights" range={[60, 600]} name="Vols retardés" />
                <Tooltip
                  {...cs.tooltip}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload as typeof byCarrier[0]
                    return (
                      <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #DFE3E8', borderRadius: 1, boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" fontWeight={600}>{d.carrier_name}</Typography><br />
                        <Typography variant="caption">Vols : {d.total_flights?.toLocaleString()}</Typography><br />
                        <Typography variant="caption">Taux retard : {d.delay_rate_pct}%</Typography>
                      </Box>
                    )
                  }}
                />
                <Scatter data={byCarrier} fill={cs.colors[0]} opacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Tableau */}
        <Grid item xs={12}>
          <ChartCard title="Classement des compagnies" height={400}>
            <DataGrid
              rows={byCarrier.map((r, i) => ({ id: i, ...r }))}
              columns={columns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{ border: 'none', fontSize: 13 }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
