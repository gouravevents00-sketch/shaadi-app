'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, BookTemplate, X } from 'lucide-react'
import { createTemplate, deleteTemplate, addTemplateItem, deleteTemplateItem, type TemplateItem } from './actions'

interface TplItem { id: string; title: string; category: string; side: string }
interface Template { id: string; name: string; items: TplItem[] }

const SIDES = ['shared', 'bride', 'groom']

export default function TemplatesClient({ initTemplates }: { initTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initTemplates)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  // Add item state per template
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<TemplateItem>({ title: '', category: '', side: 'shared' })

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await createTemplate(newName.trim(), [])
    if ('error' in res) { toast.error(res.error); setSaving(false); return }
    setTemplates(t => [...t, { id: res.id, name: newName.trim(), items: [] }])
    setExpanded(res.id)
    setNewName('')
    setShowNew(false)
    setSaving(false)
    toast.success('Template created')
  }

  async function handleDelete(id: string) {
    setTemplates(t => t.filter(x => x.id !== id))
    const res = await deleteTemplate(id)
    if ('error' in res) { toast.error(res.error) }
  }

  async function handleAddItem(templateId: string) {
    if (!newItem.title.trim() || !newItem.category.trim()) return
    const res = await addTemplateItem(templateId, newItem)
    if ('error' in res) { toast.error(res.error); return }
    setTemplates(t => t.map(tpl =>
      tpl.id === templateId
        ? { ...tpl, items: [...tpl.items, { id: res.id, ...newItem }] }
        : tpl
    ))
    setNewItem({ title: '', category: '', side: 'shared' })
    setAddingTo(null)
  }

  async function handleDeleteItem(templateId: string, itemId: string) {
    setTemplates(t => t.map(tpl =>
      tpl.id === templateId ? { ...tpl, items: tpl.items.filter(i => i.id !== itemId) } : tpl
    ))
    const res = await deleteTemplateItem(itemId)
    if ('error' in res) toast.error(res.error)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Checklist Templates</h1>
          <p className="text-sm text-stone-400 mt-0.5">Save reusable task lists for new weddings</p>
        </div>
        <button onClick={() => setShowNew(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 text-white text-sm rounded-lg hover:bg-rose-800">
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {showNew && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Template name (e.g. Standard 3-day wedding)"
            className="flex-1 px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
          <button onClick={handleCreate} disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-rose-700 text-white text-sm rounded-lg hover:bg-rose-800 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
          <button onClick={() => setShowNew(false)} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {templates.length === 0 && !showNew && (
        <div className="text-center py-12 text-stone-400 bg-white border border-stone-200 rounded-xl">
          <BookTemplate className="w-8 h-8 mx-auto mb-3 text-stone-300" />
          <p className="text-sm">No templates yet — create one to reuse across weddings</p>
        </div>
      )}

      <div className="space-y-3">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
                className="flex-1 flex items-center gap-2 text-left">
                {expanded === tpl.id
                  ? <ChevronUp className="w-4 h-4 text-stone-400" />
                  : <ChevronDown className="w-4 h-4 text-stone-400" />}
                <span className="text-sm font-medium text-stone-800">{tpl.name}</span>
                <span className="text-xs text-stone-400 ml-1">{tpl.items.length} tasks</span>
              </button>
              <button onClick={() => handleDelete(tpl.id)} className="text-stone-300 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {expanded === tpl.id && (
              <div className="border-t border-stone-100">
                {/* Items list */}
                {tpl.items.length > 0 && (
                  <div className="divide-y divide-stone-50">
                    {tpl.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-stone-700">{item.title}</span>
                          <span className="text-xs text-stone-400 ml-2">{item.category}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize flex-shrink-0 ${
                          item.side === 'bride' ? 'bg-rose-50 text-rose-600' :
                          item.side === 'groom' ? 'bg-blue-50 text-blue-600' : 'bg-stone-100 text-stone-500'
                        }`}>{item.side}</span>
                        <button onClick={() => handleDeleteItem(tpl.id, item.id)}
                          className="text-stone-300 hover:text-red-400 flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add item form */}
                {addingTo === tpl.id ? (
                  <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 space-y-2">
                    <div className="flex gap-2">
                      <input value={newItem.title} onChange={e => setNewItem(i => ({ ...i, title: e.target.value }))}
                        placeholder="Task title" autoFocus
                        className="flex-1 px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
                      <input value={newItem.category} onChange={e => setNewItem(i => ({ ...i, category: e.target.value }))}
                        placeholder="Category"
                        className="w-32 px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
                      <select value={newItem.side} onChange={e => setNewItem(i => ({ ...i, side: e.target.value }))}
                        className="px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200">
                        {SIDES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddingTo(null)} className="text-sm text-stone-500 px-3 py-1.5">Cancel</button>
                      <button onClick={() => handleAddItem(tpl.id)}
                        disabled={!newItem.title.trim() || !newItem.category.trim()}
                        className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                        Add task
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingTo(tpl.id); setNewItem({ title: '', category: '', side: 'shared' }) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-400 hover:text-stone-600 hover:bg-stone-50 border-t border-stone-100">
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
