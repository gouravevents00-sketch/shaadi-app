'use client'

import { useState } from 'react'
import EventTeamTab, { CompanyMember, EventTeamMember } from '@/components/shared/EventTeamTab'
import StaffTasksPanel from './StaffTasksPanel'

interface StaffTask {
  id: string; title: string; description: string | null; category: string
  priority: string; status: string; due_date: string | null; due_time: string | null
  assigned_to: string | null; assigned_name: string | null; event_id: string | null
  completed_at: string | null; created_at: string
}

export default function TeamPageWrapper({
  weddingId, eventDate, companyMembers, teamMembers, myRole, companyId, appUrl,
  staffTasks, events,
}: {
  weddingId: string
  eventDate: string | null
  companyMembers: CompanyMember[]
  teamMembers: EventTeamMember[]
  myRole: string
  companyId: string
  appUrl: string
  staffTasks: StaffTask[]
  events: { id: string; name: string; date: string }[]
}) {
  const [tab, setTab] = useState<'roster' | 'tasks'>('roster')

  const taskCount = staffTasks.filter(t => t.status !== 'done').length

  return (
    <div>
      {/* Tab switcher */}
      <div className="border-b border-stone-200 bg-white px-6 flex gap-0">
        {(['roster', 'tasks'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-rose-700 text-rose-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t === 'tasks' ? (
              <span className="flex items-center gap-1.5">
                Tasks
                {taskCount > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {taskCount}
                  </span>
                )}
              </span>
            ) : 'Roster'}
          </button>
        ))}
      </div>

      {tab === 'roster' ? (
        <EventTeamTab
          weddingId={weddingId}
          orgEventId={null}
          eventDate={eventDate}
          companyMembers={companyMembers}
          teamMembers={teamMembers}
          myRole={myRole}
          companyId={companyId}
          appUrl={appUrl}
        />
      ) : (
        <StaffTasksPanel
          weddingId={weddingId}
          teamMembers={teamMembers.map(m => ({ id: m.id, userId: m.userId, name: m.name, role: m.role }))}
          events={events}
          initialTasks={staffTasks}
        />
      )}
    </div>
  )
}
