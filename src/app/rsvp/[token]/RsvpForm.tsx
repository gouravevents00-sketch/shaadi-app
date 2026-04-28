'use client'

import { useState } from 'react'
import { submitRsvp, type FamilyMember } from './actions'
import { Car, Plane, Train, Bus, Plus, X, CheckCircle2 } from 'lucide-react'

const TRAVEL_MODES = [
  { value: 'self_drive', label: 'Self drive', icon: Car },
  { value: 'flight',     label: 'Flight',     icon: Plane },
  { value: 'train',      label: 'Train',      icon: Train },
  { value: 'bus',        label: 'Bus',        icon: Bus },
]

const DIETARY_OPTIONS = [
  { value: 'veg',     label: 'Veg' },
  { value: 'non_veg', label: 'Non-Veg' },
  { value: 'jain',    label: 'Jain' },
  { value: 'other',   label: 'Other' },
]

type Step = 'welcome' | 'logistics' | 'family' | 'notes' | 'done'

export default function RsvpForm({
  guestId,
  guestName,
  weddingTitle,
  weddingDate,
  weddingVenue,
}: {
  guestId: string
  guestName: string
  weddingTitle: string
  weddingDate: string | null
  weddingVenue: string | null
}) {
  const [step, setStep] = useState<Step>('welcome')
  const [attending, setAttending] = useState<boolean | null>(null)
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [travelMode, setTravelMode] = useState('')
  const [arrivalDatetime, setArrivalDatetime] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [needsPickup, setNeedsPickup] = useState(false)
  const [family, setFamily] = useState<FamilyMember[]>([])
  const [newName, setNewName] = useState('')
  const [newDietary, setNewDietary] = useState('veg')
  const [notes, setNotes] = useState('')
  const [wishes, setWishes] = useState('')
  const [loading, setLoading] = useState(false)

  const needsBookingRef = ['flight', 'train'].includes(travelMode)
  const canRequestPickup = ['flight', 'train', 'bus'].includes(travelMode)

  function addFamilyMember() {
    if (!newName.trim()) return
    setFamily(prev => [...prev, { name: newName.trim(), dietary: newDietary }])
    setNewName('')
    setNewDietary('veg')
  }

  function removeFamilyMember(i: number) {
    setFamily(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    setLoading(true)
    const result = await submitRsvp(guestId, {
      attending: attending === true,
      arrival_date: arrivalDate,
      departure_date: departureDate,
      arrival_mode: travelMode,
      arrival_datetime: arrivalDatetime,
      arrival_booking_ref: bookingRef,
      needs_pickup: canRequestPickup && needsPickup,
      family_members: family,
      rsvp_notes: notes,
      wishes_message: wishes,
    })
    setLoading(false)
    if (result.success) setStep('done')
  }

  // ─── Header ────────────────────────────────────────────────────
  const Header = () => (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-rose-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-lg font-bold">✦</span>
        </div>
        <h1 className="text-2xl font-semibold text-stone-900">{weddingTitle}</h1>
        {weddingDate && (
          <p className="text-stone-500 text-sm mt-1">
            {new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
            {weddingVenue ? ` · ${weddingVenue}` : ''}
          </p>
        )}
      </div>
    </div>
  )

  // ─── Done ──────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-rose-600" />
          </div>
          {attending ? (
            <>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                We can't wait to see you!
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                Thank you, <span className="font-medium text-stone-700">{guestName}</span>.
                Your confirmation has been received.
                {family.length > 0 && ` Looking forward to celebrating with you and your family.`}
              </p>
              {wishes && (
                <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-800 italic">
                  "{wishes}"
                </div>
              )}
              {needsPickup && (
                <p className="text-stone-400 text-xs mt-4 bg-stone-50 rounded-xl px-4 py-3 border border-stone-200">
                  Your pickup request has been noted. Someone from the team will reach out closer to the date.
                </p>
              )}
              <p className="text-stone-400 text-xs mt-6">
                You can use this link anytime to update your details.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                We'll miss you!
              </h2>
              <p className="text-stone-500 text-sm">
                Thank you for letting us know, <span className="font-medium text-stone-700">{guestName}</span>.
                We hope to celebrate with you another time.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Welcome ───────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
          <div className="text-center">
            <p className="text-stone-600">
              Dear <span className="font-semibold text-stone-900">{guestName}</span>,
            </p>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed">
              We are delighted to invite you to be a part of our celebrations.
              Your presence would mean the world to us.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setAttending(true); setStep('logistics') }}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-medium py-4 rounded-xl transition-colors text-base"
            >
              Joyfully accepting 🎉
            </button>
            <button
              onClick={() => { setAttending(false); setStep('notes') }}
              className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 font-medium py-4 rounded-xl transition-colors text-sm"
            >
              Regretfully declining
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Logistics ─────────────────────────────────────────────────
  if (step === 'logistics') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div>
            <p className="font-medium text-stone-900">When are you joining us?</p>
            <p className="text-stone-400 text-xs mt-0.5">You can fill this later once your plans are confirmed</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">Arriving on</label>
              <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">Leaving on</label>
              <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-700">How are you travelling?</p>
            <div className="grid grid-cols-4 gap-2">
              {TRAVEL_MODES.map(({ value, label, icon: Icon }) => (
                <button key={value}
                  onClick={() => { setTravelMode(value); setNeedsPickup(false) }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                    travelMode === value
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 bg-white'
                  }`}>
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {travelMode && travelMode !== 'self_drive' && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500">
                  {travelMode === 'flight' ? 'Flight landing time' : 'Expected arrival time'}
                </label>
                <input type="datetime-local" value={arrivalDatetime}
                  onChange={e => setArrivalDatetime(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>

              {needsBookingRef && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-500">
                    {travelMode === 'flight' ? 'Flight number / PNR (optional)' : 'Train name & number / PNR (optional)'}
                  </label>
                  <input type="text" value={bookingRef} onChange={e => setBookingRef(e.target.value)}
                    placeholder={travelMode === 'flight' ? 'e.g. 6E 412 or PNR ABC123' : 'e.g. Rajdhani 12951 or PNR ABC123'}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300" />
                  <p className="text-xs text-stone-400">You can share this later too — helps us arrange your pickup</p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input type="checkbox" checked={needsPickup}
                  onChange={e => setNeedsPickup(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300" />
                <div>
                  <p className="text-sm font-medium text-stone-800">I'd like a pickup arranged</p>
                  <p className="text-xs text-stone-400">
                    From {travelMode === 'flight' ? 'airport' : 'station'} to venue · We'll confirm availability
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('welcome')}
              className="flex-1 border border-stone-200 bg-white text-stone-600 font-medium py-3 rounded-xl text-sm hover:bg-stone-50">
              Back
            </button>
            <button onClick={() => setStep('family')}
              className="flex-2 flex-1 bg-rose-700 hover:bg-rose-800 text-white font-medium py-3 rounded-xl text-sm transition-colors">
              Continue
            </button>
          </div>
          <p className="text-center text-xs text-stone-400 pb-2">
            These details can be updated anytime using this link
          </p>
        </div>
      </div>
    )
  }

  // ─── Family ────────────────────────────────────────────────────
  if (step === 'family') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div>
            <p className="font-medium text-stone-900">Who else is joining you?</p>
            <p className="text-stone-400 text-xs mt-0.5">
              Add family members so we can make the right arrangements for everyone
            </p>
          </div>

          {/* Added members */}
          {family.length > 0 && (
            <div className="space-y-2">
              {family.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{m.name}</p>
                    <p className="text-xs text-stone-400 capitalize">{m.dietary.replace('_', '-')}</p>
                  </div>
                  <button onClick={() => removeFamilyMember(i)}
                    className="text-stone-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new member */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-stone-500">Add a family member</p>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Full name"
              onKeyDown={e => e.key === 'Enter' && addFamilyMember()}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <div className="flex gap-2">
              {DIETARY_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setNewDietary(o.value)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    newDietary === o.value
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            <button onClick={addFamilyMember} disabled={!newName.trim()}
              className="w-full border border-stone-200 hover:bg-stone-50 disabled:opacity-40 text-stone-700 font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Add person
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('logistics')}
              className="flex-1 border border-stone-200 bg-white text-stone-600 font-medium py-3 rounded-xl text-sm hover:bg-stone-50">
              Back
            </button>
            <button onClick={() => setStep('notes')}
              className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-medium py-3 rounded-xl text-sm transition-colors">
              {family.length > 0 ? 'Continue' : 'Skip for now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Notes / Final ─────────────────────────────────────────────
  if (step === 'notes') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {attending ? (
            <>
              <div>
                <p className="font-medium text-stone-900">Anything you'd like us to know?</p>
                <p className="text-stone-400 text-xs mt-0.5">
                  Special dietary needs, accessibility requirements, room preferences — we want everyone to feel comfortable
                </p>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="e.g. We will need a ground floor room, or one of us has a nut allergy…"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />

              {/* Wishes */}
              <div className="pt-1">
                <p className="font-medium text-stone-900">Leave a message for {weddingTitle} 💌</p>
                <p className="text-stone-400 text-xs mt-0.5">Your wishes, blessings, or just a warm word — they'll cherish it</p>
              </div>
              <textarea value={wishes} onChange={e => setWishes(e.target.value)} rows={4}
                placeholder="Wishing you a lifetime of love and laughter…"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />

              {/* Summary */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm space-y-1.5">
                <p className="font-medium text-stone-700 text-xs uppercase tracking-wide mb-2">Your RSVP summary</p>
                {arrivalDate && <p className="text-stone-600">Arriving: <span className="font-medium">{new Date(arrivalDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></p>}
                {departureDate && <p className="text-stone-600">Leaving: <span className="font-medium">{new Date(departureDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></p>}
                {travelMode && <p className="text-stone-600 capitalize">Travel: <span className="font-medium">{travelMode.replace('_', ' ')}</span></p>}
                {needsPickup && <p className="text-stone-600">Pickup: <span className="font-medium text-green-700">Requested</span></p>}
                {family.length > 0 && <p className="text-stone-600">Family joining: <span className="font-medium">{family.map(m => m.name).join(', ')}</span></p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('family')}
                  className="flex-1 border border-stone-200 bg-white text-stone-600 font-medium py-3 rounded-xl text-sm hover:bg-stone-50">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? 'Confirming…' : 'Confirm RSVP'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-medium text-stone-900">Leave a message for {weddingTitle} 💌</p>
                <p className="text-stone-400 text-xs mt-0.5">Send them your love even from afar — completely optional</p>
              </div>
              <textarea value={wishes} onChange={e => setWishes(e.target.value)} rows={4}
                placeholder="Wishing you both all the happiness in the world…"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1.5">Anything else?</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Let us know if plans might change…"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('welcome')}
                  className="flex-1 border border-stone-200 bg-white text-stone-600 font-medium py-3 rounded-xl text-sm hover:bg-stone-50">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-stone-800 hover:bg-stone-900 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-stone-400 pb-4">
            You can update your RSVP anytime using this link
          </p>
        </div>
      </div>
    )
  }

  return null
}
