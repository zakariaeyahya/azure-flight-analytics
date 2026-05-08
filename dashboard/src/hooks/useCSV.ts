import { useState, useEffect } from 'react'
import Papa from 'papaparse'

export function useCSV<T>(path: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Papa.parse<T>(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data)
        setLoading(false)
      },
    })
  }, [path])

  return { data, loading }
}
