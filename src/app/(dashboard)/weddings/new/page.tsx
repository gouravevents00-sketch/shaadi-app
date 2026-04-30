'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { createWedding } from './actions'

function generateCode(bride: string, groom: string) {
  const b = bride.slice(0, 2).toUpperCase()
  const g = groom.slice(0, 2).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${b}${g}${rand}`
}

export default function NewWeddingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    bride_name: '', groom_name: '',
    date_from: '', date_to: '', wedding_date: '',
    primary_venue: '', primary_city: '', budget_total: '',
  })

  function set(key: string, value: string) {
    setForm(f => {
      const next = { ...f, [key]: value }
      // Auto-set main ceremony date to last day if not set
      if (key === 'date_to' && !f.wedding_date) next.wedding_date = value
      // Auto-set date_from if only one date entered
      if (key === 'date_from' && !f.date_to) next.date_to = value
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const wedding_code = generateCode(form.bride_name, form.groom_name)
    const result = await createWedding({
      bride_name: form.bride_name,
      groom_name: form.groom_name,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
      wedding_date: form.wedding_date || form.date_to || form.date_from || null,
      primary_venue: form.primary_venue || null,
      primary_city: form.primary_city || null,
      budget_total: parseFloat(form.budget_total) || 0,
      wedding_code,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Wedding created! Let\'s set it up.')
      router.push(`/weddings/${result.id}/setup`)
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">New Wedding</h1>
        <p className="text-stone-500 text-sm mt-1">Set up a new wedding project</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wedding Details</CardTitle>
          <CardDescription>Basic info to get started. Everything can be edited later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bride's name *</Label>
                <Input placeholder="e.g. Priya" value={form.bride_name}
                  onChange={e => set('bride_name', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Groom's name *</Label>
                <Input placeholder="e.g. Arjun" value={form.groom_name}
                  onChange={e => set('groom_name', e.target.value)} required />
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <Label>Wedding dates</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-stone-400">First event (pre-wedding starts)</p>
                  <Input type="date" value={form.date_from}
                    onChange={e => set('date_from', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-400">Last event (wedding ends)</p>
                  <Input type="date" value={form.date_to}
                    onChange={e => set('date_to', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-stone-400">Main ceremony date (Pheras / Saat Phere)</p>
                <Input type="date" value={form.wedding_date}
                  onChange={e => set('wedding_date', e.target.value)} />
              </div>
            </div>

            {/* Venue */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Main venue</Label>
                <Input placeholder="e.g. Taj Hotel" value={form.primary_venue}
                  onChange={e => set('primary_venue', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="e.g. Jaipur" value={form.primary_city}
                  onChange={e => set('primary_city', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-stone-400 -mt-3">
              For events at a different location (e.g. home functions in another city), add them separately in Events.
            </p>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Creating…' : 'Create wedding'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
