'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, CircleDot, Plus, Trash2, Sparkles, CalendarDays,
  Users, Wallet, Store, Handshake, Loader2, ArrowRight, Phone, Star,
  X, Crown, Bell, Copy, MessageCircle,
  Plane, Car, Train, MapPin, UserPlus, AlertCircle,
  Upload, FileDown, LayoutTemplate, SlidersHorizontal, Link as LinkIcon,
  Download, Hotel,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  updateTaskStatus, addTask, deleteTask, updateGuestCount, upgradeToPro,
  connectToCreativeEra, addCelebrationGuest, deleteCelebrationGuest,
  updateCelebrationGuest, addBudgetItem, deleteBudgetItem, updateBudgetActual,
  addCelebrationVendor, deleteCelebrationVendor,
  updateTaskDetails, getPartnerInviteToken,
  addRoom, deleteRoom, allotRoom, removeFromRoom, addRemark, deleteRemark,
  bulkImportCelebrationGuests, updateGuestFunctions, updateBudgetPaymentDue,
  bulkCreateRooms, bulkAddTasks, bulkUpdateTaskStatus, bulkDeleteTasks,
} from './actions'

// ── Types ──────────────────────────────────────────────────────
type CelebGuest = {
  id: string; celebration_id: string; name: string; phone: string | null
  email: string | null; dietary: string | null; plus_count: number; side: string
  family_group: string | null; is_vip: boolean | null; rsvp_status: string | null
  rsvp_token: string | null; notes: string | null; arrival_mode: string | null
  arrival_time: string | null; flight_no: string | null; needs_pickup: boolean | null
  room_id: string | null; attending_function_ids: string[] | null
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
  floor_block: string | null; notes: string | null; map_url: string | null
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

const BUDGET_PRESETS: Record<string, string[]> = {
  'Venue': ['Venue booking advance', 'Remaining venue payment', 'Lawn/garden rental'],
  'Catering': ['Per plate catering cost', 'Starters & snacks', 'Beverages & bar setup', 'Serving staff'],
  'Decoration': ['Stage & mandap decor', 'Floral arrangements', 'Entrance decor', 'Table centerpieces'],
  'Photography & Video': ['Photography package', 'Videography package', 'Pre-wedding shoot', 'Photo album/prints'],
  'Music & Entertainment': ['DJ setup', 'Dhol & band for baraat', 'Sangeet music', 'Sound system', 'Emcee/anchor'],
  'Mehandi': ['Bridal mehandi', 'Bridesmaids mehandi'],
  'Makeup & Hair': ['Bridal makeup', 'Pre-wedding trial', 'Bridesmaid makeup'],
  'Clothes & Jewellery': ['Bridal lehenga/saree', 'Groom sherwani/suit', 'Jewellery', 'Accessories'],
  'Invitations': ['Printing cost', 'Digital invite design', 'Postage/courier'],
  'Transport': ['Baraat vehicles', 'Guest airport/station pickup', 'Wedding car decoration'],
  'Accommodation': ['Bride family rooms', 'Groom family rooms', 'Outstation guest rooms'],
  'Other': ['Wedding favors/gifts', 'Miscellaneous expenses'],
}

const TASK_TEMPLATE: Array<{ title: string; category: string }> = [
  // Pre-Wedding (6)
  { title: 'Create master guest list', category: 'Pre-Wedding' },
  { title: 'Set overall wedding budget', category: 'Pre-Wedding' },
  { title: 'Book main venue', category: 'Pre-Wedding' },
  { title: 'Create wedding website or digital invite', category: 'Pre-Wedding' },
  { title: 'Send save-the-date messages', category: 'Pre-Wedding' },
  { title: 'Book accommodation for outstation guests', category: 'Pre-Wedding' },
  // Ceremonies & Rituals (6)
  { title: 'Book pandit and confirm muhurat', category: 'Ceremonies & Rituals' },
  { title: 'Prepare puja samagri list', category: 'Ceremonies & Rituals' },
  { title: 'Arrange garlands and ritual items', category: 'Ceremonies & Rituals' },
  { title: 'Organize ring ceremony setup', category: 'Ceremonies & Rituals' },
  { title: 'Confirm pheras and wedding ritual schedule', category: 'Ceremonies & Rituals' },
  { title: 'Arrange kalash and ritual fire setup', category: 'Ceremonies & Rituals' },
  // Decor & Ambiance (5)
  { title: 'Book floral decorator', category: 'Decor & Ambiance' },
  { title: 'Finalize mandap / stage design', category: 'Decor & Ambiance' },
  { title: 'Choose color palette and theme', category: 'Decor & Ambiance' },
  { title: 'Arrange entrance and pathway decor', category: 'Decor & Ambiance' },
  { title: 'Book lighting vendor', category: 'Decor & Ambiance' },
  // Food & Catering (5)
  { title: 'Finalize caterer and menu', category: 'Food & Catering' },
  { title: 'Confirm number of food stations', category: 'Food & Catering' },
  { title: 'Plan welcome tea/snacks for arrival', category: 'Food & Catering' },
  { title: 'Book bartending / mocktail counter', category: 'Food & Catering' },
  { title: 'Arrange welcome drinks for guests', category: 'Food & Catering' },
  // Photography & Video (4)
  { title: 'Book photographer', category: 'Photography & Video' },
  { title: 'Book videographer', category: 'Photography & Video' },
  { title: 'Plan pre-wedding shoot location', category: 'Photography & Video' },
  { title: 'Confirm candid photography package', category: 'Photography & Video' },
  // Music & Entertainment (5)
  { title: 'Book DJ and sound system', category: 'Music & Entertainment' },
  { title: 'Hire dhol and band for baraat', category: 'Music & Entertainment' },
  { title: 'Confirm mehandi singer or live music', category: 'Music & Entertainment' },
  { title: 'Arrange sangeet performers', category: 'Music & Entertainment' },
  { title: 'Book emcee / anchor', category: 'Music & Entertainment' },
  // Guests & Hospitality (5)
  { title: 'Send formal invitations to all guests', category: 'Guests & Hospitality' },
  { title: 'Track RSVPs and confirm final count', category: 'Guests & Hospitality' },
  { title: 'Arrange transportation for guests', category: 'Guests & Hospitality' },
  { title: 'Assign airport/station pickup duties', category: 'Guests & Hospitality' },
  { title: 'Create seating and room allotment plan', category: 'Guests & Hospitality' },
  // Outfits & Beauty (4)
  { title: 'Book bridal makeup artist', category: 'Outfits & Beauty' },
  { title: 'Finalize bride outfit(s)', category: 'Outfits & Beauty' },
  { title: 'Finalize groom outfit(s)', category: 'Outfits & Beauty' },
  { title: 'Book mehandi artist', category: 'Outfits & Beauty' },
  // Post-Wedding (5)
  { title: 'Arrange bidaai transportation', category: 'Post-Wedding' },
  { title: 'Book wedding car decoration', category: 'Post-Wedding' },
  { title: 'Share wedding photos with guests', category: 'Post-Wedding' },
  { title: 'Write thank you messages to guests', category: 'Post-Wedding' },
  { title: 'Sort and store wedding gifts', category: 'Post-Wedding' },
]

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

  // Feature 1: CSV import
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([])
  const [importLoading, setImportLoading] = useState(false)

  // Feature 2/4: Guest functions handled in guestDrawer

  // Feature 5: Bulk room creation
  const [showBulkRooms, setShowBulkRooms] = useState(false)
  const [bulkRoomPrefix, setBulkRoomPrefix] = useState('')
  const [bulkRoomStart, setBulkRoomStart] = useState('101')
  const [bulkRoomEnd, setBulkRoomEnd] = useState('110')
  const [bulkRoomType, setBulkRoomType] = useState('double')
  const [bulkRoomCapacity, setBulkRoomCapacity] = useState('2')
  const [bulkRoomFloor, setBulkRoomFloor] = useState('')
  const [bulkRoomMap, setBulkRoomMap] = useState('')

  // Feature 7/8: Rooms map URL + available filter
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [roomMapUrl, setRoomMapUrl] = useState('')

  // Feature 9: Task template
  const [showTemplate, setShowTemplate] = useState(false)
  const [templateSelected, setTemplateSelected] = useState<Set<number>>(new Set())

  // Feature 10: Quick due dates (handled inline in form)

  // Feature 11: Bulk task actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  // Feature 12: Budget presets
  const [budgetPresetCat, setBudgetPresetCat] = useState('')

  // Feature 13: Budget payment due edit
  const [editingPaymentDue, setEditingPaymentDue] = useState<string | null>(null)
  const [paymentDueInput, setPaymentDueInput] = useState('')

  // Feature 15: WhatsApp RSVP blast
  const [showRsvpBlast, setShowRsvpBlast] = useState(false)
  const [blastSelected, setBlastSelected] = useState<Set<string>>(new Set())
  const [blastMsg, setBlastMsg] = useState("Hi {name}! You're invited to our celebration. Please confirm your RSVP: {link}")

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
        room_id: null, attending_function_ids: null,
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

  // ── Feature 1: CSV Import ──
  function downloadGuestTemplate() {
    const csv = 'Name,Phone,Email,Side,Family Group,VIP,Dietary,Plus Count,Notes\nRamesh Sharma,9876543210,ramesh@email.com,bride,Sharma Family,false,Veg,1,\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'guest_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }
  function handleCSVFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { toast.error('CSV must have at least one data row'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = cols[i] || '' })
        return row
      }).filter(r => r['name'])
      setImportRows(rows)
      toast.success(`${rows.length} guests ready to import — review below`)
    }
    reader.readAsText(file)
  }
  async function handleBulkImport() {
    if (!importRows.length) return
    setImportLoading(true)
    const rows = importRows.map(r => ({
      name: r.name || r.Name || '',
      phone: r.phone || r.Phone || undefined,
      email: r.email || r.Email || undefined,
      side: (r.side || r.Side || 'both').toLowerCase() as string,
      family_group: r.family_group || r['family_group'] || undefined,
      is_vip: (r.vip || r.VIP || '').toLowerCase() === 'true',
      dietary: r.dietary || r.Dietary || undefined,
      plus_count: parseInt(r.plus_count || r['plus_count'] || '0') || 0,
      notes: r.notes || r.Notes || undefined,
    })).filter(r => r.name)
    const res = await bulkImportCelebrationGuests(celebration.id, rows)
    setImportLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success(`${res.count} guests imported!`)
    setShowImport(false)
    setImportRows([])
    // Add placeholder guests to state (will refresh on next open)
    const newGuests = rows.map((r, i) => ({
      id: `import-${Date.now()}-${i}`, celebration_id: celebration.id,
      name: r.name, phone: r.phone || null, email: r.email || null,
      dietary: r.dietary || null, plus_count: r.plus_count, side: r.side,
      family_group: r.family_group || null, is_vip: r.is_vip, rsvp_status: 'pending',
      rsvp_token: null, notes: r.notes || null, arrival_mode: null, arrival_time: null,
      flight_no: null, needs_pickup: null, room_id: null, attending_function_ids: null,
    }))
    setGuests(prev => [...prev, ...newGuests])
  }

  // ── Feature 11: Bulk task actions ──
  function toggleTaskSelect(id: string) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function handleBulkComplete() {
    const ids = [...selectedTaskIds]
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'done' as const } : t))
    setSelectedTaskIds(new Set())
    startTransition(async () => { await bulkUpdateTaskStatus(ids, 'done') })
    toast.success(`${ids.length} tasks marked done`)
  }
  function handleBulkDelete() {
    const ids = [...selectedTaskIds]
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    setSelectedTaskIds(new Set())
    setBulkMode(false)
    startTransition(async () => { await bulkDeleteTasks(ids) })
    toast.success(`${ids.length} tasks deleted`)
  }

  // ── Feature 9: Load task template ──
  async function handleLoadTemplate() {
    const selected = TASK_TEMPLATE.filter((_, i) => templateSelected.has(i))
    if (!selected.length) { toast.error('Select at least one task'); return }
    const existingTitles = new Set(tasks.map(t => t.title.toLowerCase()))
    const newTasks = selected.filter(t => !existingTitles.has(t.title.toLowerCase()))
    if (!newTasks.length) { toast('All selected tasks already exist'); setShowTemplate(false); return }
    const res = await bulkAddTasks(celebration.id, newTasks)
    if ('error' in res) { toast.error(res.error); return }
    const added: Task[] = newTasks.map(t => ({
      id: `tpl-${Date.now()}-${Math.random()}`, title: t.title, category: t.category,
      status: 'pending', due_date: null, notes: null, ai_generated: false, created_at: new Date().toISOString(),
    }))
    setTasks(prev => [...prev, ...added])
    setShowTemplate(false)
    setTemplateSelected(new Set())
    toast.success(`${newTasks.length} tasks added!`)
  }

  // ── Feature 5: Bulk room creation ──
  async function handleBulkRooms() {
    const start = parseInt(bulkRoomStart)
    const end = parseInt(bulkRoomEnd)
    if (isNaN(start) || isNaN(end) || end < start || (end - start) > 50) {
      toast.error('Invalid range — max 50 rooms at once'); return
    }
    const roomsToCreate = Array.from({ length: end - start + 1 }, (_, i) => ({
      name: `${bulkRoomPrefix ? bulkRoomPrefix + ' ' : ''}${start + i}`,
      room_type: bulkRoomType,
      capacity: parseInt(bulkRoomCapacity) || 2,
      floor_block: bulkRoomFloor || undefined,
      map_url: bulkRoomMap || undefined,
    }))
    const res = await bulkCreateRooms(celebration.id, roomsToCreate)
    if ('error' in res) { toast.error(res.error); return }
    const created: CelebRoom[] = (res.rooms || []).map((r: { id: string; name: string; room_type: string; capacity: number; floor_block: string | null; map_url: string | null }) => ({
      id: r.id, name: r.name, room_type: r.room_type, capacity: r.capacity,
      floor_block: r.floor_block, map_url: r.map_url, notes: null, occupants: [],
    }))
    setRooms(prev => [...prev, ...created])
    setShowBulkRooms(false)
    setBulkRoomPrefix(''); setBulkRoomStart('101'); setBulkRoomEnd('110')
    setBulkRoomFloor(''); setBulkRoomMap('')
    toast.success(`${created.length} rooms created!`)
  }

  // ── Feature 13: Budget payment due ──
  function handleSavePaymentDue(itemId: string) {
    setBudget(prev => prev.map(b => b.id === itemId ? { ...b, payment_due: paymentDueInput || null } : b))
    setEditingPaymentDue(null)
    startTransition(async () => { await updateBudgetPaymentDue(itemId, paymentDueInput || null) })
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
    <div className="min-h-screen bg-stone-50 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-100 fixed top-0 left-0 h-full z-20 overflow-y-auto">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✦</span>
            </div>
            <span className="font-semibold text-stone-900 text-sm">Utsav</span>
          </div>
          <p className="font-semibold text-stone-900 text-sm leading-snug truncate">
            {TYPE_EMOJIS[celebration.type] || '✨'} {celebration.bride_name && celebration.groom_name
              ? `${celebration.bride_name} & ${celebration.groom_name}`
              : celebration.bride_name || celebration.groom_name || celebration.name}
          </p>
          <p className={`text-xs mt-0.5 truncate ${daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? 'text-rose-600 font-medium' : 'text-stone-400'}`}>
            {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left`
              : daysLeft === 0 ? 'Today! 🎉'
              : celebration.event_date ? fmtDate(celebration.event_date) : 'Date not set'}
            {celebration.city && ` · ${celebration.city}`}
          </p>
          {isPro && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium mt-1.5">
              <Crown className="w-2.5 h-2.5" /> Pro
            </span>
          )}
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 p-2 pt-3 space-y-0.5">
          {([
            { tab: 'checklist' as const, icon: CheckCircle2, label: 'Checklist', badge: tasks.filter(t => t.status !== 'done').length },
            { tab: 'guests' as const, icon: Users, label: 'Guests', badge: isPro ? guests.filter(g => g.rsvp_status === 'pending').length : 0 },
            { tab: 'rooms' as const, icon: Hotel, label: 'Rooms', badge: 0 },
            { tab: 'budget' as const, icon: Wallet, label: 'Budget', badge: 0 },
            { tab: 'vendors' as const, icon: Store, label: 'Vendors', badge: 0 },
            { tab: 'comms' as const, icon: MessageCircle, label: 'Comms', badge: 0 },
            { tab: 'ground' as const, icon: CalendarDays, label: 'Ground Control', badge: 0 },
            { tab: 'downloads' as const, icon: Download, label: 'Export', badge: 0 },
            { tab: 'ai' as const, icon: Sparkles, label: 'AI Chat', badge: 0 },
          ]).map(({ tab, icon: Icon, label, badge }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                activeTab === tab ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
              }`}>
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar bottom actions */}
        <div className="p-3 border-t border-stone-100 flex-shrink-0 space-y-0.5">
          <button onClick={handleShowInvite}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Invite partner
          </button>
          <button onClick={() => setShowNotifications(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors">
            <Bell className="w-3.5 h-3.5" /> Reminders
            {notifCount > 0 && <span className="ml-auto w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{notifCount}</span>}
          </button>
          <Link href="/my"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-colors">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> All celebrations
          </Link>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

      {/* ── Top nav (mobile only) ── */}
      <nav className="md:hidden border-b border-stone-100 bg-white sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
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
      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 pt-4 pb-24 md:pb-8">

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {/* Filter + Bulk + Add buttons */}
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-stone-200 rounded-lg overflow-hidden flex-1">
                {(['all', 'pending', 'done'] as const).map(f => (
                  <button key={f} onClick={() => setTaskFilter(f)}
                    className={`flex-1 text-xs py-1.5 font-medium transition-colors ${taskFilter === f ? 'bg-rose-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                    {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setBulkMode(v => !v); setSelectedTaskIds(new Set()) }}
                className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors border ${bulkMode ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Select</span>
              </button>
              <button onClick={() => setShowTemplate(true)}
                className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors">
                <LayoutTemplate className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Template</span>
              </button>
              <button onClick={() => setShowAddTask(v => !v)}
                className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Add task</span>
              </button>
            </div>

            {/* Bulk action bar */}
            {bulkMode && selectedTaskIds.size > 0 && (
              <div className="flex items-center gap-2 bg-stone-900 text-white rounded-xl px-4 py-2.5">
                <span className="text-xs flex-1 font-medium">{selectedTaskIds.size} selected</span>
                <button onClick={handleBulkComplete} className="text-xs bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700">Mark done</button>
                <button onClick={handleBulkDelete} className="text-xs bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700">Delete</button>
                <button onClick={() => { setSelectedTaskIds(new Set()); setBulkMode(false) }}
                  className="text-stone-400 hover:text-white ml-1"><X className="w-4 h-4" /></button>
              </div>
            )}

            {showAddTask && (
              <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Task title (e.g. Book the venue)" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }} />
                <div className="flex gap-2">
                  <Input value={newTaskCat} onChange={e => setNewTaskCat(e.target.value)}
                    placeholder="Category" className="flex-1" />
                  <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
                    className="flex-1" min={new Date().toISOString().slice(0, 10)} />
                </div>
                {/* Feature 10: Quick due date picks */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'Today', days: 0 }, { label: 'Tomorrow', days: 1 },
                    { label: '+1 week', days: 7 }, { label: '+2 weeks', days: 14 }, { label: '+1 month', days: 30 },
                  ].map(({ label, days }) => {
                    const d = new Date(); d.setDate(d.getDate() + days)
                    const v = d.toISOString().slice(0, 10)
                    return (
                      <button key={label} onClick={() => setNewTaskDue(v)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${newTaskDue === v ? 'bg-rose-700 text-white border-rose-700' : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-rose-300'}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddTask(false)} className="text-xs text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                  <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || isPending}
                    className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                </div>
              </div>
            )}

            {/* Feature 9: Template modal */}
            {showTemplate && (
              <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTemplate(false)} />
                <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
                    <div>
                      <p className="font-bold text-stone-900">Task Template</p>
                      <p className="text-xs text-stone-400">45 tasks across 9 categories</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTemplateSelected(new Set(TASK_TEMPLATE.map((_, i) => i)))}
                        className="text-xs text-rose-600 hover:text-rose-800">Select all</button>
                      <button onClick={() => setTemplateSelected(new Set())}
                        className="text-xs text-stone-400 hover:text-stone-600">Clear</button>
                      <button onClick={() => setShowTemplate(false)}><X className="w-5 h-5 text-stone-400" /></button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {Object.entries(
                      TASK_TEMPLATE.reduce<Record<string, Array<{t: typeof TASK_TEMPLATE[0]; i: number}>>>((acc, t, i) => {
                        acc[t.category] = acc[t.category] || []
                        acc[t.category].push({ t, i })
                        return acc
                      }, {})
                    ).map(([cat, items]) => (
                      <div key={cat} className="bg-stone-50 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-stone-100">
                          <p className="text-xs font-semibold text-stone-700">{cat}</p>
                          <span className="text-[10px] text-stone-400">{items.length} tasks</span>
                        </div>
                        {items.map(({ t, i }) => (
                          <label key={i} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-100 transition-colors">
                            <input type="checkbox" checked={templateSelected.has(i)}
                              onChange={() => setTemplateSelected(prev => {
                                const next = new Set(prev)
                                next.has(i) ? next.delete(i) : next.add(i)
                                return next
                              })}
                              className="rounded border-stone-300 text-rose-700" />
                            <span className="text-xs text-stone-700">{t.title}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-stone-100 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs text-stone-500">{templateSelected.size} selected</span>
                    <button onClick={handleLoadTemplate} disabled={!templateSelected.size || isPending}
                      className="text-sm bg-rose-700 text-white px-5 py-2 rounded-xl hover:bg-rose-800 disabled:opacity-50 font-medium">
                      Add {templateSelected.size} tasks
                    </button>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(tasksByCategory).length === 0 ? (
              <div className="text-center py-14">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p className="text-stone-500 text-sm font-medium">
                  {taskFilter === 'done' ? 'Nothing completed yet' : tasks.length === 0 ? (
                    <span>No tasks yet — <button onClick={() => setShowTemplate(true)} className="text-rose-600 underline">load template</button></span>
                  ) : 'All tasks done! 🎉'}
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
                        const isSelected = selectedTaskIds.has(task.id)
                        return (
                          <div key={task.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-stone-50 group transition-colors ${isSelected ? 'bg-rose-50' : ''}`}>
                            {bulkMode ? (
                              <input type="checkbox" checked={isSelected}
                                onChange={() => toggleTaskSelect(task.id)}
                                className="mt-0.5 flex-shrink-0 rounded border-stone-300 text-rose-700" />
                            ) : (
                              <button onClick={() => cycleStatus(task)} className={`mt-0.5 flex-shrink-0 ${task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-stone-300'}`}>
                                <Icon className="w-[18px] h-[18px]" />
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {task.title}
                                {task.ai_generated && task.status === 'pending' && (
                                  <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-500 px-1 py-0.5 rounded font-medium">AI</span>
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
                            {!bulkMode && (
                              <button onClick={() => handleDeleteTask(task)}
                                className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

                {/* Search + filter + add + import */}
                <div className="flex gap-2">
                  <Input value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                    placeholder="Search by name or phone..." className="flex-1 text-sm" />
                  <button onClick={() => setShowImport(v => !v)} title="Import CSV"
                    className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowAddGuest(v => !v)}
                    className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Feature 1: CSV Import panel */}
                {showImport && (
                  <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-800">Bulk import guests</p>
                      <button onClick={downloadGuestTemplate} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800">
                        <FileDown className="w-3.5 h-3.5" /> Download template
                      </button>
                    </div>
                    <p className="text-xs text-stone-400">Upload a CSV with columns: Name, Phone, Email, Side, Family Group, VIP, Dietary, Plus Count, Notes</p>
                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-5 cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-colors">
                      <Upload className="w-6 h-6 text-stone-300" />
                      <span className="text-xs text-stone-500">Click to select CSV file</span>
                      <input type="file" accept=".csv" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }} />
                    </label>
                    {importRows.length > 0 && (
                      <>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {importRows.slice(0, 10).map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
                              <span className="font-medium text-stone-800 flex-1 truncate">{r.name || r.Name}</span>
                              <span className="text-stone-400">{r.phone || r.Phone || '—'}</span>
                            </div>
                          ))}
                          {importRows.length > 10 && <p className="text-xs text-stone-400 text-center">+{importRows.length - 10} more</p>}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setImportRows([]); setShowImport(false) }} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                          <button onClick={handleBulkImport} disabled={importLoading}
                            className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 flex items-center gap-1">
                            {importLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            Import {importRows.length} guests
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

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
                        <select value={budgetForm.category} onChange={e => {
                          setBudgetForm(f => ({ ...f, category: e.target.value }))
                          setBudgetPresetCat(e.target.value)
                        }} className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
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
                    {/* Feature 12: Category presets */}
                    {budgetPresetCat && BUDGET_PRESETS[budgetPresetCat] && (
                      <div>
                        <p className="text-[11px] text-stone-400 mb-1.5">Quick add:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {BUDGET_PRESETS[budgetPresetCat].map(p => (
                            <button key={p} onClick={() => setBudgetForm(f => ({ ...f, description: p }))}
                              className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors">
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowAddBudget(false); setBudgetPresetCat('') }} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
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
                      <div key={item.id} className="bg-white border border-stone-100 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{item.description}</p>
                            <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>
                            {/* Feature 13: Payment due inline */}
                            {editingPaymentDue === item.id ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Input type="date" value={paymentDueInput} onChange={e => setPaymentDueInput(e.target.value)}
                                  className="text-xs h-6 py-0 px-1.5 w-32" />
                                <button onClick={() => handleSavePaymentDue(item.id)} className="text-xs text-emerald-600 font-medium">Save</button>
                                <button onClick={() => setEditingPaymentDue(null)} className="text-xs text-stone-400">×</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingPaymentDue(item.id); setPaymentDueInput(item.payment_due || '') }}
                                className={`text-[11px] mt-1 flex items-center gap-1 ${item.payment_due ? (isOverdue(item.payment_due) && item.status !== 'paid' ? 'text-red-500 font-medium' : 'text-stone-400') : 'text-stone-300 hover:text-stone-500'}`}>
                                <Bell className="w-3 h-3" />
                                {item.payment_due ? fmtDate(item.payment_due) : 'Set due date'}
                              </button>
                            )}
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
                      <p className="text-[10px] text-stone-400 mt-0.5">Advance paid</p>
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

                {/* Feature 14: Marketplace link */}
                <Link href="/vendors" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-800">Find vendors on Marketplace</p>
                    <p className="text-xs text-purple-500">Browse verified photographers, caterers, decorators & more</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                </Link>

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
                              <span className="text-emerald-600">Paid: {fmtAmt(v.advance_paid)}</span>
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
              <div className="flex items-center gap-1.5">
                {/* Feature 8: Available-only filter */}
                <button onClick={() => setShowAvailableOnly(v => !v)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg border transition-colors ${showAvailableOnly ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                  <SlidersHorizontal className="w-3 h-3" /> Available
                </button>
                {/* Feature 5: Bulk create */}
                <button onClick={() => setShowBulkRooms(v => !v)}
                  className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-2.5 py-2 rounded-lg hover:bg-stone-200 transition-colors">
                  <Plus className="w-3 h-3" /> Bulk
                </button>
                <button onClick={() => setShowAddRoom(v => !v)}
                  className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {showAddRoom && (
              <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-800">Add room</p>
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
                  {/* Feature 7: Map URL */}
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 mb-1 block">Map / location link (optional)</label>
                    <Input value={roomMapUrl} onChange={e => setRoomMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddRoom(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                  <button onClick={() => {
                    if (!roomForm.name.trim()) return
                    startTransition(async () => {
                      const res = await addRoom(celebration.id, {
                        name: roomForm.name, room_type: roomForm.room_type,
                        capacity: parseInt(roomForm.capacity) || 2,
                        floor_block: roomForm.floor_block || undefined,
                        map_url: roomMapUrl || undefined,
                      })
                      if ('error' in res) { toast.error(res.error); return }
                      setRooms(prev => [...prev, { id: res.id, name: roomForm.name, room_type: roomForm.room_type, capacity: parseInt(roomForm.capacity) || 2, floor_block: roomForm.floor_block || null, map_url: roomMapUrl || null, notes: null, occupants: [] }])
                      setRoomForm({ name: '', room_type: 'double', capacity: '2', floor_block: '' })
                      setRoomMapUrl('')
                      setShowAddRoom(false)
                      toast.success('Room added')
                    })
                  }} disabled={!roomForm.name.trim() || isPending}
                    className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
                </div>
              </div>
            )}

            {/* Feature 5: Bulk room creation form */}
            {showBulkRooms && (
              <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-800">Bulk create rooms</p>
                <p className="text-xs text-stone-400">Creates rooms with a numbered sequence (e.g. Room 101 to Room 115)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 mb-1 block">Prefix (optional)</label>
                    <Input value={bulkRoomPrefix} onChange={e => setBulkRoomPrefix(e.target.value)} placeholder="Room / Suite / Cottage" autoFocus />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Start number</label>
                    <Input type="number" value={bulkRoomStart} onChange={e => setBulkRoomStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">End number</label>
                    <Input type="number" value={bulkRoomEnd} onChange={e => setBulkRoomEnd(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Type</label>
                    <select value={bulkRoomType} onChange={e => setBulkRoomType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                      {['single','double','suite','family','dormitory','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Capacity each</label>
                    <Input type="number" min="1" value={bulkRoomCapacity} onChange={e => setBulkRoomCapacity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Floor / Wing</label>
                    <Input value={bulkRoomFloor} onChange={e => setBulkRoomFloor(e.target.value)} placeholder="Ground Floor" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Map URL</label>
                    <Input value={bulkRoomMap} onChange={e => setBulkRoomMap(e.target.value)} placeholder="Optional map link" />
                  </div>
                </div>
                <p className="text-xs text-stone-400">Will create: {Math.max(0, parseInt(bulkRoomEnd) - parseInt(bulkRoomStart) + 1) || 0} rooms</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowBulkRooms(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                  <button onClick={handleBulkRooms} disabled={isPending}
                    className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Create rooms</button>
                </div>
              </div>
            )}

            {/* Unallotted guests count */}
            {guests.length > 0 && guests.filter(g => !g.room_id).length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">{guests.filter(g => !g.room_id).length} guests not yet assigned to a room</p>
              </div>
            )}

            {(() => {
              const displayRooms = showAvailableOnly
                ? rooms.filter(r => r.capacity - guests.filter(g => g.room_id === r.id).length > 0)
                : rooms

              if (displayRooms.length === 0) return (
                <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                  <p className="text-stone-500 text-sm">{showAvailableOnly ? 'No available rooms' : 'No rooms yet'}</p>
                  {!showAvailableOnly && <button onClick={() => setShowAddRoom(true)} className="text-xs text-rose-600 mt-2">+ Add first room</button>}
                </div>
              )

              // Feature 6: Group by floor_block
              const grouped = displayRooms.reduce<Record<string, typeof rooms>>((acc, r) => {
                const key = r.floor_block || 'No floor/wing specified'
                acc[key] = acc[key] || []
                acc[key].push(r)
                return acc
              }, {})

              return (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([floor, floorRooms]) => (
                    <div key={floor}>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{floor}</p>
                      <div className="space-y-3">
                        {floorRooms.map(room => {
                          const occupants = guests.filter(g => g.room_id === room.id)
                          const vacancy = room.capacity - occupants.length
                          const unallotted = guests.filter(g => !g.room_id)
                          return (
                            <div key={room.id} className="bg-white border border-stone-100 rounded-xl p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-stone-800">{room.name}</p>
                                  <p className="text-xs text-stone-400">{room.room_type}</p>
                                  {/* Feature 7: Map URL */}
                                  {room.map_url && (
                                    <a href={room.map_url} target="_blank" rel="noopener noreferrer"
                                      className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mt-0.5">
                                      <LinkIcon className="w-2.5 h-2.5" /> View map
                                    </a>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${vacancy === 0 ? 'bg-red-100 text-red-600' : vacancy <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {occupants.length}/{room.capacity}
                                  </div>
                                  <p className="text-[10px] text-stone-400 mt-0.5">{vacancy > 0 ? `${vacancy} vacant` : 'Full'}</p>
                                </div>
                              </div>
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
                    </div>
                  ))}
                </div>
              )
            })()}
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
                  setBlastSelected(new Set(pending.map(g => g.id)))
                  setShowRsvpBlast(true)
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

        {/* Feature 15: WhatsApp RSVP Blast Sheet */}
        {showRsvpBlast && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRsvpBlast(false)} />
            <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-stone-200 rounded-full" /></div>
              <div className="px-5 pb-3 flex items-center justify-between border-b border-stone-100 flex-shrink-0">
                <div>
                  <p className="font-bold text-stone-900">RSVP Blast</p>
                  <p className="text-xs text-stone-400">{blastSelected.size} guests selected</p>
                </div>
                <button onClick={() => setShowRsvpBlast(false)}><X className="w-5 h-5 text-stone-400" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-stone-700 mb-1.5">Message template</p>
                  <p className="text-[11px] text-stone-400 mb-1.5">{'{name}'} = guest name, {'{link}'} = their RSVP link</p>
                  <textarea value={blastMsg} onChange={e => setBlastMsg(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400 resize-none" rows={3} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-stone-700">Select guests</p>
                  <div className="flex gap-2">
                    <button onClick={() => setBlastSelected(new Set(guests.filter(g => g.phone && g.rsvp_status === 'pending').map(g => g.id)))}
                      className="text-xs text-rose-600 hover:text-rose-800">All pending</button>
                    <button onClick={() => setBlastSelected(new Set())} className="text-xs text-stone-400">Clear</button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {guests.filter(g => g.phone).map(g => (
                    <label key={g.id} className="flex items-center gap-2.5 p-2.5 bg-stone-50 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors">
                      <input type="checkbox" checked={blastSelected.has(g.id)}
                        onChange={() => setBlastSelected(prev => {
                          const next = new Set(prev)
                          next.has(g.id) ? next.delete(g.id) : next.add(g.id)
                          return next
                        })}
                        className="rounded border-stone-300 text-rose-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-800 truncate">{g.name}</p>
                        <p className="text-[11px] text-stone-400">{g.phone}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RSVP_COLORS[g.rsvp_status as keyof typeof RSVP_COLORS] || 'bg-stone-100 text-stone-500'}`}>
                        {RSVP_LABELS[g.rsvp_status as keyof typeof RSVP_LABELS] || 'Pending'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-stone-100 flex-shrink-0 space-y-2">
                <p className="text-xs text-stone-400 text-center">Opens WhatsApp for each guest one by one</p>
                <button disabled={blastSelected.size === 0}
                  onClick={() => {
                    const selected = guests.filter(g => blastSelected.has(g.id) && g.phone)
                    if (!selected.length) return
                    let i = 0
                    function sendNext() {
                      if (i >= selected.length) { toast.success(`${selected.length} messages queued`); setShowRsvpBlast(false); return }
                      const g = selected[i]
                      const clean = g.phone!.replace(/\D/g, '')
                      const rsvpLink = g.rsvp_token ? `${window.location.origin}/rsvp/${g.rsvp_token}` : `${window.location.origin}/my/${celebration.id}`
                      const msg = blastMsg.replace('{name}', g.name).replace('{link}', rsvpLink)
                      window.open(`https://wa.me/${clean.startsWith('91') ? clean : '91' + clean}?text=${encodeURIComponent(msg)}`, '_blank')
                      i++
                      setTimeout(sendNext, 1200)
                    }
                    sendNext()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-40 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Send to {blastSelected.size} guests via WhatsApp
                </button>
              </div>
            </div>
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
                { type: 'guests' as const, label: 'Guest List', desc: `${guests.length} guests — name, phone, RSVP, room, dietary`, icon: Users, color: 'text-blue-500 bg-blue-50' },
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
                    <p className="text-stone-500 text-sm font-medium">Wedding AI is ready to help</p>
                    <p className="text-stone-400 text-xs mt-1">Ask anything — budget tips, checklist help, vendor questions</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[`How to prepare for Haldi?`, `Budget tips for ${celebration.wedding_style || 'traditional'} wedding`, 'Guest management best practices'].map(q => (
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
                <p className="text-xs text-stone-500 mt-0.5">Connect with an expert — they handle everything</p>
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
          ) : connection.status === 'declined' ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Handshake className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Request declined</p>
                  <p className="text-xs text-red-500">You can connect with a different planner</p>
                </div>
              </div>
              <a href={`/my/${celebration.id}/connect`}
                className="flex-shrink-0 text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 transition-colors">
                Find another
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

      {/* ── Bottom Tab Nav (mobile only) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-20 safe-area-pb">
        <div className="flex overflow-x-auto scrollbar-none">
          {([
            { tab: 'checklist', icon: CheckCircle2, label: 'Checklist', badge: tasks.filter(t => t.status !== 'done').length },
            { tab: 'guests', icon: Users, label: 'Guests', badge: isPro ? guests.filter(g => g.rsvp_status === 'pending').length : 0 },
            { tab: 'rooms', icon: Hotel, label: 'Rooms', badge: 0 },
            { tab: 'budget', icon: Wallet, label: 'Budget', badge: 0 },
            { tab: 'vendors', icon: Store, label: 'Vendors', badge: 0 },
            { tab: 'comms', icon: MessageCircle, label: 'Comms', badge: 0 },
            { tab: 'ground', icon: CalendarDays, label: 'Ground', badge: 0 },
            { tab: 'downloads', icon: Download, label: 'Export', badge: 0 },
            { tab: 'ai', icon: Sparkles, label: 'AI', badge: 0 },
          ] as const).map(({ tab, icon: Icon, label, badge }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3.5 py-2.5 transition-colors relative ${activeTab === tab ? 'text-rose-700' : 'text-stone-400 hover:text-stone-600'}`}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
              {activeTab === tab && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-rose-700 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      </div>{/* end main content area */}

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
          functions={functions}
          onClose={() => setGuestDrawer(null)}
          onRsvpChange={(id, status) => {
            handleUpdateRsvp(id, status)
            setGuestDrawer(prev => prev ? { ...prev, rsvp_status: status } : prev)
          }}
          onSave={(id, data) => {
            setGuests(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
            setGuestDrawer(prev => prev ? { ...prev, ...data } : prev)
            startTransition(async () => {
              await updateCelebrationGuest(id, {
                name: data.name ?? undefined,
                phone: data.phone ?? undefined,
                email: data.email ?? undefined,
                dietary: data.dietary ?? undefined,
                side: data.side ?? undefined,
                family_group: data.family_group ?? undefined,
                is_vip: data.is_vip ?? undefined,
                notes: data.notes ?? undefined,
              })
            })
            toast.success('Guest updated')
          }}
          onFunctionsChange={(id, fnIds) => {
            setGuests(prev => prev.map(g => g.id === id ? { ...g, attending_function_ids: fnIds } : g))
            setGuestDrawer(prev => prev ? { ...prev, attending_function_ids: fnIds } : prev)
            startTransition(async () => { await updateGuestFunctions(id, fnIds) })
          }}
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
function GuestDrawer({ guest, functions, onClose, onRsvpChange, onSave, onFunctionsChange, onDelete, onCopyLink, onWhatsApp, isPending }: {
  guest: CelebGuest
  functions: CelebFunction[]
  onClose: () => void
  onRsvpChange: (id: string, status: string) => void
  onSave: (id: string, data: Partial<CelebGuest>) => void
  onFunctionsChange: (id: string, fnIds: string[]) => void
  onDelete: (id: string) => void
  onCopyLink: (token: string | null) => void
  onWhatsApp: (phone: string | null, name: string) => void
  isPending: boolean
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'edit' | 'travel' | 'functions'>('profile')
  const [editForm, setEditForm] = useState({
    name: guest.name, phone: guest.phone || '', email: guest.email || '',
    dietary: guest.dietary || '', side: guest.side,
    family_group: guest.family_group || '', is_vip: guest.is_vip || false,
    notes: guest.notes || '',
  })
  const attendingIds = new Set(guest.attending_function_ids || [])

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center gap-3 flex-shrink-0">
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
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap border-b border-stone-100 flex-shrink-0">
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
        <div className="flex border-b border-stone-100 px-5 flex-shrink-0 overflow-x-auto">
          {([
            { key: 'profile', label: 'Profile' },
            { key: 'edit', label: 'Edit' },
            { key: 'travel', label: 'Travel' },
            ...(functions.length > 0 ? [{ key: 'functions', label: 'Functions' }] : []),
          ] as { key: 'profile' | 'edit' | 'travel' | 'functions'; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`text-xs font-medium py-2.5 mr-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-rose-700 text-rose-700' : 'border-transparent text-stone-400'}`}>
              {t.label}
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
              {!guest.phone && !guest.email && !guest.dietary && !guest.notes && (
                <p className="text-sm text-stone-400 text-center py-4">No details yet — use Edit tab to add.</p>
              )}
            </div>
          )}

          {/* Feature 2: Edit mode */}
          {activeTab === 'edit' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-stone-500 mb-1 block">Name *</label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Phone</label>
                  <Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Email</label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="name@email.com" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Dietary</label>
                  <select value={editForm.dietary} onChange={e => setEditForm(f => ({ ...f, dietary: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                    {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Side</label>
                  <select value={editForm.side} onChange={e => setEditForm(f => ({ ...f, side: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                    {SIDES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-stone-500 mb-1 block">Family group</label>
                  <Input value={editForm.family_group} onChange={e => setEditForm(f => ({ ...f, family_group: e.target.value }))} placeholder="e.g. Sharma Family" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-stone-500 mb-1 block">Notes</label>
                  <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="edit-vip" checked={editForm.is_vip}
                    onChange={e => setEditForm(f => ({ ...f, is_vip: e.target.checked }))}
                    className="rounded border-stone-300 text-rose-700" />
                  <label htmlFor="edit-vip" className="text-xs text-stone-600 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> VIP guest
                  </label>
                </div>
              </div>
              <button onClick={() => onSave(guest.id, {
                name: editForm.name.trim(), phone: editForm.phone || null,
                email: editForm.email || null, dietary: editForm.dietary || null,
                side: editForm.side, family_group: editForm.family_group || null,
                is_vip: editForm.is_vip, notes: editForm.notes || null,
              })} disabled={!editForm.name.trim() || isPending}
                className="w-full bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 transition-colors">
                Save changes
              </button>
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

          {/* Feature 4: Functions tab */}
          {activeTab === 'functions' && functions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-stone-400 mb-3">Select which functions this guest is attending</p>
              {functions.map(fn => {
                const attending = attendingIds.has(fn.id)
                return (
                  <label key={fn.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${attending ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-100 hover:border-stone-200'}`}>
                    <input type="checkbox" checked={attending}
                      onChange={() => {
                        const next = new Set(attendingIds)
                        next.has(fn.id) ? next.delete(fn.id) : next.add(fn.id)
                        onFunctionsChange(guest.id, [...next])
                      }}
                      className="rounded border-stone-300 text-rose-700" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{fn.name}</p>
                      <p className="text-xs text-stone-400">{fmtDate(fn.date)}{fn.start_time && ` · ${fn.start_time.slice(0, 5)}`}</p>
                    </div>
                    {attending && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">Attending</span>}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="px-5 py-3 border-t border-stone-100 flex-shrink-0">
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
