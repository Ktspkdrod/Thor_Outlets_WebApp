import { ChevronDown, Languages } from 'lucide-react'
import type { Lang } from '../types'

type LanguagePickerProps = {
  lang: Lang
  onChange: (language: Lang) => void
}

export function LanguagePicker({ lang, onChange }: LanguagePickerProps) {
  return (
    <label className="language">
      <Languages size={15} />
      <select
        value={lang}
        onChange={(event) => onChange(event.target.value as Lang)}
        aria-label="Language"
      >
        <option value="th">ไทย</option>
        <option value="en">English</option>
      </select>
      <ChevronDown size={13} />
    </label>
  )
}
