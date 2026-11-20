import { useEffect, useState, useRef, type FormEvent } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  Activity,
  AlertTriangle,
  Bell,
  CircleUserRound,
  ChevronDown,
  Eye,
  EyeOff,
  Gauge,
  Home,
  LoaderCircle,
  LockKeyhole,
  Mail,
  PlugZap,
  ShieldCheck,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { auth, db, firebaseConfigured } from './firebase'
import {
  fetchThingsBoardDevice,
  thingsboardConfigured,
  toggleThingsBoardRelay,
} from './thingsboard'
import './App.css'

import type { Page, Lang, Item } from './types'
import { words } from './i18n/translations'
import { AccountSettings, DeviceList, EmptyState, LanguagePicker } from './components'

const menu: { id: Page; icon: typeof Home }[] = [
  { id: 'dashboard', icon: Home },
  { id: 'devices', icon: PlugZap },
  { id: 'alerts', icon: Bell },
  { id: 'account', icon: CircleUserRound },
]

const ELECTRICITY_RATE_THB = 4.5

function App() {
  const signInRecorded = useRef(false)
  const [, setProfileVersion] = useState(0)
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('thor-lang') as Lang) || 'th')
  const t = words[lang],
    [user, setUser] = useState<User | null>(null),
    [avatarUrl, setAvatarUrl] = useState<string>(''),
    [ready, setReady] = useState(false),
    [page, setPage] = useState<Page>('dashboard'),
    [signup, setSignup] = useState(false),
    [show, setShow] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [resetMessage, setResetMessage] = useState(''),
    [firestoreDevices, setFirestoreDevices] = useState<Item[]>([]),
    [tbDevice, setTbDevice] = useState<Item | null>(null),
    [tbConnected, setTbConnected] = useState(false),
    [alerts, setAlerts] = useState<Item[]>([]),
    [dataError, setDataError] = useState(false)

  useEffect(() => {
    if (!auth || !firebaseConfigured) {
      setReady(true)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAvatarUrl(u?.photoURL ?? '')
      if (u && db && !signInRecorded.current) {
        signInRecorded.current = true
        void addDoc(collection(db, 'users', u.uid, 'activity'), {
          type: 'signed_in',
          createdAt: serverTimestamp(),
        }).catch(() => undefined)
      }
      if (!u) signInRecorded.current = false
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!db || !user) {
      setFirestoreDevices([])
      setAlerts([])
      return
    }
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data()
      if (data?.photoURL) {
        setAvatarUrl(data.photoURL as string)
      }
    })
    const a = onSnapshot(
      collection(db, 'users', user.uid, 'devices'),
      (s) => setFirestoreDevices(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Item)),
      () => setDataError(true),
    )
    const b = onSnapshot(
      collection(db, 'users', user.uid, 'alerts'),
      (s) => setAlerts(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Item)),
      () => setDataError(true),
    )
    return () => {
      unsubUser()
      a()
      b()
    }
  }, [user])

  useEffect(() => {
    if (!user || !thingsboardConfigured) {
      setTbDevice(null)
      setTbConnected(false)
      return
    }

    let cancelled = false
    const sync = async () => {
      try {
        const item = await fetchThingsBoardDevice()
        if (!cancelled && item) {
          setTbDevice(item)
          setTbConnected(true)
        }
      } catch {
        if (!cancelled) setTbConnected(false)
      }
    }

    void sync()
    const timer = setInterval(() => void sync(), 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user])

  const devices: Item[] = tbDevice
    ? [tbDevice, ...firestoreDevices.filter((d) => d.id !== tbDevice.id)]
    : firestoreDevices

  const isDeviceOnline = Boolean(tbDevice?.online)
  const todayKwh = typeof tbDevice?.energy === 'number' ? tbDevice.energy.toFixed(3) : '—'
  const currentPower = typeof tbDevice?.power === 'number' ? tbDevice.power.toFixed(1) : '—'
  const estimatedCost =
    typeof tbDevice?.energy === 'number'
      ? (tbDevice.energy * ELECTRICITY_RATE_THB).toFixed(2)
      : '—'

  const handleToggleRelay = async (device: Item) => {
    const nextState = device.relay === false
    try {
      await toggleThingsBoardRelay(nextState)
      setTbDevice((prev) => (prev ? { ...prev, relay: nextState } : prev))
    } catch {
      setDataError(true)
    }
  }

  const changeLang = (v: Lang) => {
    setLang(v)
    localStorage.setItem('thor-lang', v)
  }

  const handleForgotPassword = async () => {
    setError('')
    setResetMessage('')
    const targetEmail = email.trim()
    if (!targetEmail) {
      setError(
        lang === 'th'
          ? 'กรุณากรอกอีเมลในช่องด้านบนก่อนกดลืมรหัสผ่าน'
          : 'Please enter your email address first.',
      )
      return
    }
    if (!auth) return
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, targetEmail)
      setResetMessage(
        lang === 'th'
          ? `ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${targetEmail} แล้ว กรุณาตรวจสอบกล่องจดหมาย (หรือโฟลเดอร์สแปม)`
          : `Password reset link sent to ${targetEmail}. Check your inbox or spam folder.`,
      )
    } catch {
      setError(
        lang === 'th'
          ? 'ไม่พบบัญชีอีเมลนี้หรือรูปแบบอีเมลไม่ถูกต้อง'
          : 'Could not send reset email. Please check the email address.',
      )
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setResetMessage('')
    try {
      if (!auth || !db) throw Error()
      if (
        signup &&
        (password.length < 8 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/\d/.test(password))
      ) {
        setError(t.signupPasswordError)
        setBusy(false)
        return
      }
      const c = signup
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password)
      await setDoc(
        doc(db, 'users', c.user.uid),
        { email: c.user.email, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch {
      setError(
        signup
          ? lang === 'th'
            ? 'ไม่สามารถสร้างบัญชีได้ อีเมลนี้อาจถูกใช้งานแล้ว'
            : 'Could not create account. This email may already be in use.'
          : lang === 'th'
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
            : 'Invalid email or password. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (!ready)
    return (
      <div className="loading">
        <LoaderCircle className="spin" />
        {t.loading}
      </div>
    )

  if (!user)
    return (
      <main className="auth">
        <section className="auth-card">
          <div className="logo">
            <img src="/thor-logo.png" alt="Thor Outlet logo" />
          </div>
          <h1>Thor Outlet</h1>
          <p className="muted center">
            {lang === 'th' ? 'จัดการพลังงานในบ้านอย่างปลอดภัย' : 'Safer, clearer home energy'}
          </p>
          <div className="secure">
            <ShieldCheck size={16} /> SECURE ACCOUNT
          </div>
          <h2>{signup ? t.create : t.welcome}</h2>
          <p className="muted">{t.hint}</p>
          <form onSubmit={submit}>
            <label>
              {t.email}
              <span className="field">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </span>
              <small className="form-hint">{t.emailHelp}</small>
            </label>
            <label>
              {t.password}
              <span className="field">
                <LockKeyhole size={17} />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={signup ? 8 : undefined}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="eye"
                  aria-label={show ? t.hide : t.show}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              <small className="form-hint">{signup ? t.signupPasswordHelp : t.passwordHelp}</small>
            </label>
            {error && <small className="error">{error}</small>}
            {resetMessage && (
              <small style={{ color: '#4ade80', display: 'block', lineHeight: 1.4 }}>
                {resetMessage}
              </small>
            )}
            <button className="primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={18} /> : <Zap size={19} />} {t.go}
            </button>
          </form>
          {!signup ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                gap: 12,
              }}
            >
              <button
                type="button"
                className="switch"
                style={{ margin: 0, textAlign: 'left' }}
                disabled={busy}
                onClick={handleForgotPassword}
              >
                {lang === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
              </button>
              <button
                type="button"
                className="switch"
                style={{ margin: 0, textAlign: 'right' }}
                onClick={() => {
                  setSignup(true)
                  setError('')
                  setResetMessage('')
                }}
              >
                {t.switchup}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="switch"
              onClick={() => {
                setSignup(false)
                setError('')
                setResetMessage('')
              }}
            >
              {t.switchin}
            </button>
          )}
          <LanguagePicker lang={lang} onChange={changeLang} />
        </section>
      </main>
    )

  const title = t[page],
    first = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || ''

  const onlineDotStyle = isDeviceOnline
    ? { background: '#22c55e', boxShadow: '0 0 8px #22c55e' }
    : tbConnected
      ? { background: '#f59e0b' }
      : undefined

  const statusText = isDeviceOnline
    ? lang === 'th'
      ? 'ออนไลน์'
      : 'Online'
    : tbConnected
      ? lang === 'th'
        ? 'รออุปกรณ์'
        : 'Standby'
      : t.offline

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-logo">
          <span className="logo mini">
            <img src="/thor-logo.png" alt="" />
          </span>
          <div>
            <b>Thor Outlet</b>
            <small>ENERGY MANAGEMENT</small>
          </div>
        </div>
        <small className="menu-label">{lang === 'th' ? 'เมนูหลัก' : 'MENU'}</small>
        {menu.map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={`nav ${page === id ? 'selected' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon size={19} />
            {t[id]}
            {id === 'alerts' && alerts.length > 0 && <i>{alerts.length}</i>}
          </button>
        ))}
        <div className="side-bottom">
          <div className="connect">
            <span className="dot gray" style={onlineDotStyle} />
            <div>
              <b>{statusText}</b>
              <small>Thor Cloud</small>
            </div>
          </div>
          <small className="safe">
            <ShieldCheck size={15} />
            {lang === 'th' ? 'ระบบปลอดภัยและพร้อมใช้งาน' : 'System ready & protected'}
          </small>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <div className="crumb">
            Thor Outlet <span>/</span> {title}
          </div>
          <div className="topright">
            <span className="offline">
              <span className="dot gray" style={onlineDotStyle} />
              {statusText}
            </span>
            <LanguagePicker lang={lang} onChange={changeLang} />
            <button
              className="avatar"
              onClick={() => setPage('account')}
              style={avatarUrl ? { padding: 0, overflow: 'hidden' } : undefined}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={t.profilePhoto}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <CircleUserRound size={19} />
              )}
            </button>
          </div>
        </header>
        <main className="content">
          {dataError && (
            <div className="notice warn">
              <AlertTriangle size={18} />
              {lang === 'th'
                ? 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
                : 'Unable to load data. Please try again.'}
            </div>
          )}
          {page === 'dashboard' && (
            <>
              <div className="heading">
                <div>
                  <small>
                    {t.hello}
                    {first ? `, ${first}` : ''}
                  </small>
                  <h2>{t.overview}</h2>
                  <p>{t.live}</p>
                </div>
                <span className="tag">
                  <span className="dot gray" style={onlineDotStyle} />
                  {lang === 'th' ? 'เรียลไทม์' : 'Real-time'}
                </span>
              </div>
              <section className="metrics">
                {[
                  [Activity, t.today, todayKwh, 'kWh'],
                  [Gauge, t.power, currentPower, 'W'],
                  [Bell, t.cost, estimatedCost, '฿'],
                ].map(([Icon, label, value, unit], i) => {
                  const I = Icon as typeof Home
                  const hasVal = value !== '—'
                  return (
                    <article className="metric highlight" key={i}>
                      <div className="metric-top">
                        <span>
                          <I size={19} />
                        </span>
                        <small>
                          {hasVal ? (lang === 'th' ? 'อัปเดตล่าสุด' : 'Live') : t.noReading}
                        </small>
                      </div>
                      <p>{label as string}</p>
                      <strong>
                        {value as string}
                        <em>{unit as string}</em>
                      </strong>
                      <small className="metric-note">{t.measured}</small>
                    </article>
                  )
                })}
              </section>
              <section className="panel history">
                <div className="panel-title">
                  <div>
                    <b>{t.history}</b>
                    <small>{t.measured}</small>
                  </div>
                  <span className="tag">
                    {lang === 'th' ? 'วันนี้' : 'Today'} <ChevronDown size={14} />
                  </span>
                </div>
                <div className="chart-empty">
                  <Activity size={29} />
                  <b>
                    {tbDevice?.appliance
                      ? `${lang === 'th' ? 'อุปกรณ์ที่ตรวจพบ:' : 'Detected:'} ${tbDevice.appliance}`
                      : t.noReading}
                  </b>
                  <small>{t.chart}</small>
                </div>
              </section>
              <div className="subhead">
                <div>
                  <b>{t.devicesTitle}</b>
                  <small>{t.status}</small>
                </div>
                <button className="link" onClick={() => setPage('devices')}>
                  {t.devices} →
                </button>
              </div>
              <DeviceList
                items={devices.slice(0, 3)}
                translations={t}
                lang={lang}
                onToggleRelay={handleToggleRelay}
              />
              {!isDeviceOnline && (
                <div className="notice info">
                  {tbConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
                  <div>
                    <b>{lang === 'th' ? 'รอการเชื่อมต่ออุปกรณ์' : 'Waiting for device'}</b>
                    <small>
                      {lang === 'th'
                        ? 'กรุณาเสียบปลั๊ก Thor Outlet และเชื่อมต่ออินเทอร์เน็ตที่ตัวอุปกรณ์เพื่อเริ่มแสดงค่าพลังงาน'
                        : 'Plug in your Thor Outlet and connect it to Wi-Fi to start monitoring.'}
                    </small>
                  </div>
                  <span className="pending">{t.wait}</span>
                </div>
              )}
            </>
          )}
          {page === 'devices' && (
            <>
              <div className="heading">
                <div>
                  <small>DEVICE MANAGEMENT</small>
                  <h2>{t.devicesTitle}</h2>
                  <p>
                    {lang === 'th'
                      ? 'จัดการและตรวจสอบสถานะ Thor Outlet ทั้งหมดของคุณ'
                      : 'Manage and monitor all your Thor Outlets'}
                  </p>
                </div>
              </div>
              <DeviceList
                items={devices}
                translations={t}
                lang={lang}
                onToggleRelay={handleToggleRelay}
              />
              <div className="notice info">
                <PlugZap size={18} />
                <div>
                  <b>
                    {lang === 'th' ? 'การเชื่อมต่อ Thor Outlet' : 'Thor Outlet Connection'}
                  </b>
                  <small>
                    {lang === 'th'
                      ? 'อุปกรณ์ที่เชื่อมต่อกับบัญชีของคุณจะแสดงสถานะและควบคุมได้ที่นี่'
                      : 'Devices linked to your account will appear and sync automatically here.'}
                  </small>
                </div>
              </div>
            </>
          )}
          {page === 'alerts' && (
            <>
              <div className="heading">
                <div>
                  <small>STATUS & SAFETY</small>
                  <h2>{t.alertsTitle}</h2>
                  <p>{t.alertsHint}</p>
                </div>
              </div>
              {alerts.length ? (
                <div className="alert-list">
                  {alerts.map((a) => (
                    <article className="alert-item" key={a.id}>
                      <AlertTriangle size={20} />
                      <div>
                        <b>{a.title || t.alertsTitle}</b>
                        <p>{a.message || ''}</p>
                      </div>
                      <span>{a.severity || 'Alert'}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Bell} title={t.noAlerts} hint={t.alertsHint} />
              )}
            </>
          )}
          {page === 'account' && (
            <>
              <div className="heading">
                <div>
                  <small>USER PROFILE</small>
                  <h2>{t.accountTitle}</h2>
                </div>
              </div>
              <AccountSettings
                user={user}
                lang={lang}
                translations={t}
                onUserUpdated={() => setProfileVersion((version) => version + 1)}
                onLanguageChange={changeLang}
                onSignOut={() => auth && signOut(auth)}
              />
            </>
          )}
        </main>
        <footer>
          <span>© Thor Outlet</span>
          <span>
            <ShieldCheck size={14} />
            {t.measured}
          </span>
        </footer>
      </div>
      <nav className="bottom">
        {menu.map(({ id, icon: Icon }) => (
          <button key={id} className={page === id ? 'selected' : ''} onClick={() => setPage(id)}>
            <Icon size={20} />
            <small>{t[id]}</small>
          </button>
        ))}
      </nav>
    </div>
  )
}
export default App