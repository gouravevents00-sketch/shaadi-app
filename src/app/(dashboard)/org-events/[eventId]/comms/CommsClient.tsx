'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Copy, MessageSquare, Mail, Send, Phone, Clock, Users } from 'lucide-react'
import { logComm } from './actions'

type Delegate = { id: string; name: string; phone: string | null; email: string | null; is_vip: boolean; checked_in: boolean; dietary: string | null; organization: string | null }
type Guest = { id: string; name: string; phone: string | null; email: string | null; is_vvip: boolean; checked_in: boolean; category: string | null }
type Volunteer = { id: string; name: string; phone: string | null; email: string | null; role: string | null; zone: string | null; checked_in: boolean }
type LogEntry = { id: string; channel: string; audience_label: string; recipient_count: number; message: string; created_at: string }

type Recipient = { id: string; name: string; phone: string | null; email: string | null; tag?: string }

type Props = {
  eventId: string
  eventName: string
  delegates: Delegate[]
  guests: Guest[]
  volunteers: Volunteer[]
  logs: LogEntry[]
}

const AUDIENCES = [
  { value: 'all_delegates',        label: 'All Delegates' },
  { value: 'vip_delegates',        label: 'VIP Delegates only' },
  { value: 'delegates_not_in',     label: 'Delegates — not checked in' },
  { value: 'delegates_in',         label: 'Delegates — checked in' },
  { value: 'all_guests',           label: 'All Guests' },
  { value: 'vvip_guests',          label: 'VVIP Guests only' },
  { value: 'guests_not_in',        label: 'Guests — not checked in' },
  { value: 'all_volunteers',       label: 'All Volunteers' },
  { value: 'volunteers_not_in',    label: 'Volunteers — not on site' },
  { value: 'everyone',             label: 'Everyone (delegates + guests + volunteers)' },
]

const TEMPLATES = [
  { label: 'Event reminder', text: 'Dear {name},\n\nThis is a reminder that our event is scheduled for today. Please carry your registration confirmation and a valid ID.\n\nSee you there!' },
  { label: 'Check-in open', text: 'Dear {name},\n\nCheck-in is now open at the registration desk. Please proceed to collect your badge and delegate kit.' },
  { label: 'Change of venue', text: 'Dear {name},\n\nImportant: The venue for today\'s session has been changed to [NEW VENUE]. Apologies for the inconvenience. Please update accordingly.' },
  { label: 'Lunch break', text: 'Dear {name},\n\nLunch is now being served at the dining area. Please proceed for the break. Session resumes at [TIME].' },
  { label: 'Thank you', text: 'Dear {name},\n\nThank you for attending [EVENT NAME]. It was a pleasure having you with us. We hope to see you again!' },
]

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Phone,
}

