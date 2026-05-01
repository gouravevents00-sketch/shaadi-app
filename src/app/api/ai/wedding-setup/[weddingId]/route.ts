import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AiSetupInput {
  ceremonies:        string[]   // checked ceremony names
  guestCount:        number
  brideSide:         number
  groomSide:         number
  budget:            number
  vegPct:            number
  nonVegPct:         number
  jainPct:           number
  bookedCategories:  string[]
  theme:             string
  accommodation:     number
  priority:          string
  notes:             string
}

export interface AiSetupPlan {
  vendors: { category: string; name: string; estimated: number; priority: 'must' | 'should' | 'nice'; ceremony: string }[]
  budget:  { category: string; item: string; estimated: number }[]
  checklist: { title: string; category: string; due_days_before: number }[]
  insights: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> },
) {
  const { weddingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sc = createServiceClient()

  // Verify wedding ownership
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name, wedding_date, primary_city, budget_total')
    .eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const input: AiSetupInput = await req.json()

  // ── Fetch company's past wedding patterns for learning ────────────────────
  const { data: pastWeddings } = await sc.from('weddings')
    .select('id, budget_total')
    .eq('company_id', member.company_id)
    .neq('id', weddingId)
    .order('created_at', { ascending: false })
    .limit(5)

  let companyHistory = ''
  if (pastWeddings && pastWeddings.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = pastWeddings.map((w: any) => w.id)
    const { data: pastItems } = await sc.from('budget_items')
      .select('description, estimated, budget_categories!inner(name, wedding_id)')
      .in('budget_categories.wedding_id', ids)

    if (pastItems && pastItems.length > 0) {
      // Aggregate by broad category
      const catTotals: Record<string, { sum: number; count: number }> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of pastItems as any[]) {
        const cat = item.budget_categories?.name ?? 'Other'
        if (!catTotals[cat]) catTotals[cat] = { sum: 0, count: 0 }
        catTotals[cat].sum += item.estimated ?? 0
        catTotals[cat].count++
      }
      const lines = Object.entries(catTotals)
        .sort((a, b) => b[1].sum - a[1].sum)
        .slice(0, 6)
        .map(([cat, { sum, count }]) => `  ${cat}: avg ₹${Math.round(sum / count).toLocaleString('en-IN')} per item (${count} items across ${pastWeddings.length} weddings)`)
      if (lines.length) companyHistory = `\nCOMPANY SPENDING PATTERNS (last ${pastWeddings.length} weddings):\n${lines.join('\n')}\nUse these to calibrate estimates for this company's style.\n`
    }
  }

  const brideGroom = `${wedding.bride_name}${wedding.groom_name ? ` & ${wedding.groom_name}` : ''}`
  const daysLeft = wedding.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date).getTime() - Date.now()) / 86400000)
    : null
  const bookedNote = input.bookedCategories.length
    ? `ALREADY BOOKED: ${input.bookedCategories.join(', ')} (skip these in vendors list)`
    : 'ALREADY BOOKED: None'

  const prompt = `You are an expert Indian wedding planner AI. Generate a complete, practical wedding setup plan.

WEDDING: ${brideGroom}
DATE: ${wedding.wedding_date ?? 'TBD'}${daysLeft !== null ? ` (${daysLeft} days away)` : ''}
CITY: ${wedding.primary_city ?? input.notes?.match(/\b\w+\b/) ?? 'India'}
CEREMONIES: ${input.ceremonies.join(', ') || 'Standard (Mehandi, Haldi, Baraat, Pheras, Reception)'}
GUESTS: ${input.guestCount} total | Bride side: ${input.brideSide} | Groom side: ${input.groomSide}
BUDGET: ₹${input.budget.toLocaleString('en-IN')}
DIETARY: ${input.vegPct}% Veg, ${input.nonVegPct}% Non-Veg, ${input.jainPct}% Jain
${bookedNote}
THEME: ${input.theme}
OUTSTATION GUESTS: ${input.accommodation} (need accommodation)
TOP PRIORITY: ${input.priority}
SPECIAL NOTES: ${input.notes || 'None'}
${companyHistory}
Return ONLY a valid JSON object — no explanation, no markdown fences:
{
  "vendors": [
    { "category": "...", "name": "e.g. [Photographer TBD]", "estimated": 0, "priority": "must", "ceremony": "Pheras" }
  ],
  "budget": [
    { "category": "Photography & Video", "item": "Main photography package", "estimated": 150000 }
  ],
  "checklist": [
    { "title": "...", "category": "...", "due_days_before": 90 }
  ],
  "insights": "2-3 sentence summary of key recommendations for this wedding"
}

Rules:
- vendors: Only include categories NOT already booked. Use "must" for ceremony-critical vendors, "should" for important, "nice" for optional. Name as "[Category TBD]" placeholder.
- budget: Cover all ceremonies proportionally. Items should sum close to ₹${input.budget.toLocaleString('en-IN')}. Budget categories must match exactly: Venue, Catering, Decoration, Photography & Video, Music & Entertainment, Transportation, Makeup & Hair, Invitations & Stationery, Gifts & Favours, Accommodation, Mehandi, Miscellaneous.
- checklist: 15-20 tasks, most urgent first. due_days_before = days before wedding date.
- All amounts in INR as plain numbers. No currency symbols.`

  let plan: AiSetupPlan
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    plan = JSON.parse(cleaned)
  } catch (err) {
    console.error('AI setup error:', err)
    return NextResponse.json({ error: 'AI generation failed — try again' }, { status: 500 })
  }

  return NextResponse.json({ plan })
}
