'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2, Loader2, Store } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { submitVendorRegistration, type VendorRegisterForm } from './actions'

const CATEGORIES = [
  'Photographer', 'Videographer', 'Caterer', 'Decorator', 'Florist',
  'Makeup Artist', 'DJ / Band', 'Venue', 'Pandit', 'Mehendi Artist',
  'Wedding Planner', 'Invitation Designer', 'Transport', 'Accommodation', 'Other',
]

// Specializations per category — shown as tag chips
const SPECIALIZATION_MAP: Record<string, string[]> = {
  Photographer: ['Candid', 'Traditional', 'Drone', 'Pre-wedding', 'Film/Cinematic', 'Editorial', 'Budget-friendly', 'Luxury'],
  Videographer: ['Cinematic', 'Drone footage', 'Reel-ready', 'Same-day edit', 'Documentary', 'Luxury'],
  Caterer: ['Veg only', 'Multi-cuisine', 'Rajasthani', 'Mughlai', 'South Indian', 'Live counters', 'Home-style', 'FSSAi certified'],
  Decorator: ['Floral', 'Minimalist', 'Royal', 'Rustic', 'Theme-based', 'Sustainable', 'Luxury'],
  Florist: ['Imported flowers', 'Local flowers', 'Sustainable', 'Fragrance-based', 'Seasonal'],
  'Makeup Artist': ['Bridal', 'Airbrush', 'HD makeup', 'Natural look', 'South Indian', 'North Indian', 'Rajasthani'],
  'DJ / Band': ['DJ', 'Live band', 'Dhol', 'Folk music', 'Brass band', 'Bollywood', 'Sufi/Folk'],
  Venue: ['Palace', 'Farmhouse', 'Hotel', '5-star', 'Rooftop', 'Garden', 'Beach', 'Heritage', 'Budget-friendly'],
  Pandit: ['Vedic', 'North Indian', 'South Indian', 'Marathi', 'Gujarati', 'Bilingual ceremony', 'Destination'],
  'Mehendi Artist': ['Rajasthani', 'Arabic', 'Bridal', 'Minimalist', 'Intricate', 'Team available'],
  'Wedding Planner': ['Full-service', 'Day-of', 'Destination', 'Budget', 'Luxury', 'South Indian', 'Royal'],
  'Invitation Designer': ['Digital invites', 'Print invites', 'Video invites', 'Luxury boxes', 'Eco-friendly'],
  Transport: ['Luxury cars', 'Vintage cars', 'Tempo traveller', 'Buses', 'Ghodi', 'Decorated vehicles'],
  Accommodation: ['Hotel block', 'Resort', 'Homestay', 'Budget', 'Luxury', 'Destination'],
  Other: ['Custom', 'Multi-service'],
}

export default function VendorRegisterPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<VendorRegisterForm>({
    name: '', category: 'Photographer', city: '', tagline: '', description: '',
    phone: '', email: '', website: '', instagram: '',
    specializations: [], yearsActive: '', servesDestination: false,
  })

  function set<K extends keyof VendorRegisterForm>(k: K, v: VendorRegisterForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleSpec(s: string) {
    set('specializations', form.specializations.includes(s)
      ? form.specializations.filter(x => x !== s)
      : [...form.specializations, s])
  }

  const specs = SPECIALIZATION_MAP[form.category] ?? SPECIALIZATION_MAP.Other

  function canNext() {
    if (step === 0) return !!form.name.trim() && !!form.city.trim() && !!form.category
    if (step === 1) return form.specializations.length > 0
    return !!form.email.trim()
  }

  async function handleSubmit() {
    setLoading(true)
    const res = await submitVendorRegistration(form)
    setLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Registration submitted!</h2>
          <p className="text-stone-500 text-sm mb-6">
            Your listing is under review. We&apos;ll verify and activate it within 24–48 hours. You&apos;ll receive a confirmation on <strong>{form.email}</strong>.
          </p>
          <a href="/vendors" className="inline-flex items-center gap-2 bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-800 transition-colors">
            Browse marketplace →
          </a>
        </div>
      </div>
    )
  }

  const STEPS = ['Business info', 'Specializations', 'Contact']

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-900">List your business</p>
            <p className="text-xs text-stone-400">Utsav Marketplace · Free listing</p>
          </div>
          <span className="text-xs text-stone-400">Step {step + 1} of 3</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-rose-700 text-white' : i === step ? 'bg-rose-700 text-white ring-4 ring-rose-100' : 'bg-stone-100 text-stone-400'
                }`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-wide ${i === step ? 'text-rose-700' : 'text-stone-300'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-0.5 mx-2 mb-4" style={{ background: i < step ? '#e11d48' : '#e7e5e4' }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Business basics */}
        {step === 0 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-stone-900">Tell us about your business</h1>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Business name *</label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sharma Photography Studio" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Category *</label>
                <select value={form.category} onChange={e => { set('category', e.target.value); set('specializations', []) }}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">City *</label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Jaipur, Delhi…" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">One-line tagline</label>
                <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Capturing moments with cinematic finesse since 2015" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">About your business</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                  placeholder="Share your story, experience, and what makes you special…"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1.5">Years in business</label>
                  <select value={form.yearsActive} onChange={e => set('yearsActive', e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400">
                    <option value="">Select…</option>
                    {['1','2','3','5','7','10','15','20'].map(y => <option key={y} value={y}>{y}+ years</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.servesDestination} onChange={e => set('servesDestination', e.target.checked)}
                      className="w-4 h-4 accent-rose-600" />
                    <span className="text-sm text-stone-600">Serves destination events</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Specializations */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Your specializations</h1>
              <p className="text-stone-500 text-sm mt-1">Select all that apply — these show as tags on your profile</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {specs.map(s => {
                  const active = form.specializations.includes(s)
                  return (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`text-sm px-3.5 py-2 rounded-full font-medium transition-all ${
                        active ? 'bg-rose-700 text-white shadow-sm' : 'bg-stone-50 border border-stone-200 text-stone-600 hover:border-rose-200 hover:text-rose-700'
                      }`}>
                      {active && '✓ '}{s}
                    </button>
                  )
                })}
              </div>
            </div>
            {form.specializations.length > 0 && (
              <p className="text-xs text-rose-600 font-medium text-center">{form.specializations.length} selected ✦</p>
            )}
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Contact details</h1>
              <p className="text-stone-500 text-sm mt-1">Couples will reach out through your profile — no direct number shown publicly</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Email address *</label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@yourbusiness.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Phone (internal use, not shown publicly)</label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Instagram handle</label>
                <Input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@yourhandle" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Website</label>
                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yoursite.com" />
              </div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-stone-500 leading-relaxed">
              By submitting, you agree your listing will be reviewed and activated within 24–48 hours. Listing is free. No prices are shown publicly — couples contact you directly.
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-stone-100">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors">← Back</button>
            : <div />
          }
          {step < 2
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-2 bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-40 transition-all active:scale-95">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            : <button onClick={handleSubmit} disabled={!canNext() || loading}
                className="flex items-center gap-2 bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-40 transition-all active:scale-95">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit listing
              </button>
          }
        </div>
      </div>
    </div>
  )
}
