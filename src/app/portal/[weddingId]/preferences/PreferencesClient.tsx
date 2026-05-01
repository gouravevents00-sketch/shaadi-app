'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { savePreferences } from './actions'

interface Props {
  weddingId: string
  initial: Record<string, string>
}

const SECTIONS = [
  {
    id: 'food',
    label: 'Food & Catering',
    emoji: '🍽️',
    fields: [
      { key: 'food.type', label: 'Food type', type: 'chips', options: ['Pure Veg', 'Veg + Non-Veg', 'Jain options needed', 'International cuisine'] },
      { key: 'food.cuisine', label: 'Preferred cuisines', type: 'chips', options: ['North Indian', 'South Indian', 'Rajasthani', 'Chinese', 'Continental', 'Mughlai'] },
      { key: 'food.special', label: 'Special dietary requirements', type: 'text', placeholder: 'e.g. 10 guests are diabetic, avoid excess sugar' },
      { key: 'food.snacks', label: 'Snack preferences', type: 'text', placeholder: 'e.g. Evening snacks should include chaat, samosa' },
    ],
  },
  {
    id: 'music',
    label: 'Music & Entertainment',
    emoji: '🎵',
    fields: [
      { key: 'music.style', label: 'Music style', type: 'chips', options: ['Bollywood', 'Classical', 'Sufi', 'Western', 'Punjabi', 'Rajasthani folk'] },
      { key: 'music.dj', label: 'DJ preference', type: 'chips', options: ['Yes, full night DJ', 'Only for specific events', 'No DJ, live music only', 'No preference'] },
      { key: 'music.band', label: 'Live band / baraati band', type: 'chips', options: ['Yes, arrange band', 'We are arranging ourselves', 'Not needed'] },
      { key: 'music.songs', label: 'Must-play songs / artists', type: 'text', placeholder: 'e.g. Arijit Singh, Diljit Dosanjh, no sad songs' },
    ],
  },
  {
    id: 'decor',
    label: 'Decor & Theme',
    emoji: '🌸',
    fields: [
      { key: 'decor.theme', label: 'Theme preference', type: 'chips', options: ['Royal / Maharaja', 'Floral', 'Rustic', 'Minimal & Modern', 'Traditional', 'Destination feel'] },
      { key: 'decor.colors', label: 'Colour palette', type: 'text', placeholder: 'e.g. Gold + ivory, avoid red & green together' },
      { key: 'decor.flowers', label: 'Flower preferences', type: 'chips', options: ['Marigold', 'Roses', 'Jasmine', 'Orchids', 'Mix of all', 'No strong fragrance'] },
      { key: 'decor.avoid', label: 'What to avoid', type: 'text', placeholder: 'e.g. No plastic flowers, avoid too much glitter' },
    ],
  },
  {
    id: 'photography',
    label: 'Photography & Video',
    emoji: '📸',
    fields: [
      { key: 'photo.style', label: 'Photography style', type: 'chips', options: ['Candid', 'Traditional', 'Both candid + traditional', 'Cinematic'] },
      { key: 'photo.must_shots', label: 'Must-capture moments', type: 'text', placeholder: 'e.g. Nana ji & bride together, full family group photo' },
      { key: 'photo.drone', label: 'Drone shots', type: 'chips', options: ['Yes please', 'No preference', 'Not needed'] },
      { key: 'photo.reel', label: 'Wedding reel / highlight video', type: 'chips', options: ['Yes, 3-5 min reel', 'Yes, full documentary', 'Just photos are fine'] },
    ],
  },
  {
    id: 'general',
    label: 'General Preferences',
    emoji: '✨',
    fields: [
      { key: 'general.vibe', label: 'Overall vibe', type: 'chips', options: ['Grand & opulent', 'Intimate & cozy', 'Fun & vibrant', 'Elegant & minimal'] },
      { key: 'general.kids', label: 'Kids attending?', type: 'chips', options: ['Yes, many kids', 'A few', 'Mostly adults'] },
      { key: 'general.elderly', label: 'Elderly guests', type: 'chips', options: ['Many elderly guests, need seating priority', 'Some', 'Mostly young crowd'] },
      { key: 'general.other', label: 'Anything else for the team', type: 'text', placeholder: 'Any specific requests, things you loved at other weddings, things to avoid…' },
    ],
  },
]

export default function PreferencesClient({ weddingId, initial }: Props) {
  const [prefs, setPrefs] = useState<Record<string, string>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function sectionFillCount(section: typeof SECTIONS[0]) {
    return section.fields.filter(f => (prefs[f.key] || '').trim()).length
  }

  function toggle(key: string, option: string) {
    setPrefs(prev => {
      const current = (prev[key] || '').split(',').map(s => s.trim()).filter(Boolean)
      const idx = current.indexOf(option)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(option)
      return { ...prev, [key]: current.join(', ') }
    })
    setSaved(false)
  }

  function setText(key: string, value: string) {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function isSelected(key: string, option: string) {
    return (prefs[key] || '').split(',').map(s => s.trim()).includes(option)
  }

  async function handleSave() {
    setSaving(true)
    const res = await savePreferences(weddingId, prefs)
    if ('error' in res) toast.error(res.error)
    else { setSaved(true); toast.success('Preferences saved!') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Your Preferences</h2>
          <p className="text-sm text-stone-400 mt-0.5">Help your event team understand exactly what you want</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-700 text-white hover:bg-rose-800'} disabled:opacity-50`}>
          {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save all'}</>}
        </button>
      </div>

      {SECTIONS.map(section => {
        const isOpen = !!openSections[section.id]
        const filled = sectionFillCount(section)
        return (
          <div key={section.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-stone-800">{section.emoji} {section.label}</p>
                {filled > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                    {filled}/{section.fields.length} filled
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </button>
            {isOpen && (
              <div className="p-4 space-y-4 border-t border-stone-100">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-stone-500 mb-2 block">{field.label}</label>
                    {field.type === 'chips' ? (
                      <div className="flex flex-wrap gap-2">
                        {field.options!.map(opt => (
                          <button key={opt} type="button" onClick={() => toggle(field.key, opt)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              isSelected(field.key, opt)
                                ? 'bg-rose-700 text-white border-rose-700'
                                : 'border-stone-200 text-stone-600 hover:border-rose-300 hover:text-rose-700'
                            }`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        value={prefs[field.key] || ''}
                        onChange={e => setText(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <button onClick={handleSave} disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-700 text-white hover:bg-rose-800'} disabled:opacity-50`}>
        {saved ? '✓ Preferences saved' : saving ? 'Saving…' : 'Save preferences'}
      </button>
    </div>
  )
}
