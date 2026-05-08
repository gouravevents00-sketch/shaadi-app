'use client'

import { useState } from 'react'
import { Sparkles, Calculator, FileText, Zap, Clock, Users, Package, BarChart3, BookOpen, Star, Palette, Music, Lock, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import Link from 'next/link'

type Celebration = {
  name: string
  bride_name?: string
  groom_name?: string
  event_date?: string
  city?: string
  wedding_style?: string
}

type Tool = {
  id: string
  icon: React.ElementType
  label: string
  desc: string
  color: string
  iconColor: string
  tag?: string
  href?: string
  action?: () => void
}

type Props = {
  celebrationId: string
  plan: string
  celebration: Celebration
}

function parseMessage(raw: string): { text: string; options: string[] } {
  const match = raw.match(/\[OPTIONS:\s*([\s\S]+?)\]\s*$/)
  if (!match) return { text: raw.trim(), options: [] }
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean)
  const text = raw.slice(0, match.index).trim()
  return { text, options }
}

export default function ToolsClient({ celebrationId, plan }: Props) {
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({})
  const isPro = plan === 'pro'

  async function handleFeedback(msgIndex: number, rating: 'up' | 'down') {
    if (feedback[msgIndex]) return
    setFeedback(prev => ({ ...prev, [msgIndex]: rating }))
    const aiMessage = aiMessages[msgIndex]?.content ?? ''
    const userMessage = aiMessages[msgIndex - 1]?.content ?? ''
    await fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: celebrationId, entity_type: 'celebration', user_message: userMessage, ai_message: aiMessage, rating }),
    }).catch(() => null)
  }

  async function handleAiSend(overrideMsg?: string) {
    const userMsg = (overrideMsg ?? aiInput).trim()
    if (!userMsg || aiLoading) return
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: celebrationId,
          entityType: 'celebration',
          message: userMsg,
          history: aiMessages.slice(-10),
        }),
      })
      if (!res.ok) throw new Error('API error')
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let reply = ''
      setAiMessages(prev => [...prev, { role: 'assistant', content: '' }])
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          reply += decoder.decode(value, { stream: true })
          setAiMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: reply }
            return updated
          })
        }
      }
      if (!reply) setAiMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Kuch problem aayi, dobara try karo.' }; return u })
    } catch {
      setAiMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Kuch problem aayi, dobara try karo.' }; return u
        }
        return [...prev, { role: 'assistant', content: 'Kuch problem aayi, dobara try karo.' }]
      })
    } finally {
      setAiLoading(false)
    }
  }

  const tools: Tool[] = [
    {
      id: 'ai', icon: Sparkles, label: 'Utsav AI', desc: 'Ask anything — budget tips, vendor advice, rituals, crisis help',
      color: 'bg-purple-50 border-purple-100', iconColor: 'text-purple-500 bg-purple-100', tag: 'Pro',
    },
    {
      id: 'budget-calc', icon: Calculator, label: 'Budget Calculator', desc: 'Smart estimates using your functions, season & venue data',
      color: 'bg-emerald-50 border-emerald-100', iconColor: 'text-emerald-500 bg-emerald-100', tag: 'Pro',
      href: `/my/${celebrationId}/tools/budget-calc`,
    },
    {
      id: 'show-flow', icon: Clock, label: 'Show Flow Builder', desc: 'Build a minute-by-minute event schedule',
      color: 'bg-blue-50 border-blue-100', iconColor: 'text-blue-500 bg-blue-100',
      href: `/my/${celebrationId}/tools/show-flow`,
    },
    {
      id: 'doc-gen', icon: FileText, label: 'Document Generator', desc: 'Generate vendor agreement, invitation text & more',
      color: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-500 bg-amber-100', tag: 'Pro',
      href: `/my/${celebrationId}/tools/docs`,
    },
    {
      id: 'seating', icon: Users, label: 'Seating Planner', desc: 'Arrange tables and assign guests to seats',
      color: 'bg-rose-50 border-rose-100', iconColor: 'text-rose-500 bg-rose-100', tag: 'Soon',
    },
    {
      id: 'packing', icon: Package, label: 'Packing Checklist', desc: 'Never forget trousseau, puja items, travel essentials',
      color: 'bg-stone-50 border-stone-200', iconColor: 'text-stone-500 bg-stone-100', tag: 'Soon',
    },
    {
      id: 'analytics', icon: BarChart3, label: 'Wedding Analytics', desc: 'RSVP trends, budget burn rate, timeline health',
      color: 'bg-indigo-50 border-indigo-100', iconColor: 'text-indigo-500 bg-indigo-100', tag: 'Soon',
    },
    {
      id: 'vows', icon: BookOpen, label: 'Vow Writer', desc: 'AI-assisted personalized wedding vows',
      color: 'bg-pink-50 border-pink-100', iconColor: 'text-pink-500 bg-pink-100', tag: 'Soon',
    },
    {
      id: 'vendor-rate', icon: Star, label: 'Vendor Rate Card', desc: 'Market price benchmarks for your city',
      color: 'bg-yellow-50 border-yellow-100', iconColor: 'text-yellow-500 bg-yellow-100', tag: 'Soon',
    },
    {
      id: 'theme', icon: Palette, label: 'Theme Inspiration', desc: 'Color palettes, decor ideas by wedding style',
      color: 'bg-fuchsia-50 border-fuchsia-100', iconColor: 'text-fuchsia-500 bg-fuchsia-100', tag: 'Soon',
    },
    {
      id: 'playlist', icon: Music, label: 'Music Playlist Planner', desc: 'Curate function-wise playlists',
      color: 'bg-teal-50 border-teal-100', iconColor: 'text-teal-500 bg-teal-100', tag: 'Soon',
    },
    {
      id: 'timeline', icon: Zap, label: 'D-Day Timeline', desc: 'Hour-by-hour master schedule for the big day',
      color: 'bg-orange-50 border-orange-100', iconColor: 'text-orange-500 bg-orange-100', tag: 'Soon',
    },
  ]

  const [showAiPanel, setShowAiPanel] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-stone-800">Tools</p>
        <p className="text-xs text-stone-400">Smart utilities to make planning easier</p>
      </div>

      {/* AI Panel — full screen overlay */}
      {showAiPanel && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <p className="text-sm font-semibold text-stone-800">Utsav AI</p>
            </div>
            <div className="flex items-center gap-2">
              {aiMessages.length > 0 && (
                <button
                  onClick={() => { setAiMessages([]); setAiInput(''); setFeedback({}) }}
                  className="text-[10px] text-purple-400 hover:text-purple-600 border border-purple-100 hover:border-purple-300 px-2.5 py-1 rounded-full transition-colors"
                >
                  New chat
                </button>
              )}
              <button onClick={() => setShowAiPanel(false)} className="text-stone-400 hover:text-stone-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {aiMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <Sparkles className="w-10 h-10 text-purple-200 mb-3" />
                <p className="text-stone-600 text-sm font-medium">Kya jaanna chahte ho?</p>
                <p className="text-stone-400 text-xs mt-1 mb-5">Budget, vendors, rituals, checklist — kuch bhi</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Budget estimate karo', 'Haldi ke liye kya chahiye', 'Vendor red flags', 'Kya baaki hai abhi'].map(q => (
                    <button key={q} onClick={() => setAiInput(q)}
                      className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {aiMessages.map((m, i) => {
              const parsed = m.role === 'assistant' ? parseMessage(m.content) : null
              const isLast = i === aiMessages.length - 1
              return (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-purple-700 text-white rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
                    {parsed ? parsed.text : m.content}
                  </div>
                  {/* Quick reply chips */}
                  {parsed && parsed.options.length > 0 && isLast && !aiLoading && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                      {parsed.options.map(opt => (
                        <button key={opt}
                          onClick={() => handleAiSend(opt)}
                          className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors">
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Feedback */}
                  {m.role === 'assistant' && parsed?.text && !aiLoading && (
                    <div className="flex gap-1 mt-1 px-1">
                      <button onClick={() => handleFeedback(i, 'up')} className={`p-1 rounded transition-colors ${feedback[i] === 'up' ? 'text-emerald-500' : 'text-stone-300 hover:text-stone-500'}`}>
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleFeedback(i, 'down')} className={`p-1 rounded transition-colors ${feedback[i] === 'down' ? 'text-rose-400' : 'text-stone-300 hover:text-stone-500'}`}>
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-stone-100 p-3 flex gap-2 flex-shrink-0 bg-white">
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
              placeholder="Kuch bhi poocho…"
              className="flex-1 text-sm px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={() => handleAiSend()}
              disabled={!aiInput.trim() || aiLoading}
              className="bg-purple-700 text-white px-3.5 py-2.5 rounded-xl hover:bg-purple-800 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tools grid — hidden when AI panel is open */}
      <div className={`grid grid-cols-1 gap-2 ${showAiPanel ? 'hidden' : ''}`}>
        {tools.map(tool => {
          const isComingSoon = tool.tag === 'Soon'
          const isLocked = tool.tag === 'Pro' && !isPro

          const content = (
            <div className={`relative flex items-center gap-3 p-4 border rounded-xl transition-all ${tool.color} ${isComingSoon || isLocked ? 'opacity-70' : 'hover:shadow-sm cursor-pointer'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.iconColor}`}>
                <tool.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-800">{tool.label}</p>
                  {tool.tag && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${tool.tag === 'AI' ? 'bg-purple-200 text-purple-700' : tool.tag === 'Pro' ? 'bg-amber-200 text-amber-700' : 'bg-stone-200 text-stone-500'}`}>
                      {tool.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{tool.desc}</p>
              </div>
              {isLocked && (
                <Lock className="w-4 h-4 text-stone-400 flex-shrink-0" />
              )}
            </div>
          )

          if (isComingSoon) return <div key={tool.id}>{content}</div>
          if (isLocked) return <div key={tool.id} onClick={() => setUpgradeModal(tool.id)}>{content}</div>
          if (tool.id === 'ai') return <div key={tool.id} onClick={() => isPro && setShowAiPanel(v => !v)}>{content}</div>
          if (tool.href) return <Link key={tool.id} href={tool.href}>{content}</Link>
          return <div key={tool.id}>{content}</div>
        })}
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4" onClick={() => setUpgradeModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${upgradeModal === 'ai' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                {upgradeModal === 'ai'
                  ? <Sparkles className="w-6 h-6 text-purple-600" />
                  : <Calculator className="w-6 h-6 text-emerald-600" />
                }
              </div>
              <button onClick={() => setUpgradeModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {upgradeModal === 'ai' ? (
              <>
                <div>
                  <p className="text-base font-bold text-stone-900">Utsav AI is a Pro feature</p>
                  <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                    India&apos;s smartest event planning AI — budget advice, vendor tips, crisis help, ritual guidance, and live updates to your checklist & guests.
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    'Understands your exact wedding — functions, venue, guests',
                    'Can update tasks, RSVP, vendors directly from chat',
                    'Crisis playbooks for real event-day situations',
                    'Hinglish support — talks like a friend, not a bot',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-stone-600">
                      <span className="text-purple-500 mt-0.5 flex-shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full bg-purple-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-800 transition-colors">
                  Upgrade to Pro
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-base font-bold text-stone-900">Budget Calculator is a Pro feature</p>
                  <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                    Get smart cost estimates that factor in your functions, season, venue, city, and guest count — all in one place.
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    'Function-aware decoration & catering costs',
                    'Season multipliers (peak vs off-season)',
                    'Multi-day & destination wedding logic',
                    '"I have a budget" allocation mode',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-stone-600">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                  Upgrade to Pro
                </button>
              </>
            )}
            <button onClick={() => setUpgradeModal(null)} className="w-full text-xs text-stone-400 hover:text-stone-600 text-center">
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
