import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  Activity,
  Camera,
  CircleUserRound,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { auth, db, storage } from '../firebase'
import type { Lang } from '../types'
import type { Translation } from '../i18n/translations'
import { LanguagePicker } from './LanguagePicker'

type AccountSettingsProps = {
  user: User
  lang: Lang
  translations: Translation
  onUserUpdated: (displayName: string) => void
  onSignOut: () => void
  onLanguageChange: (language: Lang) => void
}

type EnergyRecord = {
  id: string
  deviceName?: string
  energyKwh?: number
  recordedAt?: Timestamp
}

function resizeImageToDataUrl(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function AccountSettings({
  user,
  lang,
  translations: t,
  onUserUpdated,
  onSignOut,
  onLanguageChange,
}: AccountSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string>(user.photoURL ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [energyHistory, setEnergyHistory] = useState<EnergyRecord[]>([])
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    if (!db) return
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data()
      if (data?.photoURL) setAvatarUrl(data.photoURL as string)
    })
    const energyQuery = query(
      collection(db, 'users', user.uid, 'energyHistory'),
      orderBy('recordedAt', 'desc'),
      limit(20),
    )
    const unsubscribeEnergy = onSnapshot(
      energyQuery,
      (snapshot) =>
        setEnergyHistory(
          snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as EnergyRecord),
        ),
      () => setHistoryError(true),
    )
    return () => {
      unsubProfile()
      unsubscribeEnergy()
    }
  }, [user.uid])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!db || !displayName.trim()) throw new Error('profile')
      await updateProfile(user, { displayName: displayName.trim() })
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: displayName.trim(), email: user.email, updatedAt: serverTimestamp() },
        { merge: true },
      )
      onUserUpdated(displayName.trim())
      setMessage(t.profileSaved)
    } catch {
      setError(t.profileError)
    } finally {
      setBusy(false)
    }
  }

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setMessage('')
    if (!file.type.startsWith('image/')) {
      setError(t.imageTypeError)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t.imageSizeError)
      return
    }
    if (!db) {
      setError(t.avatarError)
      return
    }
    setBusy(true)
    try {
      let photoURL = ''
      if (storage) {
        try {
          const avatarRef = ref(storage, `users/${user.uid}/profile/avatar`)
          await uploadBytes(avatarRef, file, { contentType: file.type })
          photoURL = await getDownloadURL(avatarRef)
          await updateProfile(user, { photoURL })
        } catch {
          photoURL = await resizeImageToDataUrl(file)
        }
      } else {
        photoURL = await resizeImageToDataUrl(file)
      }

      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL, updatedAt: serverTimestamp() },
        { merge: true },
      )
      setAvatarUrl(photoURL)
      setMessage(t.avatarSaved)
    } catch {
      setError(t.avatarError)
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    if (
      newPassword.length < 8 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setError(t.passwordPolicyError)
      setBusy(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch)
      setBusy(false)
      return
    }
    try {
      if (!auth || !user.email) throw new Error('account')
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage(t.passwordChanged)
    } catch {
      setError(t.passwordChangeError)
    } finally {
      setBusy(false)
    }
  }

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return t.justNow
    return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp.toDate())
  }

  return (
    <div className="account-settings">
      <details className="account-accordion profile-accordion" open>
        <summary className="account profile-summary">
          <span className="profile-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={t.profilePhoto}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              <CircleUserRound size={25} />
            )}
          </span>
          <div className="profile-summary-text">
            <b>{displayName.trim() || user.email?.split('@')[0]}</b>
            <small>{user.email}</small>
          </div>
        </summary>
        <div className="accordion-content profile-content">
          <label className="upload-avatar">
            <Camera size={17} /> {t.changePhoto}
            <input type="file" accept="image/*" onChange={uploadAvatar} disabled={busy} />
          </label>
          <small className="form-hint">{t.imageHelp}</small>
          <form className="account-form" onSubmit={saveProfile}>
            <label>
              {t.displayName}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={60}
                required
              />
            </label>
            <button className="primary account-submit" disabled={busy || !displayName.trim()}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{' '}
              {t.saveProfile}
            </button>
          </form>
        </div>
      </details>

      {(message || error) && (
        <div className={`account-feedback ${error ? 'error' : 'success'}`}>{error || message}</div>
      )}

      <details className="panel account-accordion">
        <summary className="account-accordion-summary">
          <span className="accordion-label">
            <KeyRound size={18} />
            <span>
              <b>{t.changePassword}</b>
              <small>{t.passwordPolicy}</small>
            </span>
          </span>
          <ChevronDown className="accordion-chevron" size={18} />
        </summary>
        <div className="accordion-content">
          <form className="account-form" onSubmit={changePassword}>
            <label>
              {t.currentPassword}
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              {t.newPassword}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              {t.confirmPassword}
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <button className="primary account-submit" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}{' '}
              {t.savePassword}
            </button>
          </form>
        </div>
      </details>

      <details className="panel account-accordion">
        <summary className="account-accordion-summary">
          <span className="accordion-label">
            <Activity size={18} />
            <span>
              <b>{t.energyHistory}</b>
              <small>
                {energyHistory.length
                  ? `${energyHistory.length} ${t.historyRecords}`
                  : lang === 'th'
                    ? 'บันทึกการใช้พลังงานย้อนหลังของอุปกรณ์'
                    : 'Historical energy consumption records'}
              </small>
            </span>
          </span>
          <ChevronDown className="accordion-chevron" size={18} />
        </summary>
        <div className="accordion-content">
          {energyHistory.length ? (
            <div className="history-list">
              {energyHistory.map((entry) => (
                <article className="history-row" key={entry.id}>
                  <div>
                    <b>{entry.deviceName || t.device}</b>
                    <small>{formatDate(entry.recordedAt)}</small>
                  </div>
                  <strong>
                    {typeof entry.energyKwh === 'number'
                      ? `${entry.energyKwh.toFixed(3)} kWh`
                      : t.noReading}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <Activity size={20} />
              <span>{historyError ? t.historyUnavailable : t.energyHistoryEmpty}</span>
            </div>
          )}
        </div>
      </details>

      <section className="panel settings">
        <div className="setting">
          <span>
            <ShieldCheck size={18} /> {t.language}
          </span>
          <LanguagePicker lang={lang} onChange={onLanguageChange} />
        </div>
        <p>
          {lang === 'th'
            ? 'ข้อมูลบัญชีและการตั้งค่าจะถูกซิงก์และบันทึกไว้ในระบบคลาวด์โดยอัตโนมัติ'
            : 'Your profile and preferences are synced and saved automatically.'}
        </p>
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button className="signout" onClick={onSignOut}>
          {t.out}
        </button>
      </div>
    </div>
  )
}