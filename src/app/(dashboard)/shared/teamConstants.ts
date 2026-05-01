// Shared constants — safe to import in both server and client components

export const EVENT_ROLES = [
  { value: 'project_head',  label: 'Project Head'   },
  { value: 'coordinator',   label: 'Coordinator'    },
  { value: 'accounts',      label: 'Accounts'       },
  { value: 'logistics',     label: 'Logistics'      },
  { value: 'hospitality',   label: 'Hospitality'    },
  { value: 'fb_team',       label: 'F&B Team'       },
  { value: 'decor_team',    label: 'Decor Team'     },
  { value: 'creative',      label: 'Creative'       },
  { value: 'photography',   label: 'Photography'    },
  { value: 'view_only',     label: 'View Only'      },
]

export const COMPANY_ROLES = [
  { value: 'owner',         label: 'Owner',          desc: 'Full access, billing' },
  { value: 'admin',         label: 'Admin',           desc: 'Manage team & all events' },
  { value: 'project_head',  label: 'Project Head',    desc: 'Leads assigned events' },
  { value: 'coordinator',   label: 'Coordinator',     desc: 'Manages guests, tasks, vendors' },
  { value: 'accounts',      label: 'Accounts',        desc: 'Budget & payments only' },
  { value: 'logistics',     label: 'Logistics',       desc: 'Rooms, transport, ground control' },
  { value: 'hospitality',   label: 'Hospitality',     desc: 'Guests & accommodation' },
  { value: 'fb_team',       label: 'F&B Team',        desc: 'Food & beverage ops' },
  { value: 'decor_team',    label: 'Decor Team',      desc: 'Decor tasks & documents' },
  { value: 'creative',      label: 'Creative',        desc: 'Documents & deliverables' },
  { value: 'photography',   label: 'Photography',     desc: 'Deliverables & media' },
  { value: 'view_only',     label: 'View Only',       desc: 'Read-only access' },
]
