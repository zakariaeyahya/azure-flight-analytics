import { useMemo } from 'react'
import { Grid, Typography, MenuItem, TextField, Box, CircularProgress } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { AirportPerformance } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'

export default function Airports() {
  const { data, loading } = useCSV<AirportPerformance>(dataUrl('airport_performance'))
  const { filters, setFilter } = useFilters()

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
      avg_dep_delay_min: parseFloat((v.dep_delay / v.count).toFixed(2)),
      avg_taxi_out_min:  parseFloat((v.taxi / v.count).toFixed(2)),
    })).sort((a, b) => b.delay_rate_pct - a.delay_rate_pct)
  }, [filtered])

  const top10 = byAirport.slice(0, 10)

  const columns: GridColDef[] = [
    { field: 'Origin',            headerName: 'Code',         width: 70 },
    { field: 'origin_name',       headerName: 'Aéroport',     flex: 2 },
    { field: 'origin_city',       headerName: 'Ville',        flex: 1 },
    { field: 'origin_state',      headerName: 'État',         width: 70 },
    { field: 'total_flights',     headerName: 'Total vols',   flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'delay_rate_pct',    headerName: 'Taux retard',  flex: 1, type: 'number', valueFormatter: v => `${v.value}%` },
    { field: 'avg_dep_delay_min', headerName: 'Ret. dép.',    flex: 1, type: 'number' },
    { field: 'avg_taxi_out_min',  headerName: 'Taxi-out',     flex: 1, type: 'number' },
  ]

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Aéroports problématiques</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Taux de retard, retards au départ et temps de taxi-out par aéroport
      </Typography>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField select label="Année" size="small" value={filters.year} onChange={e => setFilter('year', e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Toutes</MenuItem>
          {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField select label="État" size="small" value={filters.state} onChange={e => setFilter('state', e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Tous</MenuItem>
          {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField label="Code IATA (ex: ATL)" size="small" value={filters.origin} onChange={e => setFilter('origin', e.target.value)} sx={{ minWidth: 160 }} />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 10 aéroports — taux de retard (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 160 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="origin_name" tick={{ fontSize: 10 }} width={160} />
                <Tooltip formatter={(v) => [`${v}%`, 'Taux retard']} />
                <Bar dataKey="delay_rate_pct" fill="#c62828" name="Taux retard (%)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Top 10 aéroports — taxi-out moyen (min)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 160 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="origin_name" tick={{ fontSize: 10 }} width={160} />
                <Tooltip formatter={(v) => [`${v} min`, 'Taxi-out moy.']} />
                <Bar dataKey="avg_taxi_out_min" fill="#e65100" name="Taxi-out moy. (min)" radius={[0,4,4,0]} />
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
              sx={{ border: 'none', fontSize: 13 }}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
