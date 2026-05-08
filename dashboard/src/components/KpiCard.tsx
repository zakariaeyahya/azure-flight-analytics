import { Card, CardContent, Typography, Box } from '@mui/material'
import { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: string
}

export default function KpiCard({ title, value, subtitle, icon, color = '#1565c0' }: Props) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e7ef', height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
          )}
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 1, color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
