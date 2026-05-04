import Link from 'next/link'
import { ArrowRight, CheckCircle2, Users, Wallet, Store, CalendarDays, Sparkles, Star } from 'lucide-react'

const CELEBRATION_TYPES = [
  { emoji: '💒', label: 'Wedding' }, { emoji: '💍', label: 'Sagai' },
  { emoji: '🎵', label: 'Sangeet' }, { emoji: '👶', label: 'Namkaran' },
  { emoji: '🏠', label: 'Griha Pravesh' }, { emoji: '🤰', label: 'Godh Bharai' },
  { emoji: '🪔', label: 'Puja' }, { emoji: '🎂', label: 'Birthday' },
  { emoji: '✂️', label: 'Mundan' }, { emoji: '🍚', label: 'Annaprashan' },
  { emoji: '🧵', label: 'Janeu' }, { emoji: '❤️', label: 'Anniversary' },
  { emoji: '🎓', label: 'Graduation' }, { emoji: '✨', label: '+ many more' },
]

const STEPS = [
  {
    n: '01',
    title: 'Create your celebration',
    desc: "2 mins — name, date, venue. That's all it takes.",
    color: 'bg-rose-50 border-rose-100',
    icon: '✦',
  },
  {
    n: '02',
    title: 'AI checklist ready',
    desc: 'A complete task list tailored to your celebration — from booking to farewell.',
    color: 'bg-amber-50 border-amber-100',
    icon: '⚡',
  },
  {
    n: '03',
    title: 'Track everything in one place',
    desc: 'Guests, budget, vendors, tasks — on your phone, anytime.',
    color: 'bg-emerald-50 border-emerald-100',
    icon: '✓',
  },
]

const FEATURES = [
  { icon: CheckCircle2, color: 'text-rose-500 bg-rose-50', title: 'AI Checklist', desc: '25+ celebration types with ready-made task lists. Edit, add, and track.' },
  { icon: Users, color: 'text-blue-500 bg-blue-50', title: 'Guest Management', desc: 'Track RSVP, dietary preferences, family groups — all in one place.' },
  { icon: Wallet, color: 'text-emerald-500 bg-emerald-50', title: 'Budget Tracker', desc: 'Estimated vs actual — how much spent, how much left — crystal clear.' },
  { icon: Store, color: 'text-purple-500 bg-purple-50', title: 'Vendor List', desc: 'Photographer, caterer, DJ — contact, amount, status — all here.' },
  { icon: CalendarDays, color: 'text-orange-500 bg-orange-50', title: 'Reminders', desc: 'Never miss a task — due dates, vendor payments, event countdown.' },
  { icon: Sparkles, color: 'text-pink-500 bg-pink-50', title: 'Plan with your partner', desc: 'Both of you can manage together — invite with one link.' },
]

export default function CelebratePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">✦</span>
          </div>
          <span className="font-semibold text-stone-900 text-sm">Utsav</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/celebrate/signup?mode=signin"
            className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5">
            Sign in
          </Link>
          <Link href="/celebrate/new"
            className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 transition-colors font-medium">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-5 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium px-3 py-1 rounded-full mb-5">
          <Star className="w-3 h-3 fill-rose-400 text-rose-400" />
          Free forever · No credit card
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-[1.15] tracking-tight mb-4">
          Your complete wedding plan<br />
          <span className="text-rose-700">in one place</span>
        </h1>
        <p className="text-stone-500 text-base sm:text-lg mb-7 max-w-lg mx-auto leading-relaxed">
          No wedding planner? No problem.<br />
          Build your checklist with AI, track guests, and manage your budget.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/celebrate/new"
            className="inline-flex items-center justify-center gap-2 bg-rose-700 text-white px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-rose-800 active:scale-95 transition-all shadow-sm shadow-rose-200">
            Start planning <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/celebrate/signup?mode=signin"
            className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white text-stone-700 px-7 py-3.5 rounded-xl text-base font-medium hover:bg-stone-50 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Celebration types */}
      <section className="bg-white border-y border-stone-100 py-8 overflow-hidden">
        <p className="text-center text-xs font-semibold text-stone-400 uppercase tracking-widest mb-5 px-5">
          For every Indian celebration
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-5">
          {CELEBRATION_TYPES.map(c => (
            <span key={c.label}
              className="inline-flex items-center gap-1.5 text-sm bg-stone-50 border border-stone-100 text-stone-600 px-3 py-1.5 rounded-full hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-default">
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-2xl mx-auto px-5 py-14">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">How it works</h2>
        <p className="text-stone-500 text-sm text-center mb-8">Three simple steps</p>
        <div className="space-y-4">
          {STEPS.map(s => (
            <div key={s.n} className={`flex items-start gap-4 border rounded-2xl p-5 ${s.color}`}>
              <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-lg">{s.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-stone-400">{s.n}</span>
                  <h3 className="font-semibold text-stone-900 text-sm">{s.title}</h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-stone-100 py-14">
        <div className="max-w-2xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">What's inside the app</h2>
          <p className="text-stone-500 text-sm text-center mb-8">Everything a couple needs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl border border-stone-100 hover:border-rose-100 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{f.title}</p>
                    <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="bg-gradient-to-br from-rose-700 to-rose-800 rounded-3xl px-8 py-10 shadow-lg shadow-rose-100">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to get started? 🎉</h2>
          <p className="text-rose-200 text-sm mb-6">Free forever · 2 min setup · No credit card needed</p>
          <Link href="/celebrate/new"
            className="inline-flex items-center gap-2 bg-white text-rose-700 px-7 py-3 rounded-xl font-semibold text-base hover:bg-rose-50 transition-colors active:scale-95">
            Start planning <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="text-center text-xs text-stone-400 pb-8 px-5">
        © {new Date().getFullYear()} UtsavOS · Made with ♥ for Indian celebrations ·{' '}
        <Link href="/terms" className="hover:text-stone-600">Terms</Link>
        {' · '}
        <Link href="/privacy" className="hover:text-stone-600">Privacy</Link>
      </footer>
    </div>
  )
}
