'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, CircleDot, Plus, Trash2, Sparkles, CalendarDays,
  Users, Wallet, Store, Handshake, Loader2, ArrowRight, Phone, Star,
  ChevronDown, ChevronUp, X, Crown, Bell, Copy, MessageCircle,
  Plane, Car, Train, MapPin, Edit2, Share2, UserPlus, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  updateTaskStatus, addTask, deleteTask, updateGuestCount, upgradeToPro,
  connectToCreativeEra, addCelebrationGuest, deleteCelebrationGuest,
  updateCelebrationGuest, addBudgetItem, deleteBudgetItem, updateBudgetActual,
  addCelebrationVendor, updateCelebrationVendor, deleteCelebrationVendor,
  updateTaskDetails, getPartnerInviteToken,
  addRoom, deleteRoom, allotRoom, removeFromRoom, addRemark, deleteRemark,
} from './actions'

// ── Types ──────────────────────────────────────────────────────
type CelebGuest = {
  id: string; celebration_id: string; name: string; phone: string | null
  email: string | null; dietary: string | null; plus_count: number; side: string
  family_group: string | null; is_vip: boolean | null; rsvp_status: string | null
  rsvp_token: string | null; notes: string | null; arrival_mode: string | null
  arrival_time: string | null; flight_no: string | null; needs_pickup: boolean | null
  room_id: string | null
}
type BudgetItem = {
  id: string; category: string; description: string
  estimated: number; actual: number | null; status: string
  advance_paid: number | null; payment_due: string | null; vendor_name: string | null
}
type CelebVendor = {
  id: string; category: string; name: string; contact_name: string | null
  phone: string | null; email: string | null; total_amount: number
  advance_paid: number; status: string; notes: string | null; payment_due: string | null
}
type CelebRoom = {
  id: string; name: string; room_type: string; capacity: number
  floor_block: string | null; notes: string | null
  // computed
  occupants?: CelebGuest[]
}
type Remark = {
  id: string; body: string; category: string; is_for_agency: boolean; resolved: boolean; created_at: string
}
type Task = {
  id: string; title: string; category: string
  status: 'pending' | 'in_progress' | 'done'
  due_date: string | null; notes: string | null; ai_generated: boolean; created_at: string
}
type Celebration = {
  id: string; user_id: string; type: string; name: string
  bride_name: string | null; groom_name: string | null
  event_date: string | null; end_date: string | null
  venue: string | null; city: string | null
  budget: number; guest_count: number
  wedding_style: string | null; requirements: string[] | null
  managed_by: string | null
}
type CelebFunction = {
  id: string; name: string; date: string
  start_time: string | null; end_time: string | null
  venue_space: string | null; expected_count: number | null; sort_order: number
}
type Tab = 'checklist' | 'guests' | 'budget' | 'vendors' | 'rooms' | 'comms' | 'ground' | 'downloads' | 'ai'

// ── Constants ─────────────────────────────────────────────────
const TYPE_EMOJIS: Record<string, string> = {
  wedding: '💒', sagai: '💍', sangeet: '🎵', namkaran: '👶', mundan: '✂️',
  annaprashan: '🍚', janeu: '🧵', godh_bharai: '🤰', griha_pravesh: '🏠',
  puja: '🪔', birthday: '🎂', anniversary: '❤️', graduation: '🎓',
  retirement: '🎉', kitty: '👗', other: '✨',
}
const DIETARY = ['', 'Veg', 'Non-Veg', 'Jain', 'Vegan', 'Gluten Free']
const SIDES = [{ v: 'both', l: 'Both sides' }, { v: 'bride', l: 'Bride side' }, { v: 'groom', l: 'Groom side' }]
const RSVP_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
}
const RSVP_LABELS = { confirmed: 'Attending ✓', declined: 'Declined', pending: 'Pending' }

const VENDOR_CATS = [
  'Photography', 'Videography', 'Catering', 'Decoration', 'Music & DJ',
  'Makeup & Hair', 'Mehandi Artist', 'Transportation', 'Dhol & Band',
  'Pandit', 'Venue', 'Tent & Furniture', 'Lighting', 'Invitations', 'Other',
]
const VENDOR_STATUS_COLORS: Record<string, string> = {
  enquired: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-blue-100 text-blue-700',
  booked: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
}
const BUDGET_CATS = ['Venue', 'Catering', 'Decoration', 'Photography & Video', 'Music & Entertainment',
  'Mehandi', 'Makeup & Hair', 'Clothes & Jewellery', 'Invitations', 'Transport', 'Accommodation', 'Other']

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtAmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

