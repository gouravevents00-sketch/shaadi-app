// ─────────────────────────────────────────────────────────────
// Database types — mirrors the Supabase schema exactly
// ─────────────────────────────────────────────────────────────

export type CompanyPlan = 'trial' | 'starter' | 'pro' | 'enterprise'
export type CompanyMemberRole = 'owner' | 'admin' | 'coordinator'
export type WeddingStatus = 'setup' | 'active' | 'completed' | 'archived'
export type WeddingAccessRole =
  | 'coordinator'
  | 'bride_family'
  | 'groom_family'
  | 'hospitality'
  | 'logistics'
  | 'fb_team'
  | 'decor_team'
  | 'photography'
export type Side = 'bride' | 'groom' | 'both' | 'shared' | 'neutral'
export type EventType = 'ceremony' | 'meal' | 'ritual' | 'party' | 'other'
export type RsvpStatus = 'pending' | 'confirmed' | 'declined'
export type ChecklistStatus = 'pending' | 'in_progress' | 'done'
export type VendorStatus = 'enquired' | 'booked' | 'confirmed' | 'paid' | 'cancelled'
export type ArrivalStatus = 'expected' | 'arrived' | 'no_show'
export type PickupStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type DecorStatus = 'pending' | 'in_progress' | 'done' | 'issue'
export type IncidentSeverity = 'low' | 'medium' | 'high'
export type IncidentStatus = 'open' | 'assigned' | 'resolved'
export type CommChannel = 'email' | 'sms' | 'whatsapp'
export type CommRecipientType = 'all' | 'event' | 'individual'
export type MediaType = 'invitation' | 'contract' | 'reference' | 'album' | 'other'
export type DietaryPref = 'veg' | 'non_veg' | 'jain' | 'other'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'high_tea' | 'snacks'
export type VehicleType = 'car' | 'bus' | 'van' | 'suv'

// ── Row types ────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: CompanyPlan
  created_at: string
}

export interface User {
  id: string
  email: string
  phone: string | null
  name: string
  avatar_url: string | null
  created_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: CompanyMemberRole
  created_at: string
}

export interface Wedding {
  id: string
  company_id: string
  bride_name: string
  groom_name: string
  wedding_code: string
  status: WeddingStatus
  budget_total: number
  primary_venue: string | null
  primary_city: string | null
  wedding_date: string | null
  created_at: string
}

export interface WeddingAccess {
  id: string
  wedding_id: string
  user_id: string
  role: WeddingAccessRole
  side: Side
  created_at: string
}

export interface WeddingEvent {
  id: string
  wedding_id: string
  name: string
  date: string
  start_time: string
  end_time: string | null
  venue: string
  city: string | null
  expected_count: number
  type: EventType
  notes: string | null
  created_at: string
}

export interface Guest {
  id: string
  wedding_id: string
  name: string
  phone: string | null
  email: string | null
  side: Side
  is_vip: boolean
  dietary: DietaryPref
  dietary_notes: string | null
  rsvp_token: string
  notes: string | null
  created_at: string
}

export interface GuestEvent {
  id: string
  guest_id: string
  event_id: string
  rsvp_status: RsvpStatus
  meal_note: string | null
  created_at: string
}

export interface Room {
  id: string
  wedding_id: string
  room_number: string
  type: string
  capacity: number
  floor: string | null
  notes: string | null
}

export interface RoomAllocation {
  id: string
  room_id: string
  guest_id: string
  check_in: string
  check_out: string
  kit_given: boolean
  kit_given_at: string | null
  created_at: string
}

export interface ChecklistItem {
  id: string
  wedding_id: string
  title: string
  category: string
  side: Side
  status: ChecklistStatus
  due_date: string | null
  assigned_to: string | null
  notes: string | null
  order: number
  created_at: string
}

export interface Requirement {
  id: string
  wedding_id: string
  side: Side
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: ChecklistStatus
  created_at: string
}

export interface BudgetCategory {
  id: string
  wedding_id: string
  name: string
  estimated: number
  order: number
}

export interface BudgetItem {
  id: string
  category_id: string
  wedding_id: string
  vendor_id: string | null
  description: string
  estimated: number
  quoted: number
  paid: number
  invoice_url: string | null
  due_date: string | null
  created_at: string
}

export interface Vendor {
  id: string
  wedding_id: string
  name: string
  category: string
  contact_name: string | null
  phone: string | null
  email: string | null
  total_amount: number
  paid_amount: number
  status: VendorStatus
  contract_url: string | null
  notes: string | null
  created_at: string
}

export interface VendorPayment {
  id: string
  vendor_id: string
  amount: number
  due_date: string
  paid_date: string | null
  mode: string | null
  notes: string | null
  created_at: string
}

export interface TimelineItem {
  id: string
  wedding_id: string
  event_id: string | null
  time: string
  duration_mins: number
  title: string
  description: string | null
  team: string
  status: ChecklistStatus
  created_at: string
}

export interface Arrival {
  id: string
  wedding_id: string
  guest_id: string
  event_id: string | null
  mode: 'flight' | 'train' | 'car' | 'self'
  flight_train_no: string | null
  arrival_time: string | null
  pickup_required: boolean
  status: ArrivalStatus
  created_at: string
}

