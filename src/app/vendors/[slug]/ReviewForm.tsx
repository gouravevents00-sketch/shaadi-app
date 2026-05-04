'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Star, Loader2 } from 'lucide-react'

export default function ReviewForm({ vendorId, vendorSlug }: { vendorId: string; vendorSlug: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { toast.error('Please select a star rating'); return }
    if (!body.trim()) { toast.error('Please write a review'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/vendor-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, rating, title, body }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setSubmitted(true)
      toast.success('Review submitted! It will appear after approval.')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-emerald-700">Thank you for your review!</p>
        <p className="text-xs text-emerald-600 mt-1">It will be visible after our team approves it.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-stone-100 pt-4 space-y-3">
      <p className="text-sm font-semibold text-stone-700">Write a review</p>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button"
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="transition-transform hover:scale-110 active:scale-95">
            <Star className={`w-6 h-6 transition-colors ${
              s <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
            }`} />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-stone-500 ml-2">{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}</span>
        )}
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />

      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
        placeholder="Share your experience — what did they do well?"
        required
        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" />

      <button type="submit" disabled={loading}
        className="flex items-center gap-2 bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Submit review
      </button>
    </form>
  )
}
