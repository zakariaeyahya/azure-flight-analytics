import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, Chip, IconButton, useMediaQuery, useTheme, Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import FlightIcon from '@mui/icons-material/Flight'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AirlinesIcon from '@mui/icons-material/Airlines'
import LocalAirportIcon from '@mui/icons-material/LocalAirport'
import WarningIcon from '@mui/icons-material/Warning'
import RouteIcon from '@mui/icons-material/Route'

const DRAWER_WIDTH = 240
const DRAWER_MINI  = 64

const NAV_ITEMS = [
  { label: 'Vue générale',    path: '/',          icon: <TrendingUpIcon /> },
  { label: 'Compagnies',      path: '/airlines',  icon: <AirlinesIcon /> },
  { label: 'Aéroports',       path: '/airports',  icon: <LocalAirportIcon /> },
  { label: 'Causes retards',  path: '/causes',    icon: <WarningIcon /> },
  { label: 'Top Routes',      path: '/routes',    icon: <RouteIcon /> },
]

export default function Layout() {
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const theme      = useTheme()
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = useState(!isMobile)

  const drawerWidth = open ? DRAWER_WIDTH : DRAWER_MINI

  const drawerContent = (
    <>
      <List sx={{ pt: 1 }}>
        {NAV_ITEMS.map(({ label, path, icon }) => {
          const active = pathname === path
          return (
            <Tooltip key={path} title={!open ? label : ''} placement="right">
              <ListItemButton
                onClick={() => { navigate(path); if (isMobile) setOpen(false) }}
                sx={{
                  mx: 1, mb: 0.5, borderRadius: 2,
                  justifyContent: open ? 'initial' : 'center',
                  px: open ? 2 : 1.5,
                  bgcolor: active ? '#1e3a5f' : 'transparent',
                  '&:hover': { bgcolor: '#1a2f4a' },
                }}
              >
                <ListItemIcon sx={{
                  color: active ? '#4fc3f7' : '#78909c',
                  minWidth: open ? 36 : 'auto',
                  justifyContent: 'center',
                }}>
                  {icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#e3f2fd' : '#90a4ae',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          )
        })}
      </List>

      <Divider sx={{ borderColor: '#1e3a5f', mt: 'auto', mb: 2 }} />
      {open && (
        <Typography variant="caption" sx={{ color: '#546e7a', px: 2, pb: 2, display: 'block' }}>
          ~30M vols analysés
        </Typography>
      )}
    </>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: '#0d1b2a' }}>
        <Toolbar>
          <IconButton
            onClick={() => setOpen(o => !o)}
            sx={{ mr: 1.5, color: '#4fc3f7' }}
            size="small"
          >
            {open && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <FlightIcon sx={{ mr: 1.5, color: '#4fc3f7' }} />
          <Typography variant="h6" fontWeight={700} color="white" flexGrow={1}>
            Flight Analytics
          </Typography>
          <Chip label="USA 2003–2008" size="small" sx={{ bgcolor: '#1e3a5f', color: '#90caf9' }} />
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: '#0d1b2a',
              color: 'white',
              borderRight: 'none',
              pt: 8,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: theme.transitions.create('width', { duration: 200 }),
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              bgcolor: '#0d1b2a',
              color: 'white',
              borderRight: 'none',
              pt: 8,
              overflowX: 'hidden',
              transition: theme.transitions.create('width', { duration: 200 }),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 11,
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
