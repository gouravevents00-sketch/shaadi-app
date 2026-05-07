'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Copy, Check, Info, ChevronDown, ChevronUp } from 'lucide-react'

type Celebration = {
  id: string; bride_name: string | null; groom_name: string | null
  guest_count: number | null; city: string | null; venue: string | null
  wedding_style: string | null; event_date: string | null
}
type CelebFunction = { id: string; name: string; date: string; expected_count: number | null }
type BudgetItem = { id: string; category: string; label: string; estimated: number; actual: number | null; status: string }

// ─── Constants ────────────────────────────────────────────────────────────────

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

// Season multiplier by month (1=Jan … 12=Dec)
const SEASON_FACTOR: Record<number, number> = {
  1: 1.2, 2: 1.2, 3: 1.05, 4: 0.95, 5: 0.85, 6: 0.85,
  7: 0.85, 8: 0.85, 9: 0.95, 10: 1.1, 11: 1.2, 12: 1.25,
}
const SEASON_LABEL: Record<number, string> = {
  1: 'Peak season (+20%)', 2: 'Peak season (+20%)', 3: 'Shoulder (+5%)',
  4: 'Off-season (-5%)', 5: 'Off-season (-15%)', 6: 'Off-season (-15%)',
  7: 'Off-season (-15%)', 8: 'Off-season (-15%)', 9: 'Shoulder (-5%)',
  10: 'Pre-peak (+10%)', 11: 'Peak season (+20%)', 12: 'Peak season (+25%)',
}

// Function name → type mapping
function detectFunctionType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('baraat') || n.includes('barat')) return 'baraat'
  if (n.includes('phera') || n.includes('phere') || n.includes('ceremony') || n.includes('nikah')) return 'ceremony'
  if (n.includes('sangeet')) return 'sangeet'
  if (n.includes('reception')) return 'reception'
  if (n.includes('cocktail')) return 'cocktail'
  if (n.includes('mehandi') || n.includes('mehndi')) return 'mehandi'
  if (n.includes('haldi')) return 'haldi'
  if (n.includes('hawan') || n.includes('puja') || n.includes('pooja')) return 'puja'
  if (n.includes('sagai') || n.includes('engagement') || n.includes('ring')) return 'sagai'
  if (n.includes('mayra') || n.includes('vidaai') || n.includes('vidai')) return 'ritual'
  if (n.includes('lunch') || n.includes('dinner') || n.includes('brunch')) return 'meal'
  return 'other'
}

// Per-function decoration multiplier (× base decoration rate)
const DECOR_FACTOR: Record<string, number> = {
  ceremony: 1.6, reception: 1.4, sangeet: 1.2, sagai: 0.9,
  cocktail: 0.8, haldi: 0.6, mehandi: 0.6, ritual: 0.5,
  baraat: 0.3, puja: 0.4, meal: 0.3, other: 0.7,
}

// Per-function entertainment multiplier
const ENTERTAIN_FACTOR: Record<string, number> = {
  sangeet: 2.0, cocktail: 1.8, reception: 1.5, ceremony: 0.2,
  sagai: 0.6, haldi: 0.3, mehandi: 0.4, baraat: 1.0,
  ritual: 0.1, puja: 0.1, meal: 0.3, other: 0.5,
}

