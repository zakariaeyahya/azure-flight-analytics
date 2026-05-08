import { createContext, useContext, useState, ReactNode } from 'react'
import { Filters } from '../types'

interface FilterContextType {
  filters: Filters
  setFilter: (key: keyof Filters, value: string) => void
  resetFilters: () => void
}

const defaults: Filters = { year: '', month: '', carrier: '', state: '', origin: '', dest: '' }

const FilterContext = createContext<FilterContextType>({
  filters: defaults,
  setFilter: () => {},
  resetFilters: () => {},
})

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaults)

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const resetFilters = () => setFilters(defaults)

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => useContext(FilterContext)
