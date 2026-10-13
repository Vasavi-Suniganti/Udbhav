import { useEffect, useState } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n, type Locale } from '@/context/I18nContext';
import { api } from '@/lib/api';

const languages: Array<[Locale, string]> = [
  ['en', 'English'],
  ['hi', 'हिन्दी — Hindi'],
  ['sat', 'ᱥᱟᱱᱛᱟᱲᱤ — Santali'],
  ['bn', 'বাংলা — Bengali'],
  ['ur', 'اردو — Urdu'],
  ['nag', 'नागपुरी — Nagpuri'],
];

export default function LanguageSelector() {
  const { profile } = useAuth();
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.locale && profile.locale !== locale) setLocale(profile.locale);
  }, [profile?.locale, locale, setLocale]);

  async function choose(next: Locale) {
    setSaving(true);
    try {
      await api.updateUserPreferences({ locale: next });
      setLocale(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const label = languages.find(([value]) => value === locale)?.[1] || 'English';
  return <div className="relative">
    <button type="button" className="topbar-control topbar-language" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Select language">
      <Globe2 size={16} /><span>{label.split(' — ')[0]}</span><ChevronDown size={13} />
    </button>
    {open && <div className="topbar-popover topbar-language-menu" role="menu">
      {languages.map(([value, name]) => <button type="button" key={value} disabled={saving} className="topbar-menu-item" onClick={() => void choose(value)}><span>{name}</span>{value === locale && <Check size={15} className="text-primary-600" />}</button>)}
    </div>}
  </div>;
}

export { languages };
