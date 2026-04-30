'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, Check, ChevronDown } from 'lucide-react'
import { addMarketplaceVendorToWedding } from './actions'

type Wedding = { id: string; label: string; date: string | null }

export default function AddToEventButton({ vendorId, vendorName, weddings, isLoggedIn }: {
  vendorId: string
  vendorName: string
  weddings: Wedding[]
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <a href={`/login?next=/vendors`}
        className="inline-flex items-center gap-1.5 bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-800 transition-colors">
        <Plus className="w-4 h-4" /> Add to my event
      </a>
    )
  }

  if (added) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-xl">
        <Check className="w-4 h-4" /> Added to event
      </div>
    )
  }

  function handleAdd(weddingId: string) {
    setShowPicker(false)
    startTransition(async () => {
      const res = await addMarketplaceVendorToWedding(vendorId, weddingId)
      if ('error' in res) { toast.error(res.error); return }
      setAdded(true)
      toast.success(`${vendorName} added to your event`)
      setTimeout(() => router.push(`/weddings/${weddingId}/vendors`), 1200)
    })
  }

  // Single wedding — no picker needed
  if (weddings.length === 1) {
    return (
      <button
        disabled={isPending}
        onClick={() => handleAdd(weddings[0].id)}
        className="inline-flex items-center gap-1.5 bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-800 disabled:opacity-60 transition-colors">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add to event
      </button>
    )
  }

  // Multiple weddings — show dropdown
  return (
    <div className="relative">
      <button
        disabled={isPending}
        onClick={() => setShowPicker(s => !s)}
        className="inline-flex items-center gap-1.5 bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-800 disabled:opacity-60 transition-colors">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add to event <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {showPicker && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide px-3 pt-3 pb-1.5">Select event</p>
          {weddings.length === 0 ? (
            <p className="text-sm text-stone-500 px-3 pb-3">No events found. Create a wedding first.</p>
          ) : (
            weddings.map(w => (
              <button key={w.id} onClick={() => handleAdd(w.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-rose-50 transition-colors">
                <p className="text-sm font-medium text-stone-800">{w.label}</p>
                {w.date && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(w.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
