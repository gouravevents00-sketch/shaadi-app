'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, CheckSquare, Wallet, Trophy, ShoppingBag, Mic, Star } from 'lucide-react'

type Props = {
  event: { id: string; name: string; expected_count: number | null }
  delegates: { id: string; checked_in: boolean; dietary: string | null; organization: string | null; is_vip: boolean; title: string | null }[]
  guests: { id: string; checked_in: boolean; is_vvip: boolean; requires_escort: boolean; requires_vehicle: boolean; dietary: string | null }[]
  volunteers: { id: string; checked_in: boolean; role: string | null; zone: string | null; t_shirt_size: string | null }[]
  speakerCount: number
  checklist: { id: string; status: string; category: string }[]
  vendors: { id: string; name: string; category: string | null; quoted_amount: number | null; contract_signed: boolean }[]
  budgetCats: { id: string; name: string; estimated: number }[]
  budgetItems: { id: string; category_id: string; quoted: number; paid: number }[]
  sponsors: { id: string; name: string; tier: string | null; amount: number | null; amount_received: number | null }[]
}

function pct(num: number, den: number) {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-stone-100`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="font-semibold text-stone-800 text-sm">{title}</h2>
    </div>
  )
}

export default function ReportsClient({
  event, delegates, guests, volunteers, speakerCount,
  checklist, vendors, budgetCats, budgetItems, sponsors,
}: Props) {
  // ── Attendance ──
  const totalDelegates = delegates.length
  const checkedInDelegates = delegates.filter(d => d.checked_in).length
  const vipDelegates = delegates.filter(d => d.is_vip).length
  const totalGuests = guests.length
  const checkedInGuests = guests.filter(g => g.checked_in).length
  const vvipGuests = guests.filter(g => g.is_vvip).length
  const totalVolunteers = volunteers.length
  const checkedInVolunteers = volunteers.filter(v => v.checked_in).length

  // ── Dietary breakdown ──
  const dietaryCount = (items: { dietary: string | null }[]) => {
    const map: Record<string, number> = {}
    for (const d of items) {
      const key = d.dietary?.toLowerCase() || 'not specified'
      map[key] = (map[key] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }
  const delegateDietary = dietaryCount(delegates)
  const guestDietary = dietaryCount(guests)

  // ── Organisation breakdown (delegates) ──
  const orgCount: Record<string, number> = {}
  for (const d of delegates) {
    const org = d.organization?.trim() || 'Unknown'
    orgCount[org] = (orgCount[org] ?? 0) + 1
  }
  const topOrgs = Object.entries(orgCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // ── T-shirt sizes ──
  const tshirtCount: Record<string, number> = {}
  for (const v of volunteers) {
    const s = v.t_shirt_size || 'Not specified'
    tshirtCount[s] = (tshirtCount[s] ?? 0) + 1
  }

  // ── Zone breakdown ──
  const zoneCount: Record<string, number> = {}
  for (const v of volunteers) {
    const z = v.zone || 'Unassigned'
    zoneCount[z] = (zoneCount[z] ?? 0) + 1
  }

  // ── Checklist ──
  const checklistTotal = checklist.length
  const checklistDone = checklist.filter(c => c.status === 'done').length
  const checklistByCategory: Record<string, { total: number; done: number }> = {}
  for (const c of checklist) {
    if (!checklistByCategory[c.category]) checklistByCategory[c.category] = { total: 0, done: 0 }
    checklistByCategory[c.category].total++
    if (c.status === 'done') checklistByCategory[c.category].done++
  }

  // ── Budget ──
  const totalEstimated = budgetCats.reduce((s, c) => s + c.estimated, 0)
  const totalQuoted = budgetItems.reduce((s, i) => s + i.quoted, 0)
  const totalPaid = budgetItems.reduce((s, i) => s + i.paid, 0)

  // ── Sponsors ──
  const totalSponsorCommitted = sponsors.reduce((s, sp) => s + (sp.amount ?? 0), 0)
  const totalSponsorReceived = sponsors.reduce((s, sp) => s + (sp.amount_received ?? 0), 0)

  // ── Vendors ──
  const totalVendorQuoted = vendors.reduce((s, v) => s + (v.quoted_amount ?? 0), 0)
  const signedVendors = vendors.filter(v => v.contract_signed).length

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Reports</h1>
        <p className="text-sm text-stone-400 mt-0.5">{event.name}</p>
      </div>

      {/* ── Attendance Summary ── */}
      <Card className="border-stone-200">
        <CardContent className="pt-5">
          <SectionHeader icon={Users} title="Attendance Summary" color="text-blue-500" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Delegates', in: checkedInDelegates, total: totalDelegates, color: 'bg-blue-500', sub: `${vipDelegates} VIPs` },
              { label: 'Guests / VIPs', in: checkedInGuests, total: totalGuests, color: 'bg-amber-500', sub: `${vvipGuests} VVIPs` },
              { label: 'Volunteers', in: checkedInVolunteers, total: totalVolunteers, color: 'bg-purple-500', sub: `on site` },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-sm font-medium text-stone-700">{item.label}</p>
                  <p className="text-xs text-stone-400">{item.in}/{item.total} · {pct(item.in, item.total)}%</p>
                </div>
                <Bar value={item.in} max={item.total} color={item.color} />
                <p className="text-xs text-stone-400 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-stone-100 text-center">
            {[
              { label: 'Speakers', value: speakerCount, icon: Mic },
              { label: 'Delegates', value: totalDelegates, icon: Users },
              { label: 'Guests', value: totalGuests, icon: Star },
              { label: 'Volunteers', value: totalVolunteers, icon: UserCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <Icon className="w-4 h-4 text-stone-300 mx-auto mb-1" />
                <p className="text-xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-400">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Dietary Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={Users} title="Delegate Dietary" color="text-blue-500" />
            {delegateDietary.length === 0 ? (
              <p className="text-sm text-stone-400">No data</p>
            ) : (
              <div className="space-y-2.5">
                {delegateDietary.map(([label, count]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span className="capitalize">{label}</span>
                      <span>{count} ({pct(count, totalDelegates)}%)</span>
                    </div>
                    <Bar value={count} max={totalDelegates} color="bg-blue-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={Star} title="Guest Dietary" color="text-amber-500" />
            {guestDietary.length === 0 ? (
              <p className="text-sm text-stone-400">No data</p>
            ) : (
              <div className="space-y-2.5">
                {guestDietary.map(([label, count]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span className="capitalize">{label}</span>
                      <span>{count} ({pct(count, totalGuests)}%)</span>
                    </div>
                    <Bar value={count} max={totalGuests} color="bg-amber-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Organisations ── */}
      {topOrgs.length > 0 && (
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={Users} title="Top Organisations (Delegates)" color="text-emerald-500" />
            <div className="space-y-2">
              {topOrgs.map(([org, count]) => (
                <div key={org}>
                  <div className="flex justify-between text-xs text-stone-600 mb-1">
                    <span className="truncate max-w-xs">{org}</span>
                    <span>{count}</span>
                  </div>
                  <Bar value={count} max={topOrgs[0][1]} color="bg-emerald-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Volunteers ── */}
      {totalVolunteers > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-stone-200">
            <CardContent className="pt-5">
              <SectionHeader icon={UserCheck} title="Volunteer Zones" color="text-purple-500" />
              <div className="space-y-2">
                {Object.entries(zoneCount).sort((a, b) => b[1] - a[1]).map(([zone, count]) => (
                  <div key={zone} className="flex justify-between text-sm">
                    <span className="text-stone-600">{zone}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardContent className="pt-5">
              <SectionHeader icon={UserCheck} title="T-Shirt Sizes" color="text-purple-500" />
              <div className="space-y-2">
                {Object.entries(tshirtCount).sort((a, b) => b[1] - a[1]).map(([size, count]) => (
                  <div key={size} className="flex justify-between text-sm">
                    <span className="text-stone-600">{size}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Checklist ── */}
      {checklistTotal > 0 && (
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={CheckSquare} title="Checklist Progress" color="text-green-500" />
            <div className="mb-4">
              <div className="flex justify-between text-xs text-stone-600 mb-1">
                <span>Overall</span>
                <span>{checklistDone}/{checklistTotal} ({pct(checklistDone, checklistTotal)}%)</span>
              </div>
              <Bar value={checklistDone} max={checklistTotal} color="bg-green-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(checklistByCategory).map(([cat, { total, done }]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span className="capitalize">{cat}</span>
                    <span>{done}/{total}</span>
                  </div>
                  <Bar value={done} max={total} color="bg-green-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Budget ── */}
      {totalEstimated > 0 && (
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={Wallet} title="Budget Summary" color="text-rose-500" />
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              {[
                { label: 'Estimated', value: fmt(totalEstimated), color: 'text-stone-700' },
                { label: 'Quoted / Committed', value: fmt(totalQuoted), color: 'text-amber-700' },
                { label: 'Paid Out', value: fmt(totalPaid), color: 'text-rose-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-stone-50 rounded-xl p-3">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-stone-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {budgetCats.map(cat => {
                const items = budgetItems.filter(i => i.category_id === cat.id)
                const paid = items.reduce((s, i) => s + i.paid, 0)
                return (
                  <div key={cat.id}>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>{cat.name}</span>
                      <span>{fmt(paid)} / {fmt(cat.estimated)}</span>
                    </div>
                    <Bar value={paid} max={cat.estimated || 1} color="bg-rose-400" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Sponsors ── */}
      {sponsors.length > 0 && (
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={Trophy} title="Sponsor Summary" color="text-yellow-500" />
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-lg font-bold text-yellow-700">{fmt(totalSponsorCommitted)}</p>
                <p className="text-xs text-stone-400">Committed</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-lg font-bold text-emerald-700">{fmt(totalSponsorReceived)}</p>
                <p className="text-xs text-stone-400">Received ({pct(totalSponsorReceived, totalSponsorCommitted)}%)</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {sponsors.map(sp => (
                <div key={sp.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-800 font-medium">{sp.name}</span>
                    {sp.tier && <Badge variant="outline" className="text-xs capitalize">{sp.tier.replace('_', ' ')}</Badge>}
                  </div>
                  <span className="text-stone-500 text-xs">{fmt(sp.amount_received ?? 0)} / {fmt(sp.amount ?? 0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Vendors ── */}
      {vendors.length > 0 && (
        <Card className="border-stone-200">
          <CardContent className="pt-5">
            <SectionHeader icon={ShoppingBag} title="Vendor Summary" color="text-stone-500" />
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-lg font-bold text-stone-700">{vendors.length}</p>
                <p className="text-xs text-stone-400">Total Vendors</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-lg font-bold text-emerald-700">{signedVendors}</p>
                <p className="text-xs text-stone-400">Contracts Signed</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-lg font-bold text-amber-700">{fmt(totalVendorQuoted)}</p>
                <p className="text-xs text-stone-400">Total Quoted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
