'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Sparkles, CalendarDays, Star, Info, Copy, Check, Moon, Sun } from 'lucide-react'
import { Input } from '@/components/ui/input'

// ── Types ─────────────────────────────────────────────────────
type MuhuratResult = {
  muhurat: string          // date string YYYY-MM-DD
  tithi: string
  nakshatra: string
  time_range: string       // e.g. "7:30 AM – 10:15 AM"
  quality: 'excellent' | 'good' | 'average'
  reasons: string[]
  avoid: string[]
  panchangam_notes: string
}

// ── Panchang utility (pure calculation — no external API) ──────
// Simplified Hindu calendar logic: tithi & nakshatra approximation
const TITHIS = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima / Amavasya']
const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']

// Nakshatras considered auspicious for marriage
const AUSPICIOUS_NAKSHATRAS = new Set(['Rohini','Mrigashira','Uttara Phalguni','Hasta','Swati','Anuradha','Uttara Ashadha','Uttara Bhadrapada','Revati'])
// Tithis auspicious for marriage
const AUSPICIOUS_TITHIS = new Set(['Dwitiya','Tritiya','Panchami','Saptami','Dashami','Ekadashi','Trayodashi'])
// Avoid these months (roughly): Adhik maas / Kharmas simplified as Dec-Jan for demo
const AVOID_MONTHS = new Set([0]) // January = index 0 in demo

function computeTithi(date: Date): string {
  // Approximate synodic month calculation
  const refNewMoon = new Date('2024-01-11').getTime()
  const synodic = 29.53058867
  const daysSince = (date.getTime() - refNewMoon) / 86400000
  const tithiIndex = Math.floor(((daysSince % synodic) / synodic) * 30) % 15
  return TITHIS[tithiIndex] ?? TITHIS[0]
}

function computeNakshatra(date: Date): string {
  // Approximate sidereal day calculation
  const refDate = new Date('2024-01-01').getTime()
  const daysSince = (date.getTime() - refDate) / 86400000
  const nIndex = Math.floor(daysSince * (27 / 27.3217)) % 27
  return NAKSHATRAS[Math.abs(nIndex)] ?? NAKSHATRAS[0]
}

function getMuhuratTimes(nakshatra: string): string {
  // Simple lookup — in production this would use Suryodaya calculations
  const map: Record<string, string> = {
    Rohini: '7:00 AM – 11:30 AM',
    Mrigashira: '8:00 AM – 12:00 PM',
    'Uttara Phalguni': '7:30 AM – 10:00 AM',
    Hasta: '9:00 AM – 12:30 PM',
    Swati: '8:30 AM – 11:00 AM',
    Anuradha: '7:00 AM – 9:30 AM',
    'Uttara Ashadha': '8:00 AM – 11:30 AM',
    'Uttara Bhadrapada': '9:30 AM – 12:00 PM',
    Revati: '7:30 AM – 10:30 AM',
  }
  return map[nakshatra] ?? '9:00 AM – 12:00 PM'
}

function scoreMuhurat(date: Date): { quality: MuhuratResult['quality']; reasons: string[]; avoid: string[] } {
  const tithi = computeTithi(date)
  const nakshatra = computeNakshatra(date)
  const day = date.getDay() // 0=Sun, 1=Mon...
  const month = date.getMonth()

  const reasons: string[] = []
  const avoid: string[] = []
  let score = 0

  // Day checks
  if (day === 1 || day === 5 || day === 3) { // Mon, Fri, Wed
    score += 2
    reasons.push(`${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]}day is auspicious for marriage`)
  } else if (day === 6) { // Sat
    avoid.push('Saturday is generally avoided for weddings')
    score -= 1
  }

  // Nakshatra check
  if (AUSPICIOUS_NAKSHATRAS.has(nakshatra)) {
    score += 3
    reasons.push(`${nakshatra} nakshatra is highly auspicious for vivah`)
  } else {
    avoid.push(`${nakshatra} nakshatra is not ideal for marriage`)
    score -= 1
  }

  // Tithi check
  if (AUSPICIOUS_TITHIS.has(tithi)) {
    score += 2
    reasons.push(`${tithi} tithi is shubh for vivah`)
  } else if (tithi === 'Chaturdashi' || tithi === 'Purnima / Amavasya' || tithi === 'Ashtami') {
    avoid.push(`${tithi} is typically avoided`)
    score -= 2
  }

  // Month check
  if (AVOID_MONTHS.has(month)) {
    avoid.push('This month may overlap with Kharmas — verify with pandit')
  }

  // Season bonus (winter weddings in India: Nov-Feb)
  if (month >= 10 || month <= 1) {
    score += 1
    reasons.push('Winter season is preferred for Indian weddings')
  }

  const quality: MuhuratResult['quality'] = score >= 5 ? 'excellent' : score >= 2 ? 'good' : 'average'
  return { quality, reasons, avoid }
}

