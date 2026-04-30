import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, Zap, Star, Building2 } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Star,
    color: 'border-stone-200',
    badge: null,
    features: [
      '1 active wedding',
      'Up to 100 guests',
      'Basic checklist',
      'Client portal',
      '1 team member',
    ],
    cta: 'Current plan',
    ctaAction: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1499,
    icon: Zap,
    color: 'border-blue-200',
    badge: 'Popular',
    features: [
      '5 weddings / events',
      'Up to 500 guests each',
      'AI assistant included',
      'Custom checklist templates',
      '3 team members',
      'Email support',
    ],
    cta: 'Upgrade to Starter',
    ctaAction: 'starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 3999,
    icon: Star,
    color: 'border-rose-200',
    badge: 'Best value',
    features: [
      '25 weddings + corporate events',
      'Unlimited guests',
      'AI assistant',
      'Custom templates',
      '10 team members',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Upgrade to Pro',
    ctaAction: 'pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    icon: Building2,
    color: 'border-stone-300',
    badge: null,
    features: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated account manager',
      'Custom branding / white-label',
      'API access',
      'SLA guarantee',
    ],
    cta: 'Contact us',
    ctaAction: 'contact',
  },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: member } = await sc.from('company_members')
    .select('company_id, role, companies(name)')
    .eq('user_id', user.id).single()

  if (!member) redirect('/dashboard')

  const { data: subscription } = await sc.from('company_subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('company_id', member.company_id).single()

  const currentPlan = subscription?.plan_id || 'free'
  const company = member.companies as { name: string } | null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Plans & Billing</h1>
        <p className="text-stone-500 text-sm mt-1">
          {company?.name} · Current plan: <span className="font-semibold text-stone-800 capitalize">{currentPlan}</span>
          {subscription?.current_period_end && (
            <span className="text-stone-400"> · renews {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          const Icon = plan.icon
          return (
            <div key={plan.id} className={`bg-white border-2 rounded-2xl p-5 flex flex-col relative ${isCurrent ? 'border-rose-400 shadow-md' : plan.color}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.id === 'starter' ? 'bg-blue-600 text-white' : 'bg-rose-700 text-white'}`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-700 text-white">Active</span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-stone-500" />
                  <span className="font-bold text-stone-900">{plan.name}</span>
                </div>
                {plan.price === null ? (
                  <p className="text-xl font-bold text-stone-900">Custom</p>
                ) : plan.price === 0 ? (
                  <p className="text-xl font-bold text-stone-900">Free</p>
                ) : (
                  <p className="text-xl font-bold text-stone-900">
                    ₹{plan.price.toLocaleString('en-IN')}
                    <span className="text-sm font-normal text-stone-400">/mo</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-stone-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center text-xs text-stone-400 py-2 border border-stone-100 rounded-lg">Current plan</div>
              ) : plan.ctaAction === 'contact' ? (
                <a href="mailto:hello@creativeeraos.com?subject=Enterprise Plan"
                  className="text-center text-sm font-medium text-stone-700 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">
                  Contact us →
                </a>
              ) : (
                <button
                  className="text-center text-sm font-semibold bg-rose-700 text-white rounded-lg py-2 hover:bg-rose-800 transition-colors"
                  onClick={() => {
                    // Razorpay integration will go here
                    alert('Razorpay payment coming soon! Contact hello@creativeeraos.com to upgrade.')
                  }}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800 mb-1">Billing & Payments</p>
        <p>We use Razorpay for secure payments. All amounts are in INR. GST applicable as per current rates.</p>
        <p className="mt-1">For billing queries: <a href="mailto:billing@creativeeraos.com" className="text-rose-600 hover:underline">billing@creativeeraos.com</a></p>
      </div>
    </div>
  )
}
