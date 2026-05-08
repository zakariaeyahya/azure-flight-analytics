import { Box, Card, CardProps, alpha } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { fNumber, fPercent, fShortenNumber } from '../utils/formatNumber'

// Couleurs exactes du template Minimal UI v6
const PALETTE: Record<string, { lighter: string; light: string; main: string; dark: string; darker: string }> = {
  primary:   { lighter: '#C8FAD6', light: '#5BE49B',  main: '#00A76F', dark: '#007867', darker: '#004B50' },
  secondary: { lighter: '#EFD6FF', light: '#C684FF',  main: '#8E33FF', dark: '#5119B7', darker: '#27097A' },
  info:      { lighter: '#CAFDF5', light: '#61F3F3',  main: '#00B8D9', dark: '#006C9C', darker: '#003768' },
  success:   { lighter: '#D3FCD2', light: '#77ED8B',  main: '#22C55E', dark: '#118D57', darker: '#065E49' },
  warning:   { lighter: '#FFF5CC', light: '#FFD666',  main: '#FFAB00', dark: '#B76E00', darker: '#7A4100' },
  error:     { lighter: '#FFE9D5', light: '#FFAC82',  main: '#FF5630', dark: '#B71D18', darker: '#7A0916' },
}

type ColorType = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

type Props = CardProps & {
  title: string
  total: number
  percent: number
  color?: ColorType
  icon: React.ReactNode
  chart: {
    series: number[]
    categories: string[]
  }
}

export function AppWidgetSummary({
  title,
  total,
  percent,
  color = 'primary',
  icon,
  chart,
  sx,
  ...other
}: Props) {
  const p   = PALETTE[color]
  const isUp = percent >= 0
  const chartData = chart.categories.map((cat, i) => ({ cat, value: chart.series[i] ?? 0 }))

  return (
    <Card
      sx={{
        p: 3,
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        // Dégradé exact du template Minimal UI
        background: `linear-gradient(135deg, ${alpha(p.lighter, 0.48)}, ${alpha(p.light, 0.48)})`,
        backgroundColor: 'common.white',
        color: p.darker,
        ...sx,
      }}
      {...other}
    >
      {/* Icône 48×48 */}
      <Box sx={{ width: 48, height: 48, mb: 3, color: p.main, '& svg': { fontSize: 40 } }}>
        {icon}
      </Box>

      {/* Trending — absolu en haut à droite */}
      <Box
        sx={{
          top: 16, right: 16,
          gap: 0.5,
          display: 'flex',
          position: 'absolute',
          alignItems: 'center',
          color: isUp ? '#118D57' : '#B71D18',
        }}
      >
        {isUp
          ? <TrendingUpIcon sx={{ fontSize: 20 }} />
          : <TrendingDownIcon sx={{ fontSize: 20 }} />
        }
        <Box component="span" sx={{ typography: 'subtitle2' }}>
          {isUp && '+'}{fPercent(percent)}
        </Box>
      </Box>

      {/* Titre + nombre + sparkline ligne */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ mb: 1, typography: 'subtitle2', color: p.darker }}>{title}</Box>
          <Box sx={{ typography: 'h4', color: p.darker }}>{fShortenNumber(total)}</Box>
        </Box>

        <Box sx={{ width: 84, height: 56 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={p.dark}
                strokeWidth={2.5}
                dot={false}
                strokeLinecap="round"
              />
              <Tooltip
                cursor={false}
                content={({ payload }) => {
                  if (!payload?.length) return null
                  const item = payload[0]
                  return (
                    <Box sx={{
                      bgcolor: 'white', px: 1, py: 0.5,
                      border: '1px solid #DFE3E8', borderRadius: 1,
                      fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>
                      {item.payload.cat} : {fNumber(item.value as number)}
                    </Box>
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Forme décorative — copie du shape-square.svg de Minimal UI */}
      <Box
        sx={{
          top: -8, left: -20,
          width: 200, height: 200,
          zIndex: 0, opacity: 0.2,
          position: 'absolute',
          borderRadius: '24px',
          transform: 'rotate(-30deg)',
          background: `linear-gradient(135deg, ${p.light}, transparent)`,
          pointerEvents: 'none',
        }}
      />
    </Card>
  )
}
