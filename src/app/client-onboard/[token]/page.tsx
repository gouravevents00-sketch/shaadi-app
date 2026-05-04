import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientOnboardClient from './ClientOnboardClient'

export default async function ClientOnboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/celebrate/signup?mode=signin&next=/client-onboard/${token}`)
  }

  const sc = createServiceClient()

  // Look up the wedding by invite token
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name, wedding_date, primary_venue, primary_city, client_celebration_id, client_invite_token')
    .eq('client_invite_token', token)
    .maybeSingle()

  if (!wedding) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-stone-100">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-lg font-bold text-stone-900 mb-2">Invalid invite link</h1>
          <p className="text-stone-500 text-sm mb-6">This link has expired or is invalid.</p>
          <a href="/celebrate" className="text-sm text-rose-600 hover:underline">Homepage par jayein</a>
        </div>
      </div>
    )
  }

  // If already connected — go directly to celebration dashboard
  if (wedding.client_celebration_id) {
    // Check if this user owns the celebration
    const { data: cel } = await sc.from('celebrations')
      .select('id, user_id').eq('id', wedding.client_celebration_id).maybeSingle()
    if (cel?.user_id === user.id) {
      redirect(`/my/${cel.id}`)
    }
  }

  // Check if user already has a celebration for this wedding
  const { data: existingCel } = await sc.from('celebrations')
    .select('id').eq('user_id', user.id).eq('wedding_id', wedding.id).maybeSingle()
  if (existingCel) redirect(`/my/${existingCel.id}`)

  return (
    <ClientOnboardClient
      weddingId={wedding.id}
      inviteToken={token}
      userId={user.id}
      agencyWedding={{
        brideName: wedding.bride_name,
        groomName: wedding.groom_name,
        weddingDate: wedding.wedding_date,
        venue: wedding.primary_venue,
        city: wedding.primary_city,
      }}
    />
  )
}
