'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createOrgEvent } from './actions'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

// ─── Event type taxonomy ───────────────────────────────────────────────────

export type EventSubType = {
  id: string
  label: string
  emoji: string
  category: 'corporate' | 'government' | 'public' | 'btl'
  description: string
  tags: string[]
}

export const EVENT_SUBTYPES: EventSubType[] = [
  // Corporate
  { id: 'conference', label: 'Conference / Summit', emoji: '🎤', category: 'corporate', description: 'Multi-session event with keynotes, panels, and breakouts', tags: ['Speakers', 'Delegates', 'Agenda', 'Sponsors'] },
  { id: 'award_ceremony', label: 'Award Ceremony', emoji: '🏆', category: 'corporate', description: 'Felicitation, recognition, and awards event', tags: ['VVIP Guests', 'Stage', 'Run of Show', 'Sponsors'] },
  { id: 'product_launch', label: 'Product Launch', emoji: '🚀', category: 'corporate', description: 'Brand / product reveal with media and influencers', tags: ['Media', 'Brand Vendors', 'Live Demo'] },
  { id: 'corporate_dinner', label: 'Gala / Corporate Dinner', emoji: '🥂', category: 'corporate', description: 'Formal dinner or networking banquet', tags: ['Seating', 'Hospitality', 'Entertainment'] },
  { id: 'agm', label: 'AGM / Board Meeting', emoji: '📋', category: 'corporate', description: 'Annual general meeting or board-level event', tags: ['Governance', 'Shareholders', 'Compliance'] },
  { id: 'team_building', label: 'Team Building / Offsite', emoji: '🤝', category: 'corporate', description: 'Offsite retreat or team engagement activity', tags: ['Activities', 'Transport', 'Accommodation'] },
  { id: 'trade_fair', label: 'Trade Fair / Exhibition', emoji: '🏛️', category: 'corporate', description: 'Exhibitor stalls, product displays, B2B networking', tags: ['Stalls', 'Exhibitors', 'Floor Plan'] },

  // Government
  { id: 'state_function', label: 'State / Official Function', emoji: '🎖️', category: 'government', description: 'Official government ceremony with dignitaries', tags: ['VIP Protocol', 'Security', 'Motorcade'] },
  { id: 'inauguration', label: 'Inauguration / Foundation Stone', emoji: '🪨', category: 'government', description: 'Inaugural ceremony for project or institution', tags: ['Dignitaries', 'Media', 'Stage Setup'] },
  { id: 'republic_day', label: 'Republic / Independence Day', emoji: '🇮🇳', category: 'government', description: 'National day celebration with parade and programme', tags: ['Protocol', 'Flag Hoisting', 'Cultural'] },
  { id: 'felicitation', label: 'Felicitation / Samman Samaroh', emoji: '🙏', category: 'government', description: 'Honour and recognition ceremony', tags: ['Guests', 'Mementos', 'Cultural Programme'] },
  { id: 'public_address', label: 'Public Address / Rally', emoji: '📢', category: 'government', description: 'Large gathering for public communication', tags: ['Stage', 'Security', 'Crowd Management'] },

  // Public / Entertainment
  { id: 'concert', label: 'Concert / Live Show', emoji: '🎵', category: 'public', description: 'Live music or entertainment performance', tags: ['Artists', 'AV', 'Ticketing', 'Hospitality Riders'] },
  { id: 'festival', label: 'Festival / Mela', emoji: '🎪', category: 'public', description: 'Multi-day cultural or entertainment festival', tags: ['Multiple Stages', 'Food & Beverage', 'Security'] },
  { id: 'sports', label: 'Sports / Marathon', emoji: '🏅', category: 'public', description: 'Sporting event, race, or competition', tags: ['Registration', 'Timing', 'Volunteers', 'Medical'] },
  { id: 'fundraiser', label: 'Fundraiser / Charity Gala', emoji: '💛', category: 'public', description: 'Fundraising event with auctions or performances', tags: ['Donors', 'Sponsors', 'Live Auction'] },

  // BTL / Promotions
  { id: 'brand_activation', label: 'Brand Activation', emoji: '⚡', category: 'btl', description: 'Experiential brand engagement at a fixed location', tags: ['Sampling Staff', 'Brand Setup', 'Footfall Tracking'] },
  { id: 'sampling_campaign', label: 'Product Sampling', emoji: '🎁', category: 'btl', description: 'Free sampling drive in malls, RWAs, or high-footfall areas', tags: ['Promoters', 'Inventory', 'Sampling Kits', 'Data Collection'] },
  { id: 'roadshow', label: 'Roadshow / City Tour', emoji: '🚐', category: 'btl', description: 'Multi-city or multi-location activation on the move', tags: ['Vehicles', 'City Schedule', 'Promoters', 'Logistics'] },
  { id: 'mall_activation', label: 'Mall Activation', emoji: '🏬', category: 'btl', description: 'In-mall promotional activity, stall or experience zone', tags: ['Mall Permissions', 'Stall Setup', 'Promoters', 'Contest'] },
  { id: 'rwa_activation', label: 'RWA / Housing Society', emoji: '🏘️', category: 'btl', description: 'Residential society activation, van-based sampling', tags: ['Gate Permissions', 'Promoters', 'Van', 'Sampling'] },
  { id: 'kiosk_campaign', label: 'Kiosk / Pop-up Stall', emoji: '🛖', category: 'btl', description: 'Branded kiosk at a high-traffic location', tags: ['Kiosk Setup', 'Staff', 'POS Material', 'Lead Capture'] },
  { id: 'van_campaign', label: 'Van Campaign / Rural BTL', emoji: '🚌', category: 'btl', description: 'Mobile van activity targeting tier 2/3 or rural markets', tags: ['Vehicles', 'Route Plan', 'Local Promoters', 'Village List'] },
  { id: 'ipl_activation', label: 'Sports / IPL Fan Zone', emoji: '🏏', category: 'btl', description: 'Fan engagement zone at stadium or sports venue', tags: ['Branding', 'Fan Activities', 'Sampling', 'Security'] },
]

