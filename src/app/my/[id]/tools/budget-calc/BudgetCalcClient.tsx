'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Copy, Check, Info } from 'lucide-react'

type Celebration = {
  id: string; bride_name: string | null; groom_name: string | null
  guest_count: number | null; city: string | null; venue: string | null
  wedding_style: string | null; event_date: string | null
}
type CelebFunction = { id: string; name: string; date: string }
type BudgetItem = { id: string; category: string; label: string; estimated: number; actual: number | null; status: string }

const CITY_TIERS = [
  { value: 'metro',  label: 'Metro',  desc: 'Delhi, Mumbai, Bengaluru, Chennai' },
  { value: 'tier2',  label: 'Tier 2', desc: 'Jaipur, Pune, Hyderabad, Chandigarh' },
  { value: 'tier3',  label: 'Tier 3', desc: 'Smaller cities & towns' },
]
const STYLES = [
  { value: 'simple',      label: 'Simple',      emoji: '🤍', factor: 0.55 },
  { value: 'intimate',    label: 'Intimate',    emoji: '🌸', factor: 0.75 },
  { value: 'traditional', label: 'Traditional', emoji: '🎊', factor: 1.0 },
  { value: 'destination', label: 'Destination', emoji: '🏰', factor: 1.4 },
]

// Category definition
// Costs based on real 2024-25 Indian wedding data (traditional style, factor=1.0)
// perPlate: multiply by guest count | perFunction: multiply by function count | fixed: flat cost
// metro/tier2/tier3: [min, max] in ₹
type CatDef = {
  label: string; emoji: string; appCategory: string
  perPlate?: boolean; perFunction?: boolean; accommodation?: boolean
  metro: [number, number]; tier2: [number, number]; tier3: [number, number]
  note?: string
}

const CATEGORIES: CatDef[] = [
  {
    label: 'Venue & Lawn',       emoji: '🏛️', appCategory: 'Venue',
    metro:  [300000, 900000],    tier2: [150000, 500000],    tier3: [60000, 220000],
    note: 'Main venue booking for all functions',
  },
  {
    label: 'Catering',           emoji: '🍽️', appCategory: 'Catering', perPlate: true,
    metro:  [1100, 2000],        tier2: [700, 1400],         tier3: [450, 900],
    note: 'Per plate cost × total guests',
  },
  {
    label: 'Decoration',         emoji: '🌸', appCategory: 'Decoration', perFunction: true,
    metro:  [80000, 300000],     tier2: [45000, 180000],     tier3: [20000, 80000],
    note: 'Per function decoration (stage, mandap, flowers)',
  },
  {
    label: 'Photography & Video',emoji: '📷', appCategory: 'Photography & Video',
    metro:  [100000, 350000],    tier2: [55000, 180000],     tier3: [25000, 85000],
    note: 'Full event coverage package',
  },
  {
    label: 'Clothes & Jewellery',emoji: '👗', appCategory: 'Clothes & Jewellery',
    metro:  [300000, 1500000],   tier2: [150000, 800000],    tier3: [70000, 350000],
    note: 'Bridal lehenga/saree, groom sherwani, jewellery, family outfits',
  },
  {
    label: 'Music & Entertainment',emoji: '🎵', appCategory: 'Music & Entertainment', perFunction: true,
    metro:  [40000, 150000],     tier2: [25000, 90000],      tier3: [12000, 45000],
    note: 'DJ, sound system, live music per function',
  },
  {
    label: 'Baraat (Band/Ghodi/Fireworks)', emoji: '🐴', appCategory: 'Music & Entertainment',
    metro:  [60000, 220000],     tier2: [35000, 130000],     tier3: [15000, 60000],
    note: 'Baraat band, ghodi/car, fireworks/sparklers',
  },
  {
    label: 'Mehandi',            emoji: '🪷', appCategory: 'Mehandi',
    metro:  [20000, 70000],      tier2: [10000, 40000],      tier3: [5000, 20000],
    note: 'Bridal + family mehandi',
  },
  {
    label: 'Makeup & Hair',      emoji: '💄', appCategory: 'Makeup & Hair',
    metro:  [25000, 90000],      tier2: [14000, 55000],      tier3: [7000, 25000],
    note: 'Bridal makeup + trial, family makeup',
  },
  {
    label: 'Pandit & Ceremonies',emoji: '🪔', appCategory: 'Other',
    metro:  [12000, 45000],      tier2: [7000, 28000],       tier3: [3500, 15000],
    note: 'Pandit, samagri, hawan setup',
  },
  {
    label: 'Invitations & Stationery', emoji: '💌', appCategory: 'Invitations',
    metro:  [15000, 65000],      tier2: [8000, 38000],       tier3: [3500, 18000],
    note: 'Printed cards, digital invites, welcome kits',
  },
  {
    label: 'Transport & Logistics', emoji: '🚌', appCategory: 'Transport',
    metro:  [40000, 150000],     tier2: [22000, 90000],      tier3: [10000, 40000],
    note: 'Guest pickups, baraat vehicles, wedding car',
  },
  {
    label: 'Accommodation',      emoji: '🏨', appCategory: 'Accommodation',
    perPlate: true, accommodation: true,
    metro:  [2800, 6500],        tier2: [1400, 3500],        tier3: [700, 2000],
    note: 'Per outstation guest per night (2 nights avg)',
  },
  {
    label: 'Gifts & Favours',    emoji: '🎁', appCategory: 'Other', perPlate: true,
    metro:  [200, 700],          tier2: [150, 500],           tier3: [80, 300],
    note: 'Return gifts, wedding favours',
  },
  {
    label: 'Miscellaneous (10% buffer)', emoji: '🗂️', appCategory: 'Other',
    metro:  [0, 0],              tier2: [0, 0],               tier3: [0, 0],
    note: 'Always keep 10% for last-minute costs',
  },
]

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

