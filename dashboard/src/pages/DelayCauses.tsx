import { useMemo } from 'react'
import { Grid, Typography, MenuItem, TextField, Box, CircularProgress } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useCSV } from '../hooks/useCSV'
import { useFilters } from '../context/FilterContext'
import { DelayCause } from '../types'
import { dataUrl } from '../config/datasource'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/ChartCard'

const CAUSES = [
  { key: 'avg_carrier_delay',      label: 'Compagnie',       color: '#1565c0' },
  { key: 'avg_weather_delay',      label: 'Météo',           color: '#0288d1' },
  { key: 'avg_nas_delay',          label: 'NAS',             color: '#e65100' },
  { key: 'avg_late_aircraft_delay',label: 'Avion en retard', color: '#c62828' },
  { key: 'avg_security_delay',     label: 'Sécurité',        color: '#6a1b9a' },
]

export default function DelayCauses() {
  const { data, loading } = useCSV<DelayCause>(dataUrl('delay_causes'))
  const { filters, setFilter } = useFilters()

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
        delayed_flights:        prev.delayed_flights + d.delayed_flights,
        avg_carrier_delay:      prev.avg_carrier_delay + d.avg_carrier_delay,
        avg_weather_delay:      prev.avg_weather_delay + d.avg_weather_delay,
        avg_nas_delay:          prev.avg_nas_delay + d.avg_nas_delay,
        avg_late_aircraft_delay:prev.avg_late_aircraft_delay + d.avg_late_aircraft_delay,
        avg_security_delay:     prev.avg_security_delay + d.avg_security_delay,
        count:                  prev.count + 1,
      })
    })
    return [...map.entries()].map(([, v]) => ({
      carrier_name:             v.carrier_name,
      delayed_flights:          v.delayed_flights,
      avg_carrier_delay:        parseFloat((v.avg_carrier_delay / v.count).toFixed(2)),
      avg_weather_delay:        parseFloat((v.avg_weather_delay / v.count).toFixed(2)),
      avg_nas_delay:            parseFloat((v.avg_nas_delay / v.count).toFixed(2)),
      avg_late_aircraft_delay:  parseFloat((v.avg_late_aircraft_delay / v.count).toFixed(2)),
      avg_security_delay:       parseFloat((v.avg_security_delay / v.count).toFixed(2)),
    })).sort((a, b) => b.avg_carrier_delay - a.avg_carrier_delay)
  }, [filtered])

  const globalAvg = useMemo(() => {
    if (!byCarrier.length) return null
    const n = byCarrier.length
    return {
      carrier:       (byCarrier.reduce((s, d) => s + d.avg_carrier_delay, 0) / n).toFixed(1),
      weather:       (byCarrier.reduce((s, d) => s + d.avg_weather_delay, 0) / n).toFixed(1),
      nas:           (byCarrier.reduce((s, d) => s + d.avg_nas_delay, 0) / n).toFixed(1),
      late_aircraft: (byCarrier.reduce((s, d) => s + d.avg_late_aircraft_delay, 0) / n).toFixed(1),
      security:      (byCarrier.reduce((s, d) => s + d.avg_security_delay, 0) / n).toFixed(1),
    }
  }, [byCarrier])

  const columns: GridColDef[] = [
    { field: 'carrier_name',             headerName: 'Compagnie',         flex: 2 },
    { field: 'avg_carrier_delay',        headerName: 'Compagnie (min)',   flex: 1, type: 'number' },
    { field: 'avg_weather_delay',        headerName: 'Météo (min)',       flex: 1, type: 'number' },
    { field: 'avg_nas_delay',            headerName: 'NAS (min)',         flex: 1, type: 'number' },
    { field: 'avg_late_aircraft_delay',  headerName: 'Avion ret. (min)', flex: 1, type: 'number' },
    { field: 'avg_security_delay',       headerName: 'Sécurité (min)',   flex: 1, type: 'number' },
  ]

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>Causes des retards</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Météo, compagnie, NAS, avion en retard ou sécurité ?
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

      {globalAvg && (
        <Grid container spacing={2} mb={3}>
          {CAUSES.map(({ key, label, color }) => (
            <Grid item xs={6} md key={key}>
              <KpiCard title={`Moy. ${label}`} value={`${globalAvg[key as keyof typeof globalAvg]} min`} color={color} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <ChartCard title="Causes de retard par compagnie (barres empilées)" height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} layout="vertical" margin={{ left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Minutes', position: 'insideBottom', offset: -5 }} />
                <YAxis type="category" dataKey="carrier_name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Legend />
                {CAUSES.map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={color} name={label} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Comparaison des causes par compagnie" height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCarrier} margin={{ left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="carrier_name" tick={{ fontSize: 10, angle: -40, textAnchor: 'end' }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {CAUSES.map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} fill={color} name={label} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12}>
          <ChartCard title="Détail par compagnie" height={380}>
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
