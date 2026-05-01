'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, X, CheckCircle2, Gift } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitEarlyBird } from '@/app/for-agencies/early-bird-action'

export default function EarlyBirdBanner({
  userName,
  userEmail,
  celebrationName,
}: {
  userName?: string | null
  userEmail?: string | null
  celebrationName?: string | null
}) {
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(userName ?? '')
  const [email, setEmail] = useState(userEmail ?? '')
  const [phone, setPhone] = useState('')

  if (dismissed) return null

  async function handleSubmit() {
    setLoading(true)
    const res = await submitEarlyBird({ name, email, phone, celebrationName: celebrationName ?? undefined })
    setLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    setDone(true)
  }

  return (
    <>
      <div className="mx-4 mt-4 bg-gradient-to-r from-rose-700 to-rose-600 rounded-xl px-4 py-3 flex items-center gap-3">
        <Gift className="w-4 h-4 text-rose-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Early Bird Offer — 50% off first year</p>
          <p className="text-rose-200 text-xs mt-0.5">Lock in founder pricing before launch. Limited spots.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs bg-white text-rose-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
        >
          Claim offer
        </button>
        <button onClick={() => setDismissed(true)} className="text-rose-300 hover:text-white transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v && done) setDismissed(true) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-600" />
              {done ? 'You\'re on the list!' : 'Claim early bird offer'}
            </DialogTitle>
          </DialogHeader>

          {done ? (
            <div className="py-4 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-stone-700 font-medium">We&apos;ll reach out within 24 hours</p>
              <p className="text-sm text-stone-400">Watch for a WhatsApp message from us with your exclusive pricing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-rose-50 rounded-lg p-3 text-sm text-rose-700">
                <p className="font-semibold">50% off — ₹749/year</p>
                <p className="text-xs text-rose-500 mt-0.5">Instead of ₹1,499/year · Locked for life</p>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Your name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">WhatsApp number *</label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
          )}

          <DialogFooter>
            {!done && (
              <Button
                onClick={handleSubmit}
                disabled={loading || !name || !email || !phone}
                className="bg-rose-700 hover:bg-rose-800"
              >
                {loading ? 'Submitting…' : 'Claim my spot'}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setOpen(false); if (done) setDismissed(true) }}>
              {done ? 'Done' : 'Maybe later'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
