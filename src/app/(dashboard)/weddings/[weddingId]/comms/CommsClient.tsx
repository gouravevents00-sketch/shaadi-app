'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Copy, ExternalLink, Clock, Trash2, Users, User, ChevronDown, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logCommunication, deleteComm } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Wedding {
  bride_name: string; groom_name: string; wedding_date: string | null
  primary_venue: string | null; primary_city: string | null
}
interface Guest {
  id: string; name: string; phone: string | null; email: string | null
  side: string; rsvp_status: string; is_vip: boolean
}
interface Event { id: string; name: string; date: string; start_time: string; venue: string }
interface Comm {
  id: string; channel: string; recipient_type: string; event_id: string | null
  guest_id: string | null; subject: string | null; body: string; sent_at: string | null; created_at: string
}

// ─── Templates ────────────────────────────────────────────────────────────────

function buildTemplates(wedding: Wedding, events: Event[]) {
  const venue = wedding.primary_venue ?? 'the venue'
  const city = wedding.primary_city ?? ''
  const couple = `${wedding.bride_name} & ${wedding.groom_name}`
  const date = wedding.wedding_date
    ? new Date(wedding.wedding_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'the wedding day'

  const eventList = events.map(e => {
    const t = e.start_time.slice(0, 5)
    const d = new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    return `• ${e.name} — ${d} at ${t}`
  }).join('\n')

  return [
    {
      name: 'Welcome & schedule',
      body: `Dear {name},\n\nWelcome to the celebrations of ${couple}! 🎉\n\nHere's the schedule of events:\n${eventList || '• Details to follow'}\n\nVenue: ${venue}${city ? `, ${city}` : ''}\n\nLooking forward to celebrating with you!\n\nWarm regards,\nWedding Team`,
    },
    {
      name: 'Event reminder',
      body: `Dear {name},\n\nThis is a friendly reminder that *{eventName}* is scheduled for *{eventDate}* at *{eventTime}*.\n\nVenue: {eventVenue}\n\nPlease arrive 15–20 minutes early.\n\nSee you there! 🙏`,
    },
    {
      name: 'Venue directions',
      body: `Dear {name},\n\nHere are the directions to ${venue}${city ? `, ${city}` : ''}:\n\n📍 [Add Google Maps link]\n\nFor any assistance, please call the coordinator.\n\nThank you!`,
    },
    {
      name: 'Room details',
      body: `Dear {name},\n\nYour accommodation details for the ${couple} wedding:\n\n🏨 Hotel: ${venue}\n🚪 Room: [Room number]\n📅 Check-in: [Date] | Check-out: [Date]\n\nAmenities include [list]. For any queries, please contact the front desk.\n\nSee you soon! 😊`,
    },
    {
      name: 'Transport / pickup info',
      body: `Dear {name},\n\nYour transport details for the wedding:\n\n🚌 Pickup from: [Location]\n⏰ Pickup time: [Time]\n📞 Driver contact: [Number]\n\nPlease be ready 10 minutes before the scheduled time.\n\nThank you!`,
    },
    {
      name: 'Day-of update',
      body: `Dear {name},\n\nQuick update — *{eventName}* will begin at *{time}* today.\n\nPlease make your way to ${venue}.\n\nThank you for your patience! 🙏`,
    },
    {
      name: 'Thank you',
      body: `Dear {name},\n\nThank you so much for being part of the ${couple} wedding celebrations! 🎊\n\nYour presence made the occasion truly special. We hope you had a wonderful time and will cherish these memories for years to come.\n\nWith love & gratitude 💕`,
    },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_STYLE: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  sms:      'bg-blue-100 text-blue-700',
  email:    'bg-purple-100 text-purple-700',
}

const CHANNEL_ICON: Record<string, string> = {
  whatsapp: '💬', sms: '📱', email: '✉️',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtEventDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CommsClient({ weddingId, wedding, guests, events, initialComms }: {
  weddingId: string
  wedding: Wedding
  guests: Guest[]
  events: Event[]
  initialComms: Comm[]
}) {
  const [tab, setTab] = useState<'compose' | 'history'>('compose')
  const [comms, setComms] = useState<Comm[]>(initialComms)

  // Compose state
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp')
  const [recipientType, setRecipientType] = useState<'all' | 'attending' | 'event' | 'vip' | 'individual'>('all')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedGuestId, setSelectedGuestId] = useState<string>('')
  const [guestSearch, setGuestSearch] = useState('')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [logging, setLogging] = useState(false)
  const [sent, setSent] = useState(false)

  const templates = useMemo(() => buildTemplates(wedding, events), [wedding, events])

  // Resolved recipients
  const recipients = useMemo(() => {
    if (recipientType === 'all') return guests
    if (recipientType === 'attending') return guests.filter(g => g.rsvp_status === 'attending')
    if (recipientType === 'vip') return guests.filter(g => g.is_vip)
    if (recipientType === 'individual') return guests.filter(g => g.id === selectedGuestId)
    if (recipientType === 'event') {
      // All guests for now (event-specific guest filtering needs guest_events table)
      return guests
    }
    return guests
  }, [guests, recipientType, selectedGuestId])

  const withPhone = recipients.filter(g => g.phone)
  const withEmail = recipients.filter(g => g.email)

  // WhatsApp link for individual
  const waLink = useMemo(() => {
    if (recipientType !== 'individual' || !selectedGuestId || !body) return null
    const guest = guests.find(g => g.id === selectedGuestId)
    if (!guest?.phone) return null
    const phone = guest.phone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    const personalised = body.replace('{name}', guest.name)
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(personalised)}`
  }, [recipientType, selectedGuestId, body, guests])

  // Filtered guests for search
  const filteredGuests = useMemo(() =>
    guests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase())).slice(0, 8),
  [guests, guestSearch])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function applyTemplate(t: { name: string; body: string }) {
    setBody(t.body)
    setSubject(t.name)
  }

  function handleCopy() {
    if (!body) return
    navigator.clipboard.writeText(body)
    toast.success('Copied to clipboard')
  }

  async function handleMarkSent() {
    if (!body.trim()) { toast.error('Write a message first'); return }
    setLogging(true)
    const r = await logCommunication(weddingId, {
      channel,
      recipient_type: recipientType,
      event_id: recipientType === 'event' ? selectedEventId || null : null,
      guest_id: recipientType === 'individual' ? selectedGuestId || null : null,
      subject: subject || null,
      body,
    })
    setLogging(false)
    if ('error' in r && r.error) { toast.error(r.error); return }
    const newComm: Comm = {
      id: r.id!, channel, recipient_type: recipientType,
      event_id: recipientType === 'event' ? selectedEventId || null : null,
      guest_id: recipientType === 'individual' ? selectedGuestId || null : null,
      subject: subject || null, body, sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    setComms(prev => [newComm, ...prev])
    setSent(true)
    toast.success('Logged as sent')
    setTimeout(() => { setSent(false); setBody(''); setSubject('') }, 2000)
  }

  async function handleDelete(commId: string) {
    setComms(prev => prev.filter(c => c.id !== commId))
    await deleteComm(weddingId, commId)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Comms</h1>
          <p className="text-sm text-stone-400 mt-0.5">{guests.length} guests · {guests.filter(g => g.phone).length} with phone</p>
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {(['compose', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {t}{t === 'history' && comms.length > 0 && <span className="ml-1.5 text-xs text-stone-400">{comms.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── COMPOSE ─────────────────────────────────────────────────────────── */}
      {tab === 'compose' && (
        <div className="space-y-5">

          {/* Channel */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Channel</p>
            <div className="flex gap-2">
              {(['whatsapp', 'sms', 'email'] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    channel === ch ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}>
                  <span>{CHANNEL_ICON[ch]}</span>
                  <span className="capitalize">{ch}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Recipients</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {([
                { key: 'all',        label: `All guests (${guests.length})` },
                { key: 'attending',  label: `Attending (${guests.filter(g => g.rsvp_status === 'attending').length})` },
                { key: 'vip',        label: `VIP (${guests.filter(g => g.is_vip).length})` },
                { key: 'event',      label: 'By event' },
                { key: 'individual', label: 'Individual' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setRecipientType(key)}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                    recipientType === key ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Event picker */}
            {recipientType === 'event' && (
              <div className="flex gap-2 flex-wrap">
                {events.map(ev => (
                  <button key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                    className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                      selectedEventId === ev.id ? 'border-rose-600 bg-rose-50 text-rose-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}>
                    {ev.name} · {fmtEventDate(ev.date)}
                  </button>
                ))}
              </div>
            )}

            {/* Individual guest picker */}
            {recipientType === 'individual' && (
              <div className="relative">
                <input
                  value={guestSearch}
                  onChange={e => setGuestSearch(e.target.value)}
                  placeholder="Search guest name…"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                />
                {guestSearch && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {filteredGuests.map(g => (
                      <button key={g.id} onClick={() => { setSelectedGuestId(g.id); setGuestSearch(g.name) }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50 text-left ${selectedGuestId === g.id ? 'bg-rose-50' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-medium text-stone-600 flex-shrink-0">
                          {g.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-800">{g.name}</p>
                          <p className="text-xs text-stone-400">{g.phone ?? 'No phone'}</p>
                        </div>
                        {g.phone && <span className="text-xs text-green-500">WhatsApp ready</span>}
                      </button>
                    ))}
                    {filteredGuests.length === 0 && <p className="px-3 py-2 text-sm text-stone-400">No guests found</p>}
                  </div>
                )}
              </div>
            )}

            {/* Recipient count summary */}
            {recipientType !== 'individual' && (
              <p className="text-xs text-stone-400 mt-2">
                {withPhone.length} with phone · {withEmail.length} with email
                {channel === 'whatsapp' && withPhone.length < recipients.length && (
                  <span className="text-amber-500"> · {recipients.length - withPhone.length} missing phone number</span>
                )}
              </p>
            )}
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Templates</p>
            <div className="flex gap-2 flex-wrap">
              {templates.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 hover:border-stone-300 transition-colors">
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message compose */}
          <div>
            {channel === 'email' && (
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject…"
                className="w-full border border-stone-200 rounded-t-xl border-b-0 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:ring-inset"
              />
            )}
            <div className="relative">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                placeholder={`Write your ${channel} message here…\n\nUse {name} to personalise with guest name.`}
                className={`w-full border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none font-mono leading-relaxed ${
                  channel === 'email' ? 'rounded-b-xl' : 'rounded-xl'
                }`}
              />
              {body && (
                <div className="absolute bottom-3 right-3 text-xs text-stone-300">{body.length} chars</div>
              )}
            </div>

            {/* Placeholder hint */}
            {body.includes('{') && (
              <div className="mt-1.5 flex gap-2 flex-wrap">
                {['{name}', '{eventName}', '{eventDate}', '{eventTime}', '{eventVenue}', '{time}'].map(p => body.includes(p) && (
                  <span key={p} className="text-[11px] px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-full">{p} — fill before sending</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!body}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
            </Button>

            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-green-700 border-green-200 hover:bg-green-50">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open WhatsApp
                </Button>
              </a>
            )}

            {channel === 'whatsapp' && recipientType !== 'individual' && withPhone.length > 0 && (
              <button
                onClick={() => {
                  const lines = withPhone.map(g => {
                    const phone = g.phone!.replace(/\D/g, '')
                    const full = phone.startsWith('91') ? phone : `91${phone}`
                    return `wa.me/${full}`
                  }).join('\n')
                  navigator.clipboard.writeText(lines)
                  toast.success(`${withPhone.length} WhatsApp links copied`)
                }}
                className="text-xs text-green-600 hover:text-green-800 underline transition-colors">
                Copy {withPhone.length} WhatsApp links
              </button>
            )}

            <div className="ml-auto">
              <Button
                size="sm"
                className={sent ? 'bg-green-600 hover:bg-green-600' : 'bg-rose-700 hover:bg-rose-800'}
                onClick={handleMarkSent}
                disabled={!body.trim() || logging}
              >
                {sent ? <><CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Logged!</> : logging ? 'Saving…' : <><Clock className="w-3.5 h-3.5 mr-1.5" /> Mark as sent</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORY ─────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {comms.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
              <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">No messages logged yet</p>
              <p className="text-stone-400 text-sm mt-1">Compose and mark messages as sent to track them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comms.map(c => {
                const event = events.find(e => e.id === c.event_id)
                const guest = guests.find(g => g.id === c.guest_id)
                return (
                  <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-4 group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${CHANNEL_STYLE[c.channel] ?? 'bg-stone-100 text-stone-600'}`}>
                          {CHANNEL_ICON[c.channel]} {c.channel}
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          {c.recipient_type === 'individual' && guest
                            ? <><User className="w-3 h-3" /> {guest.name}</>
                            : c.recipient_type === 'event' && event
                            ? <><Users className="w-3 h-3" /> {event.name}</>
                            : <><Users className="w-3 h-3" /> {c.recipient_type === 'attending' ? 'Attending guests' : c.recipient_type === 'vip' ? 'VIP guests' : 'All guests'}</>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{c.sent_at ? fmtDate(c.sent_at) : fmtDate(c.created_at)}</span>
                        <button onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {c.subject && <p className="text-sm font-semibold text-stone-800 mb-1">{c.subject}</p>}
                    <p className="text-sm text-stone-600 whitespace-pre-wrap line-clamp-3">{c.body}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { navigator.clipboard.writeText(c.body); toast.success('Copied') }}
                        className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors">
                        <Copy className="w-3 h-3" /> Copy again
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
