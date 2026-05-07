'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { updateCelebration } from '../actions'

const WEDDING_STYLES = [
  { value: 'intimate', label: 'Intimate & Elegant', emoji: '🌸' },
  { value: 'traditional', label: 'Traditional Grand', emoji: '🎊' },
  { value: 'destination', label: 'Destination', emoji: '🏰' },
  { value: 'simple', label: 'Simple & Sweet', emoji: '🤍' },
]

type Celebration = Record<string, unknown>

export default function SettingsClient({ celebrationId, celebration }: {
  celebrationId: string
  celebration: Celebration
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [brideName, setBrideName] = useState((celebration.bride_name as string) ?? '')
  const [groomName, setGroomName] = useState((celebration.groom_name as string) ?? '')
  const [city, setCity] = useState((celebration.city as string) ?? '')
  const [venue, setVenue] = useState((celebration.venue as string) ?? '')
  const [eventDate, setEventDate] = useState((celebration.event_date as string) ?? '')
  const [endDate, setEndDate] = useState((celebration.end_date as string) ?? '')
  const [guestCount, setGuestCount] = useState(String((celebration.guest_count as number) ?? ''))
  const [weddingStyle, setWeddingStyle] = useState((celebration.wedding_style as string) ?? '')

  function handleSave() {
    startTransition(async () => {
      const res = await updateCelebration(celebrationId, {
        bride_name: brideName.trim() || undefined,
        groom_name: groomName.trim() || undefined,
        city: city.trim() || null,
        venue: venue.trim() || null,
        event_date: eventDate || null,
        end_date: endDate || null,
        guest_count: guestCount ? parseInt(guestCount) : undefined,
        wedding_style: weddingStyle || null,
      })
      if ('error' in res) { toast.error(res.error); return }
      toast.success('Saved!')
      router.refresh()
    })
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-12 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm mt-0.5">Edit your celebration details</p>
      </div>

      {/* Couple names */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Couple</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Bride&apos;s name</label>
            <Input value={brideName} onChange={e => setBrideName(e.target.value)} placeholder="Priya" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Groom&apos;s name</label>
            <Input value={groomName} onChange={e => setGroomName(e.target.value)} placeholder="Arjun" />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Dates</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Start date</label>
            <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">End date</label>
            <Input type="date" value={endDate} min={eventDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Venue & City */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Location</p>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1.5">City</label>
          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Jaipur, Mumbai..." />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1.5">Venue name</label>
          <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Nahargarh Palace..." />
        </div>
      </div>

      {/* Guests */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Guests</p>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1.5">Expected guest count</label>
          <Input type="number" min="0" value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder="250" />
        </div>
      </div>

      {/* Wedding style */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Wedding style</p>
        <div className="grid grid-cols-2 gap-2">
          {WEDDING_STYLES.map(ws => (
            <button key={ws.value} onClick={() => setWeddingStyle(ws.value)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                weddingStyle === ws.value ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-stone-100 bg-stone-50 text-stone-600 hover:border-stone-200'
              }`}>
              {ws.emoji} {ws.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-60 transition-colors">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isPending ? 'Saving…' : 'Save changes'}
      </button>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Danger zone</p>
        </div>
        <p className="text-xs text-stone-500">Deleting your celebration will permanently remove all data — guests, budget, vendors, tasks. This cannot be undone.</p>
        <button
          onClick={() => toast.error('To delete, please contact support')}
          className="flex items-center gap-2 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" /> Delete celebration
        </button>
      </div>
    </div>
  )
}
