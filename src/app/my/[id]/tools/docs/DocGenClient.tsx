'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Sparkles, Copy, Check, Download, Loader2 } from 'lucide-react'

type Vendor = { id: string; name: string; category: string; contact_name: string | null; phone: string | null }
type Celebration = Record<string, unknown>

const DOC_TYPES = [
  {
    id: 'vendor_agreement',
    label: 'Vendor Agreement',
    emoji: '📝',
    desc: 'Formal agreement with scope, payment terms & cancellation policy',
    fields: ['vendor_name', 'service', 'amount', 'advance', 'event_date', 'special_terms'],
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
    fields: ['style', 'who', 'tone'],
  },
  {
    id: 'checklist_email',
    label: 'Vendor Brief Email',
    emoji: '📧',
    desc: 'Professional email briefing a vendor about your event',
    fields: ['vendor_name', 'service', 'event_date', 'special_instructions'],
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
]

export default function DocGenClient({ celebrationId, celebration, vendors }: {
  celebrationId: string
  celebration: Celebration
  vendors: Vendor[]
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

  const docType = DOC_TYPES.find(d => d.id === selected)

  function setField(k: string, v: string) {
    setFields(f => ({ ...f, [k]: v }))
  }

  async function generate() {
    if (!selected) return
    setLoading(true)
    setOutput('')

    const coupleInfo = [brideName, groomName].filter(Boolean).join(' & ')
    const dateStr = eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

    let prompt = ''
    if (selected === 'vendor_agreement') {
      prompt = `Generate a professional vendor agreement in English for an Indian wedding.
Couple: ${coupleInfo}
Event date: ${dateStr}${city ? `, ${city}` : ''}${venue ? `, ${venue}` : ''}
Vendor name: ${fields.vendor_name ?? ''}
Service: ${fields.service ?? ''}
Total amount: ₹${fields.amount ?? ''}
Advance paid: ₹${fields.advance ?? ''}
Special terms: ${fields.special_terms ?? 'None'}
Include: scope of work, payment schedule, cancellation policy (30% advance non-refundable), dispute resolution. Format as a formal document with sections.`
    } else if (selected === 'invitation_text') {
      prompt = `Write a beautiful ${fields.style ?? 'traditional'} Indian wedding invitation in English (with a bit of Hindi for warmth).
Couple: ${coupleInfo}
Date: ${dateStr}
Venue: ${venue || 'TBD'}
City: ${city || ''}
Make it heartfelt, warm, and ${fields.style === 'modern' ? 'contemporary' : 'elegant and traditional'}.`
    } else if (selected === 'vow_draft') {
      prompt = `Write personalised wedding vows for ${fields.who === 'groom' ? groomName || 'the groom' : brideName || 'the bride'}.
Style: ${fields.tone ?? 'romantic and heartfelt'}
Partner's name: ${fields.who === 'groom' ? brideName : groomName}
Keep it personal, genuine, about 150-200 words. Include a mix of promises and feelings. End with a memorable line.`
    } else if (selected === 'checklist_email') {
      prompt = `Write a professional and warm email to a vendor for an Indian wedding.
From: ${coupleInfo}
To vendor: ${fields.vendor_name ?? 'Vendor'}
Service: ${fields.service ?? ''}
Event date: ${dateStr}${venue ? `, ${venue}` : ''}
Special instructions: ${fields.special_instructions ?? 'None'}
Include event overview, what we need from them, logistics, and contact info placeholder. Tone: professional yet warm.`
    } else if (selected === 'rsvp_message') {
      prompt = `Write a short, warm WhatsApp message to send to wedding guests for RSVP.
Wedding: ${coupleInfo}
Date: ${dateStr}
Venue: ${venue || 'TBD'}${city ? `, ${city}` : ''}
Tone: ${fields.tone ?? 'warm and friendly'}
Keep it under 100 words. Include a clear call to action to confirm attendance.`
    } else if (selected === 'thankyou_note') {
      prompt = `Write a heartfelt thank you note from ${coupleInfo} after their wedding.
For: ${fields.recipient ?? 'guests'}
Make it warm, personal, about 80-120 words. Express gratitude for their presence and blessings.`
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: `Wedding document generation for ${coupleInfo}` }),
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
        <div>
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" /> Document Generator
          </h1>
          <p className="text-xs text-stone-400">AI-powered documents for your wedding</p>
        </div>
      </div>

      {/* Doc type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DOC_TYPES.map(doc => (
          <button key={doc.id} onClick={() => { setSelected(doc.id); setOutput('') }}
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
          <p className="text-sm font-semibold text-stone-700">{docType.emoji} {docType.label} — Fill in details</p>

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
                    if (v) {
                      setField('vendor_name', v.name)
                      setField('service', v.category)
                    }
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
                placeholder="Any specific clauses, deliverables, or requirements…"
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
              className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
