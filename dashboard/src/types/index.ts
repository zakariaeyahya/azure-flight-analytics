export interface MonthlyTrend {
  Year: number
  Month: number
  total_flights: number
  cancelled_flights: number
  cancellation_rate_pct: number
  avg_arr_delay_min: number
  severe_delays: number
  moderate_delays: number
  minor_delays: number
  on_time_flights: number
}

export interface CarrierPerformance {
  Year: number
  UniqueCarrier: string
  carrier_name: string
  total_flights: number
  delayed_flights: number
  avg_arr_delay_min: number
  avg_dep_delay_min: number
  delay_rate_pct: number
  avg_distance_miles: number
}

export interface AirportPerformance {
  Year: number
  Origin: string
  origin_name: string
  origin_city: string
  origin_state: string
  total_flights: number
  delayed_flights: number
  avg_arr_delay_min: number
  avg_dep_delay_min: number
  delay_rate_pct: number
  avg_taxi_out_min: number
}

export interface DelayCause {
  Year: number
  UniqueCarrier: string
  carrier_name: string
  delayed_flights: number
  avg_carrier_delay: number
  avg_weather_delay: number
  avg_nas_delay: number
  avg_late_aircraft_delay: number
  avg_security_delay: number
}

export interface TopRoute {
  route: string
  Origin: string
  Dest: string
  origin_city: string
  dest_city: string
  total_flights: number
  avg_arr_delay_min: number
  distance_miles: number
  delay_rate_pct: number
}

export interface Filters {
  year: string
  month: string
  carrier: string
  state: string
  origin: string
  dest: string
}
