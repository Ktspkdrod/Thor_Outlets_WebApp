import type { Item } from './types'

const TB_URL = (import.meta.env.VITE_TB_URL || 'https://thingsboard.cloud').replace(/\/$/, '')
const TB_DEVICE_ID = import.meta.env.VITE_TB_DEVICE_ID || 'f6a8ec40-e276-11f1-8cd9-6b9990469fa2'
const TB_USERNAME = import.meta.env.VITE_TB_USERNAME || 'ktzaapokla@gmail.com'
const TB_PASSWORD = import.meta.env.VITE_TB_PASSWORD || '123456'

export const thingsboardConfigured = Boolean(TB_DEVICE_ID && TB_USERNAME && TB_PASSWORD)

let cachedToken = ''
let tokenExpiry = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }
  const res = await fetch(`${TB_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TB_USERNAME, password: TB_PASSWORD }),
  })
  if (!res.ok) throw new Error('ThingsBoard login failed')
  const data = await res.json()
  cachedToken = data.token
  tokenExpiry = Date.now() + 50 * 60 * 1000
  return cachedToken
}

type TelemetryEntry = { ts: number; value: string }

function parseNum(arr?: TelemetryEntry[]): number | undefined {
  if (!arr?.length) return undefined
  const n = Number(arr[0].value)
  return Number.isFinite(n) ? n : undefined
}

export async function fetchThingsBoardDevice(): Promise<Item | null> {
  if (!thingsboardConfigured) return null

  const token = await getToken()
  const headers = { 'X-Authorization': `Bearer ${token}` }

  const keys = 'voltage,current,power,energy,appliance,confidence,anomaly,relay'
  const telRes = await fetch(
    `${TB_URL}/api/plugins/telemetry/DEVICE/${TB_DEVICE_ID}/values/timeseries?keys=${keys}`,
    { headers },
  )
  if (!telRes.ok) {
    cachedToken = ''
    throw new Error('Failed to fetch telemetry')
  }
  const tel: Record<string, TelemetryEntry[]> = await telRes.json()

  let online = false
  try {
    const attrRes = await fetch(
      `${TB_URL}/api/plugins/telemetry/DEVICE/${TB_DEVICE_ID}/values/attributes/SERVER_SCOPE?keys=active`,
      { headers },
    )
    if (attrRes.ok) {
      const attrs: { key: string; value: boolean }[] = await attrRes.json()
      const activeAttr = attrs.find((a) => a.key === 'active')
      if (activeAttr) online = Boolean(activeAttr.value)
    }
  } catch {
    const latestTs = Math.max(0, ...Object.values(tel).map((arr) => arr?.[0]?.ts ?? 0))
    online = latestTs > 0 && Date.now() - latestTs < 30_000
  }

  const latestTs = Math.max(0, ...Object.values(tel).map((arr) => arr?.[0]?.ts ?? 0))
  const relayRaw = tel.relay?.[0]?.value

  return {
    id: TB_DEVICE_ID,
    name: 'Thor Outlet - Outlet 01',
    online,
    voltage: parseNum(tel.voltage),
    current: parseNum(tel.current),
    power: parseNum(tel.power),
    energy: parseNum(tel.energy),
    appliance: tel.appliance?.[0]?.value,
    confidence: parseNum(tel.confidence),
    anomaly: parseNum(tel.anomaly),
    relay: relayRaw === undefined ? undefined : relayRaw === 'true' || relayRaw === '1',
    lastUpdated: latestTs || undefined,
  }
}

export async function toggleThingsBoardRelay(state: boolean): Promise<void> {
  if (!thingsboardConfigured) return
  const token = await getToken()
  await fetch(`${TB_URL}/api/plugins/rpc/oneway/${TB_DEVICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      method: 'setRelay',
      params: state,
    }),
  })
}