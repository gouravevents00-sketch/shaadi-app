'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Sparkles, Copy, Check, Download, Loader2 } from 'lucide-react'

type Vendor = { id: string; name: string; category: string; contact_name: string | null; phone: string | null }
type CelebFunction = { id: string; name: string; date: string; start_time: string | null }
type Celebration = Record<string, unknown>

const DOC_TYPES = [
  {
    id: 'vendor_agreement',
    label: 'Vendor Agreement',
    emoji: '📝',
    desc: 'Formal agreement with scope, payment terms & cancellation policy',
    fields: ['vendor_name', 'service', 'amount', 'advance', 'special_terms'],
  },
  {
    id: 'invitation_text',
    label: 'Invitation Text',
    emoji: '💌',
    desc: 'Formal wedding invitation for card printing or WhatsApp',
    fields: ['style'],
  },
  {
    id: 'vow_draft',
    label: 'Wedding Vows',
    emoji: '💍',
    desc: 'Personalised wedding vows — traditional, modern, or poetic',
    fields: ['who', 'style'],
  },
  {
    id: 'vendor_brief',
    label: 'Vendor Brief Email',
    emoji: '📧',
    desc: 'Professional email briefing a vendor about your event',
    fields: ['vendor_name', 'service', 'special_instructions'],
  },
  {
    id: 'rsvp_message',
    label: 'RSVP WhatsApp Message',
    emoji: '💬',
    desc: 'Short, warm message to send guests for RSVP confirmation',
    fields: ['tone'],
  },
  {
    id: 'thankyou_note',
    label: 'Thank You Note',
    emoji: '🙏',
    desc: 'Post-wedding thank you message for guests and vendors',
    fields: ['recipient'],
  },
  {
    id: 'day_checklist',
    label: 'Day-Of Checklist',
    emoji: '✅',
    desc: 'Detailed checklist of tasks for the wedding day',
    fields: ['function_name'],
  },
  {
    id: 'vendor_call_script',
    label: 'Vendor Call Script',
    emoji: '📞',
    desc: 'Script + questions to ask when calling a vendor for the first time',
    fields: ['service'],
  },
]

