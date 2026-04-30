'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Building2, CheckCircle2, Clock, ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { requestConnection } from './actions'

interface Company { id: string; name: string; slug: string; logo_url: string | null }
interface Connection { id: string; company_id: string; status: string; created_at: string; wedding_id: string | null }

export default function ConnectClient({ celebrationId, companies, initialConnections }: {
  celebrationId: string
  companies: Company[]
  initialConnections: Connection[]
}) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [requesting, setRequesting] = useState<string | null>(null) // company_id
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const connectedIds = new Set(connections.map(c => c.company_id))

  function openRequest(companyId: string) {
    setRequesting(companyId)
    setMessage('')
  }

  function handleRequest(companyId: string) {
    startTransition(async () => {
      const res = await requestConnection(celebrationId, companyId, message || undefined)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Request sent! The planner will reach out.')
      const optimistic: Connection = {
        id: `opt-${Date.now()}`,
        company_id: companyId,
        status: 'pending',
        created_at: new Date().toISOString(),
        wedding_id: null,
      }
      setConnections(c => [...c, optimistic])
      setRequesting(null)
    })
  }

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Accepted</span>
    if (status === 'declined') return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Declined</span>
    return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-100 bg-white px-4 py-3.5 flex items-center gap-3">
        <Link href={`/my/${celebrationId}`} className="text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-rose-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">✦</span>
          </div>
          <span className="text-sm font-semibold text-stone-700">Connect with a planner</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Find a wedding planner</h1>
          <p className="text-sm text-stone-500 mt-1">
            Once connected, your planner will take over management and you'll get a dedicated portal to share details.
          </p>
        </div>

        {/* My requests */}
        {connections.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">My requests</p>
            </div>
            <div className="divide-y divide-stone-100">
              {connections.map(conn => {
                const company = companies.find(c => c.id === conn.company_id)
                return (
                  <div key={conn.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-rose-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-stone-800">{company?.name || 'Agency'}</span>
                    {statusBadge(conn.status)}
                    {conn.status === 'accepted' && conn.wedding_id && (
                      <Link href={`/portal/${conn.wedding_id}`}
                        className="text-xs text-rose-600 hover:text-rose-800 underline ml-2">
                        Open portal →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Company list */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Available planners</p>
          {companies.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-200" />
              <p className="text-sm text-stone-500">No planners available yet.</p>
              <p className="text-xs text-stone-400 mt-1">Check back soon or email us at hello@creativeeraos.com</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map(company => {
                const conn = connections.find(c => c.company_id === company.id)
                const alreadyRequested = !!conn
                const isRequesting = requesting === company.id

                return (
                  <div key={company.id} className="bg-white border border-stone-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-rose-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800">{company.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">Professional wedding planner</p>
                      </div>
                      {!alreadyRequested && !isRequesting && (
                        <button onClick={() => openRequest(company.id)}
                          className="flex items-center gap-1.5 text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 transition-colors flex-shrink-0">
                          <Send className="w-3 h-3" /> Connect
                        </button>
                      )}
                      {alreadyRequested && statusBadge(conn.status)}
                    </div>

                    {isRequesting && (
                      <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                        <input
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="Add a note (optional) — e.g. Wedding in June 2026, Jaipur"
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setRequesting(null)}
                            className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                          <button onClick={() => handleRequest(company.id)} disabled={isPending}
                            className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                            Send request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