export default function CommsClient({ eventId, eventName, delegates, guests, volunteers, logs }: Props) {
  const [audience, setAudience] = useState('all_delegates')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [logging, setLogging] = useState(false)
  const [logList, setLogList] = useState<LogEntry[]>(logs)

  const recipients = useMemo<Recipient[]>(() => {
    switch (audience) {
      case 'all_delegates':     return delegates.map(d => ({ ...d, tag: d.organization || undefined }))
      case 'vip_delegates':     return delegates.filter(d => d.is_vip).map(d => ({ ...d }))
      case 'delegates_not_in':  return delegates.filter(d => !d.checked_in).map(d => ({ ...d }))
      case 'delegates_in':      return delegates.filter(d => d.checked_in).map(d => ({ ...d }))
      case 'all_guests':        return guests.map(g => ({ ...g }))
      case 'vvip_guests':       return guests.filter(g => g.is_vvip).map(g => ({ ...g }))
      case 'guests_not_in':     return guests.filter(g => !g.checked_in).map(g => ({ ...g }))
      case 'all_volunteers':    return volunteers.map(v => ({ ...v, tag: [v.role, v.zone].filter(Boolean).join(' · ') || undefined }))
      case 'volunteers_not_in': return volunteers.filter(v => !v.checked_in).map(v => ({ ...v }))
      case 'everyone':          return [
        ...delegates.map(d => ({ ...d })),
        ...guests.map(g => ({ ...g })),
        ...volunteers.map(v => ({ ...v })),
      ]
      default: return []
    }
  }, [audience, delegates, guests, volunteers])

  const phones = recipients.map(r => r.phone).filter(Boolean) as string[]
  const emails = recipients.map(r => r.email).filter(Boolean) as string[]

  function copyPhones() {
    if (!phones.length) { toast.error('No phone numbers in this group'); return }
    navigator.clipboard.writeText(phones.join('\n'))
    toast.success(`${phones.length} phone numbers copied`)
  }

  function copyEmails() {
    if (!emails.length) { toast.error('No emails in this group'); return }
    navigator.clipboard.writeText(emails.join(', '))
    toast.success(`${emails.length} emails copied`)
  }

  function applyTemplate(text: string) {
    setMessage(text)
  }

  async function handleLog() {
    if (!message.trim()) { toast.error('Write a message first'); return }
    const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? audience
    setLogging(true)
    const r = await logComm(eventId, {
      channel,
      audience_label: audienceLabel,
      recipient_count: recipients.length,
      message: message.trim(),
    })
    setLogging(false)
    if ('error' in r) { toast.error(r.error); return }
    toast.success('Communication logged')
    setLogList(prev => [{
      id: Date.now().toString(),
      channel,
      audience_label: audienceLabel,
      recipient_count: recipients.length,
      message: message.trim(),
      created_at: new Date().toISOString(),
    }, ...prev])
  }

  const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? audience

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Comms</h1>
        <p className="text-sm text-stone-400 mt-0.5">{eventName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Compose ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-stone-200">
            <CardContent className="pt-5 space-y-4">
              {/* Audience + Channel */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-stone-500">Audience</p>
                  <Select value={audience} onValueChange={v => v && setAudience(v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-stone-500">Channel</p>
                  <Select value={channel} onValueChange={v => v && setChannel(v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipient summary */}
              <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg">
                <Users className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-600">
                  <strong>{recipients.length}</strong> recipients · {phones.length} phones · {emails.length} emails
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={copyPhones} className="flex items-center gap-1 text-xs text-stone-500 hover:text-green-600 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Phones
                  </button>
                  <button onClick={copyEmails} className="flex items-center gap-1 text-xs text-stone-500 hover:text-blue-600 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Emails
                  </button>
                </div>
              </div>

              {/* Templates */}
              <div>
                <p className="text-xs font-medium text-stone-500 mb-2">Templates</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.label}
                      onClick={() => applyTemplate(t.text)}
                      className="text-xs px-2.5 py-1.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-stone-500">Message</p>
                <Textarea
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  placeholder="Type your message here... Use {name} to personalise."
                  rows={6}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-stone-400">{message.length} characters</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyPhones} disabled={!phones.length}>
                    <MessageSquare className="w-4 h-4 mr-1.5 text-green-500" />
                    Copy {phones.length} numbers
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyEmails} disabled={!emails.length}>
                    <Mail className="w-4 h-4 mr-1.5 text-blue-500" />
                    Copy {emails.length} emails
                  </Button>
                </div>
                <Button size="sm" onClick={handleLog} disabled={logging || !message.trim()}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {logging ? 'Logging…' : 'Log communication'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Recipient List ── */}
        <div className="space-y-3">
          <Card className="border-stone-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-stone-700">{audienceLabel}</p>
                <Badge variant="secondary">{recipients.length}</Badge>
              </div>
              {recipients.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">No recipients</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recipients.slice(0, 50).map(r => (
                    <div key={r.id} className="flex items-start gap-2 py-1.5 border-b border-stone-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{r.name}</p>
                        {r.tag && <p className="text-xs text-stone-400 truncate">{r.tag}</p>}
                        <div className="flex gap-2 mt-0.5">
                          {r.phone && <span className="text-xs text-stone-500 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{r.phone}</span>}
                          {r.email && <span className="text-xs text-stone-500 truncate">{r.email}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recipients.length > 50 && (
                    <p className="text-xs text-stone-400 text-center pt-2">+{recipients.length - 50} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Communication Log ── */}
      {logList.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Communication Log</h2>
          <div className="space-y-2">
            {logList.map(log => {
              const Icon = CHANNEL_ICONS[log.channel] ?? MessageSquare
              return (
                <Card key={log.id} className="border-stone-200">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{log.channel}</Badge>
                          <span className="text-sm font-medium text-stone-700">{log.audience_label}</span>
                          <span className="text-xs text-stone-400">· {log.recipient_count} recipients</span>
                        </div>
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{log.message}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-400 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
