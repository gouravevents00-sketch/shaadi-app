'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCelebration } from './actions'

export default function CelebrationNewClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [guestCount, setGuestCount] = useState('')

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Please fill in the celebration name')
      return
    }
    setLoading(true)
    const res = await createCelebration({
      userId,
      type: 'wedding',
      name: name.trim(),
      eventDate: eventDate || undefined,
      venue: venue || undefined,
      city: city || undefined,
      guestCount: guestCount ? parseInt(guestCount) : undefined,
    })
    if ('error' in res) {
      toast.error(res.error)
      setLoading(false)
      return
    }
    toast.success('Celebration created! Your checklist is ready.')
    router.push(`/my/${res.id}`)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-100 bg-white px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✦</span>
        </div>
        <span className="font-semibold text-stone-900 text-sm">Plan your wedding</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Tell us about your big day</h1>
          <p className="text-stone-500 text-sm mt-1.5">We'll set up a personalised checklist to get you started — takes 30 seconds</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <Label>What would you like to call this? <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya & Arjun Wedding"
              className="mt-1"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Wedding date</Label>
              <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Approx. guests</Label>
              <Input type="number" min="0" value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder="e.g. 200" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Venue name</Label>
            <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Nahargarh Palace" className="mt-1" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Jaipur" className="mt-1" />
          </div>
        </div>

        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-rose-800">AI checklist ready to generate</p>
            <p className="text-rose-600 text-xs mt-0.5">
              We'll create a complete task list for your wedding — edit, add or remove tasks anytime
            </p>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="w-full mt-6 bg-rose-700 hover:bg-rose-800 h-12 text-base"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating your plan…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Create my wedding plan</>
          }
        </Button>
        <p className="text-center text-xs text-stone-400 mt-3">You can update all these details later</p>
      </div>
    </div>
  )
}