export interface Vehicle {
  id: string
  wedding_id: string
  number: string
  type: VehicleType
  driver_name: string
  driver_phone: string
  capacity: number
}

export interface Pickup {
  id: string
  wedding_id: string
  guest_id: string
  vehicle_id: string | null
  type: 'pickup' | 'drop'
  scheduled_time: string
  actual_time: string | null
  from_location: string
  to_location: string
  status: PickupStatus
  notes: string | null
  created_at: string
}

export interface FbCount {
  id: string
  wedding_id: string
  event_id: string
  meal_type: MealType
  veg: number
  non_veg: number
  jain: number
  other: number
  counted_by: string
  counted_at: string
  notes: string | null
}

export interface DecorItem {
  id: string
  wedding_id: string
  event_id: string | null
  title: string
  description: string | null
  reference_image_url: string | null
  status: DecorStatus
  completed_by: string | null
  completed_at: string | null
  issue_note: string | null
  created_at: string
}

export interface Communication {
  id: string
  wedding_id: string
  channel: CommChannel
  recipient_type: CommRecipientType
  event_id: string | null
  guest_id: string | null
  subject: string | null
  body: string
  status: string
  sent_at: string | null
  sent_by: string
}

export interface Incident {
  id: string
  wedding_id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  reported_by: string
  assigned_to: string | null
  created_at: string
  resolved_at: string | null
}

export interface Media {
  id: string
  wedding_id: string
  type: MediaType
  name: string
  url: string
  uploaded_by: string
  created_at: string
}

// ── View/join types used in UI ───────────────────────────────

export interface GuestWithEvents extends Guest {
  guest_events: (GuestEvent & { event: WeddingEvent })[]
  room_allocation: (RoomAllocation & { room: Room }) | null
}

export interface WeddingWithAccess extends Wedding {
  wedding_access: WeddingAccess[]
}

export interface VendorWithPayments extends Vendor {
  vendor_payments: VendorPayment[]
}

export interface BudgetCategoryWithItems extends BudgetCategory {
  budget_items: BudgetItem[]
}

// ── Auth session extras ──────────────────────────────────────

export interface AppUser extends User {
  company_member: CompanyMember & { company: Company }
  wedding_access: (WeddingAccess & { wedding: Wedding })[]
}

// ─────────────────────────────────────────────────────────────
// PHASE 2 — Org Events (Corporate / Government / Public)
// ─────────────────────────────────────────────────────────────

export type OrgEventType    = 'corporate' | 'government' | 'public'
export type SessionType     = 'keynote' | 'panel' | 'workshop' | 'break' | 'networking' | 'other'
export type SessionStatus   = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type SpeakerStatus   = 'invited' | 'confirmed' | 'declined'
export type SpeakerRole     = 'speaker' | 'moderator' | 'panelist'
export type DelegateStatus  = 'registered' | 'confirmed' | 'checked_in' | 'cancelled'

export interface OrgEvent {
  id: string
  company_id: string
  name: string
  event_code: string
  type: OrgEventType
  status: 'setup' | 'active' | 'completed' | 'archived'
  start_date: string | null
  end_date: string | null
  venue: string | null
  city: string | null
  expected_count: number
  budget_total: number
  notes: string | null
  created_at: string
}

export interface AgendaSession {
  id: string
  org_event_id: string
  title: string
  description: string | null
  date: string | null
  start_time: string
  end_time: string | null
  venue: string | null
  type: SessionType
  status: SessionStatus
  order: number
  created_at: string
}

export interface Speaker {
  id: string
  org_event_id: string
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  photo_url: string | null
  phone: string | null
  email: string | null
  linkedin_url: string | null
  fill_token: string
  status: SpeakerStatus
  token_filled_at: string | null
  created_at: string
}

export interface SessionSpeaker {
  id: string
  session_id: string
  speaker_id: string
  role: SpeakerRole
}

export interface Delegate {
  id: string
  org_event_id: string
  name: string
  title: string | null
  organization: string | null
  phone: string | null
  email: string | null
  dietary: DietaryPref
  dietary_notes: string | null
  is_vip: boolean
  badge_printed: boolean
  checked_in: boolean
  checked_in_at: string | null
  status: DelegateStatus
  rsvp_token: string
  notes: string | null
  created_at: string
}

export interface DelegateSession {
  id: string
  delegate_id: string
  session_id: string
  rsvp_status: RsvpStatus
  created_at: string
}

export interface OrgChecklistItem {
  id: string
  org_event_id: string
  title: string
  category: string
  status: ChecklistStatus
  due_date: string | null
  assigned_to: string | null
  notes: string | null
  order: number
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  company_id: string | null
  event_type: string
  title: string
  category: string
  order: number
  created_at: string
}

// ── Join types ───────────────────────────────────────────────

export interface AgendaSessionWithSpeakers extends AgendaSession {
  session_speakers: (SessionSpeaker & { speaker: Speaker })[]
}

export interface SpeakerWithSessions extends Speaker {
  session_speakers: (SessionSpeaker & { session: AgendaSession })[]
}
