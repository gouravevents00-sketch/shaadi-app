'use client'

import { useState } from 'react'
import { Sparkles, Calculator, FileText, Zap, Clock, Users, Package, BarChart3, BookOpen, Star, Palette, Music, Lock, X } from 'lucide-react'
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

export default function ToolsClient({ celebrationId, plan, celebration }: Props) {
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null)
  const isPro = plan === 'pro'

  async function handleAiSend() {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim()
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setAiLoading(true)
    try {
      const context = `Wedding: ${celebration.name}${celebration.bride_name && celebration.groom_name ? `, ${celebration.bride_name} & ${celebration.groom_name}` : ''}${celebration.event_date ? `, ${new Date(celebration.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}${celebration.city ? `, ${celebration.city}` : ''}`
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context }),
      })
      const data = await res.json()
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I couldn\'t process that.' }])
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  const tools: Tool[] = [
    {
      id: 'ai', icon: Sparkles, label: 'Wedding AI', desc: 'Ask anything — budget tips, checklist, vendor advice',
      color: 'bg-purple-50 border-purple-100', iconColor: 'text-purple-500 bg-purple-100', tag: 'AI',
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

      {/* AI Panel */}
      {showAiPanel && (
        <div className="bg-white border border-purple-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <p className="text-sm font-semibold text-stone-800">Wedding AI</p>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-stone-400 hover:text-stone-600 text-xs">✕</button>
          </div>
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {aiMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-purple-300 mb-2" />
                <p className="text-stone-500 text-sm font-medium">Ready to help</p>
                <p className="text-stone-400 text-xs mt-1">Ask about budget, vendors, rituals, checklist…</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Budget tips for 250 guests', 'Haldi ceremony preparation', 'Vendor payment schedule'].map(q => (
                    <button key={q} onClick={() => { setAiInput(q) }}
                      className="text-[10px] bg-purple-50 text-purple-600 px-2.5 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-purple-700 text-white rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
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
          <div className="border-t border-stone-100 p-3 flex gap-2">
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
              placeholder="Ask anything…"
              className="flex-1 text-sm px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleAiSend}
              disabled={!aiInput.trim() || aiLoading}
              className="bg-purple-700 text-white px-3 py-2 rounded-xl hover:bg-purple-800 disabled:opacity-40 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tools grid */}
      <div className="grid grid-cols-1 gap-2">
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
          if (tool.id === 'ai') return <div key={tool.id} onClick={() => setShowAiPanel(v => !v)}>{content}</div>
          if (tool.href) return <Link key={tool.id} href={tool.href}>{content}</Link>
          return <div key={tool.id}>{content}</div>
        })}
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4" onClick={() => setUpgradeModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-emerald-600" />
              </div>
              <button onClick={() => setUpgradeModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
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
            <button onClick={() => setUpgradeModal(null)} className="w-full text-xs text-stone-400 hover:text-stone-600 text-center">
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