const CATEGORY_META = {
  corporate: { label: 'Corporate', color: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  government: { label: 'Government / Official', color: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  public: { label: 'Public / Entertainment', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  btl: { label: 'BTL / Promotions & Activations', color: 'border-pink-200 bg-pink-50 text-pink-700', dot: 'bg-pink-500' },
}

// ─── Step 1: Type Picker ───────────────────────────────────────────────────

function TypePicker({ onSelect }: { onSelect: (sub: EventSubType) => void }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-2">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-stone-900">What kind of event are you creating?</h1>
        <p className="text-stone-500 text-sm mt-1.5">We'll automatically set up the right checklist, budget categories, and tools for your event type.</p>
      </div>

      {(['corporate', 'government', 'public', 'btl'] as const).map(cat => {
        const meta = CATEGORY_META[cat]
        const subtypes = EVENT_SUBTYPES.filter(s => s.category === cat)
        return (
          <div key={cat} className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-2 h-2 rounded-full', meta.dot)} />
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">{meta.label}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {subtypes.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => onSelect(sub)}
                  onMouseEnter={() => setHovered(sub.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    hovered === sub.id
                      ? 'border-blue-400 bg-blue-50 shadow-sm scale-[1.01]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{sub.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 text-sm leading-snug">{sub.label}</p>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">{sub.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sub.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 2: Details Form ──────────────────────────────────────────────────

const PLACEHOLDERS: Record<string, string> = {
  conference: 'e.g. Annual Leadership Summit 2026',
  award_ceremony: 'e.g. Excellence Awards 2026',
  product_launch: 'e.g. Brand X — Launch Event',
  corporate_dinner: 'e.g. Founders Gala Night 2026',
  agm: 'e.g. Annual General Meeting 2026',
  team_building: 'e.g. Offsite 2026 — Coorg',
  trade_fair: 'e.g. India Trade & Industry Expo',
  state_function: "e.g. Chief Minister's Swearing-In Ceremony",
  inauguration: 'e.g. Inauguration of City Library',
  republic_day: 'e.g. Republic Day Parade 2026',
  felicitation: 'e.g. Senior Citizens Samman Samaroh',
  public_address: 'e.g. Jan Sabha — Constituency Rally',
  concert: 'e.g. Arijit Singh Live — Jaipur 2026',
  festival: 'e.g. Jaipur Literature Festival 2026',
  sports: 'e.g. Jaipur Pink City Marathon 2026',
  fundraiser: 'e.g. Hope Foundation Gala 2026',
  brand_activation: 'e.g. Brand X Activation — Phoenix Mall',
  sampling_campaign: 'e.g. Product Y Sampling — Delhi NCR',
  roadshow: 'e.g. Brand Z Roadshow — 5 Cities',
  mall_activation: 'e.g. Summer Activation — Select Citywalk',
  rwa_activation: 'e.g. RWA Sampling Drive — Noida',
  kiosk_campaign: 'e.g. Pop-up Kiosk — T3 Airport Delhi',
  van_campaign: 'e.g. Rural Van Campaign — UP & Bihar',
  ipl_activation: 'e.g. Fan Zone — IPL Season 2026',
}

function DetailsForm({ sub, onBack }: { sub: EventSubType; onBack: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    venue: '',
    city: '',
    expected_count: '',
    budget_total: '',
  })

  const categoryMeta = CATEGORY_META[sub.category]

  function set(key: string, value: string) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'start_date' && !f.end_date) next.end_date = value
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Event name is required'); return }
    setLoading(true)

    const result = await createOrgEvent({
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: sub.category === 'btl' ? 'public' : sub.category,
      sub_type: sub.id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      venue: form.venue.trim() || null,
      city: form.city.trim() || null,
      expected_count: parseInt(form.expected_count) || 0,
      budget_total: parseFloat(form.budget_total) || 0,
    })

    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Change event type
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sub.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{sub.label}</h1>
            <p className="text-stone-500 text-sm mt-0.5">{sub.description}</p>
          </div>
        </div>
      </div>

      {/* Auto-setup preview */}
      <div className={cn('rounded-xl border-2 p-4 mb-6', categoryMeta.color)}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-70">Auto-setup after creation</p>
        <div className="flex flex-wrap gap-2">
          {[...sub.tags, 'Checklist template', 'Budget categories'].map(t => (
            <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/70 font-medium">
              <Check className="w-3 h-3" /> {t}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Event name *</Label>
          <Input
            placeholder={PLACEHOLDERS[sub.id] ?? 'Enter event name'}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            autoFocus
            className="text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Description <span className="text-stone-400 font-normal text-xs">(optional)</span></Label>
          <textarea
            placeholder="Brief description for your team..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
            className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <Label>Event dates</Label>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <div>
              <p className="text-xs text-stone-400 mb-1">Start date</p>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-1">End date</p>
              <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Venue</Label>
            <Input placeholder="e.g. Taj Palace Hotel" value={form.venue} onChange={e => set('venue', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input placeholder="e.g. New Delhi" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Expected attendees</Label>
            <Input type="number" min="0" placeholder="e.g. 300" value={form.expected_count}
              onChange={e => set('expected_count', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Budget (₹) <span className="text-stone-400 font-normal text-xs">optional</span></Label>
            <Input type="number" min="0" placeholder="e.g. 25,00,000" value={form.budget_total}
              onChange={e => set('budget_total', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Setting up your event…' : (
              <span className="flex items-center gap-2">Create & Setup Event <ArrowRight className="w-4 h-4" /></span>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ─── Main wizard ───────────────────────────────────────────────────────────

function NewOrgEventWizard() {
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedSub, setSelectedSub] = useState<EventSubType | null>(null)

  if (step === 'details' && selectedSub) {
    return <DetailsForm sub={selectedSub} onBack={() => setStep('type')} />
  }

  return (
    <TypePicker
      onSelect={sub => {
        setSelectedSub(sub)
        setStep('details')
      }}
    />
  )
}

export default function NewOrgEventPage() {
  return (
    <Suspense>
      <NewOrgEventWizard />
    </Suspense>
  )
}
