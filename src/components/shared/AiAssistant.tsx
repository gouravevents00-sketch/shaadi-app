'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Loader2, ChevronDown } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type EntityType = 'wedding' | 'org_event'

const FALLBACK_SUGGESTIONS: Record<string, string[]> = {
  wedding: [
    'Aaj ka status kya hai?',
    'RSVP pending kaun hain?',
    'Koi overdue payments hain?',
    'Checklist mein kya baaki hai?',
    'Unseated VIP guests kaun hain?',
  ],
  org_event: [
    'Event ka overall status kya hai?',
    'Koi overdue payments hain?',
    'Checklist mein kya pending hai?',
  ],
  conference: [
    'Kitne speakers confirmed hain?',
    'Delegate registrations ka status?',
    'Koi overdue payments hain?',
    'Checklist mein kya pending hai?',
    'Sponsors confirmed hain?',
  ],
  award_ceremony: [
    'VIP guests ka status kya hai?',
    'Run of show ready hai?',
    'Koi overdue payments hain?',
    'Checklist mein kya pending hai?',
  ],
  concert: [
    'Artists ka confirmation status?',
    'Volunteers briefed hain?',
    'Sound & AV vendors confirmed?',
    'Checklist mein kya pending hai?',
    'Koi overdue payments hain?',
  ],
  festival: [
    'Kitne artists confirmed hain?',
    'Volunteer assignments complete hain?',
    'Vendors ka status kya hai?',
    'Checklist mein kya pending hai?',
  ],
  brand_activation: [
    'Promoters ready hain?',
    'Sampling inventory confirm hua?',
    'Checklist mein kya pending hai?',
    'Koi overdue payments hain?',
  ],
  sampling_campaign: [
    'Promoters ready hain?',
    'Inventory dispatch hua?',
    'Checklist mein kya pending hai?',
  ],
  roadshow: [
    'Vehicles confirmed hain?',
    'City-wise schedule ready hai?',
    'Promoters briefed hain?',
    'Checklist mein kya pending hai?',
  ],
  state_function: [
    'VIP protocol list ready hai?',
    'Accommodation confirmed hai?',
    'Checklist mein kya pending hai?',
    'Koi overdue payments hain?',
  ],
  sports: [
    'Volunteers assigned hain?',
    'Timing & registration ready?',
    'Medical team confirmed?',
    'Checklist mein kya pending hai?',
  ],
}

const GREET: Record<string, string> = {
  wedding:    'Give me a quick status summary of this wedding — what needs attention right now?',
  org_event:  'Give me a quick status summary of this event — what needs attention right now?',
  conference: 'Give me a quick status of this conference — speakers, delegates, sponsors status kya hai?',
  concert:    'Give me a quick status of this concert — artists, volunteers, AV vendors ka kya haal hai?',
  festival:   'Give me a quick status of this festival — artists, volunteers, key pending tasks kya hain?',
  brand_activation: 'Give me a quick status of this activation — promoters, inventory, pending tasks kya hain?',
}

function detectEntity(pathname: string): { entityId: string; entityType: EntityType } | null {
  const weddingMatch = pathname.match(/\/weddings\/([a-f0-9-]{36})/)
  if (weddingMatch) return { entityId: weddingMatch[1], entityType: 'wedding' }

  const orgMatch = pathname.match(/\/org-events\/([a-f0-9-]{36})/)
  if (orgMatch) return { entityId: orgMatch[1], entityType: 'org_event' }

  return null
}

