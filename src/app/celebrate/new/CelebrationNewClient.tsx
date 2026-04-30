'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCelebration } from './actions'

const CELEBRATION_TYPES = [
  { id: 'wedding', label: 'Shadi / Wedding', emoji: '💒', desc: 'Complete wedding planning' },
  { id: 'sagai', label: 'Sagai / Engagement', emoji: '💍', desc: 'Ring ceremony & celebration' },
  { id: 'sangeet', label: 'Sangeet Night', emoji: '🎵', desc: 'Music, dance & performances' },
  { id: 'namkaran', label: 'Namkaran', emoji: '👶', desc: 'Baby naming ceremony' },
  { id: 'mundan', label: 'Mundan', emoji: '✂️', desc: 'First haircut ceremony' },
  { id: 'annaprashan', label: 'Annaprashan', emoji: '🍚', desc: 'First rice feeding ceremony' },
  { id: 'janeu', label: 'Janeu / Upanayana', emoji: '🧵', desc: 'Sacred thread ceremony' },
  { id: 'godh_bharai', label: 'Godh Bharai', emoji: '🤰', desc: 'Baby shower ceremony' },
  { id: 'griha_pravesh', label: 'Griha Pravesh', emoji: '🏠', desc: 'Housewarming puja' },
  { id: 'puja', label: 'Puja / Havan', emoji: '🪔', desc: 'Religious ceremony or havan' },
  { id: 'birthday', label: 'Birthday Party', emoji: '🎂', desc: 'Birthday celebration' },
  { id: 'anniversary', label: 'Anniversary', emoji: '❤️', desc: 'Wedding anniversary' },
  { id: 'graduation', label: 'Graduation Party', emoji: '🎓', desc: 'Academic milestone' },
  { id: 'retirement', label: 'Retirement Party', emoji: '🎉', desc: 'Farewell & celebration' },
  { id: 'kitty', label: 'Kitty Party', emoji: '👗', desc: 'Social gathering' },
  { id: 'other', label: 'Other Celebration', emoji: '✨', desc: 'Custom event' },
]

type Step = 'type' | 'details'

export default function CelebrationNewClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [guestCount, setGuestCount] = useState('')

  const selectedTypeInfo = CELEBRATION_TYPES.find(t => t.id === selectedType)

  async function handleCreate() {
    if (!selectedType || !name.trim()) {
      toast.error('Please fill in the celebration name')
      return
    }
    setLoading(true)
    const res = await createCelebration({
      userId,
      type: selectedType,
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
        <span className="font-semibold text-stone-900 text-sm">Creative Era OS</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 'type' ? 'text-rose-700' : 'text-emerald-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'type' ? 'bg-rose-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              {step === 'type' ? '1' : '✓'}
            </div>
            Choose type
          </div>
          <div className="flex-1 h-px bg-stone-200" />
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 'details' ? 'text-rose-700' : 'text-stone-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'details' ? 'bg-rose-700 text-white' : 'bg-stone-200 text-stone-500'}`}>2</div>
            Basic details
          </div>
        </div>

        {step === 'type' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-stone-900">Kaunsa celebration plan karna hai?</h1>
              <p className="text-stone-500 text-sm mt-1">Select your event type — AI will generate a starter checklist for you</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CELEBRATION_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedType === type.id
                      ? 'border-rose-500 bg-rose-50 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.emoji}</div>
                  <p className="text-sm font-semibold text-stone-800">{type.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{type.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => { if (!selectedType) { toast.error('Please select a celebration type'); return }; setStep('details') }}
                className="bg-rose-700 hover:bg-rose-800"
              >
                Next <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="mb-6">
              <button onClick={() => setStep('type')} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="text-2xl font-bold text-stone-900">
                {selectedTypeInfo?.emoji} {selectedTypeInfo?.label} details
              </h1>
              <p className="text-stone-500 text-sm mt-1">Fill in what you know — you can always update these later</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
              <div>
                <Label>Celebration name <span className="text-red-500">*</span></Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={selectedType === 'wedding' ? 'Priya & Arjun Wedding' : selectedType === 'birthday' ? "Neha's 30th Birthday" : 'My celebration'}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Event date</Label>
                  <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Approx. guests</Label>
                  <Input type="number" min="0" value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder="e.g. 150" className="mt-1" />
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
                  We&apos;ll create a complete task list for your {selectedTypeInfo?.label} — you can edit, add or remove tasks anytime
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep('type')}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="bg-rose-700 hover:bg-rose-800">
                {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Create my plan</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
