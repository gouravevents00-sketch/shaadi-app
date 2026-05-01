import Link from 'next/link'
import {
  CalendarDays, Users, ShoppingBag, Wallet, LayoutGrid, Sun,
  CheckSquare, Sparkles, ArrowRight, Star, Zap, FileText,
  MessageSquare, UsersRound, BarChart2, Building2, HeartHandshake,
} from 'lucide-react'
import DemoRequestButton from './DemoRequestButton'

const FEATURES = [
  { icon: HeartHandshake, label: 'Weddings',         desc: 'Full guest, vendor, rooms, seating, ground control' },
  { icon: Building2,      label: 'Corporate Events', desc: 'Conferences, AGMs, product launches, activations' },
  { icon: UsersRound,     label: 'Team Management',  desc: 'Project heads, coordinators, role-based access' },
  { icon: Sparkles,       label: 'AI Assistant',     desc: 'Hinglish AI that knows your event data live' },
  { icon: Users,          label: 'Guest Management', desc: 'CSV import, RSVP, guest 360, seating chart' },
  { icon: ShoppingBag,    label: 'Vendor Tracker',   desc: 'Quotes, payments, overdue alerts' },
  { icon: Wallet,         label: 'Finance',          desc: 'Budget vs actuals, payment schedules' },
  { icon: Sun,            label: 'Ground Control',   desc: 'Day-of live dashboard for your team' },
  { icon: CheckSquare,    label: 'Checklist',        desc: 'Templates, assignments, progress tracking' },
  { icon: FileText,       label: 'Documents',        desc: 'Briefs, contracts, mood boards' },
  { icon: MessageSquare,  label: 'Client Portal',    desc: 'Branded portal for your clients' },
  { icon: BarChart2,      label: 'Reports',          desc: 'Post-event summaries and deliverables' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '₹1,499',
    period: '/month',
    desc: 'For small agencies just getting started',
    features: ['5 active events', '3 team members', 'All core modules', 'AI assistant'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹3,999',
    period: '/month',
    desc: 'For growing agencies managing multiple events',
    features: ['Unlimited events', '15 team members', 'All modules + RBAC', 'Priority support', 'Client portals'],
    cta: 'Book a demo',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large agencies with custom requirements',
    features: ['Unlimited everything', 'Custom onboarding', 'Dedicated support', 'White-label option'],
    cta: 'Talk to us',
    highlight: false,
  },
]

const TESTIMONIALS = [
  { name: 'Ritika S.', company: 'Celebrations Co., Delhi', text: 'Guest management and ground control features saved us 3 hours on every event day.' },
  { name: 'Anand M.', company: 'EventCraft, Mumbai', text: 'The AI assistant is the first thing my team opens every morning. It knows exactly what needs attention.' },
  { name: 'Priya K.', company: 'Royal Weddings, Jaipur', text: 'Client portal has made follow-ups seamless. Clients love having everything in one place.' },
]

export default function ForAgenciesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-stone-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">✦</span>
          </div>
          <span className="font-semibold text-stone-900 text-sm">Creative Era OS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900">Sign in</Link>
          <Link href="/signup" className="text-sm bg-rose-700 text-white px-4 py-2 rounded-lg hover:bg-rose-800 font-medium">
            Start free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3 h-3" /> Built for Indian event management agencies
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-5">
          Manage every event.<br />
          <span className="text-rose-700">From planning to post-event.</span>
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto mb-8">
          Creative Era OS is the all-in-one platform for wedding planners and event management agencies — team management, guest ops, vendor payments, AI assistant, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-800 transition-colors">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <DemoRequestButton variant="outline" />
        </div>
        <p className="text-xs text-stone-400 mt-4">No credit card required · Setup in 2 minutes</p>
      </section>

      {/* Features grid */}
      <section className="bg-stone-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">Everything your agency needs</h2>
          <p className="text-stone-500 text-center mb-10">24 event types supported — weddings, conferences, concerts, activations, and more</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div key={f.label} className="bg-white rounded-xl p-4 border border-stone-200">
                <f.icon className="w-5 h-5 text-rose-600 mb-2" />
                <p className="text-sm font-semibold text-stone-800">{f.label}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI highlight */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-rose-700 to-rose-900 rounded-2xl p-8 text-white flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-7 h-7 text-rose-200" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">AI Assistant — jo samjhe aapki baat</h3>
            <p className="text-rose-100 text-sm leading-relaxed">
              Ask in Hinglish. Get real-time answers about your event — overdue tasks, unseated guests, pending payments, vendor status. The AI knows your live data and can take actions too.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-stone-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">Agencies love it</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-xl p-5 border border-stone-200">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-stone-600 italic mb-3">&quot;{t.text}&quot;</p>
                <p className="text-xs font-semibold text-stone-800">{t.name}</p>
                <p className="text-xs text-stone-400">{t.company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 max-w-5xl mx-auto" id="pricing">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">Simple pricing</h2>
        <p className="text-stone-500 text-center mb-10">Start free, upgrade when you need more</p>
        <div className="grid sm:grid-cols-3 gap-5">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-2xl p-6 border-2 flex flex-col ${p.highlight ? 'border-rose-500 bg-rose-50 shadow-lg' : 'border-stone-200 bg-white'}`}>
              {p.highlight && (
                <span className="text-xs font-bold uppercase tracking-wide text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full self-start mb-3">Most popular</span>
              )}
              <h3 className="text-lg font-bold text-stone-900">{p.name}</h3>
              <p className="text-xs text-stone-400 mt-0.5 mb-4">{p.desc}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold text-stone-900">{p.price}</span>
                <span className="text-sm text-stone-400">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {p.highlight
                ? <DemoRequestButton variant="filled" label={p.cta} />
                : <Link href="/signup" className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${p.highlight ? 'bg-rose-700 text-white hover:bg-rose-800' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                    {p.cta}
                  </Link>
              }
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-stone-900 py-14 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to run smarter events?</h2>
        <p className="text-stone-400 mb-6 text-sm">Join agencies across India already using Creative Era OS</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-800">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <DemoRequestButton variant="white" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 px-6 py-6 text-center">
        <p className="text-xs text-stone-400">© 2026 Creative Era OS · <Link href="/celebrate" className="hover:text-stone-600">For personal planning →</Link></p>
      </footer>
    </div>
  )
}