// Base costs (traditional style=1.0, before season/style factor)
// [metro_min, metro_max, tier2_min, tier2_max, tier3_min, tier3_max]
const BASE = {
  venue:       { metro: [280000, 800000],  tier2: [140000, 450000],  tier3: [55000, 200000]  },
  cateringPP:  { metro: [1100, 2000],      tier2: [700, 1350],       tier3: [420, 850]        }, // per plate
  decorBase:   { metro: [70000, 220000],   tier2: [40000, 130000],   tier3: [18000, 60000]   }, // per function unit
  entertBase:  { metro: [35000, 110000],   tier2: [20000, 65000],    tier3: [9000, 30000]    }, // per function unit
  baraat:      { metro: [55000, 200000],   tier2: [30000, 110000],   tier3: [14000, 55000]   },
  mehandi:     { metro: [18000, 65000],    tier2: [9000, 38000],     tier3: [4000, 18000]    },
  makeup:      { metro: [22000, 85000],    tier2: [12000, 50000],    tier3: [6000, 22000]    },
  pandit:      { metro: [10000, 40000],    tier2: [6000, 25000],     tier3: [3000, 12000]    },
  clothes:     { metro: [250000, 1400000], tier2: [130000, 700000],  tier3: [60000, 300000]  },
  invites:     { metro: [12000, 55000],    tier2: [7000, 32000],     tier3: [3000, 15000]    },
  transport:   { metro: [35000, 130000],   tier2: [20000, 80000],    tier3: [9000, 35000]    },
  accomPP:     { metro: [2600, 6000],      tier2: [1300, 3200],      tier3: [650, 1800]      }, // per person per night
  gifts:       { metro: [180, 650],        tier2: [130, 450],        tier3: [70, 250]        }, // per guest
}

function getRange(key: keyof typeof BASE, city: 'metro' | 'tier2' | 'tier3'): [number, number] {
  const d = BASE[key][city] as number[]
  return [d[0], d[1]]
}

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