type Mode = 'estimate' | 'allocate'

export default function BudgetCalcClient({
  celebrationId, celebration, functions, budgetItems,
}: {
  celebrationId: string
  celebration: Celebration
  functions: CelebFunction[]
  budgetItems: BudgetItem[]
}) {
  const fnCount = Math.max(functions.length, 1)

  // Estimate mode
  const [mode, setMode] = useState<Mode>('estimate')
  const [guests, setGuests] = useState(celebration.guest_count ?? 150)
  const [guestInput, setGuestInput] = useState(String(celebration.guest_count ?? 150))
  const [cityTier, setCityTier] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [style, setStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [outstation, setOutstation] = useState(25)
  const [copied, setCopied] = useState(false)

  // Allocate mode
  const [budget, setBudget] = useState('')
  const [allocGuests, setAllocGuests] = useState(String(celebration.guest_count ?? 150))
  const [allocCity, setAllocCity] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [allocStyle, setAllocStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [allocOutstation, setAllocOutstation] = useState(25)

  // Tracked amounts from existing budget items, by appCategory
  const trackedByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of budgetItems) {
      map[item.category] = (map[item.category] ?? 0) + (item.estimated ?? 0)
    }
    return map
  }, [budgetItems])
  const totalTracked = Object.values(trackedByCategory).reduce((s, v) => s + v, 0)

  const factor = STYLES.find(s => s.value === style)?.factor ?? 1.0
  const outstationCount = Math.round(guests * outstation / 100)

  // Estimate calculation
  const estimates = useMemo(() => {
    return CATEGORIES.map(cat => {
      if (cat.label.includes('buffer')) {
        // computed after rest
        return { ...cat, min: 0, max: 0, isBuffer: true }
      }
      const [rawMin, rawMax] = cat[cityTier]
      let min = rawMin * factor
      let max = rawMax * factor
      if (cat.perPlate) {
        const count = cat.accommodation ? Math.max(outstationCount, 1) : guests
        min *= count; max *= count
      } else if (cat.perFunction) {
        min *= fnCount; max *= fnCount
      }
      return { ...cat, min: Math.round(min), max: Math.round(max), isBuffer: false }
    })
  }, [guests, cityTier, style, outstation, fnCount, factor, outstationCount])

  // Add 10% buffer based on subtotal
  const subMin = estimates.filter(e => !e.isBuffer).reduce((s, e) => s + e.min, 0)
  const subMax = estimates.filter(e => !e.isBuffer).reduce((s, e) => s + e.max, 0)
  const finalEstimates = estimates.map(e =>
    e.isBuffer ? { ...e, min: Math.round(subMin * 0.1), max: Math.round(subMax * 0.1) } : e
  )
  const totalMin = subMin + Math.round(subMin * 0.1)
  const totalMax = subMax + Math.round(subMax * 0.1)

  // Allocate mode calculation
  const allocFactor = STYLES.find(s => s.value === allocStyle)?.factor ?? 1.0
  const allocGuestsNum = parseInt(allocGuests) || 150
  const allocOutstationCount = Math.max(Math.round(allocGuestsNum * allocOutstation / 100), 1)
  const budgetNum = parseInt(budget.replace(/,/g, '')) || 0

  const allocations = useMemo(() => {
    const midpoints = CATEGORIES.map(cat => {
      if (cat.label.includes('buffer')) return { cat, mid: 0, isBuffer: true }
      const [rawMin, rawMax] = cat[allocCity]
      const mid = ((rawMin + rawMax) / 2) * allocFactor
      let val = mid
      if (cat.perPlate) val = mid * (cat.accommodation ? allocOutstationCount : allocGuestsNum)
      else if (cat.perFunction) val = mid * fnCount
      return { cat, mid: Math.round(val), isBuffer: false }
    })

    const subMid = midpoints.filter(m => !m.isBuffer).reduce((s, m) => s + m.mid, 0)
    const withBuffer = midpoints.map(m =>
      m.isBuffer ? { ...m, mid: Math.round(subMid * 0.1) } : m
    )
    const totalMid = subMid + Math.round(subMid * 0.1)

    return withBuffer.map(({ cat, mid, isBuffer }) => {
      const pct = totalMid > 0 ? Math.round((mid / totalMid) * 100) : 0
      const allocated = totalMid > 0 ? Math.round((mid / totalMid) * budgetNum) : 0
      const perPersonCount = cat.accommodation ? allocOutstationCount : allocGuestsNum
      const perPerson = cat.perPlate ? Math.round(allocated / perPersonCount) : null
      const tracked = trackedByCategory[cat.appCategory] ?? 0
      return { ...cat, mid, pct, allocated, perPerson, isBuffer, tracked, totalMid }
    })
  }, [allocCity, allocStyle, allocGuests, allocOutstation, budgetNum, fnCount, trackedByCategory, allocFactor, allocGuestsNum, allocOutstationCount])

  const allocTotalMid = allocations[0]?.totalMid ?? 0

  function handleGuestInput(val: string) {
    setGuestInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 5000) setGuests(n)
  }

  function copyEstimate() {
    const couple = [celebration.bride_name, celebration.groom_name].filter(Boolean).join(' & ')
    const lines = [
      `Wedding Budget Estimate — ${couple}`,
      `${guests} guests · ${CITY_TIERS.find(c => c.value === cityTier)?.label} · ${STYLES.find(s => s.value === style)?.label} · ${fnCount} functions`,
      `Total: ${fmt(totalMin)} – ${fmt(totalMax)}`,
      '',
      ...finalEstimates.map(e => `${e.emoji} ${e.label}: ${fmt(e.min)} – ${fmt(e.max)}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const health = budgetNum >= allocTotalMid * 1.1 ? 'comfortable'
    : budgetNum >= allocTotalMid * 0.82 ? 'tight'
    : 'low'
  const healthCfg = {
    comfortable: { label: 'Budget looks comfortable ✓', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    tight:       { label: 'Budget is tight — prioritise carefully', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    low:         { label: 'Budget likely insufficient for this scale', cls: 'text-red-700 bg-red-50 border-red-200' },
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}/tools`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" /> Budget Calculator
          </h1>
          <p className="text-xs text-stone-400">
            {functions.length > 0
              ? `${functions.length} functions · ${[celebration.bride_name, celebration.groom_name].filter(Boolean).join(' & ')}`
              : 'Realistic estimates for Indian weddings 2024–25'}
          </p>
        </div>
      </div>

      {/* Existing budget callout */}
      {totalTracked > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            You have <span className="font-bold">{fmt(totalTracked)}</span> already tracked in your budget. Compare below.
          </p>
          <Link href={`/my/${celebrationId}/budget`} className="text-xs text-blue-600 font-medium underline ml-auto flex-shrink-0">View →</Link>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
        <button onClick={() => setMode('estimate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'estimate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          Estimate for me
        </button>
        <button onClick={() => setMode('allocate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'allocate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          I have a budget
        </button>
      </div>

      {/* ── ESTIMATE MODE ── */}
      {mode === 'estimate' && (
        <>
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5">
            {/* Guest count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Guest count</label>
                <input type="number" min={1} max={5000} value={guestInput}
                  onChange={e => handleGuestInput(e.target.value)}
                  className="w-20 text-sm font-bold text-rose-700 text-right border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400" />
              </div>
              <input type="range" min={25} max={2000} step={25} value={guests}
                onChange={e => { setGuests(Number(e.target.value)); setGuestInput(String(e.target.value)) }}
                className="w-full accent-rose-600" />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>25</span><span>500</span><span>1000</span><span>2000</span>
              </div>
            </div>

            {/* Functions info */}
            {functions.length > 0 && (
              <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
                <span className="text-xs text-stone-500">📅 {fnCount} functions detected:</span>
                <div className="flex gap-1 flex-wrap">
                  {functions.map(f => (
                    <span key={f.id} className="text-[10px] bg-white border border-stone-200 rounded-full px-2 py-0.5 text-stone-600">{f.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Outstation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Outstation guests <span className="text-stone-400 font-normal">(need accommodation)</span></label>
                <span className="text-sm font-bold text-rose-700">{outstation}% · {outstationCount} pax</span>
              </div>
              <input type="range" min={0} max={80} step={5} value={outstation}
                onChange={e => setOutstation(Number(e.target.value))}
                className="w-full accent-rose-600" />
            </div>

            {/* City */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">City</label>
              <div className="grid grid-cols-3 gap-2">
                {CITY_TIERS.map(c => (
                  <button key={c.value} onClick={() => setCityTier(c.value as 'metro' | 'tier2' | 'tier3')}
                    className={`text-left p-2.5 rounded-xl border-2 transition-all ${cityTier === c.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className={`text-xs font-bold ${cityTier === c.value ? 'text-rose-700' : 'text-stone-700'}`}>{c.label}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Wedding style</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${style === s.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className="text-xl">{s.emoji}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${style === s.value ? 'text-rose-700' : 'text-stone-600'}`}>{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Total banner */}
          <div className="bg-rose-700 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-rose-200 text-xs font-medium">Estimated total (incl. 10% buffer)</p>
              <p className="text-white text-2xl font-bold mt-0.5">{fmt(totalMin)} – {fmt(totalMax)}</p>
              <p className="text-rose-300 text-xs mt-1">{guests} guests · {fnCount} functions · {CITY_TIERS.find(c => c.value === cityTier)?.label} · {STYLES.find(s => s.value === style)?.label}</p>
            </div>
            <button onClick={copyEstimate}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">Category breakdown</p>
            <div className="divide-y divide-stone-50">
              {finalEstimates.map(e => {
                const tracked = trackedByCategory[e.appCategory] ?? 0
                const pctOfMax = totalMax > 0 ? (e.max / totalMax) * 100 : 0
                return (
                  <div key={e.label} className={`px-5 py-3 ${e.isBuffer ? 'bg-stone-50' : ''}`}>
                    <div className="flex items-start justify-between mb-1.5 gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="text-base flex-shrink-0">{e.emoji}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium leading-tight ${e.isBuffer ? 'text-stone-400 italic' : 'text-stone-700'}`}>{e.label}</p>
                          {e.note && <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{e.note}</p>}
                          {e.perFunction && fnCount > 1 && (
                            <p className="text-[10px] text-rose-500 mt-0.5">× {fnCount} functions</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${e.isBuffer ? 'text-stone-400' : 'text-stone-800'}`}>
                          {fmt(e.min)} – {fmt(e.max)}
                        </p>
                        {tracked > 0 && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">✓ {fmt(tracked)} tracked</p>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all ${e.isBuffer ? 'bg-stone-300' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(pctOfMax, 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── ALLOCATE MODE ── */}
      {mode === 'allocate' && (
        <>
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-1.5">My total budget (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₹</span>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-400 font-medium" />
              </div>
              {budgetNum > 0 && <p className="text-xs text-emerald-600 font-medium mt-1">{fmt(budgetNum)} total</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-stone-700 block mb-1.5">Guest count</label>
                <input type="number" min={1} max={5000} value={allocGuests}
                  onChange={e => setAllocGuests(e.target.value)} placeholder="150"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-stone-700">Outstation %</label>
                  <span className="text-sm font-bold text-emerald-600">{allocOutstation}%</span>
                </div>
                <input type="range" min={0} max={80} step={5} value={allocOutstation}
                  onChange={e => setAllocOutstation(Number(e.target.value))}
                  className="w-full accent-emerald-600 mt-2" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">City</label>
              <div className="grid grid-cols-3 gap-2">
                {CITY_TIERS.map(c => (
                  <button key={c.value} onClick={() => setAllocCity(c.value as 'metro' | 'tier2' | 'tier3')}
                    className={`text-left p-2.5 rounded-xl border-2 transition-all ${allocCity === c.value ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className={`text-xs font-bold ${allocCity === c.value ? 'text-emerald-700' : 'text-stone-700'}`}>{c.label}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Wedding style</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setAllocStyle(s.value)}
                    className={`p-2 rounded-xl border-2 text-center transition-all ${allocStyle === s.value ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className="text-xl">{s.emoji}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${allocStyle === s.value ? 'text-emerald-700' : 'text-stone-600'}`}>{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {budgetNum > 0 ? (
            <>
              {/* Summary */}
              <div className="bg-emerald-700 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-200 text-xs">Your budget</p>
                  <p className="text-white text-2xl font-bold">{fmt(budgetNum)}</p>
                  <p className="text-emerald-300 text-xs mt-1">
                    ≈ {fmt(Math.round(budgetNum / allocGuestsNum))} per guest
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-200 text-xs">Realistic need</p>
                  <p className="text-white text-xl font-bold">{fmt(allocTotalMid)}</p>
                  <p className="text-emerald-300 text-[10px]">{fnCount} functions</p>
                </div>
              </div>

              {/* Health */}
              <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${healthCfg[health].cls}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${health === 'comfortable' ? 'bg-emerald-500' : health === 'tight' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <p className="text-sm font-medium flex-1">{healthCfg[health].label}</p>
                {health !== 'comfortable' && (
                  <p className="text-xs opacity-70 flex-shrink-0">Need: {fmt(allocTotalMid)}</p>
                )}
              </div>

              {/* Allocation table */}
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">
                  Recommended allocation
                </p>
                <div className="divide-y divide-stone-50">
                  {allocations.map(a => {
                    const isLow = !a.isBuffer && a.allocated < a.mid * 0.65
                    return (
                      <div key={a.label} className={`px-5 py-3 ${a.isBuffer ? 'bg-stone-50' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="text-base flex-shrink-0">{a.emoji}</span>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium leading-tight ${a.isBuffer ? 'text-stone-400 italic' : 'text-stone-700'}`}>{a.label}</p>
                              {a.note && <p className="text-[10px] text-stone-400 leading-tight mt-0.5">{a.note}</p>}
                              {a.tracked > 0 && (
                                <p className="text-[10px] text-emerald-600 mt-0.5">✓ {fmt(a.tracked)} already tracked</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${isLow ? 'text-red-600' : a.isBuffer ? 'text-stone-400' : 'text-stone-800'}`}>
                              {fmt(a.allocated)}
                            </p>
                            {a.perPerson && a.allocated > 0 && (
                              <p className="text-[10px] text-stone-400">{fmt(a.perPerson)}/person</p>
                            )}
                            <p className="text-[10px] text-stone-300">typical: {fmt(a.mid)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-400' : a.isBuffer ? 'bg-stone-300' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(a.pct * 3.5, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-[11px] text-stone-400 text-center px-4 leading-relaxed">
                Based on real {CITY_TIERS.find(c => c.value === allocCity)?.label} city costs. Red = budget likely insufficient for that category.
              </p>
            </>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-2xl">
              <p className="text-stone-400 text-sm">Enter your budget above to see allocation</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
