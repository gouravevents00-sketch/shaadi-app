import { createServiceClient } from '@/lib/supabase/server'

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise'

export const PLAN_LIMITS = {
  free:       { maxWeddings: 1,    maxOrgEvents: 1,    maxGuests: 100,   maxTeam: 1  },
  starter:    { maxWeddings: 5,    maxOrgEvents: 5,    maxGuests: 500,   maxTeam: 3  },
  pro:        { maxWeddings: 25,   maxOrgEvents: 25,   maxGuests: 2000,  maxTeam: 10 },
  enterprise: { maxWeddings: 9999, maxOrgEvents: 9999, maxGuests: 99999, maxTeam: 999 },
} as const

export const PLAN_FEATURES = {
  free:       { aiAssistant: false, clientPortal: true, budgetTracker: true,  customTemplates: false, prioritySupport: false },
  starter:    { aiAssistant: true,  clientPortal: true, budgetTracker: true,  customTemplates: true,  prioritySupport: false },
  pro:        { aiAssistant: true,  clientPortal: true, budgetTracker: true,  customTemplates: true,  prioritySupport: true  },
  enterprise: { aiAssistant: true,  clientPortal: true, budgetTracker: true,  customTemplates: true,  prioritySupport: true  },
} as const

export async function getCompanyPlan(companyId: string): Promise<PlanId> {
  const sc = createServiceClient()
  const { data } = await sc
    .from('company_subscriptions')
    .select('plan_id, status')
    .eq('company_id', companyId)
    .single()

  if (!data || data.status === 'cancelled') return 'free'
  return (data.plan_id as PlanId) || 'free'
}

export async function checkPlanLimit(
  companyId: string,
  limitType: 'maxWeddings' | 'maxOrgEvents' | 'maxTeam',
  currentCount: number
): Promise<{ allowed: boolean; planId: PlanId; limit: number }> {
  const planId = await getCompanyPlan(companyId)
  const limit = PLAN_LIMITS[planId][limitType]
  return { allowed: currentCount < limit, planId, limit }
}

export function hasFeature(planId: PlanId, feature: keyof typeof PLAN_FEATURES.free): boolean {
  return PLAN_FEATURES[planId][feature]
}
