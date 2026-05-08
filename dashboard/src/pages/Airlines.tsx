import { useMemo } from 'react'
import { Grid, Typography, MenuItem, TextField, Box, CircularProgress } from '@mui/material'
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { CarrierPerformance } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'

export default function Airlines() {
  const { data, loading } = useCSV<CarrierPerformance>(dataUrl('carrier_performance'))
  const { filters, setFilter } = useFilters()

  const years    = useMemo(() => [...new Set(data.map(d => d.Year))].sort(), [data])
  const carriers = useMemo(() => [...new Set(data.map(d => d.carrier_name))].sort(), [data])

  const filtered = useMemo(() =>
    data.filter(d =>
      (!filters.year    || d.Year         === Number(filters.year)) &&
      (!filters.carrier || d.carrier_name === filters.carrier)
    ), [data, filters])

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

  const columns: GridColDef[] = [
    { field: 'carrier_name',      headerName: 'Compagnie',           flex: 2 },
    { field: 'total_flights',     headerName: 'Total vols',          flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delayed_flights',   headerName: 'Vols en retard',      flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delay_rate_pct',    headerName: 'Taux retard (%)',     flex: 1, type: 'number' },
    { field: 'avg_arr_delay_min', headerName: 'Retard moy. (min)',   flex: 1, type: 'number' },
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

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Taux de retard par compagnie (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="carrier_name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="delay_rate_pct" fill="#1565c0" name="Taux retard (%)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Retard moyen à l'arrivée (min)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="carrier_name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="avg_arr_delay_min" fill="#e65100" name="Retard moy. (min)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Volume de vols vs taux de retard" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="total_flights"   name="Total vols"      tick={{ fontSize: 11 }} label={{ value: 'Total vols', position: 'insideBottom', offset: -10 }} />
                <YAxis dataKey="delay_rate_pct"  name="Taux retard (%)" tick={{ fontSize: 11 }} label={{ value: 'Taux retard (%)', angle: -90, position: 'insideLeft' }} />
                <ZAxis dataKey="delayed_flights" range={[60, 600]} name="Vols retardés" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0].payload as typeof byCarrier[0]
                  return (
                    <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={600}>{d.carrier_name}</Typography><br />
                      <Typography variant="caption">Vols : {d.total_flights?.toLocaleString()}</Typography><br />
                      <Typography variant="caption">Taux retard : {d.delay_rate_pct}%</Typography>
                    </Box>
                  )
                }} />
                <Scatter data={byCarrier} fill="#1565c0" opacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

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
