export const fNumber = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n))

export const fPercent = (n: number): string =>
  `${Math.abs(n).toFixed(1)} %`

export const fShortenNumber = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(n % 1 === 0 ? 0 : 1)
}