// ── Main Component ─────────────────────────────────────────────
export default function MyCelebrationClient({
  celebration, initialTasks, initialPlan, initialConnection,
  initialGuests, initialBudget, initialVendors, initialFunctions,
  initialRooms, initialRemarks,
}: {
  celebration: Celebration
  initialTasks: Task[]
  initialPlan: string
  initialConnection: { id: string; status: string; wedding_id: string | null } | null
  initialGuests: CelebGuest[]
  initialBudget: BudgetItem[]
  initialVendors: CelebVendor[]
  initialFunctions: CelebFunction[]
  initialRooms: CelebRoom[]
  initialRemarks: Remark[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('checklist')
  const [isPro, setIsPro] = useState(initialPlan === 'pro')
  const [connection, setConnection] = useState(initialConnection)
  const [guestCount, setGuestCount] = useState(celebration.guest_count)
  const [editingGuestCount, setEditingGuestCount] = useState(false)
  const [guestCountInput, setGuestCountInput] = useState(String(celebration.guest_count))
  const [isPending, startTransition] = useTransition()

  // Tasks
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCat, setNewTaskCat] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all')

  // Guests
  const [guests, setGuests] = useState<CelebGuest[]>(initialGuests)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestDrawer, setGuestDrawer] = useState<CelebGuest | null>(null)
  const [guestSearch, setGuestSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState<string>('all')
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '', dietary: '', plus_count: '0', side: 'both', family_group: '', is_vip: false })

  // Budget
  const [budget, setBudget] = useState<BudgetItem[]>(initialBudget)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ category: '', description: '', estimated: '', advance_paid: '' })

  // Functions
  const [functions] = useState<CelebFunction[]>(initialFunctions)

  // Rooms
  const [rooms, setRooms] = useState<CelebRoom[]>(initialRooms)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', room_type: 'double', capacity: '2', floor_block: '' })
  const [allotting, setAllotting] = useState<string | null>(null) // roomId being allotted

  // Remarks
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks)
  const [showAddRemark, setShowAddRemark] = useState(false)
  const [remarkForm, setRemarkForm] = useState({ body: '', category: 'general', is_for_agency: false })

  // AI chat
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Vendors
  const [vendors, setVendors] = useState<CelebVendor[]>(initialVendors)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [vendorForm, setVendorForm] = useState({ category: '', name: '', phone: '', contact_name: '', total_amount: '', advance_paid: '', status: 'enquired', notes: '' })
  const [vendorCatFilter, setVendorCatFilter] = useState('all')

  // Notifications + Invite
  const [showNotifications, setShowNotifications] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const doneCount = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const daysLeft = celebration.event_date ? Math.ceil((new Date(celebration.event_date).getTime() - Date.now()) / 86400000) : null
  const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed').reduce((s, g) => s + 1 + g.plus_count, 0)
  const totalBudget = budget.reduce((s, b) => s + (b.actual ?? b.estimated), 0)
  const totalVendorPaid = vendors.reduce((s, v) => s + (v.advance_paid ?? 0), 0)
  const totalVendorAmt = vendors.reduce((s, v) => s + (v.total_amount ?? 0), 0)

  // ── Task Handlers ──
  function cycleStatus(task: Task) {
    const next = { pending: 'in_progress' as const, in_progress: 'done' as const, done: 'pending' as const }
    const newStatus = next[task.status]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, newStatus)
      if ('error' in res) { toast.error(res.error); setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)) }
    })
  }
  function handleAddTask() {
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      const res = await addTask(celebration.id, newTaskTitle.trim(), newTaskCat || 'General')
      if ('error' in res) { toast.error(res.error); return }
      const t: Task = { id: res.id, title: newTaskTitle.trim(), category: newTaskCat || 'General', status: 'pending', due_date: newTaskDue || null, notes: null, ai_generated: false, created_at: new Date().toISOString() }
      setTasks(prev => [...prev, t])
      if (newTaskDue) startTransition(async () => { await updateTaskDetails(res.id, { due_date: newTaskDue }) })
      setNewTaskTitle(''); setNewTaskCat(''); setNewTaskDue(''); setShowAddTask(false)
      toast.success('Task added')
    })
  }
  function handleDeleteTask(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    startTransition(async () => {
      const res = await deleteTask(task.id)
      if ('error' in res) { toast.error(res.error); setTasks(prev => [...prev, task]) }
    })
  }

  // ── Guest Handlers ──
  function handleAddGuest() {
    if (!guestForm.name.trim()) return
    startTransition(async () => {
      const res = await addCelebrationGuest(celebration.id, {
        name: guestForm.name, phone: guestForm.phone || undefined,
        dietary: guestForm.dietary || undefined,
        plus_count: parseInt(guestForm.plus_count) || 0, side: guestForm.side,
      })
      if ('error' in res) { toast.error(res.error); return }
      const newG: CelebGuest = {
        id: res.id, celebration_id: celebration.id, name: guestForm.name,
        phone: guestForm.phone || null, email: guestForm.email || null,
        dietary: guestForm.dietary || null, plus_count: parseInt(guestForm.plus_count) || 0,
        side: guestForm.side, family_group: guestForm.family_group || null,
        is_vip: guestForm.is_vip, rsvp_status: 'pending', rsvp_token: null, notes: null,
        arrival_mode: null, arrival_time: null, flight_no: null, needs_pickup: null,
        room_id: null,
      }
      setGuests(prev => [...prev, newG])
      setGuestForm({ name: '', phone: '', email: '', dietary: '', plus_count: '0', side: 'both', family_group: '', is_vip: false })
      setShowAddGuest(false)
      toast.success(`${guestForm.name} added`)
    })
  }
  function handleUpdateRsvp(guestId: string, status: string) {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, rsvp_status: status } : g))
    startTransition(async () => { await updateCelebrationGuest(guestId, { rsvp_status: status }) })
  }
  function copyRsvpLink(token: string | null) {
    if (!token) { toast.error('RSVP link not ready yet'); return }
    navigator.clipboard.writeText(`${window.location.origin}/rsvp/${token}`)
    toast.success('RSVP link copied!')
  }
  function waLink(phone: string | null, name: string) {
    if (!phone) { toast.error('No phone number on file'); return }
    const clean = phone.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi ${name}! You're invited to our celebration. Please RSVP by clicking the link.`)
    window.open(`https://wa.me/${clean.startsWith('91') ? clean : '91' + clean}?text=${msg}`, '_blank')
  }

  // ── Budget Handlers ──
  function handleAddBudget() {
    if (!budgetForm.description.trim() || !budgetForm.category) return
    startTransition(async () => {
      const res = await addBudgetItem(celebration.id, {
        category: budgetForm.category, description: budgetForm.description,
        estimated: parseFloat(budgetForm.estimated) || 0,
      })
      if ('error' in res) { toast.error(res.error); return }
      setBudget(prev => [...prev, {
        id: res.id, category: budgetForm.category, description: budgetForm.description,
        estimated: parseFloat(budgetForm.estimated) || 0, actual: null, status: 'planned',
        advance_paid: parseFloat(budgetForm.advance_paid) || 0, payment_due: null, vendor_name: null,
      }])
      setBudgetForm({ category: '', description: '', estimated: '', advance_paid: '' })
      setShowAddBudget(false)
      toast.success('Budget item added')
    })
  }

  // ── Vendor Handlers ──
  function handleAddVendor() {
    if (!vendorForm.name.trim() || !vendorForm.category) return
    startTransition(async () => {
      const res = await addCelebrationVendor(celebration.id, {
        category: vendorForm.category, name: vendorForm.name,
        contact_name: vendorForm.contact_name || undefined, phone: vendorForm.phone || undefined,
        total_amount: parseFloat(vendorForm.total_amount) || 0,
        advance_paid: parseFloat(vendorForm.advance_paid) || 0,
        status: vendorForm.status, notes: vendorForm.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setVendors(prev => [...prev, {
        id: res.id, category: vendorForm.category, name: vendorForm.name,
        contact_name: vendorForm.contact_name || null, phone: vendorForm.phone || null,
        email: null, total_amount: parseFloat(vendorForm.total_amount) || 0,
        advance_paid: parseFloat(vendorForm.advance_paid) || 0,
        status: vendorForm.status, notes: vendorForm.notes || null, payment_due: null,
      }])
      setVendorForm({ category: '', name: '', phone: '', contact_name: '', total_amount: '', advance_paid: '', status: 'enquired', notes: '' })
      setShowAddVendor(false)
      toast.success(`${vendorForm.name} added`)
    })
  }

  // ── Room Handlers ──
  function handleAddRoom() {
    if (!roomForm.name.trim()) return
    startTransition(async () => {
      const res = await addRoom(celebration.id, {
        name: roomForm.name, room_type: roomForm.room_type,
        capacity: parseInt(roomForm.capacity) || 2, floor_block: roomForm.floor_block || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setRooms(prev => [...prev, { id: res.id, name: roomForm.name, room_type: roomForm.room_type, capacity: parseInt(roomForm.capacity) || 2, floor_block: roomForm.floor_block || null, notes: null, occupants: [] }])
      setRoomForm({ name: '', room_type: 'double', capacity: '2', floor_block: '' })
      setShowAddRoom(false)
      toast.success('Room added')
    })
  }
  function handleAllotGuest(roomId: string, guestId: string) {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    startTransition(async () => {
      const res = await allotRoom({ roomId, guestId, celebrationId: celebration.id })
      if ('error' in res) { toast.error(res.error); return }
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, room_id: roomId } : g))
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, occupants: [...(r.occupants || []), guest] } : r))
      setAllotting(null)
      toast.success(`${guest.name} assigned to room`)
    })
  }
  function handleRemoveFromRoom(guestId: string, roomId: string) {
    const guest = guests.find(g => g.id === guestId)
    startTransition(async () => {
      await removeFromRoom(guestId, roomId)
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, room_id: null } : g))
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, occupants: (r.occupants || []).filter(o => o.id !== guestId) } : r))
      if (guest) toast.success(`${guest.name} removed from room`)
    })
  }

  // ── Remark Handlers ──
  function handleAddRemark() {
    if (!remarkForm.body.trim()) return
    startTransition(async () => {
      const res = await addRemark(celebration.id, remarkForm)
      if ('error' in res) { toast.error(res.error); return }
      const newR: Remark = { id: res.id, body: remarkForm.body, category: remarkForm.category, is_for_agency: remarkForm.is_for_agency, resolved: false, created_at: new Date().toISOString() }
      setRemarks(prev => [newR, ...prev])
      setRemarkForm({ body: '', category: 'general', is_for_agency: false })
      setShowAddRemark(false)
      toast.success('Note added')
    })
  }

  // ── AI Chat ──
  async function handleAiSend() {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim()
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setAiLoading(true)
    try {
      const context = `Wedding: ${celebration.bride_name || ''} & ${celebration.groom_name || ''}, Date: ${celebration.event_date || 'TBD'}, Venue: ${celebration.venue || 'TBD'}, City: ${celebration.city || 'TBD'}, Functions: ${functions.map(f => f.name).join(', ')}, Guests: ${guests.length}, Style: ${celebration.wedding_style || 'traditional'}`
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context, type: 'b2c_wedding' }),
      })
      const data = await res.json()
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message || 'Something went wrong.' }])
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    }
    setAiLoading(false)
  }

  // ── CSV Export ──
  function exportCSV(type: 'guests' | 'budget' | 'vendors') {
    let csv = ''
    let filename = ''
    if (type === 'guests') {
      csv = 'Name,Phone,Email,Side,Family Group,RSVP,Dietary,Plus Count,Room\n' +
        guests.map(g => [g.name, g.phone || '', g.email || '', g.side, g.family_group || '', g.rsvp_status || 'pending', g.dietary || '', g.plus_count, rooms.find(r => r.id === g.room_id)?.name || ''].join(',')).join('\n')
      filename = 'guests.csv'
    } else if (type === 'budget') {
      csv = 'Category,Item,Estimated,Actual,Status\n' +
        budget.map(b => [b.category, b.description, b.estimated, b.actual || '', b.status].join(',')).join('\n')
      filename = 'budget.csv'
    } else {
      csv = 'Category,Name,Contact,Phone,Total,Advance Paid,Balance,Status\n' +
        vendors.map(v => [v.category, v.name, v.contact_name || '', v.phone || '', v.total_amount, v.advance_paid, v.total_amount - v.advance_paid, v.status].join(',')).join('\n')
      filename = 'vendors.csv'
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filename} download started`)
  }

  const filteredTasks = tasks.filter(t =>
    taskFilter === 'all' ? true : taskFilter === 'done' ? t.status === 'done' : t.status !== 'done'
  )
  const tasksByCategory = filteredTasks.reduce<Record<string, Task[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || []
    acc[t.category].push(t)
    return acc
  }, {})

  const filteredGuests = guests.filter(g => {
    const matchSearch = !guestSearch || g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone?.includes(guestSearch)
    const matchRsvp = rsvpFilter === 'all' || g.rsvp_status === rsvpFilter
    return matchSearch && matchRsvp
  })

  const filteredVendors = vendors.filter(v => vendorCatFilter === 'all' || v.category === vendorCatFilter)
  const vendorCategories = [...new Set(vendors.map(v => v.category))]

  const isOverdue = (due: string | null) => due && new Date(due) < new Date() && true

  // Notification computations
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const in14 = new Date(today); in14.setDate(in14.getDate() + 14)
  const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < today)
  const upcomingTasks = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) >= today && new Date(t.due_date) <= in7)
  const upcomingPayments = vendors.filter(v => v.payment_due && new Date(v.payment_due) >= today && new Date(v.payment_due) <= in14 && v.status !== 'paid')
  const notifCount = overdueTasks.length + upcomingTasks.length + upcomingPayments.length

  async function handleShowInvite() {
    setShowInvite(true)
    if (inviteToken) return
    setInviteLoading(true)
    const res = await getPartnerInviteToken(celebration.id)
    setInviteLoading(false)
    if ('token' in res) setInviteToken(res.token ?? null)
    else toast.error(res.error)
  }

  function copyInviteLink() {
    if (!inviteToken) return
    navigator.clipboard.writeText(`${window.location.origin}/my/join/${inviteToken}`)
    toast.success('Invite link copied!')
  }
  function shareInviteWhatsApp() {
    if (!inviteToken) return
    const link = `${window.location.origin}/my/join/${inviteToken}`
    const msg = encodeURIComponent(`Let's plan our ${celebration.name} together! Join using this link: ${link}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">

      {/* ── Top nav ── */}
      <nav className="border-b border-stone-100 bg-white sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/my" className="text-stone-400 hover:text-stone-700 transition-colors">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 text-sm truncate">
            {TYPE_EMOJIS[celebration.type] || '✨'} {celebration.bride_name && celebration.groom_name
              ? `${celebration.bride_name} & ${celebration.groom_name}`
              : celebration.bride_name || celebration.groom_name || celebration.name}
          </p>
          <p className={`text-xs truncate ${daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? 'text-rose-600 font-medium' : 'text-stone-400'}`}>
            {celebration.event_date ? (
              daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left`
              : daysLeft === 0 ? 'Today! 🎉'
              : fmtDate(celebration.event_date)
            ) : 'Date not set'}
            {celebration.end_date && celebration.end_date !== celebration.event_date && ` → ${fmtDate(celebration.end_date)}`}
            {celebration.city && ` · ${celebration.city}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPro && <span className="inline-flex items-center gap-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium"><Crown className="w-3 h-3" /> Pro</span>}
          <button onClick={handleShowInvite} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Invite partner">
            <UserPlus className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNotifications(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors relative" title="Reminders">
            <Bell className="w-4 h-4" />
            {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>
      </nav>

      {/* ── Hero Stats ── */}
      <div className="bg-white border-b border-stone-100 px-4 py-4">
        <div className="flex gap-3">
          {/* Progress */}
          <div className="flex-1 bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-500 mb-1">Tasks</p>
            <p className="text-lg font-bold text-stone-900">{pct}%</p>
            <div className="h-1.5 bg-stone-200 rounded-full mt-1.5">
              <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-stone-400 mt-1">{doneCount}/{tasks.length} done</p>
          </div>
          {/* Guests */}
          <div className="flex-1 bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-500 mb-1">Guests</p>
            {isPro ? (
              <>
                <p className="text-lg font-bold text-stone-900">{confirmedGuests}</p>
                <p className="text-xs text-stone-400 mt-1">{guests.length} total invited</p>
              </>
            ) : (
              <>
                {editingGuestCount ? (
                  <input type="number" min="0" value={guestCountInput}
                    onChange={e => setGuestCountInput(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(guestCountInput) || 0
                      setGuestCount(n); setEditingGuestCount(false)
                      startTransition(async () => { await updateGuestCount(celebration.id, n) })
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    autoFocus className="w-16 text-lg font-bold border-b border-rose-400 bg-transparent focus:outline-none" />
                ) : (
                  <button onClick={() => { setEditingGuestCount(true); setGuestCountInput(String(guestCount)) }}
                    className="text-lg font-bold text-stone-900 hover:text-rose-600">~{guestCount}</button>
                )}
                <p className="text-xs text-stone-400 mt-1">estimated</p>
              </>
            )}
          </div>
          {/* Budget */}
          <div className="flex-1 bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-500 mb-1">Budget</p>
            <p className="text-lg font-bold text-stone-900">
              {isPro && budget.length > 0 ? `₹${(totalBudget / 100000).toFixed(1)}L` : '—'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {isPro && vendors.length > 0 ? `₹${(totalVendorPaid / 100000).toFixed(1)}L paid` : 'Start tracking'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Functions timeline strip ── */}
      {functions.length > 0 && (
        <div className="bg-white border-b border-stone-100 px-4 py-2.5 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {functions.map(fn => (
              <div key={fn.id} className="flex-shrink-0 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5 text-center min-w-[80px]">
                <p className="text-[10px] text-stone-400">{new Date(fn.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                <p className="text-xs font-semibold text-stone-800 mt-0.5">{fn.name}</p>
                {fn.start_time && <p className="text-[10px] text-rose-500 font-medium">{fn.start_time.slice(0, 5)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upgrade Banner (free users) ── */}
      {!isPro && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-rose-600 to-rose-700 rounded-2xl p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-rose-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Unlock Pro — it's free!</p>
            <p className="text-xs text-rose-200">Guests, budget, vendors — all in one place</p>
          </div>
          <button disabled={isPending} onClick={() => {
            startTransition(async () => {
              const res = await upgradeToPro(celebration.id)
              if ('error' in res) { toast.error(res.error); return }
              setIsPro(true)
              toast.success('Pro unlocked! 🎉')
              router.refresh()
            })
          }} className="flex-shrink-0 bg-white text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors">
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Unlock'}
          </button>
        </div>
      )}

      {/* ── Tab Content ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {/* Filter + Add */}
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-stone-200 rounded-lg overflow-hidden flex-1">
                {(['all', 'pending', 'done'] as const).map(f => (
                  <button key={f} onClick={() => setTaskFilter(f)}
                    className={`flex-1 text-xs py-1.5 font-medium transition-colors ${taskFilter === f ? 'bg-rose-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                    {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddTask(v => !v)}
                className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Task
              </button>
            </div>

            {showAddTask && (
              <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Task title (e.g. Book the venue)" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }} />
                <div className="flex gap-2">
                  <Input value={newTaskCat} onChange={e => setNewTaskCat(e.target.value)}
                    placeholder="Category (e.g. Venue, Catering)" className="flex-1" />
                  <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
                    className="flex-1" min={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddTask(false)} className="text-xs text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                  <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || isPending}
                    className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                </div>
              </div>
            )}

            {Object.keys(tasksByCategory).length === 0 ? (
              <div className="text-center py-14">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p className="text-stone-500 text-sm font-medium">
                  {taskFilter === 'done' ? 'Nothing completed yet' : 'All tasks done! 🎉'}
                </p>
              </div>
            ) : (
              Object.entries(tasksByCategory).map(([cat, catTasks]) => {
                const catDone = catTasks.filter(t => t.status === 'done').length
                return (
                  <div key={cat} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-600">{cat}</p>
                      <p className="text-xs text-stone-400">{catDone}/{catTasks.length}</p>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {catTasks.map(task => {
                        const Icon = task.status === 'done' ? CheckCircle2 : task.status === 'in_progress' ? CircleDot : Circle
                        const overdue = isOverdue(task.due_date) && task.status !== 'done'
                        return (
                          <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 group transition-colors">
                            <button onClick={() => cycleStatus(task)} className={`mt-0.5 flex-shrink-0 ${task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-stone-300'}`}>
                              <Icon className="w-[18px] h-[18px]" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {task.title}
                                {task.ai_generated && task.status === 'pending' && (
                                  <span className="ml-1.5 text-[10px] text-stone-300">AI</span>
                                )}
                              </p>
                              {task.due_date && (
                                <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                                  <Bell className="w-3 h-3" />
                                  {overdue ? 'Overdue — ' : ''}{fmtDate(task.due_date)}
                                </p>
                              )}
                              {task.notes && <p className="text-xs text-stone-400 mt-0.5">{task.notes}</p>}
                            </div>
                            <button onClick={() => handleDeleteTask(task)}
                              className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* GUESTS TAB */}
        {activeTab === 'guests' && (
          <div className="space-y-4">
            {!isPro ? (
              <ProGate tab="guests" onUpgrade={() => {
                startTransition(async () => {
                  const res = await upgradeToPro(celebration.id)
                  if ('error' in res) { toast.error(res.error); return }
                  setIsPro(true); toast.success('Pro unlocked! 🎉'); router.refresh()
                })
              }} isPending={isPending} />
            ) : (
              <>
                {/* Stats bar */}
                <div className="flex gap-2 text-center">
                  {[
                    { label: 'Total', value: guests.reduce((s, g) => s + 1 + g.plus_count, 0), color: 'text-stone-800' },
                    { label: 'Attending', value: guests.filter(g => g.rsvp_status === 'confirmed').reduce((s, g) => s + 1 + g.plus_count, 0), color: 'text-emerald-600' },
                    { label: 'Pending', value: guests.filter(g => g.rsvp_status === 'pending').length, color: 'text-amber-600' },
                    { label: 'Declined', value: guests.filter(g => g.rsvp_status === 'declined').length, color: 'text-red-500' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 bg-white border border-stone-100 rounded-xl py-2.5">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Search + filter + add */}
                <div className="flex gap-2">
                  <Input value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                    placeholder="Search by name or phone..." className="flex-1 text-sm" />
                  <button onClick={() => setShowAddGuest(v => !v)}
                    className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* RSVP filter pills */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[['all', 'All'], ['pending', 'Pending'], ['confirmed', 'Attending'], ['declined', 'Declined']].map(([v, l]) => (
                    <button key={v} onClick={() => setRsvpFilter(v)}
                      className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 transition-colors font-medium ${rsvpFilter === v ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* Add Guest form */}
                {showAddGuest && (
                  <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-stone-800">Add new guest</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Name *</label>
                        <Input value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))} placeholder="Ramesh Sharma" autoFocus />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Phone</label>
                        <Input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" type="tel" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Plus ones</label>
                        <Input type="number" min="0" max="10" value={guestForm.plus_count} onChange={e => setGuestForm(f => ({ ...f, plus_count: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Dietary</label>
                        <select value={guestForm.dietary} onChange={e => setGuestForm(f => ({ ...f, dietary: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                          {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Side</label>
                        <select value={guestForm.side} onChange={e => setGuestForm(f => ({ ...f, side: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                          {SIDES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Family group (optional)</label>
                        <Input value={guestForm.family_group} onChange={e => setGuestForm(f => ({ ...f, family_group: e.target.value }))} placeholder="e.g. Sharma Family, College Friends" />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="vip" checked={guestForm.is_vip} onChange={e => setGuestForm(f => ({ ...f, is_vip: e.target.checked }))} className="rounded border-stone-300 text-rose-700" />
                        <label htmlFor="vip" className="text-xs text-stone-600 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> VIP guest</label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddGuest(false)} className="text-xs text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                      <button onClick={handleAddGuest} disabled={!guestForm.name.trim() || isPending}
                        className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                    </div>
                  </div>
                )}

                {/* Guest list */}
                {filteredGuests.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                    <Users className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                    <p className="text-stone-500 text-sm">{guestSearch || rsvpFilter !== 'all' ? 'No guests found' : 'No guests yet'}</p>
                    {!guestSearch && rsvpFilter === 'all' && (
                      <button onClick={() => setShowAddGuest(true)} className="text-xs text-rose-600 mt-2">+ Add first guest</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredGuests.map(g => (
                      <div key={g.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center gap-3"
                        onClick={() => setGuestDrawer(g)}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${g.is_vip ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {g.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-stone-800 truncate">{g.name}</p>
                            {g.is_vip && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                            {g.plus_count > 0 && <span className="text-xs text-stone-400 flex-shrink-0">+{g.plus_count}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {g.family_group && <span className="text-[10px] text-stone-400">{g.family_group}</span>}
                            {g.dietary && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded">{g.dietary}</span>}
                            {g.side !== 'both' && <span className="text-[10px] text-stone-400">{g.side === 'bride' ? '🌸 Bride' : '🤵 Groom'}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${RSVP_COLORS[g.rsvp_status as keyof typeof RSVP_COLORS] || 'bg-stone-100 text-stone-500'}`}>
                            {RSVP_LABELS[g.rsvp_status as keyof typeof RSVP_LABELS] || 'Pending'}
                          </span>
                          {g.phone && (
                            <button onClick={e => { e.stopPropagation(); waLink(g.phone, g.name) }}
                              className="text-stone-300 hover:text-green-500 transition-colors">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-4">
            {!isPro ? (
              <ProGate tab="budget" onUpgrade={() => {
                startTransition(async () => {
                  const res = await upgradeToPro(celebration.id)
                  if ('error' in res) { toast.error(res.error); return }
                  setIsPro(true); toast.success('Pro unlocked! 🎉'); router.refresh()
                })
              }} isPending={isPending} />
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-stone-900">{fmtAmt(totalBudget)}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Total estimated</p>
                  </div>
                  <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-emerald-600">{fmtAmt(budget.filter(b => b.status === 'paid').reduce((s, b) => s + (b.actual ?? b.estimated), 0))}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Paid</p>
                  </div>
                  <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-amber-600">{fmtAmt(budget.filter(b => b.status !== 'paid').reduce((s, b) => s + (b.actual ?? b.estimated), 0))}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Remaining</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-stone-700">{budget.length} items</p>
                  <button onClick={() => setShowAddBudget(v => !v)}
                    className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add item
                  </button>
                </div>

                {showAddBudget && (
                  <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Category *</label>
                        <select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                          <option value="">Select...</option>
                          {BUDGET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Estimated (₹)</label>
                        <Input type="number" min="0" value={budgetForm.estimated} onChange={e => setBudgetForm(f => ({ ...f, estimated: e.target.value }))} placeholder="0" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Item *</label>
                        <Input value={budgetForm.description} onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Mandap decoration" autoFocus />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddBudget(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                      <button onClick={handleAddBudget} disabled={!budgetForm.description.trim() || !budgetForm.category || isPending}
                        className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                    </div>
                  </div>
                )}

                {budget.length === 0 && !showAddBudget ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                    <Wallet className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                    <p className="text-stone-500 text-sm">No items yet</p>
                    <button onClick={() => setShowAddBudget(true)} className="text-xs text-rose-600 mt-2">+ Add first item</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {budget.map(item => (
                      <div key={item.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{item.description}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-stone-900">{fmtAmt(item.actual ?? item.estimated)}</p>
                          <select value={item.status}
                            onChange={e => {
                              setBudget(prev => prev.map(b => b.id === item.id ? { ...b, status: e.target.value } : b))
                              startTransition(async () => { await updateBudgetActual(item.id, item.actual ?? item.estimated, e.target.value) })
                            }}
                            onClick={e => e.stopPropagation()}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border-0 focus:outline-none cursor-pointer ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : item.status === 'booked' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>
                            <option value="planned">Planned</option>
                            <option value="booked">Booked</option>
                            <option value="paid">Paid ✓</option>
                          </select>
                        </div>
                        <button onClick={() => {
                          setBudget(prev => prev.filter(b => b.id !== item.id))
                          startTransition(async () => {
                            const res = await deleteBudgetItem(item.id)
                            if ('error' in res) { toast.error(res.error); setBudget(prev => [...prev, item]) }
                          })
                        }} className="text-stone-200 hover:text-red-400 transition-colors ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            {!isPro ? (
              <ProGate tab="vendors" onUpgrade={() => {
                startTransition(async () => {
                  const res = await upgradeToPro(celebration.id)
                  if ('error' in res) { toast.error(res.error); return }
                  setIsPro(true); toast.success('Pro unlocked! 🎉'); router.refresh()
                })
              }} isPending={isPending} />
            ) : (
              <>
                {/* Payment summary */}
                {vendors.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-stone-900">{vendors.length}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Vendors</p>
                    </div>
                    <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-emerald-600">{fmtAmt(totalVendorPaid)}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Advance diya</p>
                    </div>
                    <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-amber-600">{fmtAmt(totalVendorAmt - totalVendorPaid)}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Balance due</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  {vendorCategories.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto flex-1 pb-0.5">
                      <button onClick={() => setVendorCatFilter('all')}
                        className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${vendorCatFilter === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
                        All
                      </button>
                      {vendorCategories.map(cat => (
                        <button key={cat} onClick={() => setVendorCatFilter(cat)}
                          className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${vendorCatFilter === cat ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowAddVendor(v => !v)}
                    className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {showAddVendor && (
                  <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-stone-800">Add new vendor</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Category *</label>
                        <select value={vendorForm.category} onChange={e => setVendorForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                          <option value="">Select...</option>
                          {VENDOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Status</label>
                        <select value={vendorForm.status} onChange={e => setVendorForm(f => ({ ...f, status: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                          <option value="enquired">Enquired</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="booked">Booked ✓</option>
                          <option value="paid">Paid ✓✓</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Name *</label>
                        <Input value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Moments Studio" autoFocus />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Contact person</label>
                        <Input value={vendorForm.contact_name} onChange={e => setVendorForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Rahul bhai" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Phone</label>
                        <Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" type="tel" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Total amount (₹)</label>
                        <Input type="number" min="0" value={vendorForm.total_amount} onChange={e => setVendorForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Advance paid (₹)</label>
                        <Input type="number" min="0" value={vendorForm.advance_paid} onChange={e => setVendorForm(f => ({ ...f, advance_paid: e.target.value }))} placeholder="0" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Notes</label>
                        <Input value={vendorForm.notes} onChange={e => setVendorForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special notes..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddVendor(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                      <button onClick={handleAddVendor} disabled={!vendorForm.name.trim() || !vendorForm.category || isPending}
                        className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                    </div>
                  </div>
                )}

                {filteredVendors.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                    <Store className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                    <p className="text-stone-500 text-sm">No vendors yet</p>
                    <button onClick={() => setShowAddVendor(true)} className="text-xs text-rose-600 mt-2">+ Add first vendor</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredVendors.map(v => {
                      const balance = v.total_amount - v.advance_paid
                      return (
                        <div key={v.id} className="bg-white border border-stone-100 rounded-xl p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-base">
                              {v.category === 'Photography' ? '📸' : v.category === 'Catering' ? '🍽️' : v.category === 'Decoration' ? '💐' : v.category === 'Music & DJ' ? '🎵' : v.category === 'Makeup & Hair' ? '💄' : v.category === 'Transportation' ? '🚗' : v.category === 'Pandit' ? '🪔' : '🏪'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-stone-800">{v.name}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VENDOR_STATUS_COLORS[v.status] || 'bg-stone-100 text-stone-500'}`}>{v.status}</span>
                              </div>
                              {v.contact_name && <p className="text-xs text-stone-400 mt-0.5">{v.contact_name}</p>}
                              <p className="text-xs text-stone-400">{v.category}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {v.phone && (
                                <a href={`tel:${v.phone}`} onClick={e => e.stopPropagation()}
                                  className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-green-100 hover:text-green-600 transition-colors">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button onClick={() => {
                                setVendors(prev => prev.filter(x => x.id !== v.id))
                                startTransition(async () => {
                                  const res = await deleteCelebrationVendor(v.id)
                                  if ('error' in res) { toast.error(res.error); setVendors(prev => [...prev, v]) }
                                })
                              }} className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-red-100 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {v.total_amount > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-stone-50 flex items-center justify-between text-xs">
                              <span className="text-stone-500">Total: <span className="font-semibold text-stone-800">{fmtAmt(v.total_amount)}</span></span>
                              <span className="text-emerald-600">Diya: {fmtAmt(v.advance_paid)}</span>
                              <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-stone-400'}>
                                {balance > 0 ? `Due: ${fmtAmt(balance)}` : 'Fully paid ✓'}
                              </span>
                            </div>
                          )}
                          {v.notes && <p className="text-xs text-stone-400 mt-1.5 pt-1.5 border-t border-stone-50">{v.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-800">Room Allotment</p>
                <p className="text-xs text-stone-400">{rooms.length} rooms · {guests.filter(g => g.room_id).length}/{guests.length} guests allotted</p>
              </div>
              <button onClick={() => setShowAddRoom(v => !v)}
                className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add room
              </button>
            </div>

            {showAddRoom && (
              <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-800">Add new room</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 mb-1 block">Room name *</label>
                    <Input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="Room 101 / Garden Suite" autoFocus />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Type</label>
                    <select value={roomForm.room_type} onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                      {['single','double','suite','family','dormitory','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Capacity</label>
                    <Input type="number" min="1" max="20" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 mb-1 block">Floor / Wing (optional)</label>
                    <Input value={roomForm.floor_block} onChange={e => setRoomForm(f => ({ ...f, floor_block: e.target.value }))} placeholder="Ground Floor / Wing A" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddRoom(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                  <button onClick={handleAddRoom} disabled={!roomForm.name.trim() || isPending}
                    className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                </div>
              </div>
            )}

            {/* Unallotted guests count */}
            {guests.length > 0 && guests.filter(g => !g.room_id).length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">{guests.filter(g => !g.room_id).length} guests are not yet assigned to any room</p>
              </div>
            )}

            {rooms.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p className="text-stone-500 text-sm">No rooms yet</p>
                <button onClick={() => setShowAddRoom(true)} className="text-xs text-rose-600 mt-2">+ Add first room</button>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map(room => {
                  const occupants = guests.filter(g => g.room_id === room.id)
                  const vacancy = room.capacity - occupants.length
                  const unallotted = guests.filter(g => !g.room_id)
                  return (
                    <div key={room.id} className="bg-white border border-stone-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-stone-800">{room.name}</p>
                          <p className="text-xs text-stone-400">{room.room_type} · {room.floor_block || 'No floor/wing'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${vacancy === 0 ? 'bg-red-100 text-red-600' : vacancy <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {occupants.length}/{room.capacity}
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5">{vacancy > 0 ? `${vacancy} vacant` : 'Full'}</p>
                        </div>
                      </div>
                      {/* Occupants */}
                      <div className="space-y-1.5 mb-2">
                        {occupants.map(g => (
                          <div key={g.id} className="flex items-center gap-2 bg-stone-50 rounded-lg px-2.5 py-1.5">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{g.name[0]}</div>
                            <span className="text-xs text-stone-700 flex-1 truncate">{g.name}</span>
                            {g.plus_count > 0 && <span className="text-[10px] text-stone-400">+{g.plus_count}</span>}
                            <button onClick={() => handleRemoveFromRoom(g.id, room.id)} className="text-stone-300 hover:text-red-400 flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Allot button */}
                      {vacancy > 0 && unallotted.length > 0 && (
                        allotting === room.id ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-stone-500 mb-1">Select guest:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {unallotted.map(g => (
                                <button key={g.id} onClick={() => handleAllotGuest(room.id, g.id)}
                                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors">
                                  {g.name} {g.plus_count > 0 ? `+${g.plus_count}` : ''}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setAllotting(null)} className="text-[10px] text-stone-400 mt-1">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setAllotting(room.id)}
                            className="w-full text-xs text-rose-600 border border-dashed border-rose-200 rounded-lg py-1.5 hover:bg-rose-50 transition-colors font-medium">
                            + Assign guest ({vacancy} spot{vacancy !== 1 ? 's' : ''} available)
                          </button>
                        )
                      )}
                      <button onClick={() => {
                        setRooms(prev => prev.filter(r => r.id !== room.id))
                        startTransition(async () => { await deleteRoom(room.id) })
                      }} className="text-[10px] text-stone-300 hover:text-red-400 mt-2 transition-colors">Delete room</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* COMMS TAB */}
        {activeTab === 'comms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-800">Communications</p>
                <p className="text-xs text-stone-400">Messages for guests, vendors &amp; family</p>
              </div>
              <button onClick={() => setShowAddRemark(v => !v)}
                className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Note
              </button>
            </div>

            {/* Quick WhatsApp actions */}
            <div className="bg-white border border-stone-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Quick actions</p>
              <div className="space-y-2">
                <button onClick={() => {
                  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed' && g.phone)
                  if (confirmed.length === 0) { toast.error('No confirmed guests with phone numbers'); return }
                  const nums = confirmed.map(g => g.phone!.replace(/\D/g, '')).join('\n')
                  navigator.clipboard.writeText(nums)
                  toast.success(`${confirmed.length} confirmed guest numbers copied`)
                }} className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-green-50 transition-colors group">
                  <MessageCircle className="w-5 h-5 text-stone-400 group-hover:text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">Copy confirmed guest numbers</p>
                    <p className="text-xs text-stone-400">{guests.filter(g => g.rsvp_status === 'confirmed' && g.phone).length} numbers</p>
                  </div>
                </button>
                <button onClick={() => {
                  const pending = guests.filter(g => g.rsvp_status === 'pending' && g.phone)
                  if (pending.length === 0) { toast.error('No pending guests with phone numbers'); return }
                  const msg = encodeURIComponent(`Hi! You're invited to our ${celebration.name}. Please confirm your RSVP.`)
                  window.open(`https://wa.me/?text=${msg}`, '_blank')
                }} className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-green-50 transition-colors group">
                  <MessageCircle className="w-5 h-5 text-stone-400 group-hover:text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">RSVP reminder blast</p>
                    <p className="text-xs text-stone-400">{guests.filter(g => g.rsvp_status === 'pending').length} pending guests</p>
                  </div>
                </button>
                <button onClick={() => {
                  const vWithPhone = vendors.filter(v => v.phone)
                  if (vWithPhone.length === 0) { toast.error('No vendors with phone numbers'); return }
                  const nums = vWithPhone.map(v => v.phone!.replace(/\D/g, '')).join('\n')
                  navigator.clipboard.writeText(nums)
                  toast.success(`${vWithPhone.length} vendor numbers copied`)
                }} className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-purple-50 transition-colors group">
                  <Phone className="w-5 h-5 text-stone-400 group-hover:text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">Copy all vendor contacts</p>
                    <p className="text-xs text-stone-400">{vendors.filter(v => v.phone).length} vendors</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Remarks / Notes */}
            {showAddRemark && (
              <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                <textarea value={remarkForm.body} onChange={e => setRemarkForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write an important note... e.g. Seat bride's family in Hall A"
                  className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400 resize-none" rows={3} autoFocus />
                <div className="flex gap-2 items-center flex-wrap">
                  <select value={remarkForm.category} onChange={e => setRemarkForm(f => ({ ...f, category: e.target.value }))}
                    className="text-xs px-2.5 py-1.5 border border-stone-200 bg-white rounded-lg focus:outline-none">
                    {['general','decor','catering','music','rituals','logistics','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-stone-600">
                    <input type="checkbox" checked={remarkForm.is_for_agency} onChange={e => setRemarkForm(f => ({ ...f, is_for_agency: e.target.checked }))} className="rounded" />
                    For agency
                  </label>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => setShowAddRemark(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                    <button onClick={handleAddRemark} disabled={!remarkForm.body.trim() || isPending}
                      className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Save</button>
                  </div>
                </div>
              </div>
            )}

            {remarks.length === 0 && !showAddRemark && (
              <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                <p className="text-stone-500 text-sm">No notes yet</p>
                <button onClick={() => setShowAddRemark(true)} className="text-xs text-rose-600 mt-2">+ Add first note</button>
              </div>
            )}

            {remarks.map(r => (
              <div key={r.id} className={`bg-white border rounded-xl p-3.5 ${r.is_for_agency ? 'border-purple-100 bg-purple-50' : 'border-stone-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">{r.category}</span>
                      {r.is_for_agency && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">Agency</span>}
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{r.body}</p>
                  </div>
                  <button onClick={() => {
                    setRemarks(prev => prev.filter(x => x.id !== r.id))
                    startTransition(async () => { await deleteRemark(r.id) })
                  }} className="text-stone-300 hover:text-red-400 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GROUND CONTROL TAB */}
        {activeTab === 'ground' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-800">Ground Control</p>
              <p className="text-xs text-stone-400">Event day timeline and logistics</p>
            </div>

            {/* Day-wise timeline from functions */}
            {functions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p className="text-stone-500 text-sm">Add functions first</p>
                <p className="text-xs text-stone-400 mt-1">Timeline will appear here once functions are added via the master form</p>
              </div>
            ) : (
              (() => {
                const byDate = functions.reduce<Record<string, CelebFunction[]>>((acc, fn) => {
                  acc[fn.date] = acc[fn.date] || []
                  acc[fn.date].push(fn)
                  return acc
                }, {})
                return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayFns]) => (
                  <div key={date} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                      <p className="text-sm font-semibold text-stone-800">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {dayFns.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map(fn => (
                        <div key={fn.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="w-14 flex-shrink-0">
                            {fn.start_time
                              ? <p className="text-xs font-bold text-rose-600">{fn.start_time.slice(0, 5)}</p>
                              : <p className="text-xs text-stone-300">—</p>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-800">{fn.name}</p>
                            {fn.venue_space && <p className="text-xs text-stone-400 mt-0.5">{fn.venue_space}</p>}
                            {fn.expected_count && <p className="text-xs text-stone-400">{fn.expected_count} guests expected</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()
            )}

            {/* Logistics summary */}
            {guests.filter(g => g.needs_pickup).length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Pickup Needed</p>
                <div className="space-y-1.5">
                  {guests.filter(g => g.needs_pickup).map(g => (
                    <div key={g.id} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-stone-700 flex-1">{g.name}</span>
                      {g.flight_no && <span className="text-stone-400">{g.flight_no}</span>}
                      {g.arrival_time && <span className="text-amber-600">{new Date(g.arrival_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      {g.phone && <a href={`tel:${g.phone}`} className="text-stone-400 hover:text-stone-600"><Phone className="w-3.5 h-3.5" /></a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOWNLOADS TAB */}
        {activeTab === 'downloads' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-800">Export & Downloads</p>
              <p className="text-xs text-stone-400">Export your data as CSV</p>
            </div>
            <div className="space-y-3">
              {[
                { type: 'guests' as const, label: 'Guest List', desc: `${guests.length} guests — naam, phone, RSVP, room, dietary`, icon: Users, color: 'text-blue-500 bg-blue-50' },
                { type: 'budget' as const, label: 'Budget Sheet', desc: `${budget.length} items — category, estimated, actual, status`, icon: Wallet, color: 'text-emerald-500 bg-emerald-50' },
                { type: 'vendors' as const, label: 'Vendor List', desc: `${vendors.length} vendors — contact, amount, balance, status`, icon: Store, color: 'text-purple-500 bg-purple-50' },
              ].map(item => (
                <button key={item.type} onClick={() => exportCSV(item.type)}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-xl hover:border-rose-200 hover:shadow-sm transition-all group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-stone-800 text-sm">{item.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-200 group-hover:text-rose-400 flex-shrink-0 transition-colors" />
                </button>
              ))}

              {/* Function timeline export */}
              <button onClick={() => {
                if (functions.length === 0) { toast.error('No functions added yet'); return }
                const csv = 'Function,Date,Start Time,End Time,Venue Space,Expected Guests\n' +
                  functions.map(f => [f.name, f.date, f.start_time || '', f.end_time || '', f.venue_space || '', f.expected_count || ''].join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'functions.csv'; a.click()
                URL.revokeObjectURL(url)
                toast.success('Downloading functions.csv...')
              }} className="w-full flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-xl hover:border-rose-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-500 bg-rose-50">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-stone-800 text-sm">Functions Timeline</p>
                  <p className="text-xs text-stone-400 mt-0.5">{functions.length} functions — date, time, venue space</p>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-200 group-hover:text-rose-400 flex-shrink-0 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-stone-800">AI Wedding Assistant</p>
              <p className="text-xs text-stone-400">Ask anything about your wedding</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-purple-50 border border-rose-100 rounded-xl p-3.5 text-xs text-stone-600 leading-relaxed">
              <span className="font-semibold text-rose-700">Context loaded:</span> {celebration.bride_name && celebration.groom_name ? `${celebration.bride_name} & ${celebration.groom_name}` : celebration.name}, {functions.length} functions, {guests.length} guests{celebration.city ? `, ${celebration.city}` : ''}
            </div>
            <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
              <div className="h-72 overflow-y-auto p-4 space-y-3">
                {aiMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Sparkles className="w-8 h-8 text-rose-300 mb-2" />
                    <p className="text-stone-500 text-sm font-medium">Wedding AI aapki help ke liye ready hai</p>
                    <p className="text-stone-400 text-xs mt-1">Kuch bhi pucho — budget tips, checklist help, vendor questions</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[`Haldi ke liye kya prepare karein?`, `Budget tips for ${celebration.wedding_style || 'traditional'} wedding`, 'Guest management best practices'].map(q => (
                        <button key={q} onClick={() => { setAiInput(q); }}
                          className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-full border border-rose-100 hover:bg-rose-100 transition-colors">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-rose-700 text-white rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-stone-100 p-3 flex gap-2">
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
                  placeholder="Ask anything..." className="flex-1 text-sm px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400" />
                <button onClick={handleAiSend} disabled={!aiInput.trim() || aiLoading}
                  className="bg-rose-700 text-white px-3 py-2 rounded-xl hover:bg-rose-800 disabled:opacity-40 transition-colors flex-shrink-0">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Planner connect (visible on all tabs, bottom of page) */}
        <div className="mt-6 mb-2">
          {!connection ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 text-sm">Need a professional planner?</p>
                <p className="text-xs text-stone-500 mt-0.5">Connect with an expert — they'll handle everything</p>
              </div>
              <button disabled={isPending} onClick={async () => {
                const res = await connectToCreativeEra(celebration.id)
                if ('error' in res) { toast.error(res.error); return }
                setConnection({ id: '', status: res.status ?? 'pending', wedding_id: res.weddingId ?? null })
                toast.success("Request sent! We'll reach out shortly.")
              }} className="flex-shrink-0 text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 transition-colors">
                Connect
              </button>
            </div>
          ) : connection.status === 'accepted' && connection.wedding_id ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Planner connected ✓</p>
                  <p className="text-xs text-emerald-600">Your dedicated portal is ready</p>
                </div>
              </div>
              <a href={`/portal/${connection.wedding_id}`}
                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                Open portal <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Handshake className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Request under review</p>
                  <p className="text-xs text-amber-600">Your planner will reach out soon</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Tab Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-20 safe-area-pb">
        <div className="flex overflow-x-auto scrollbar-none">
          {([
            { tab: 'checklist', icon: CheckCircle2, label: 'Checklist', badge: tasks.filter(t => t.status !== 'done').length },
            { tab: 'guests', icon: Users, label: 'Guests', badge: isPro ? guests.filter(g => g.rsvp_status === 'pending').length : 0 },
            { tab: 'rooms', icon: MapPin, label: 'Rooms', badge: 0 },
            { tab: 'budget', icon: Wallet, label: 'Budget', badge: 0 },
            { tab: 'vendors', icon: Store, label: 'Vendor', badge: 0 },
            { tab: 'comms', icon: MessageCircle, label: 'Comms', badge: 0 },
            { tab: 'ground', icon: CalendarDays, label: 'Ground', badge: 0 },
            { tab: 'downloads', icon: ArrowRight, label: 'Export', badge: 0 },
            { tab: 'ai', icon: Sparkles, label: 'AI', badge: 0 },
          ] as const).map(({ tab, icon: Icon, label, badge }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 transition-colors relative ${activeTab === tab ? 'text-rose-700' : 'text-stone-400 hover:text-stone-600'}`}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium">{label}</span>
              {activeTab === tab && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-rose-700 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notification Sheet ── */}
      {showNotifications && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-stone-200 rounded-full" /></div>
            <div className="px-5 pb-3 flex items-center justify-between border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Reminders & Alerts</h2>
              <button onClick={() => setShowNotifications(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {notifCount === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                  <p className="text-stone-500 text-sm font-medium">All clear! Nothing urgent.</p>
                </div>
              ) : null}
              {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-rose-800">Only {daysLeft} days left!</p>
                    <p className="text-xs text-rose-600">{celebration.name} — {fmtDate(celebration.event_date!)}</p>
                  </div>
                </div>
              )}
              {overdueTasks.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Overdue tasks ({overdueTasks.length})</p>
                  <div className="space-y-2">
                    {overdueTasks.map(t => (
                      <div key={t.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{t.title}</p>
                          <p className="text-xs text-red-500">{t.category} · Due: {fmtDate(t.due_date!)}</p>
                        </div>
                        <button onClick={() => { cycleStatus(t); if (t.status === 'pending') toast.success('Marked in progress') }}
                          className="text-xs text-rose-600 hover:text-rose-800 flex-shrink-0">Start</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {upcomingTasks.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Due this week ({upcomingTasks.length})</p>
                  <div className="space-y-2">
                    {upcomingTasks.map(t => (
                      <div key={t.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <Bell className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{t.title}</p>
                          <p className="text-xs text-amber-600">{t.category} · Due: {fmtDate(t.due_date!)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {upcomingPayments.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Vendor payments due ({upcomingPayments.length})</p>
                  <div className="space-y-2">
                    {upcomingPayments.map(v => (
                      <div key={v.id} className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <Store className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{v.name}</p>
                          <p className="text-xs text-purple-600">{v.category} · Due: {fmtDate(v.payment_due!)} · Balance: {fmtAmt(v.total_amount - v.advance_paid)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Partner Invite Sheet ── */}
      {showInvite && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-t-2xl">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-stone-200 rounded-full" /></div>
            <div className="px-5 pb-3 flex items-center justify-between border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Invite partner</h2>
              <button onClick={() => setShowInvite(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-stone-500">Share this link with your partner, family member, or anyone you want to manage the celebration with.</p>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  {inviteLoading ? (
                    <div className="flex items-center gap-2 text-stone-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Generating link...</div>
                  ) : inviteToken ? (
                    <p className="text-xs text-stone-600 truncate font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/my/join/${inviteToken}` : `/my/join/${inviteToken}`}</p>
                  ) : (
                    <p className="text-sm text-stone-400">Link not ready</p>
                  )}
                </div>
                {inviteToken && (
                  <button onClick={copyInviteLink} className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {inviteToken && (
                <button onClick={shareInviteWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Share via WhatsApp
                </button>
              )}
              <p className="text-xs text-stone-400 text-center">This link is permanent — share anytime</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Guest Detail Drawer ── */}
      {guestDrawer && (
        <GuestDrawer
          guest={guestDrawer}
          onClose={() => setGuestDrawer(null)}
          onRsvpChange={handleUpdateRsvp}
          onDelete={(id) => {
            setGuests(prev => prev.filter(g => g.id !== id))
            setGuestDrawer(null)
            startTransition(async () => { await deleteCelebrationGuest(id) })
          }}
          onCopyLink={copyRsvpLink}
          onWhatsApp={waLink}
          isPending={isPending}
        />
      )}
    </div>
  )
}

// ── Guest Detail Drawer ────────────────────────────────────────
function GuestDrawer({ guest, onClose, onRsvpChange, onDelete, onCopyLink, onWhatsApp, isPending }: {
  guest: CelebGuest
  onClose: () => void
  onRsvpChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onCopyLink: (token: string | null) => void
  onWhatsApp: (phone: string | null, name: string) => void
  isPending: boolean
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'travel'>('profile')

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base ${guest.is_vip ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
            {guest.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-stone-900">{guest.name}</p>
              {guest.is_vip && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
              {guest.plus_count > 0 && <span className="text-xs text-stone-400">+{guest.plus_count}</span>}
            </div>
            {guest.family_group && <p className="text-xs text-stone-400">{guest.family_group}</p>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>

        {/* RSVP + actions */}
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap border-b border-stone-100">
          {(['confirmed', 'pending', 'declined'] as const).map(s => (
            <button key={s} onClick={() => onRsvpChange(guest.id, s)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${(guest.rsvp_status || 'pending') === s ? (RSVP_COLORS[s] + ' ring-1 ring-offset-1 ' + (s === 'confirmed' ? 'ring-emerald-400' : s === 'declined' ? 'ring-red-400' : 'ring-amber-400')) : 'bg-stone-100 text-stone-500'}`}>
              {RSVP_LABELS[s]}
            </button>
          ))}
          <div className="flex gap-1.5 ml-auto">
            <button onClick={() => onCopyLink(guest.rsvp_token)}
              className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-rose-100 hover:text-rose-600 transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
            {guest.phone && (
              <button onClick={() => onWhatsApp(guest.phone, guest.name)}
                className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-green-100 hover:text-green-600 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 px-5">
          {(['profile', 'travel'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`text-xs font-medium py-2.5 mr-4 border-b-2 transition-colors ${activeTab === t ? 'border-rose-700 text-rose-700' : 'border-transparent text-stone-400'}`}>
              {t === 'profile' ? 'Profile' : 'Travel'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 p-5">
          {activeTab === 'profile' && (
            <div className="space-y-3">
              {[
                { label: 'Phone', value: guest.phone },
                { label: 'Email', value: guest.email },
                { label: 'Dietary', value: guest.dietary },
                { label: 'Side', value: guest.side === 'bride' ? '🌸 Bride side' : guest.side === 'groom' ? '🤵 Groom side' : 'Both sides' },
                { label: 'Notes', value: guest.notes },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className="flex gap-3">
                  <p className="text-xs text-stone-400 w-16 flex-shrink-0 pt-0.5">{f.label}</p>
                  <p className="text-sm text-stone-800">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'travel' && (
            <div className="space-y-4">
              {guest.arrival_mode ? (
                <>
                  <div className="flex items-center gap-2">
                    {guest.arrival_mode === 'flight' ? <Plane className="w-4 h-4 text-blue-500" /> : guest.arrival_mode === 'train' ? <Train className="w-4 h-4 text-green-500" /> : <Car className="w-4 h-4 text-stone-500" />}
                    <p className="text-sm font-medium text-stone-800 capitalize">{guest.arrival_mode}</p>
                  </div>
                  {guest.flight_no && <p className="text-sm text-stone-600">Flight/Train: {guest.flight_no}</p>}
                  {guest.arrival_time && <p className="text-sm text-stone-600">Arrival: {new Date(guest.arrival_time).toLocaleString('en-IN')}</p>}
                  {guest.needs_pickup && <p className="text-sm text-amber-600 font-medium">⚠ Needs pickup</p>}
                </>
              ) : (
                <div className="text-center py-6">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                  <p className="text-sm text-stone-400">No travel details yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="px-5 py-3 border-t border-stone-100">
          <button onClick={() => onDelete(guest.id)} disabled={isPending}
            className="w-full text-xs text-red-400 hover:text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors">
            Remove from guest list
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pro Gate ───────────────────────────────────────────────────
function ProGate({ tab, onUpgrade, isPending }: { tab: string; onUpgrade: () => void; isPending: boolean }) {
  const msgs: Record<string, { icon: string; title: string; desc: string }> = {
    guests: { icon: '👥', title: 'Unlock guest management', desc: 'Track RSVP, dietary preferences, send WhatsApp — all organized.' },
    budget: { icon: '💰', title: 'Unlock budget tracker', desc: 'Estimate vs actual vs paid — crystal clear.' },
    vendors: { icon: '🏪', title: 'Unlock vendor list', desc: 'Photographer, caterer, DJ — contact and payment all here.' },
  }
  const m = msgs[tab] || msgs.guests
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4">{m.icon}</div>
      <h3 className="text-lg font-bold text-stone-900 mb-2">{m.title}</h3>
      <p className="text-stone-500 text-sm mb-6 max-w-xs mx-auto">{m.desc}</p>
      <button onClick={onUpgrade} disabled={isPending}
        className="inline-flex items-center gap-2 bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-800 disabled:opacity-50 transition-colors">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
        Unlock Pro — it's free
      </button>
    </div>
  )
}
