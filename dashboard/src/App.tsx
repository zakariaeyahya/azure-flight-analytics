import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { FilterProvider } from './context/FilterContext'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Airlines from './pages/Airlines'
import Airports from './pages/Airports'
import DelayCauses from './pages/DelayCauses'
import TopRoutes from './pages/TopRoutes'

const theme = createTheme({
  typography: { fontFamily: 'Inter, sans-serif' },
  palette: {
    background: { default: '#f5f7fa' },
    primary: { main: '#1565c0' },
  },
  components: {
    MuiCard: { styleOverrides: { root: { boxShadow: 'none' } } },
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index       element={<Overview />} />
              <Route path="airlines" element={<Airlines />} />
              <Route path="airports" element={<Airports />} />
              <Route path="causes"   element={<DelayCauses />} />
              <Route path="routes"   element={<TopRoutes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </ThemeProvider>
  )
}
