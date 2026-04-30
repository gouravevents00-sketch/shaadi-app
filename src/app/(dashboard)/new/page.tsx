import Link from 'next/link'
import { HeartHandshake, Zap } from 'lucide-react'

export default function NewEventSelectorPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-stone-900">New Event</h1>
        <p className="text-stone-500 text-sm mt-1">Choose the type of event you want to create.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/weddings/new">
          <div className="group rounded-xl border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 p-6 cursor-pointer transition-all">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-stone-900 text-base mb-1">Wedding</h2>
            <p className="text-sm text-stone-500 leading-snug">
              Destination or local wedding — guests, rituals, vendors, accommodation.
            </p>
          </div>
        </Link>

        <Link href="/org-events/new">
          <div className="group rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 p-6 cursor-pointer transition-all">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-stone-900 text-base mb-1">Org Event</h2>
            <p className="text-sm text-stone-500 leading-snug">
              Corporate, government, public, or BTL — conferences, concerts, activations, roadshows.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