// ─── Derived intelligence from functions ──────────────────────────────────────
function deriveFunctionIntelligence(functions: CelebFunction[]) {
  const types = functions.map(f => ({ ...f, type: detectFunctionType(f.name) }))
  const hasBaraat   = types.some(f => f.type === 'baraat')
  const hasMehandi  = types.some(f => f.type === 'mehandi')
  const hasRituals  = types.some(f => ['ceremony', 'haldi', 'puja', 'ritual'].includes(f.type))
  const hasSangeet  = types.some(f => f.type === 'sangeet')

  // Total decoration = sum of per-function weights
  const totalDecorWeight  = types.reduce((s, f) => s + (DECOR_FACTOR[f.type] ?? 0.7), 0) || 1
  const totalEntertainWeight = types.reduce((s, f) => s + (ENTERTAIN_FACTOR[f.type] ?? 0.5), 0) || 1

  // Days: from earliest to latest function date
  const dates = functions.map(f => new Date(f.date + 'T00:00:00').getTime()).filter(Boolean)
  const nights = dates.length >= 2
    ? Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1
    : 1

  return { types, hasBaraat, hasMehandi, hasRituals, hasSangeet, totalDecorWeight, totalEntertainWeight, nights }
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
  // ── State ──
  const [mode, setMode] = useState<Mode>('estimate')
  const [guests, setGuests] = useState(celebration.guest_count ?? 150)
  const [guestInput, setGuestInput] = useState(String(celebration.guest_count ?? 150))
  const [cityTier, setCityTier] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [style, setStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [outstation, setOutstation] = useState(25)
  const [copied, setCopied] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const [budget, setBudget] = useState('')
  const [allocGuests, setAllocGuests] = useState(String(celebration.guest_count ?? 150))
  const [allocCity, setAllocCity] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [allocStyle, setAllocStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [allocOutstation, setAllocOutstation] = useState(25)

  // ── Derived from celebration data ──
  const eventMonth = celebration.event_date
    ? new Date(celebration.event_date + 'T00:00:00').getMonth() + 1
    : null
  const seasonFactor   = eventMonth ? SEASON_FACTOR[eventMonth] : 1.0
  const seasonLabel    = eventMonth ? SEASON_LABEL[eventMonth] : null
  const venueBooked    = !!celebration.venue
  const styleFactor    = STYLES.find(s => s.value === style)?.factor ?? 1.0
  const outstationCount = Math.round(guests * outstation / 100)

  const intel = useMemo(() => deriveFunctionIntelligence(functions), [functions])

  const trackedByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of budgetItems) {
      map[item.category] = (map[item.category] ?? 0) + (item.estimated ?? 0)
    }
    return map
  }, [budgetItems])
  const totalTracked = Object.values(trackedByCategory).reduce((s, v) => s + v, 0)

  // ── Estimate calculation ──
  const estimates = useMemo(() => {
    const f = styleFactor * seasonFactor
    const city = cityTier
    const nights = intel.nights

    function rng(key: keyof typeof BASE): [number, number] {
      const [mn, mx] = getRange(key, city)
      return [Math.round(mn * f), Math.round(mx * f)]
    }

    const rows: { label: string; emoji: string; min: number; max: number; note: string; appCat: string; sub?: string }[] = []

    // Venue
    const [vMin, vMax] = rng('venue')
    rows.push({
      label: 'Venue & Lawn', emoji: '🏛️', min: vMin, max: vMax, appCat: 'Venue',
      note: venueBooked ? `✓ "${celebration.venue}" already booked` : 'Main venue for all functions',
      sub: venueBooked ? 'booked' : undefined,
    })

    // Catering — per plate
    const [cpMin, cpMax] = getRange('cateringPP', city)
    rows.push({
      label: 'Catering', emoji: '🍽️',
      min: Math.round(cpMin * styleFactor * guests), // no season on food
      max: Math.round(cpMax * styleFactor * guests),
      note: `${guests} guests × ₹${Math.round(cpMin * styleFactor)}–${Math.round(cpMax * styleFactor)}/plate`,
      appCat: 'Catering',
    })

    // Decoration — function-aware
    const [dMin, dMax] = getRange('decorBase', city)
    const decorMin = Math.round(dMin * f * intel.totalDecorWeight)
    const decorMax = Math.round(dMax * f * intel.totalDecorWeight)
    const decorNote = functions.length > 0
      ? intel.types.map(t => `${t.name} (${(DECOR_FACTOR[t.type] ?? 0.7).toFixed(1)}×)`).join(', ')
      : 'Estimated for functions'
    rows.push({ label: 'Decoration & Florals', emoji: '🌸', min: decorMin, max: decorMax, note: decorNote, appCat: 'Decoration' })

    // Entertainment — function-aware
    const [eMin, eMax] = getRange('entertBase', city)
    const entMin = Math.round(eMin * f * intel.totalEntertainWeight)
    const entMax = Math.round(eMax * f * intel.totalEntertainWeight)
    const entNote = functions.length > 0
      ? intel.types.filter(t => ENTERTAIN_FACTOR[t.type] > 0.15).map(t => t.name).join(', ')
      : 'DJ, sound, live music'
    rows.push({ label: 'Music & Entertainment', emoji: '🎵', min: entMin, max: entMax, note: entNote, appCat: 'Music & Entertainment' })

    // Photography
    rows.push({
      label: 'Photography & Video', emoji: '📷',
      min: Math.round(getRange('transport', city)[0] * 2.0 * f),
      max: Math.round(getRange('transport', city)[1] * 2.2 * f),
      note: `${functions.length || 1} day coverage — photo + video`,
      appCat: 'Photography & Video',
    })

    // Clothes & Jewellery
    rows.push({ label: 'Clothes & Jewellery', emoji: '👗', ...rngObj(rng('clothes')), note: 'Bridal lehenga, groom sherwani, jewellery, family outfits', appCat: 'Clothes & Jewellery' })

    // Baraat — only if function detected
    if (intel.hasBaraat) {
      rows.push({ label: 'Baraat (Band / Ghodi / Fireworks)', emoji: '🐴', ...rngObj(rng('baraat')), note: 'Detected: Baraat function', appCat: 'Music & Entertainment' })
    }

    // Mehandi — only if function detected
    if (intel.hasMehandi) {
      rows.push({ label: 'Mehandi Artist', emoji: '🪷', ...rngObj(rng('mehandi')), note: 'Detected: Mehandi function', appCat: 'Mehandi' })
    }

    // Makeup
    rows.push({ label: 'Makeup & Hair', emoji: '💄', ...rngObj(rng('makeup')), note: 'Bridal + trial, family makeup', appCat: 'Makeup & Hair' })

    // Pandit — only if ritual functions
    if (intel.hasRituals) {
      rows.push({ label: 'Pandit & Samagri', emoji: '🪔', ...rngObj(rng('pandit')), note: 'Detected: ritual functions', appCat: 'Other' })
    }

    // Invitations
    rows.push({ label: 'Invitations & Stationery', emoji: '💌', ...rngObj(rng('invites')), note: 'Cards, digital invites, welcome kits', appCat: 'Invitations' })

    // Transport
    rows.push({ label: 'Transport & Logistics', emoji: '🚌', ...rngObj(rng('transport')), note: 'Guest pickups, baraat vehicles, wedding car', appCat: 'Transport' })

    // Accommodation — per person × nights
    const [acMin, acMax] = getRange('accomPP', city)
    rows.push({
      label: 'Accommodation', emoji: '🏨',
      min: Math.round(acMin * f * outstationCount * nights),
      max: Math.round(acMax * f * outstationCount * nights),
      note: `${outstationCount} outstation guests × ${nights} night${nights > 1 ? 's' : ''}`,
      appCat: 'Accommodation',
    })

    // Gifts
    const [gMin, gMax] = getRange('gifts', city)
    rows.push({
      label: 'Return Gifts & Favours', emoji: '🎁',
      min: Math.round(gMin * styleFactor * guests),
      max: Math.round(gMax * styleFactor * guests),
      note: `${guests} guests × ₹${Math.round(gMin * styleFactor)}–${Math.round(gMax * styleFactor)}/guest`,
      appCat: 'Other',
    })

    // Buffer 10%
    const subMin2 = rows.reduce((s, r) => s + r.min, 0)
    const subMax2 = rows.reduce((s, r) => s + r.max, 0)
    rows.push({ label: 'Contingency / Buffer (10%)', emoji: '🗂️', min: Math.round(subMin2 * 0.1), max: Math.round(subMax2 * 0.1), note: 'Always keep buffer for last-minute expenses', appCat: 'Other' })

    return rows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, cityTier, style, outstation, intel, seasonFactor, styleFactor, venueBooked, outstationCount])

  const totalMin = estimates.reduce((s, e) => s + e.min, 0)
  const totalMax = estimates.reduce((s, e) => s + e.max, 0)

  // ── Allocate mode ──
  const allocFactor   = (STYLES.find(s => s.value === allocStyle)?.factor ?? 1.0) * seasonFactor
  const allocGuestsN  = parseInt(allocGuests) || 150
  const allocOutN     = Math.max(Math.round(allocGuestsN * allocOutstation / 100), 1)
  const budgetNum     = parseInt(budget.replace(/,/g, '')) || 0
  const allocIntel    = intel // reuse (same functions)

  const allocations = useMemo(() => {
    // Build same row structure but with allocFactor
    const f = allocFactor
    const city = allocCity
    const nights = allocIntel.nights

    const mids: { label: string; emoji: string; appCat: string; mid: number; note: string }[] = []

    function midOf(key: keyof typeof BASE): number {
      const [mn, mx] = getRange(key, city)
      return Math.round(((mn + mx) / 2) * f)
    }

    mids.push({ label: 'Venue & Lawn', emoji: '🏛️', appCat: 'Venue', mid: midOf('venue'), note: venueBooked ? `"${celebration.venue}" booked` : '' })
    const cpMid = ((getRange('cateringPP', city)[0] + getRange('cateringPP', city)[1]) / 2) * (STYLES.find(s => s.value === allocStyle)?.factor ?? 1.0)
    mids.push({ label: 'Catering', emoji: '🍽️', appCat: 'Catering', mid: Math.round(cpMid * allocGuestsN), note: `${allocGuestsN} guests` })
    const dBase = (getRange('decorBase', city)[0] + getRange('decorBase', city)[1]) / 2
    mids.push({ label: 'Decoration & Florals', emoji: '🌸', appCat: 'Decoration', mid: Math.round(dBase * f * allocIntel.totalDecorWeight), note: '' })
    const eBase = (getRange('entertBase', city)[0] + getRange('entertBase', city)[1]) / 2
    mids.push({ label: 'Music & Entertainment', emoji: '🎵', appCat: 'Music & Entertainment', mid: Math.round(eBase * f * allocIntel.totalEntertainWeight), note: '' })
    const tBase = (getRange('transport', city)[0] + getRange('transport', city)[1]) / 2
    mids.push({ label: 'Photography & Video', emoji: '📷', appCat: 'Photography & Video', mid: Math.round(tBase * 2.1 * f), note: '' })
    mids.push({ label: 'Clothes & Jewellery', emoji: '👗', appCat: 'Clothes & Jewellery', mid: midOf('clothes'), note: '' })
    if (allocIntel.hasBaraat) mids.push({ label: 'Baraat', emoji: '🐴', appCat: 'Music & Entertainment', mid: midOf('baraat'), note: 'Baraat detected' })
    if (allocIntel.hasMehandi) mids.push({ label: 'Mehandi Artist', emoji: '🪷', appCat: 'Mehandi', mid: midOf('mehandi'), note: 'Mehandi detected' })
    mids.push({ label: 'Makeup & Hair', emoji: '💄', appCat: 'Makeup & Hair', mid: midOf('makeup'), note: '' })
    if (allocIntel.hasRituals) mids.push({ label: 'Pandit & Samagri', emoji: '🪔', appCat: 'Other', mid: midOf('pandit'), note: '' })
    mids.push({ label: 'Invitations', emoji: '💌', appCat: 'Invitations', mid: midOf('invites'), note: '' })
    mids.push({ label: 'Transport', emoji: '🚌', appCat: 'Transport', mid: midOf('transport'), note: '' })
    const acMid = (getRange('accomPP', city)[0] + getRange('accomPP', city)[1]) / 2
    mids.push({ label: 'Accommodation', emoji: '🏨', appCat: 'Accommodation', mid: Math.round(acMid * f * allocOutN * nights), note: `${nights}n × ${allocOutN} guests` })
    const gMid = (getRange('gifts', city)[0] + getRange('gifts', city)[1]) / 2
    mids.push({ label: 'Gifts & Favours', emoji: '🎁', appCat: 'Other', mid: Math.round(gMid * (STYLES.find(s => s.value === allocStyle)?.factor ?? 1.0) * allocGuestsN), note: '' })

    const subMid = mids.reduce((s, m) => s + m.mid, 0)
    const bufferMid = Math.round(subMid * 0.1)
    mids.push({ label: 'Contingency Buffer', emoji: '🗂️', appCat: 'Other', mid: bufferMid, note: '10% of total' })

    const totalMid = subMid + bufferMid

    return mids.map(m => {
      const pct = totalMid > 0 ? Math.round((m.mid / totalMid) * 100) : 0
      const allocated = totalMid > 0 ? Math.round((m.mid / totalMid) * budgetNum) : 0
      const tracked = trackedByCategory[m.appCat] ?? 0
      return { ...m, pct, allocated, tracked, totalMid }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocCity, allocStyle, allocGuests, allocOutstation, budgetNum, allocIntel, allocFactor, allocGuestsN, allocOutN, trackedByCategory, venueBooked])

  const allocTotalMid = allocations[0]?.totalMid ?? 0
  const health = budgetNum >= allocTotalMid * 1.1 ? 'comfortable' : budgetNum >= allocTotalMid * 0.8 ? 'tight' : 'low'
  const healthCfg = {
    comfortable: { label: 'Budget looks comfortable ✓', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    tight:       { label: 'Budget is tight — prioritise carefully', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    low:         { label: 'Budget likely insufficient for this scale', cls: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  }

  function handleGuestInput(val: string) {
    setGuestInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 5000) setGuests(n)
  }

  function copyEstimate() {
    const couple = [celebration.bride_name, celebration.groom_name].filter(Boolean).join(' & ')
    const month = eventMonth ? new Date(2024, eventMonth - 1).toLocaleString('en-IN', { month: 'long' }) : ''
    const lines = [
      `Wedding Budget Estimate — ${couple}`,
      `${guests} guests · ${intel.nights} nights · ${CITY_TIERS.find(c => c.value === cityTier)?.label} · ${STYLES.find(s => s.value === style)?.label}${month ? ` · ${month} (${seasonLabel})` : ''}`,
      functions.length ? `Functions: ${intel.types.map(t => t.name).join(', ')}` : '',
      `Total: ${fmt(totalMin)} – ${fmt(totalMax)}`,
      '',
      ...estimates.map(e => `${e.emoji} ${e.label}: ${fmt(e.min)} – ${fmt(e.max)}`),
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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
            Smart estimates using your celebration details
          </p>
        </div>
      </div>

      {/* Intelligence summary chips */}
      <div className="flex flex-wrap gap-2">
        {functions.length > 0 && (
          <span className="text-[11px] bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            📅 {functions.length} functions · {intel.nights} night{intel.nights > 1 ? 's' : ''}
          </span>
        )}
        {seasonLabel && eventMonth && (
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${seasonFactor > 1 ? 'bg-amber-50 border-amber-200 text-amber-700' : seasonFactor < 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
            🗓️ {new Date(2024, eventMonth - 1).toLocaleString('en-IN', { month: 'long' })} — {seasonLabel}
          </span>
        )}
        {venueBooked && (
          <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
            ✓ Venue booked
          </span>
        )}
        {intel.hasBaraat && <span className="text-[11px] bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">🐴 Baraat detected</span>}
        {intel.hasMehandi && <span className="text-[11px] bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">🪷 Mehandi detected</span>}
        {intel.hasSangeet && <span className="text-[11px] bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">🎵 Sangeet detected</span>}
        {intel.hasRituals && <span className="text-[11px] bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">🪔 Rituals detected</span>}
      </div>

      {/* Budget tracker link */}
      {totalTracked > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 flex-1">
            <span className="font-bold">{fmt(totalTracked)}</span> already tracked in your budget
          </p>
          <Link href={`/my/${celebrationId}/budget`} className="text-xs text-blue-600 font-medium underline flex-shrink-0">View →</Link>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
        <button onClick={() => setMode('estimate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'estimate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          Estimate for me
        </button>
        <button onClick={() => setMode('allocate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'allocate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
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

            {/* Outstation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Outstation guests</label>
                <span className="text-sm font-bold text-rose-700">{outstation}% · {outstationCount} pax · {intel.nights}n</span>
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

          {/* Total */}
          <div className="bg-rose-700 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-rose-200 text-xs">Estimated total (incl. 10% buffer)</p>
              <p className="text-white text-2xl font-bold mt-0.5">{fmt(totalMin)} – {fmt(totalMax)}</p>
              <p className="text-rose-300 text-xs mt-1">
                {guests} guests · {intel.nights}n · {CITY_TIERS.find(c => c.value === cityTier)?.label} · {STYLES.find(s => s.value === style)?.label}
                {seasonFactor !== 1 && ` · Season ×${seasonFactor}`}
              </p>
            </div>
            <button onClick={copyEstimate}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">
              Category breakdown
            </p>
            <div className="divide-y divide-stone-50">
              {estimates.map((e, i) => {
                const tracked = trackedByCategory[e.appCat] ?? 0
                const pctOfMax = totalMax > 0 ? (e.max / totalMax) * 100 : 0
                const isBuffer = e.label.includes('Buffer') || e.label.includes('buffer')
                const isExpanded = expandedCat === e.label
                return (
                  <div key={i} className={`${isBuffer ? 'bg-stone-50' : ''}`}>
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : e.label)}
                      className="w-full px-5 py-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="text-base flex-shrink-0">{e.emoji}</span>
                          <p className={`text-sm font-medium leading-tight ${isBuffer ? 'text-stone-400 italic' : 'text-stone-700'}`}>{e.label}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${isBuffer ? 'text-stone-400' : 'text-stone-800'}`}>
                              {fmt(e.min)} – {fmt(e.max)}
                            </p>
                            {tracked > 0 && <p className="text-[10px] text-emerald-600">✓ {fmt(tracked)} tracked</p>}
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-stone-300" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-300" />}
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1 mt-2">
                        <div className={`h-1 rounded-full ${isBuffer ? 'bg-stone-300' : 'bg-rose-400'}`}
                          style={{ width: `${Math.min(pctOfMax, 100)}%` }} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-3 -mt-1">
                        <p className="text-xs text-stone-400 leading-relaxed">{e.note}</p>
                      </div>
                    )}
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
              {budgetNum > 0 && <p className="text-xs text-emerald-600 font-medium mt-1">{fmt(budgetNum)}</p>}
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
                  <span className="text-xs font-bold text-emerald-600">{allocOutstation}% · {intel.nights}n</span>
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
              <div className="bg-emerald-700 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-200 text-xs">Your budget</p>
                  <p className="text-white text-2xl font-bold">{fmt(budgetNum)}</p>
                  <p className="text-emerald-300 text-xs mt-1">≈ {fmt(Math.round(budgetNum / allocGuestsN))}/guest · {intel.nights} night{intel.nights > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-200 text-xs">Realistic need</p>
                  <p className="text-white text-xl font-bold">{fmt(allocTotalMid)}</p>
                  {seasonLabel && <p className="text-emerald-300 text-[10px]">{seasonLabel}</p>}
                </div>
              </div>
              <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${healthCfg[health].cls}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${healthCfg[health].dot}`} />
                <p className="text-sm font-medium flex-1">{healthCfg[health].label}</p>
                {health !== 'comfortable' && <p className="text-xs opacity-70 flex-shrink-0">Need: {fmt(allocTotalMid)}</p>}
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">Recommended allocation</p>
                <div className="divide-y divide-stone-50">
                  {allocations.map((a, i) => {
                    const isLow = a.allocated < a.mid * 0.65 && a.mid > 5000
                    const isBuffer = a.label.includes('Buffer') || a.label.includes('buffer')
                    return (
                      <div key={i} className={`px-5 py-3 ${isBuffer ? 'bg-stone-50' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="text-base flex-shrink-0">{a.emoji}</span>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium leading-tight ${isBuffer ? 'text-stone-400 italic' : 'text-stone-700'}`}>{a.label}</p>
                              {a.note && <p className="text-[10px] text-stone-400 mt-0.5">{a.note}</p>}
                              {a.tracked > 0 && <p className="text-[10px] text-emerald-600 mt-0.5">✓ {fmt(a.tracked)} tracked</p>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={`text-sm font-bold ${isLow ? 'text-red-600' : isBuffer ? 'text-stone-400' : 'text-stone-800'}`}>{fmt(a.allocated)}</p>
                            <p className="text-[10px] text-stone-300">typical: {fmt(a.mid)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${isLow ? 'bg-red-400' : isBuffer ? 'bg-stone-300' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(a.pct * 3.3, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-2xl">
              <p className="text-stone-400 text-sm">Enter your budget above to see allocation</p>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-stone-400 text-center px-4 leading-relaxed">
        Estimates use your {functions.length > 0 ? `${functions.length} functions, ` : ''}{celebration.venue ? 'booked venue, ' : ''}{eventMonth ? `${new Date(new Date().getFullYear(), eventMonth - 1).toLocaleString('en-IN', { month: 'long' })} ${new Date().getFullYear()} season, ` : ''}current market rates.
      </p>
    </div>
  )
}

// helpers
function rngObj(r: [number, number]) { return { min: r[0], max: r[1] } }
