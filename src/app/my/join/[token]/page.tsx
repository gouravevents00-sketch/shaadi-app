import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { acceptPartnerInvite } from '../../[id]/actions'

export default async function JoinCelebrationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/celebrate/signup?mode=signin&next=/my/join/${token}`)
  }

  const result = await acceptPartnerInvite(token)

  if ('error' in result) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-stone-100">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-lg font-bold text-stone-900 mb-2">Invalid invite link</h1>
          <p className="text-stone-500 text-sm mb-6">{result.error}</p>
          <a href="/my" className="text-sm text-rose-600 hover:underline">View your celebrations</a>
        </div>
      </div>
    )
  }

  redirect(`/my/${result.celebrationId}`)
}