function getSuggestionsKey(entityType: EntityType, subType: string | null): string {
  if (entityType === 'wedding') return 'wedding'
  return (subType && FALLBACK_SUGGESTIONS[subType]) ? subType : 'org_event'
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-rose-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-stone-900 text-white rounded-tr-sm'
          : 'bg-white border border-stone-100 text-stone-800 rounded-tl-sm shadow-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

export default function AiAssistant() {
  const pathname = usePathname()
  const entity = detectEntity(pathname)

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [orgSubType, setOrgSubType] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasGreeted = useRef(false)
  const lastEntityId = useRef<string | null>(null)
  const hasFetchedSuggestions = useRef(false)

  // Fetch org event sub_type for personalised suggestions/greet
  useEffect(() => {
    if (!entity || entity.entityType !== 'org_event') { setOrgSubType(null); return }
    fetch(`/api/ai/suggestions?entityId=${entity.entityId}&entityType=org_event&metaOnly=true`)
      .then(r => r.json()).then(d => setOrgSubType(d.subType ?? null)).catch(() => {})
  }, [entity?.entityId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (!entity) return

    // Reset chat when navigating to a different wedding/event
    if (lastEntityId.current && lastEntityId.current !== entity.entityId) {
      setMessages([])
      hasGreeted.current = false
      hasFetchedSuggestions.current = false
      setStreamingText('')
      setSuggestions([])
    }
    lastEntityId.current = entity.entityId

    if (open) {
      const sugKey = getSuggestionsKey(entity.entityType, orgSubType)
      const greetMsg = GREET[orgSubType ?? ''] ?? GREET[entity.entityType]
      if (!hasGreeted.current && messages.length === 0) {
        hasGreeted.current = true
        sendMessage(greetMsg, true)
      }
      if (!hasFetchedSuggestions.current) {
        hasFetchedSuggestions.current = true
        fetch(`/api/ai/suggestions?entityId=${entity.entityId}&entityType=${entity.entityType}`)
          .then(r => r.json())
          .then(d => { if (d.suggestions?.length) setSuggestions(d.suggestions) })
          .catch(() => setSuggestions(FALLBACK_SUGGESTIONS[sugKey]))
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, entity?.entityId, orgSubType])

  if (!entity) return null

  async function sendMessage(text: string, silent = false) {
    if (!entity) return
    if (!silent) setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: entity.entityId,
          entityType: entity.entityType,
          message: text,
          history: messages.slice(-10),
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Kuch error aa gaya, dobara try karo.' }])
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamingText(full)
      }

      setStreamingText('')
      setMessages(prev => [...prev, { role: 'assistant', content: full }])
    } catch {
      setLoading(false)
      setStreamingText('')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text)
  }

  const activeSuggestions = suggestions.length > 0 ? suggestions : FALLBACK_SUGGESTIONS[entity.entityType]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 52, height: 52 }}
        className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-stone-700 scale-90' : 'bg-rose-700 hover:bg-rose-800 hover:scale-105'
        }`}
        aria-label="AI Assistant"
      >
        {open
          ? <ChevronDown className="w-5 h-5 text-white" />
          : <Sparkles className="w-5 h-5 text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] bg-stone-50 rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-rose-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-200" />
              <span className="text-white font-semibold text-sm">
                {entity.entityType === 'wedding' ? 'Wedding AI' : 'Event AI'}
              </span>
              <span className="text-rose-300 text-xs">• Live data</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-rose-200 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            {messages.length === 0 && !loading && !streamingText && (
              <div className="text-center py-6 text-stone-400 text-xs">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-rose-300" />
                <p>Is {entity.entityType === 'wedding' ? 'wedding' : 'event'} ka</p>
                <p>pura data mere paas hai. Kuch bhi pucho!</p>
              </div>
            )}

            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

            {(loading || streamingText) && (
              <div className="flex justify-start mb-3">
                <div className="w-6 h-6 rounded-full bg-rose-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm bg-white border border-stone-100 shadow-sm text-stone-800 whitespace-pre-wrap">
                  {loading && !streamingText
                    ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    : streamingText
                  }
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {activeSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="text-xs bg-white border border-stone-200 text-stone-600 rounded-full px-3 py-1 whitespace-nowrap hover:border-rose-300 hover:text-rose-700 transition-colors flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-stone-200 px-3 py-2.5 flex gap-2 items-center bg-white flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Kuch bhi pucho…"
              disabled={loading}
              className="flex-1 text-sm outline-none bg-transparent placeholder-stone-400 text-stone-900"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full bg-rose-700 flex items-center justify-center disabled:opacity-40 hover:bg-rose-800 transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
