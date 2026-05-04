'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Download, Copy, RefreshCw, Palette, Type, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface WeddingEvent {
  id: string; name: string; date: string
  start_time: string | null; venue: string | null; city: string | null
}

// ── Themes ────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'classic',    label: 'Classic Gold',
    bg: '#1a0a00',    primary: '#d4a843',    secondary: '#f5e6c8',
    accent: '#8b6914', font: 'Georgia, serif',
    border: '2px solid #d4a843',
  },
  {
    id: 'blush',      label: 'Blush & Rose',
    bg: '#fff5f5',    primary: '#9f1239',    secondary: '#fecdd3',
    accent: '#e11d48', font: 'Georgia, serif',
    border: '2px solid #fecdd3',
  },
  {
    id: 'navy',       label: 'Royal Navy',
    bg: '#0f172a',    primary: '#e2c87e',    secondary: '#bfdbfe',
    accent: '#93c5fd', font: 'Georgia, serif',
    border: '2px solid #e2c87e',
  },
  {
    id: 'sage',       label: 'Garden Sage',
    bg: '#f0fdf4',    primary: '#166534',    secondary: '#bbf7d0',
    accent: '#16a34a', font: 'Georgia, serif',
    border: '2px solid #bbf7d0',
  },
  {
    id: 'ivory',      label: 'Ivory Minimal',
    bg: '#fafaf9',    primary: '#292524',    secondary: '#e7e5e4',
    accent: '#78716c', font: '"Helvetica Neue", sans-serif',
    border: '1px solid #e7e5e4',
  },
]

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function InviteCardClient({
  weddingId: _weddingId, wedding, events,
}: {
  weddingId: string
  wedding: { bride_name: string | null; groom_name: string | null; wedding_date: string | null; primary_venue: string | null; primary_city: string | null }
  events: WeddingEvent[]
}) {
  const [themeId, setThemeId] = useState('classic')
  const [customText, setCustomText] = useState('With the blessings of our families, we joyfully invite you to celebrate our wedding.')
  const [showEvents, setShowEvents] = useState(true)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const couple = [wedding.bride_name, wedding.groom_name].filter(Boolean).join(' & ') || 'The Couple'
  const venue = [wedding.primary_venue, wedding.primary_city].filter(Boolean).join(', ')

  const cardStyle: React.CSSProperties = {
    background: theme.bg, color: theme.secondary, fontFamily: theme.font,
    border: theme.border, borderRadius: '16px', padding: '40px 32px',
    maxWidth: '480px', width: '100%', margin: '0 auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
  }

  async function handleCopyHTML() {
    if (!cardRef.current) return
    const html = cardRef.current.outerHTML
    await navigator.clipboard.writeText(html)
    setCopied(true)
    toast.success('Card HTML copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadSVGFallback() {
    // Simple text-based download since canvas operations need browser APIs
    const text = `
${couple}
${wedding.wedding_date ? fmtDate(wedding.wedding_date) : ''}
${venue}
${customText}
${showEvents ? events.map(e => `${e.name} | ${fmtDate(e.date)}${e.start_time ? ' · ' + fmtTime(e.start_time) : ''}${e.venue ? ' · ' + e.venue : ''}`).join('\n') : ''}
    `.trim()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${couple.replace(' & ', '-')}-wedding-invite.txt`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Invite text downloaded!')
  }

  const displayedEvents = showEvents ? events : []

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Digital Invite Generator</h1>
        <p className="text-stone-500 text-sm mt-1">Design and share a beautiful digital invitation card</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          {/* Theme */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-rose-500" />
              <p className="text-sm font-semibold text-stone-800">Theme</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setThemeId(t.id)}
                  className={`relative text-xs px-3 py-2.5 rounded-xl border-2 font-medium transition-all text-left ${themeId === t.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                  style={{ background: t.bg, color: t.primary, borderColor: themeId === t.id ? '#e11d48' : t.primary + '40' }}>
                  {themeId === t.id && <Check className="w-3 h-3 absolute top-1.5 right-1.5" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom message */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-rose-500" />
              <p className="text-sm font-semibold text-stone-800">Invitation text</p>
            </div>
            <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={3}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none" />
          </div>

          {/* Options */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-800">Options</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)}
                className="w-4 h-4 accent-rose-600" />
              <span className="text-sm text-stone-600">Show event schedule ({events.length} events)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleCopyHTML}
              className="flex-1 flex items-center justify-center gap-2 text-sm bg-rose-700 text-white px-4 py-2.5 rounded-xl hover:bg-rose-800 transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
            <button onClick={handleDownloadSVGFallback}
              className="flex items-center justify-center gap-2 text-sm border border-stone-200 text-stone-700 px-4 py-2.5 rounded-xl hover:bg-stone-50 transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={() => setThemeId(THEMES[Math.floor(Math.random() * THEMES.length)].id)}
              className="flex items-center justify-center gap-2 text-sm border border-stone-200 text-stone-700 px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-colors"
              title="Random theme">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-400">
            Copy HTML to paste in WhatsApp Web (desktop), email, or your website. For WhatsApp mobile, use Download to get text version.
          </p>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview</p>
          <div ref={cardRef} style={cardStyle}>
            {/* Decorative top border */}
            <div style={{ textAlign: 'center', marginBottom: '8px', color: theme.primary, fontSize: '20px', letterSpacing: '8px' }}>
              ✦ ✦ ✦
            </div>

            {/* Couple names */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', color: theme.accent, marginBottom: '8px' }}>
                You are invited to celebrate
              </p>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary, lineHeight: 1.2, marginBottom: '4px' }}>
                {couple}
              </h2>
              <p style={{ fontSize: '14px', color: theme.accent, letterSpacing: '2px' }}>
                {'— Wedding —'}
              </p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${theme.primary}40`, margin: '20px 0' }} />

            {/* Message */}
            <p style={{ fontSize: '13px', textAlign: 'center', lineHeight: 1.7, color: theme.secondary, opacity: 0.85, marginBottom: '20px', fontStyle: 'italic' }}>
              {customText}
            </p>

            {/* Date & Venue */}
            {wedding.wedding_date && (
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: theme.primary }}>
                  {fmtDate(wedding.wedding_date)}
                </p>
              </div>
            )}
            {venue && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: theme.accent }}>{venue}</p>
              </div>
            )}

            {/* Events schedule */}
            {displayedEvents.length > 0 && (
              <>
                <div style={{ borderTop: `1px solid ${theme.primary}40`, margin: '20px 0' }} />
                <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: theme.accent, textAlign: 'center', marginBottom: '12px' }}>
                  Celebrations
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedEvents.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: theme.primary + '15', border: `1px solid ${theme.primary}30` }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.primary }}>{ev.name}</span>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: theme.secondary }}>{fmtDate(ev.date)}</p>
                        {ev.start_time && <p style={{ fontSize: '11px', color: theme.accent }}>{fmtTime(ev.start_time)}{ev.venue ? ` · ${ev.venue}` : ''}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <div style={{ borderTop: `1px solid ${theme.primary}40`, marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: theme.accent, letterSpacing: '2px' }}>
                ✦ WITH LOVE & JOY ✦
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
