'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { submitDemoRequest } from './actions'

export default function DemoRequestButton({
  variant = 'outline',
  label = 'Book a demo',
}: {
  variant?: 'outline' | 'filled' | 'white'
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' })

  const cls = {
    outline: 'border-2 border-stone-300 text-stone-700 hover:border-rose-400 hover:text-rose-700 bg-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors inline-flex items-center gap-2',
    filled:  'bg-rose-700 text-white hover:bg-rose-800 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors w-full text-center block',
    white:   'border-2 border-white/30 text-white hover:bg-white/10 text-sm font-semibold px-5 py-3 rounded-xl transition-colors inline-flex items-center gap-2',
  }[variant]

  async function handleSubmit() {
    setLoading(true)
    const res = await submitDemoRequest(form)
    setLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    setDone(true)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={cls}>
        <CalendarDays className="w-4 h-4" /> {label}
      </button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setDone(false); setForm({ name: '', email: '', phone: '', company: '', message: '' }) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{done ? 'Request received!' : 'Book a demo'}</DialogTitle>
          </DialogHeader>

          {done ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-stone-700 font-medium">We&apos;ll reach out within 24 hours</p>
              <p className="text-sm text-stone-400">Check your WhatsApp / email for a confirmation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Your name *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rahul Sharma" />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Agency / Company *</label>
                  <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="EventCraft Pvt Ltd" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rahul@eventcraft.in" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">WhatsApp number *</label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Anything specific you want to see?</label>
                <Input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="e.g. team management, AI assistant..." />
              </div>
            </div>
          )}

          <DialogFooter>
            {!done && (
              <Button
                onClick={handleSubmit}
                disabled={loading || !form.name || !form.email || !form.phone}
                className="bg-rose-700 hover:bg-rose-800"
              >
                {loading ? 'Sending…' : 'Request demo'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>{done ? 'Close' : 'Cancel'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