export default function DocGenClient({ celebrationId, celebration, vendors, functions }: {
  celebrationId: string
  celebration: Celebration
  vendors: Vendor[]
  functions: CelebFunction[]
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const brideName = (celebration.bride_name as string) ?? ''
  const groomName = (celebration.groom_name as string) ?? ''
  const eventDate = (celebration.event_date as string) ?? ''
  const city = (celebration.city as string) ?? ''
  const venue = (celebration.venue as string) ?? ''
  const guestCount = (celebration.guest_count as number) ?? null

  const coupleInfo = [brideName, groomName].filter(Boolean).join(' & ')
  const dateStr = eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const functionsList = functions.map(f => {
    const d = f.date ? new Date(f.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
    return `${f.name}${d ? ` (${d})` : ''}`
  }).join(', ')

  const docType = DOC_TYPES.find(d => d.id === selected)

  function selectDoc(id: string) {
    setSelected(id)
    setFields({})
    setOutput('')
  }

  function setField(k: string, v: string) {
    setFields(f => ({ ...f, [k]: v }))
  }

  async function generate() {
    if (!selected) return
    setLoading(true)
    setOutput('')

    const contextSuffix = [
      coupleInfo,
      dateStr,
      venue ? `Venue: ${venue}` : '',
      city,
      functionsList ? `Functions: ${functionsList}` : '',
      guestCount ? `${guestCount} guests` : '',
    ].filter(Boolean).join(' · ')

    let prompt = ''

    if (selected === 'vendor_agreement') {
      prompt = `Generate a professional vendor agreement in English for an Indian wedding.
Couple: ${coupleInfo}
Event date: ${dateStr}${city ? `, ${city}` : ''}${venue ? ` at ${venue}` : ''}
${functionsList ? `Functions: ${functionsList}` : ''}
Vendor name: ${fields.vendor_name ?? ''}
Service: ${fields.service ?? ''}
Total amount: ₹${fields.amount ?? ''}
Advance paid: ₹${fields.advance ?? ''}
Special terms: ${fields.special_terms ?? 'None'}
Include: scope of work, payment schedule, cancellation policy (advance non-refundable), force majeure clause, dispute resolution. Format as a formal document with numbered sections and blank lines for signatures.`

    } else if (selected === 'invitation_text') {
      prompt = `Write a beautiful ${fields.style ?? 'traditional'} Indian wedding invitation in English (with a touch of Hindi for warmth).
Couple: ${coupleInfo}
Date: ${dateStr}
Venue: ${venue || 'TBD'}
City: ${city || ''}
${functionsList ? `Functions/events: ${functionsList}` : ''}
${guestCount ? `Approximately ${guestCount} guests` : ''}
Style: ${fields.style === 'modern' ? 'contemporary and stylish' : fields.style === 'poetic' ? 'poetic and lyrical' : fields.style === 'simple' ? 'simple and clean' : 'elegant and traditional'}
Make it heartfelt, warm, and complete. If there are multiple functions, mention them.`

    } else if (selected === 'vow_draft') {
      const forPerson = fields.who === 'groom' ? (groomName || 'the groom') : (brideName || 'the bride')
      const toPartner = fields.who === 'groom' ? (brideName || 'the bride') : (groomName || 'the groom')
      prompt = `Write personalised wedding vows for ${forPerson} addressed to ${toPartner}.
Style: ${fields.style ?? 'romantic and heartfelt'}
Keep it personal, genuine, about 150-200 words. Include a mix of promises and feelings. End with a memorable line. Write in first person.`

    } else if (selected === 'vendor_brief') {
      prompt = `Write a professional and warm briefing email to a vendor for an Indian wedding.
From: ${coupleInfo}
To vendor: ${fields.vendor_name ?? 'Vendor'}
Service: ${fields.service ?? ''}
Event date: ${dateStr}${venue ? ` at ${venue}` : ''}${city ? `, ${city}` : ''}
${functionsList ? `Functions they need to cover: ${functionsList}` : ''}
${guestCount ? `Guest count: approximately ${guestCount}` : ''}
Special instructions: ${fields.special_instructions ?? 'None'}
Include event overview, what we need from them, timeline expectations, logistics, and a [placeholder] for contact info. Tone: professional yet warm. Add a clear call to action at the end.`

    } else if (selected === 'rsvp_message') {
      prompt = `Write a short, warm WhatsApp message to send to wedding guests for RSVP.
Wedding: ${coupleInfo}
Date: ${dateStr}
Venue: ${venue || 'TBD'}${city ? `, ${city}` : ''}
${functionsList ? `Events: ${functionsList}` : ''}
Tone: ${fields.tone ?? 'warm and friendly'}
Keep it under 100 words. Include a clear call to action to confirm attendance with a deadline. Make it feel personal, not like a broadcast.`

    } else if (selected === 'thankyou_note') {
      prompt = `Write a heartfelt thank you note from ${coupleInfo} after their wedding.
For: ${fields.recipient ?? 'guests'}
${venue ? `Venue was: ${venue}` : ''}
Make it warm, personal, about 80-120 words. Express gratitude for their presence, blessings, and any gifts. ${fields.recipient === 'vendors' ? 'Mention their professional contribution made the day special.' : ''}`

    } else if (selected === 'day_checklist') {
      const fnName = fields.function_name || (functions[0]?.name ?? 'Wedding day')
      prompt = `Create a detailed day-of checklist for the "${fnName}" function of ${coupleInfo}'s wedding.
Date: ${dateStr}
Venue: ${venue || 'TBD'}${city ? `, ${city}` : ''}
${guestCount ? `Guest count: ${guestCount}` : ''}
${functionsList ? `All functions: ${functionsList}` : ''}
Format as a numbered checklist grouped by time of day (morning, 2-3 hours before, 1 hour before, during, after). Include tasks for couple, family, and vendors. Cover: venue setup, vendor check-ins, décor, catering, sound, photography, logistics, emergency kit.`

    } else if (selected === 'vendor_call_script') {
      prompt = `Write a vendor call script and checklist of questions for hiring a ${fields.service ?? 'wedding vendor'} for an Indian wedding.
Couple: ${coupleInfo}
Event date: ${dateStr}${city ? `, ${city}` : ''}${venue ? ` at ${venue}` : ''}
${functionsList ? `Functions: ${functionsList}` : ''}
${guestCount ? `Guest count: ${guestCount}` : ''}
Include: opening introduction, key questions to ask (availability, packages, experience, deliverables, payment terms, cancellations, references), red flags to watch for, and how to close the call. Format with clear sections.`
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: `Wedding document generation for ${contextSuffix}` }),
      })
      const data = await res.json()
      setOutput(data.reply ?? 'Could not generate. Please try again.')
    } catch {
      setOutput('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadOutput() {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docType?.label ?? 'document'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}/tools`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" /> Document Generator
          </h1>
          <p className="text-xs text-stone-400">AI-powered documents using your celebration details</p>
        </div>
      </div>

      {/* Context chips */}
      {(coupleInfo || functionsList || venue) && (
        <div className="flex flex-wrap gap-2">
          {coupleInfo && <span className="text-[11px] bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">💑 {coupleInfo}</span>}
          {dateStr && <span className="text-[11px] bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">📅 {dateStr}</span>}
          {venue && <span className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">✓ {venue}</span>}
          {functions.length > 0 && <span className="text-[11px] bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{functions.length} functions</span>}
        </div>
      )}

      {/* Doc type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DOC_TYPES.map(doc => (
          <button key={doc.id} onClick={() => selectDoc(doc.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${selected === doc.id ? 'border-amber-500 bg-amber-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{doc.emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${selected === doc.id ? 'text-amber-800' : 'text-stone-800'}`}>{doc.label}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-snug">{doc.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Fields */}
      {docType && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700">{docType.emoji} {docType.label}</p>

          {docType.fields.includes('vendor_name') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Vendor name</label>
              <div className="flex gap-2">
                <input value={fields.vendor_name ?? ''} onChange={e => setField('vendor_name', e.target.value)}
                  placeholder="e.g. Sharma Photography Studio"
                  className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400" />
                {vendors.length > 0 && (
                  <select onChange={e => {
                    const v = vendors.find(vv => vv.id === e.target.value)
                    if (v) { setField('vendor_name', v.name); setField('service', v.category) }
                  }} className="text-xs border border-stone-200 rounded-xl px-2 py-2 focus:outline-none text-stone-500">
                    <option value="">From my vendors</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {docType.fields.includes('service') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Service / category</label>
              <input value={fields.service ?? ''} onChange={e => setField('service', e.target.value)}
                placeholder="e.g. Photography & Videography"
                className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400" />
            </div>
          )}

          {docType.fields.includes('amount') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Total amount (₹)</label>
                <input type="number" value={fields.amount ?? ''} onChange={e => setField('amount', e.target.value)}
                  placeholder="150000"
                  className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Advance paid (₹)</label>
                <input type="number" value={fields.advance ?? ''} onChange={e => setField('advance', e.target.value)}
                  placeholder="50000"
                  className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400" />
              </div>
            </div>
          )}

          {docType.fields.includes('special_terms') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Special terms / notes (optional)</label>
              <textarea value={fields.special_terms ?? ''} onChange={e => setField('special_terms', e.target.value)}
                placeholder="Any specific deliverables, clauses, or requirements…"
                rows={2}
                className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none" />
            </div>
          )}

          {docType.fields.includes('special_instructions') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Special instructions</label>
              <textarea value={fields.special_instructions ?? ''} onChange={e => setField('special_instructions', e.target.value)}
                placeholder="Anything specific you want them to know…"
                rows={2}
                className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none" />
            </div>
          )}

          {docType.fields.includes('style') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Style</label>
              <div className="flex gap-2 flex-wrap">
                {(selected === 'invitation_text'
                  ? ['traditional', 'modern', 'poetic', 'simple']
                  : ['romantic', 'funny', 'poetic', 'simple & heartfelt']
                ).map(s => (
                  <button key={s} onClick={() => setField('style', s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${fields.style === s ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {docType.fields.includes('who') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Vows for</label>
              <div className="flex gap-2">
                {['bride', 'groom'].map(w => (
                  <button key={w} onClick={() => setField('who', w)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${fields.who === w ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                    {w === 'bride' ? `💐 Bride${brideName ? ` (${brideName})` : ''}` : `🤵 Groom${groomName ? ` (${groomName})` : ''}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {docType.fields.includes('tone') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Tone</label>
              <div className="flex gap-2 flex-wrap">
                {['warm & friendly', 'formal', 'funny', 'heartfelt'].map(t => (
                  <button key={t} onClick={() => setField('tone', t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${fields.tone === t ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {docType.fields.includes('recipient') && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Thank you note for</label>
              <div className="flex gap-2 flex-wrap">
                {['guests', 'vendors', 'family', 'friends'].map(r => (
                  <button key={r} onClick={() => setField('recipient', r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${fields.recipient === r ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {docType.fields.includes('function_name') && functions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Which function?</label>
              <div className="flex gap-2 flex-wrap">
                {functions.map(fn => (
                  <button key={fn.id} onClick={() => setField('function_name', fn.name)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${fields.function_name === fn.name ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                    {fn.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">{docType?.label}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyOutput}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-600 border border-stone-200 bg-white px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={downloadOutput}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
          <div className="p-5">
            <pre className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed font-sans">{output}</pre>
          </div>
          <div className="px-5 pb-4">
            <button onClick={generate} disabled={loading}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1 disabled:opacity-50">
              <Sparkles className="w-3 h-3" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
