import { Card, CardContent, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  height?: number
}

export default function ChartCard({ title, children, height = 320 }: Props) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e7ef' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} mb={2} color="text.primary">
          {title}
        </Typography>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  )
}
