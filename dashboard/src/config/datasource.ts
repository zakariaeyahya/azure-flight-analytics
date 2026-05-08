const BASE = import.meta.env.VITE_ADLS_BASE_URL as string
const SAS  = import.meta.env.VITE_ADLS_SAS_TOKEN as string

export const dataUrl = (table: string): string =>
  `${BASE}/${table}.csv?${SAS}`
