'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Plus, Trash2, Copy, Check, GripVertical, Download } from 'lucide-react'

type CelebFunction = { id: string; name: string; date: string; start_time: string | null }
type FlowItem = { id: string; time: string; duration: number; activity: string; who: string; notes: string }

function newItem(time = '10:00'): FlowItem {
  return { id: crypto.randomUUID(), time, duration: 30, activity: '', who: '', notes: '' }
}

function addMinutes(timeStr: string, mins: number) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

const QUICK_ACTIVITIES = [
  'Guest arrival', 'Baraat entry', 'Jaimala / Varmala', 'Pheras / Saat Phere',
  'Sindoor ceremony', 'Vidaai', 'Lunch / Dinner', 'Cake cutting',
  'Welcome speech', 'First dance / Sangeet performance', 'DJ / Dance floor',
  'Haldi application', 'Mehandi application', 'Photo session',
  'Stage setup / Decoration check', 'Vendor briefing',
]

export default function ShowFlowClient({ celebrationId, celebration, functions }: {
  celebrationId: string
  celebration: { id: string; bride_name: string | null; groom_name: string | null }
  functions: CelebFunction[]
}) {
  const [selectedFn, setSelectedFn] = useState<CelebFunction | null>(functions[0] ?? null)
  const [items, setItems] = useState<FlowItem[]>([newItem(functions[0]?.start_time?.slice(0, 5) ?? '10:00')])
  const [copied, setCopied] = useState(false)
  const [autoTime, setAutoTime] = useState(true)
  const [showQuick, setShowQuick] = useState<string | null>(null)

  function addItem() {
    const last = items[items.length - 1]
    const nextTime = last ? addMinutes(last.time, last.duration) : '10:00'
    setItems(prev => [...prev, newItem(nextTime)])
  }

  function updateItem(id: string, key: keyof FlowItem, value: string | number) {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it
      const updated = { ...it, [key]: value }
      return updated
    }))
    // auto-cascade times
    if (autoTime && key === 'duration') {
      setItems(prev => {
        const idx = prev.findIndex(it => it.id === id)
        if (idx < 0) return prev
        const newItems = [...prev]
        newItems[idx] = { ...newItems[idx], duration: value as number }
        for (let i = idx + 1; i < newItems.length; i++) {
          newItems[i] = { ...newItems[i], time: addMinutes(newItems[i - 1].time, newItems[i - 1].duration) }
        }
        return newItems
      })
    }
  }

  function deleteItem(id: string) {
    setItems(prev => {
      const filtered = prev.filter(it => it.id !== id)
      if (autoTime) {
        return filtered.map((it, i) => i === 0 ? it : { ...it, time: addMinutes(filtered[i - 1].time, filtered[i - 1].duration) })
      }
      return filtered
    })
  }

  function copyFlow() {
    const title = selectedFn ? `Show Flow — ${selectedFn.name}` : 'Show Flow'
    const couple = [celebration.bride_name, celebration.groom_name].filter(Boolean).join(' & ')
    const lines = [
      title,
      couple,
      selectedFn?.date ? new Date(selectedFn.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      '',
      ...items.map(it => [
        `${fmt12(it.time)} (${it.duration}min)  ${it.activity || '—'}`,
        it.who ? `  → ${it.who}` : '',
        it.notes ? `  Note: ${it.notes}` : '',
      ].filter(Boolean).join('\n')),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadFlow() {
    const title = selectedFn ? `Show Flow — ${selectedFn.name}` : 'Show Flow'
    const couple = [celebration.bride_name, celebration.groom_name].filter(Boolean).join(' & ')
    const lines = [
      title, couple,
      selectedFn?.date ? new Date(selectedFn.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      '',
      ...items.map(it => [
        `${fmt12(it.time)} (${it.duration}min)  ${it.activity || '—'}`,
        it.who ? `  Responsible: ${it.who}` : '',
        it.notes ? `  Notes: ${it.notes}` : '',
      ].filter(Boolean).join('\n')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `show-flow-${selectedFn?.name ?? 'event'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalDuration = items.reduce((s, it) => s + it.duration, 0)
  const endTime = items.length ? addMinutes(items[items.length - 1].time, items[items.length - 1].duration) : '—'

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}/tools`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Show Flow Builder
          </h1>
          <p className="text-xs text-stone-400">Minute-by-minute event schedule</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyFlow}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-600 border border-stone-200 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy
          </button>
          <button onClick={downloadFlow}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Function selector */}
      {functions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {functions.map(fn => (
            <button key={fn.id} onClick={() => setSelectedFn(fn)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${selectedFn?.id === fn.id ? 'bg-blue-700 text-white border-blue-700' : 'border-stone-200 text-stone-600 hover:border-blue-300'}`}>
              {fn.name}
            </button>
          ))}
        </div>
      )}

      {/* Settings */}
      <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-stone-700">Auto-cascade times</p>
          <p className="text-[11px] text-stone-400">When you change duration, times below auto-update</p>
        </div>
        <button onClick={() => setAutoTime(v => !v)}
          className={`w-10 h-5 rounded-full transition-colors relative ${autoTime ? 'bg-blue-600' : 'bg-stone-200'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoTime ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 text-center">
        <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl py-3">
          <p className="text-lg font-bold text-blue-700">{items.length}</p>
          <p className="text-[11px] text-blue-500">items</p>
        </div>
        <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl py-3">
          <p className="text-lg font-bold text-blue-700">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</p>
          <p className="text-[11px] text-blue-500">total duration</p>
        </div>
        <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl py-3">
          <p className="text-lg font-bold text-blue-700">{items.length ? fmt12(items[items.length - 1].time) : '—'}</p>
          <p className="text-[11px] text-blue-500">ends at</p>
        </div>
      </div>

      {/* Flow items */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {/* Time bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border-b border-stone-100">
              <GripVertical className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
              <span className="text-xs font-bold text-blue-700 w-16 flex-shrink-0">{fmt12(item.time)}</span>
              <div className="flex items-center gap-1 flex-1">
                <input type="time" value={item.time}
                  onChange={e => updateItem(item.id, 'time', e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 w-28" />
                <span className="text-stone-400 text-xs">for</span>
                <input type="number" min={5} max={480} step={5} value={item.duration}
                  onChange={e => updateItem(item.id, 'duration', parseInt(e.target.value) || 30)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 w-16 text-center" />
                <span className="text-stone-400 text-xs">min</span>
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-stone-300 hover:text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              <div className="relative">
                <input
                  value={item.activity}
                  onChange={e => updateItem(item.id, 'activity', e.target.value)}
                  onFocus={() => setShowQuick(item.id)}
                  onBlur={() => setTimeout(() => setShowQuick(null), 200)}
                  placeholder="Activity / Event name"
                  className="w-full text-sm font-medium border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                />
                {showQuick === item.id && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                    {QUICK_ACTIVITIES.filter(a => !item.activity || a.toLowerCase().includes(item.activity.toLowerCase())).map(a => (
                      <button key={a} onMouseDown={() => updateItem(item.id, 'activity', a)}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-stone-50 transition-colors text-stone-700">
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={item.who} onChange={e => updateItem(item.id, 'who', e.target.value)}
                  placeholder="Responsible (MC, Pandit…)"
                  className="text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
                <input value={item.notes} onChange={e => updateItem(item.id, 'notes', e.target.value)}
                  placeholder="Notes"
                  className="text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addItem}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl py-3 text-sm text-stone-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
        <Plus className="w-4 h-4" /> Add item
      </button>
    </div>
  )
}
