import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, Chip,
} from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AirlinesIcon from '@mui/icons-material/Airlines'
import LocalAirportIcon from '@mui/icons-material/LocalAirport'
import WarningIcon from '@mui/icons-material/Warning'
import RouteIcon from '@mui/icons-material/Route'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { label: 'Vue générale',   path: '/',          icon: <TrendingUpIcon /> },
  { label: 'Compagnies',     path: '/airlines',  icon: <AirlinesIcon /> },
  { label: 'Aéroports',      path: '/airports',  icon: <LocalAirportIcon /> },
  { label: 'Causes retards', path: '/causes',    icon: <WarningIcon /> },
  { label: 'Top Routes',     path: '/routes',    icon: <RouteIcon /> },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [_open] = useState(true)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: '#0d1b2a' }}>
        <Toolbar>
          <FlightIcon sx={{ mr: 1.5, color: '#4fc3f7' }} />
          <Typography variant="h6" fontWeight={700} color="white" flexGrow={1}>
            Flight Analytics
          </Typography>
          <Chip label="USA 2003–2008" size="small" sx={{ bgcolor: '#1e3a5f', color: '#90caf9' }} />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            bgcolor: '#0d1b2a',
            color: 'white',
            borderRight: 'none',
            pt: 8,
          },
        }}
      >
        <List>
          {NAV_ITEMS.map(({ label, path, icon }) => {
            const active = pathname === path
            return (
              <ListItemButton
                key={path}
                onClick={() => navigate(path)}
                sx={{
                  mx: 1, mb: 0.5, borderRadius: 2,
                  bgcolor: active ? '#1e3a5f' : 'transparent',
                  '&:hover': { bgcolor: '#1a2f4a' },
                }}
              >
                <ListItemIcon sx={{ color: active ? '#4fc3f7' : '#78909c', minWidth: 36 }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#e3f2fd' : '#90a4ae',
                  }}
                />
              </ListItemButton>
            )
          })}
        </List>
        <Divider sx={{ borderColor: '#1e3a5f', mt: 'auto', mb: 2 }} />
        <Typography variant="caption" sx={{ color: '#546e7a', px: 2, pb: 2, display: 'block' }}>
          ~30M vols analysés
        </Typography>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 11, ml: `${DRAWER_WIDTH}px` }}>
        <Outlet />
      </Box>
    </Box>
  )
}
