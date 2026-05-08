import { useMemo } from 'react'
import { Grid, Typography, TextField, Box, CircularProgress } from '@mui/material'
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { TopRoute } from '../types'
import { dataUrl } from '../config/datasource'
import ChartCard from '../components/ChartCard'

export default function TopRoutes() {
  const { data, loading } = useCSV<TopRoute>(dataUrl('top_routes'))
  const { filters, setFilter } = useFilters()

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

  const columns: GridColDef[] = [
    { field: 'route',              headerName: 'Route',              flex: 1 },
    { field: 'origin_city',        headerName: 'Départ',             flex: 1 },
    { field: 'dest_city',          headerName: 'Arrivée',            flex: 1 },
    { field: 'total_flights',      headerName: 'Total vols',         flex: 1, type: 'number', valueFormatter: v => v.value?.toLocaleString() },
    { field: 'distance_miles',     headerName: 'Distance (mi)',      flex: 1, type: 'number' },
    { field: 'avg_arr_delay_min',  headerName: 'Retard moy. (min)', flex: 1, type: 'number' },
    { field: 'delay_rate_pct',     headerName: 'Taux retard (%)',    flex: 1, type: 'number' },
  ]

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Top 200 Routes</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Routes les plus fréquentées — trafic, distance et retards
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField label="Départ (ex: ATL)" size="small" value={filters.origin} onChange={e => setFilter('origin', e.target.value)} sx={{ minWidth: 160 }} />
        <TextField label="Arrivée (ex: LAX)" size="small" value={filters.dest}   onChange={e => setFilter('dest', e.target.value)}   sx={{ minWidth: 160 }} />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 20 routes par trafic">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20Traffic} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Vols']} />
                <Bar dataKey="total_flights" fill="#1565c0" name="Total vols" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Top 20 routes par taux de retard (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20Delay} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [`${v}%`, 'Taux retard']} />
                <Bar dataKey="delay_rate_pct" fill="#c62828" name="Taux retard (%)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Distance vs taux de retard" height={340}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="distance_miles"  name="Distance (mi)"    tick={{ fontSize: 11 }} label={{ value: 'Distance (miles)', position: 'insideBottom', offset: -10 }} />
                <YAxis dataKey="delay_rate_pct"  name="Taux retard (%)"  tick={{ fontSize: 11 }} label={{ value: 'Taux retard (%)', angle: -90, position: 'insideLeft' }} />
                <ZAxis dataKey="total_flights"   range={[40, 400]}       name="Total vols" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0].payload as TopRoute
                  return (
                    <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={600}>{d.route}</Typography><br />
                      <Typography variant="caption">Distance : {d.distance_miles} mi</Typography><br />
                      <Typography variant="caption">Taux retard : {d.delay_rate_pct}%</Typography><br />
                      <Typography variant="caption">Vols : {d.total_flights?.toLocaleString()}</Typography>
                    </Box>
                  )
                }} />
                <Scatter data={filtered} fill="#1565c0" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Classement des routes" height={420}>
            <DataGrid
              rows={filtered.map((r, i) => ({ id: i, ...r }))}
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
