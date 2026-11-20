import { Cpu, PlugZap, Power, Smartphone, Wifi, WifiOff } from 'lucide-react'
import type { Lang, Item } from '../types'
import type { Translation } from '../i18n/translations'
import { EmptyState } from './EmptyState'

type DeviceListProps = {
  items: Item[]
  translations: Translation
  lang: Lang
  onToggleRelay?: (device: Item) => void
}

export function DeviceList({ items, translations: t, lang, onToggleRelay }: DeviceListProps) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Smartphone}
        title={t.noDevices}
        hint={
          lang === 'th'
            ? 'อุปกรณ์จะแสดงหลังจากเสียบปลั๊ก Thor Outlet และเชื่อมต่ออินเทอร์เน็ตแล้ว'
            : 'Devices will appear once your Thor Outlet is plugged in and connected to Wi-Fi.'
        }
      />
    )
  }

  return (
    <div className="devices">
      {items.map((device) => {
        const isOnline = Boolean(device.online)
        const hasPower = typeof device.power === 'number'

        return (
          <article className="device" key={device.id}>
            <div className="device-top">
              <span>
                <PlugZap size={20} />
              </span>
              <small>
                <i
                  className="dot gray"
                  style={
                    isOnline ? { background: '#22c55e', boxShadow: '0 0 8px #22c55e' } : undefined
                  }
                />
                {isOnline ? (lang === 'th' ? 'ออนไลน์' : 'Online') : t.offlineDevice}
              </small>
            </div>

            <b>{device.name || device.id}</b>
            <small>
              {device.appliance ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Cpu size={13} />
                  {device.appliance}
                  {typeof device.confidence === 'number'
                    ? ` (${device.confidence.toFixed(0)}%)`
                    : ''}
                </span>
              ) : (
                'Thor Outlet'
              )}
            </small>

            <div className="reading">
              {hasPower ? `${device.power!.toFixed(1)} W` : '— W'}{' '}
              <small>
                {typeof device.voltage === 'number' && typeof device.current === 'number'
                  ? `${device.voltage.toFixed(0)}V · ${device.current.toFixed(2)}A`
                  : t.noReading}
              </small>
            </div>

            <footer>
              <span>Thor Cloud</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {onToggleRelay && isOnline && (
                  <button
                    type="button"
                    onClick={() => onToggleRelay(device)}
                    title={lang === 'th' ? 'เปิด/ปิดรีเลย์' : 'Toggle relay'}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                    }}
                  >
                    <Power size={13} />
                    {device.relay === false ? 'OFF' : 'ON'}
                  </button>
                )}
                {isOnline ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} />}
              </div>
            </footer>
          </article>
        )
      })}
    </div>
  )
}