function generateMuhurats(startDate: string, endDate: string, count: number = 5): MuhuratResult[] {
  const results: MuhuratResult[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const cur = new Date(start)

  while (cur <= end && results.length < count * 3) {
    const tithi = computeTithi(cur)
    const nakshatra = computeNakshatra(cur)
    const { quality, reasons, avoid } = scoreMuhurat(cur)
    const dateStr = cur.toISOString().slice(0, 10)

    results.push({
      muhurat: dateStr,
      tithi,
      nakshatra,
      time_range: getMuhuratTimes(nakshatra),
      quality,
      reasons,
      avoid,
      panchangam_notes: `Tithi: ${tithi} | Nakshatra: ${nakshatra} | Vara: ${['Ravivaar','Somvaar','Mangalvaar','Budhvaar','Guruvaar','Shukravaar','Shanivaar'][cur.getDay()]}`,
    })
    cur.setDate(cur.getDate() + 1)
  }

  // Sort: excellent first, then good, then average
  results.sort((a, b) => {
    const order = { excellent: 0, good: 1, average: 2 }
    return order[a.quality] - order[b.quality]
  })

  return results.slice(0, count)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const QUALITY_STYLE = {
  excellent: { wrap: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: '⭐⭐⭐', label: 'Excellent' },
  good:      { wrap: 'bg-amber-50 border-amber-200',    badge: 'bg-amber-100 text-amber-700',    icon: '⭐⭐',  label: 'Good' },
  average:   { wrap: 'bg-stone-50 border-stone-200',    badge: 'bg-stone-100 text-stone-600',    icon: '⭐',    label: 'Acceptable' },
}

export default function VivekClient() {
  const [form, setForm] = useState({ startDate: '', endDate: '', brideName: '', groomName: '', city: '' })
  const [results, setResults] = useState<MuhuratResult[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleCompute() {
    if (!form.startDate || !form.endDate) { toast.error('Please select a date range'); return }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error('End date must be after start date'); return }
    const daysDiff = (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000
    if (daysDiff > 365) { toast.error('Please keep range within 1 year'); return }

    setLoading(true)
    // Run synchronously — pure computation, no API needed
    setTimeout(() => {
      const muhurats = generateMuhurats(form.startDate, form.endDate, 6)
      setResults(muhurats)
      setLoading(false)
      if (muhurats.length === 0) toast.info('No results in this range — try a wider date range')
      else toast.success(`Found ${muhurats.length} auspicious dates`)
    }, 600) // small delay for UX feel
  }

  async function copyMuhurat(m: MuhuratResult, idx: number) {
    const text = `📅 ${fmtDate(m.muhurat)}\n⏰ ${m.time_range}\n🌟 ${m.nakshatra} Nakshatra · ${m.tithi} Tithi\n✅ ${m.reasons.join(', ')}`
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    toast.success('Muhurat details copied!')
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🔱</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Vivek AI — Muhurat Calculator</h1>
          <p className="text-stone-500 text-sm mt-1">Find shubh vivah muhurats using Panchang: tithi, nakshatra & vara analysis</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Calculations are based on simplified Vedic panchang rules (tithi, nakshatra, vara). Always confirm final muhurat with a qualified pandit/jyotishi for the specific couple's kundli.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-stone-800">Muhurat search parameters</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1.5">Bride name</label>
            <Input value={form.brideName} onChange={e => set('brideName', e.target.value)} placeholder="Priya" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1.5">Groom name</label>
            <Input value={form.groomName} onChange={e => set('groomName', e.target.value)} placeholder="Arjun" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1.5">Search from *</label>
            <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1.5">Search until *</label>
            <Input type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-stone-500 block mb-1.5">City (optional)</label>
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Jaipur, Delhi…" />
          </div>
        </div>
        <button onClick={handleCompute} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Calculating…' : 'Find Shubh Muhurats'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-700">
              {form.brideName && form.groomName ? `Muhurats for ${form.brideName} & ${form.groomName}` : 'Auspicious Dates'}
            </p>
            <p className="text-xs text-stone-400">{results.length} found · sorted by quality</p>
          </div>
          {results.map((m, i) => {
            const style = QUALITY_STYLE[m.quality]
            const dateObj = new Date(m.muhurat + 'T00:00:00')
            const moonPhase = computeTithi(dateObj).includes('Purnima') ? 'full' : computeTithi(dateObj).includes('Amavasya') ? 'new' : 'partial'

            return (
              <div key={m.muhurat} className={`border rounded-2xl overflow-hidden ${style.wrap}`}>
                <div className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-stone-700 shadow-sm">
                        {dateObj.getDate()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-stone-900">{fmtDate(m.muhurat)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                            {style.icon} {style.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-stone-500 flex items-center gap-1">
                            <Sun className="w-3 h-3 text-amber-500" /> {m.time_range}
                          </span>
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <Moon className="w-3 h-3" /> {moonPhase === 'full' ? 'Full moon' : moonPhase === 'new' ? 'New moon' : 'Waxing/waning'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => copyMuhurat(m, i)}
                      className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 flex-shrink-0 mt-0.5 transition-colors">
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Panchang details */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="text-xs bg-white border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
                      🌙 {m.nakshatra}
                    </span>
                    <span className="text-xs bg-white border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
                      📿 {m.tithi}
                    </span>
                  </div>

                  {/* Reasons */}
                  {m.reasons.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      {m.reasons.map((r, ri) => (
                        <p key={ri} className="text-xs text-emerald-700 flex items-center gap-1.5">
                          <Star className="w-3 h-3 flex-shrink-0 fill-emerald-400 text-emerald-400" /> {r}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Avoid notes */}
                  {m.avoid.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {m.avoid.map((a, ai) => (
                        <p key={ai} className="text-xs text-amber-700 flex items-center gap-1.5">
                          <span className="flex-shrink-0">⚠</span> {a}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Panchangam notes */}
                  <p className="mt-2 text-[11px] text-stone-400">{m.panchangam_notes}</p>
                </div>
              </div>
            )
          })}

          <p className="text-xs text-center text-stone-400 pt-2">
            Powered by Vivek AI · Vedic panchang approximation · Confirm with pandit
          </p>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-semibold text-stone-600">Enter a date range to find muhurats</p>
          <p className="text-xs text-stone-400 mt-1">Panchang analysis will show tithi, nakshatra & timing</p>
        </div>
      )}
    </div>
  )
}
