'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'
import { submitSpeakerProfile } from './actions'

interface SpeakerData {
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  phone: string | null
  email: string | null
  linkedin_url: string | null
  status: string
  token_filled_at: string | null
  event_name: string | null
  event_type: string | null
}

export default function SpeakerForm({ token, speaker }: { token: string; speaker: SpeakerData }) {
  const [form, setForm] = useState({
    name: speaker.name,
    title: speaker.title ?? '',
    organization: speaker.organization ?? '',
    bio: speaker.bio ?? '',
    phone: speaker.phone ?? '',
    email: speaker.email ?? '',
    linkedin_url: speaker.linkedin_url ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(!!speaker.token_filled_at)
  const [error, setError] = useState<string | null>(null)

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError(null)

    const res = await submitSpeakerProfile(token, {
      name: form.name.trim(),
      title: form.title.trim() || null,
      organization: form.organization.trim() || null,
      bio: form.bio.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
    })

    if (res.error) { setError(res.error); setLoading(false); return }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Profile submitted!</h1>
          <p className="text-stone-500 text-sm">
            Thank you, <strong>{form.name}</strong>. Your speaker profile for{' '}
            <strong>{speaker.event_name}</strong> has been saved.
          </p>
          <p className="text-stone-400 text-xs mt-4">You can close this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">✦</span>
          </div>
          <p className="text-sm text-stone-500 capitalize mb-1">{speaker.event_name}</p>
          <h1 className="text-2xl font-semibold text-stone-900">Speaker Profile</h1>
          <p className="text-stone-500 text-sm mt-2">
            Please fill in your details. This information will appear in the event programme.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input placeholder="Your full name" value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Designation / Title</Label>
                <Input placeholder="e.g. CEO, Director" value={form.title} onChange={e => setF('title', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization</Label>
                <Input placeholder="Your company / institute" value={form.organization} onChange={e => setF('organization', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bio</Label>
              <textarea
                placeholder="A short bio (2–4 sentences) that will appear in the event booklet."
                value={form.bio}
                onChange={e => setF('bio', e.target.value)}
                rows={4}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin_url} onChange={e => setF('linkedin_url', e.target.value)} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-800"
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'Submit profile'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">Powered by UtsavOS · Event Management</p>
      </div>
    </div>
  )
}
