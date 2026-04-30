import { getSpeakerByToken } from './actions'
import SpeakerForm from './SpeakerForm'

export default async function SpeakerFillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const speaker = await getSpeakerByToken(token)

  if (!speaker) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-10 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-lg font-semibold text-stone-900 mb-2">Link not found</h1>
          <p className="text-stone-500 text-sm">
            This speaker link is invalid or has expired. Please contact the event organiser for a new link.
          </p>
        </div>
      </div>
    )
  }

  return <SpeakerForm token={token} speaker={speaker} />
}
