export type Page = 'dashboard' | 'devices' | 'alerts' | 'account'
export type Lang = 'th' | 'en'

export type Item = {
  id: string
  name?: string
  title?: string
  message?: string
  severity?: string
  online?: boolean
  voltage?: number
  current?: number
  power?: number
  energy?: number
  appliance?: string
  confidence?: number
  anomaly?: number
  relay?: boolean
  lastUpdated?: number
}