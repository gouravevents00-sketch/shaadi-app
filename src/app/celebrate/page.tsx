import Link from 'next/link'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

const CELEBRATION_HIGHLIGHTS = [
  'Shadi / Wedding', 'Sagai (Engagement)', 'Namkaran', 'Griha Pravesh',
  'Godh Bharai', 'Birthday Party', 'Anniversary', 'Mundan', 'Annaprashan',
  'Sangeet Night', 'Janeu Ceremony', 'Satyanarayan Puja', '+ bahut kuch',
]

const FEATURES = [
  { title: 'Step-by-step checklist', desc: 'AI generates a complete task list for your celebration type — customize as needed' },
  { title: 'Guest management', desc: 'Track RSVPs, side (bride/groom family), dietary needs and seating' },
  { title: 'Budget tracker', desc: 'Plan your budget, add expenses, track what\'s paid and what\'s due' },
  { title: 'Vendor list', desc: 'Keep all your vendors in one place — caterer, decorator, photographer and more' },
  { title: 'AI assistant', desc: 'Ask anything — "kya baaki hai?", "kaun nahi aya?", "budget kaisa chal raha hai?"' },
  { title: 'Works for every celebration', desc: '25+ Indian event types — from namkaran to navratri, we have checklists for all' },
]

export default function CelebratePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-100 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center">
            <span className="text-white text-sm font-bold">✦</span>
          </div>
          <span className="font-semibold text-stone-900">Creative Era OS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/celebrate/signup?mode=signin" className="text-sm text-stone-600 hover:text-stone-900">Already have account? Sign in</Link>
          <Link href="/celebrate/new"
            className="text-sm bg-rose-700 text-white px-4 py-2 rounded-lg hover:bg-rose-800 transition-colors">
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered celebration planner — bilkul free
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
          Apni celebration<br />plan karo — hassle-free
        </h1>
        <p className="text-lg text-stone-500 mb-8 max-w-xl mx-auto">
          Wedding planner hire nahi kiya? Koi baat nahi. Hum hain na.
          AI se complete checklist banao, guests track karo, budget manage karo — sab ek jagah.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/celebrate/new"
            className="inline-flex items-center justify-center gap-2 bg-rose-700 text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-rose-800 transition-colors">
            Plan my celebration <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/celebrate/signup?mode=signin"
            className="inline-flex items-center justify-center gap-2 border border-stone-200 text-stone-700 px-6 py-3 rounded-xl text-base font-medium hover:bg-stone-100 transition-colors">
            I have an account
          </Link>
        </div>
        <p className="text-xs text-stone-400 mt-4">No credit card required · Free to use</p>
      </section>

      {/* Celebration types */}
      <section className="bg-white border-y border-stone-100 py-10">
        <p className="text-center text-xs font-semibold text-stone-400 uppercase tracking-wider mb-5">Works for every Indian celebration</p>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto px-6">
          {CELEBRATION_HIGHLIGHTS.map(c => (
            <span key={c} className="text-sm bg-stone-50 border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full">{c}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">Sab kuch ek jagah</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-stone-100 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-stone-800 text-sm">{f.title}</p>
                  <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-rose-700 py-14 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to start planning?</h2>
        <p className="text-rose-200 mb-6 text-sm">Apna celebration type choose karo — AI baki sab sambhal lega</p>
        <Link href="/celebrate/new"
          className="inline-flex items-center gap-2 bg-white text-rose-700 px-6 py-3 rounded-xl text-base font-semibold hover:bg-rose-50 transition-colors">
          Get started — it&apos;s free <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="py-6 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Creative Era OS · Made with ♥ for Indian celebrations
      </footer>
    </div>
  )
}
