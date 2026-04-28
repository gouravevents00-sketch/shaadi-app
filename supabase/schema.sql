-- ═══════════════════════════════════════════════════════════════
-- SHAADI APP — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

create type company_plan as enum ('trial', 'starter', 'pro', 'enterprise');
create type company_member_role as enum ('owner', 'admin', 'coordinator');
create type wedding_status as enum ('setup', 'active', 'completed', 'archived');
create type wedding_access_role as enum (
  'coordinator', 'bride_family', 'groom_family',
  'hospitality', 'logistics', 'fb_team', 'decor_team', 'photography'
);
create type side_type as enum ('bride', 'groom', 'both', 'shared', 'neutral');
create type event_type as enum ('ceremony', 'meal', 'ritual', 'party', 'other');
create type rsvp_status as enum ('pending', 'confirmed', 'declined');
create type checklist_status as enum ('pending', 'in_progress', 'done');
create type vendor_status as enum ('enquired', 'booked', 'confirmed', 'paid', 'cancelled');
create type arrival_status as enum ('expected', 'arrived', 'no_show');
create type pickup_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type decor_status as enum ('pending', 'in_progress', 'done', 'issue');
create type incident_severity as enum ('low', 'medium', 'high');
create type incident_status as enum ('open', 'assigned', 'resolved');
create type comm_channel as enum ('email', 'sms', 'whatsapp');
create type comm_recipient_type as enum ('all', 'event', 'individual');
create type media_type as enum ('invitation', 'contract', 'reference', 'album', 'other');
create type dietary_pref as enum ('veg', 'non_veg', 'jain', 'other');
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'high_tea', 'snacks');
create type vehicle_type as enum ('car', 'bus', 'van', 'suv');
create type priority_level as enum ('low', 'medium', 'high');

-- ─────────────────────────────────────────────────────────────
-- PLATFORM LEVEL
-- ─────────────────────────────────────────────────────────────

create table companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  plan        company_plan not null default 'trial',
  created_at  timestamptz not null default now()
);

-- Public user profile (mirrors auth.users)
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  phone       text,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table company_members (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        company_member_role not null default 'coordinator',
  created_at  timestamptz not null default now(),
  unique(company_id, user_id)
);

-- Invites (pending invitations before user signs up)
create table invites (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  wedding_id   uuid,  -- nullable: company invite vs wedding-specific invite
  email        text not null,
  role         text not null,
  side         side_type,
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid not null references users(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- WEDDING CORE
-- ─────────────────────────────────────────────────────────────

create table weddings (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  bride_name      text not null,
  groom_name      text not null,
  wedding_code    text not null unique,  -- 6-char code: RGWED1
  status          wedding_status not null default 'setup',
  budget_total    numeric(12,2) not null default 0,
  primary_venue   text,
  primary_city    text,
  wedding_date    date,
  notes           text,
  created_at      timestamptz not null default now()
);

create table wedding_access (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        wedding_access_role not null,
  side        side_type not null default 'neutral',
  created_at  timestamptz not null default now(),
  unique(wedding_id, user_id)
);

create table events (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references weddings(id) on delete cascade,
  name            text not null,
  date            date not null,
  start_time      time not null,
  end_time        time,
  venue           text not null,
  city            text,
  expected_count  integer not null default 0,
  type            event_type not null default 'ceremony',
  notes           text,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- GUESTS
-- ─────────────────────────────────────────────────────────────

create table guests (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references weddings(id) on delete cascade,
  name            text not null,
  phone           text,
  email           text,
  side            side_type not null default 'both',
  is_vip          boolean not null default false,
  dietary         dietary_pref not null default 'veg',
  dietary_notes   text,
  rsvp_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  notes           text,
  created_at      timestamptz not null default now()
);

create table guest_events (
  id           uuid primary key default uuid_generate_v4(),
  guest_id     uuid not null references guests(id) on delete cascade,
  event_id     uuid not null references events(id) on delete cascade,
  rsvp_status  rsvp_status not null default 'pending',
  meal_note    text,
  created_at   timestamptz not null default now(),
  unique(guest_id, event_id)
);

-- ─────────────────────────────────────────────────────────────
-- ROOMS
-- ─────────────────────────────────────────────────────────────

create table rooms (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  room_number text not null,
  type        text not null default 'standard',
  capacity    integer not null default 2,
  floor       text,
  notes       text
);

create table room_allocations (
  id           uuid primary key default uuid_generate_v4(),
  room_id      uuid not null references rooms(id) on delete cascade,
  guest_id     uuid not null references guests(id) on delete cascade,
  check_in     date not null,
  check_out    date not null,
  kit_given    boolean not null default false,
  kit_given_at timestamptz,
  created_at   timestamptz not null default now(),
  unique(guest_id, room_id)
);

-- ─────────────────────────────────────────────────────────────
-- CLIENT PORTAL
-- ─────────────────────────────────────────────────────────────

create table checklist_items (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  title       text not null,
  category    text not null default 'General',
  side        side_type not null default 'shared',
  status      checklist_status not null default 'pending',
  due_date    date,
  assigned_to uuid references users(id),
  notes       text,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

create table requirements (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  side        side_type not null default 'shared',
  title       text not null,
  description text,
  priority    priority_level not null default 'medium',
  status      checklist_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- VENDORS
-- ─────────────────────────────────────────────────────────────

create table vendors (
  id            uuid primary key default uuid_generate_v4(),
  wedding_id    uuid not null references weddings(id) on delete cascade,
  name          text not null,
  category      text not null,
  contact_name  text,
  phone         text,
  email         text,
  total_amount  numeric(12,2) not null default 0,
  paid_amount   numeric(12,2) not null default 0,
  status        vendor_status not null default 'enquired',
  contract_url  text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table vendor_payments (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  amount      numeric(12,2) not null,
  due_date    date not null,
  paid_date   date,
  mode        text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- BUDGET
-- ─────────────────────────────────────────────────────────────

create table budget_categories (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  name        text not null,
  estimated   numeric(12,2) not null default 0,
  "order"     integer not null default 0
);

create table budget_items (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid not null references budget_categories(id) on delete cascade,
  wedding_id   uuid not null references weddings(id) on delete cascade,
  vendor_id    uuid references vendors(id) on delete set null,
  description  text not null,
  estimated    numeric(12,2) not null default 0,
  quoted       numeric(12,2) not null default 0,
  paid         numeric(12,2) not null default 0,
  invoice_url  text,
  due_date     date,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- OPS
-- ─────────────────────────────────────────────────────────────

create table timeline_items (
  id            uuid primary key default uuid_generate_v4(),
  wedding_id    uuid not null references weddings(id) on delete cascade,
  event_id      uuid references events(id) on delete set null,
  time          time not null,
  duration_mins integer not null default 30,
  title         text not null,
  description   text,
  team          text not null default 'all',
  status        checklist_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create table arrivals (
  id               uuid primary key default uuid_generate_v4(),
  wedding_id       uuid not null references weddings(id) on delete cascade,
  guest_id         uuid not null references guests(id) on delete cascade,
  event_id         uuid references events(id) on delete set null,
  mode             text not null default 'self',
  flight_train_no  text,
  arrival_time     timestamptz,
  pickup_required  boolean not null default false,
  status           arrival_status not null default 'expected',
  created_at       timestamptz not null default now()
);

create table vehicles (
  id            uuid primary key default uuid_generate_v4(),
  wedding_id    uuid not null references weddings(id) on delete cascade,
  number        text not null,
  type          vehicle_type not null default 'car',
  driver_name   text not null,
  driver_phone  text not null,
  capacity      integer not null default 4
);

create table pickups (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references weddings(id) on delete cascade,
  guest_id        uuid not null references guests(id) on delete cascade,
  vehicle_id      uuid references vehicles(id) on delete set null,
  type            text not null default 'pickup',
  scheduled_time  timestamptz not null,
  actual_time     timestamptz,
  from_location   text not null,
  to_location     text not null,
  status          pickup_status not null default 'scheduled',
  notes           text,
  created_at      timestamptz not null default now()
);

create table fb_counts (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  event_id    uuid not null references events(id) on delete cascade,
  meal_type   meal_type not null,
  veg         integer not null default 0,
  non_veg     integer not null default 0,
  jain        integer not null default 0,
  other       integer not null default 0,
  counted_by  uuid not null references users(id),
  counted_at  timestamptz not null default now(),
  notes       text
);

create table decor_items (
  id                   uuid primary key default uuid_generate_v4(),
  wedding_id           uuid not null references weddings(id) on delete cascade,
  event_id             uuid references events(id) on delete set null,
  title                text not null,
  description          text,
  reference_image_url  text,
  status               decor_status not null default 'pending',
  completed_by         uuid references users(id),
  completed_at         timestamptz,
  issue_note           text,
  created_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- COMMUNICATIONS & INCIDENTS
-- ─────────────────────────────────────────────────────────────

create table communications (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references weddings(id) on delete cascade,
  channel         comm_channel not null default 'email',
  recipient_type  comm_recipient_type not null default 'all',
  event_id        uuid references events(id) on delete set null,
  guest_id        uuid references guests(id) on delete set null,
  subject         text,
  body            text not null,
  status          text not null default 'sent',
  sent_at         timestamptz,
  sent_by         uuid not null references users(id),
  created_at      timestamptz not null default now()
);

create table incidents (
  id           uuid primary key default uuid_generate_v4(),
  wedding_id   uuid not null references weddings(id) on delete cascade,
  title        text not null,
  description  text not null,
  severity     incident_severity not null default 'medium',
  status       incident_status not null default 'open',
  reported_by  uuid not null references users(id),
  assigned_to  uuid references users(id),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create table media (
  id           uuid primary key default uuid_generate_v4(),
  wedding_id   uuid not null references weddings(id) on delete cascade,
  type         media_type not null default 'other',
  name         text not null,
  url          text not null,
  uploaded_by  uuid not null references users(id),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index idx_company_members_user    on company_members(user_id);
create index idx_company_members_company on company_members(company_id);
create index idx_weddings_company        on weddings(company_id);
create index idx_weddings_code           on weddings(wedding_code);
create index idx_wedding_access_wedding  on wedding_access(wedding_id);
create index idx_wedding_access_user     on wedding_access(user_id);
create index idx_events_wedding          on events(wedding_id);
create index idx_guests_wedding          on guests(wedding_id);
create index idx_guests_rsvp_token       on guests(rsvp_token);
create index idx_guest_events_guest      on guest_events(guest_id);
create index idx_guest_events_event      on guest_events(event_id);
create index idx_rooms_wedding           on rooms(wedding_id);
create index idx_room_alloc_room         on room_allocations(room_id);
create index idx_room_alloc_guest        on room_allocations(guest_id);
create index idx_checklist_wedding       on checklist_items(wedding_id);
create index idx_vendors_wedding         on vendors(wedding_id);
create index idx_budget_items_wedding    on budget_items(wedding_id);
create index idx_timeline_wedding        on timeline_items(wedding_id);
create index idx_arrivals_wedding        on arrivals(wedding_id);
create index idx_pickups_wedding         on pickups(wedding_id);
create index idx_fb_counts_event         on fb_counts(event_id);
create index idx_decor_wedding           on decor_items(wedding_id);
create index idx_incidents_wedding       on incidents(wedding_id);
create index idx_invites_token           on invites(token);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-create user profile on auth.users insert
-- ─────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table companies         enable row level security;
alter table users             enable row level security;
alter table company_members   enable row level security;
alter table invites           enable row level security;
alter table weddings          enable row level security;
alter table wedding_access    enable row level security;
alter table events            enable row level security;
alter table guests            enable row level security;
alter table guest_events      enable row level security;
alter table rooms             enable row level security;
alter table room_allocations  enable row level security;
alter table checklist_items   enable row level security;
alter table requirements      enable row level security;
alter table budget_categories enable row level security;
alter table budget_items      enable row level security;
alter table vendors           enable row level security;
alter table vendor_payments   enable row level security;
alter table timeline_items    enable row level security;
alter table arrivals          enable row level security;
alter table vehicles          enable row level security;
alter table pickups           enable row level security;
alter table fb_counts         enable row level security;
alter table decor_items       enable row level security;
alter table communications    enable row level security;
alter table incidents         enable row level security;
alter table media             enable row level security;

-- Helper functions for RLS
create or replace function my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from company_members where user_id = auth.uid() limit 1;
$$;

create or replace function my_wedding_ids()
returns setof uuid language sql stable security definer as $$
  select wedding_id from wedding_access where user_id = auth.uid()
  union
  select w.id from weddings w
  inner join company_members cm on cm.company_id = w.company_id
  where cm.user_id = auth.uid();
$$;

create or replace function my_role_in_wedding(wid uuid)
returns text language sql stable security definer as $$
  select role::text from wedding_access where wedding_id = wid and user_id = auth.uid() limit 1;
$$;

create or replace function is_company_member()
returns boolean language sql stable security definer as $$
  select exists(select 1 from company_members where user_id = auth.uid());
$$;

-- ── POLICIES ─────────────────────────────────────────────────

-- users: read own profile
create policy "users_select_own" on users for select using (id = auth.uid());
create policy "users_update_own" on users for update using (id = auth.uid());

-- companies: members can read their company
create policy "companies_select" on companies for select
  using (id = my_company_id());

-- company_members: read own membership
create policy "cm_select" on company_members for select
  using (user_id = auth.uid() or company_id = my_company_id());

-- invites: read invites for your company or your email
create policy "invites_select" on invites for select
  using (company_id = my_company_id() or email = (select email from users where id = auth.uid()));
create policy "invites_insert" on invites for insert
  with check (company_id = my_company_id());

-- weddings: accessible to company members + wedding access members
create policy "weddings_select" on weddings for select
  using (id in (select my_wedding_ids()));
create policy "weddings_insert" on weddings for insert
  with check (company_id = my_company_id());
create policy "weddings_update" on weddings for update
  using (company_id = my_company_id());

-- wedding_access: readable if you have access to the wedding
create policy "wa_select" on wedding_access for select
  using (wedding_id in (select my_wedding_ids()));
create policy "wa_insert" on wedding_access for insert
  with check (wedding_id in (select my_wedding_ids()) and is_company_member());

-- events: accessible to wedding members
create policy "events_select" on events for select
  using (wedding_id in (select my_wedding_ids()));
create policy "events_insert" on events for insert
  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "events_update" on events for update
  using (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "events_delete" on events for delete
  using (wedding_id in (select my_wedding_ids()) and is_company_member());

-- guests: accessible to wedding members
create policy "guests_select" on guests for select
  using (wedding_id in (select my_wedding_ids()));
create policy "guests_insert" on guests for insert
  with check (wedding_id in (select my_wedding_ids()));
create policy "guests_update" on guests for update
  using (wedding_id in (select my_wedding_ids()));
create policy "guests_delete" on guests for delete
  using (wedding_id in (select my_wedding_ids()) and is_company_member());

-- guest_events: accessible via guest
create policy "ge_select" on guest_events for select
  using (guest_id in (select id from guests where wedding_id in (select my_wedding_ids())));
create policy "ge_insert" on guest_events for insert
  with check (guest_id in (select id from guests where wedding_id in (select my_wedding_ids())));
create policy "ge_update" on guest_events for update
  using (guest_id in (select id from guests where wedding_id in (select my_wedding_ids())));

-- rooms + allocations
create policy "rooms_select" on rooms for select
  using (wedding_id in (select my_wedding_ids()));
create policy "rooms_insert" on rooms for insert
  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "rooms_update" on rooms for update
  using (wedding_id in (select my_wedding_ids()) and is_company_member());

create policy "ra_select" on room_allocations for select
  using (room_id in (select id from rooms where wedding_id in (select my_wedding_ids())));
create policy "ra_insert" on room_allocations for insert
  with check (room_id in (select id from rooms where wedding_id in (select my_wedding_ids())));
create policy "ra_update" on room_allocations for update
  using (room_id in (select id from rooms where wedding_id in (select my_wedding_ids())));

-- checklist, requirements, budget, vendors — same pattern
create policy "cl_select"  on checklist_items for select  using (wedding_id in (select my_wedding_ids()));
create policy "cl_insert"  on checklist_items for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "cl_update"  on checklist_items for update  using (wedding_id in (select my_wedding_ids()));
create policy "cl_delete"  on checklist_items for delete  using (wedding_id in (select my_wedding_ids()));

create policy "req_select" on requirements for select  using (wedding_id in (select my_wedding_ids()));
create policy "req_insert" on requirements for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "req_update" on requirements for update  using (wedding_id in (select my_wedding_ids()));
create policy "req_delete" on requirements for delete  using (wedding_id in (select my_wedding_ids()));

create policy "bc_select"  on budget_categories for select  using (wedding_id in (select my_wedding_ids()));
create policy "bc_insert"  on budget_categories for insert  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "bc_update"  on budget_categories for update  using (wedding_id in (select my_wedding_ids()) and is_company_member());

create policy "bi_select"  on budget_items for select  using (wedding_id in (select my_wedding_ids()));
create policy "bi_insert"  on budget_items for insert  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "bi_update"  on budget_items for update  using (wedding_id in (select my_wedding_ids()) and is_company_member());

create policy "v_select"   on vendors for select  using (wedding_id in (select my_wedding_ids()));
create policy "v_insert"   on vendors for insert  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "v_update"   on vendors for update  using (wedding_id in (select my_wedding_ids()) and is_company_member());

create policy "vp_select"  on vendor_payments for select  using (vendor_id in (select id from vendors where wedding_id in (select my_wedding_ids())));
create policy "vp_insert"  on vendor_payments for insert  with check (vendor_id in (select id from vendors where wedding_id in (select my_wedding_ids())));
create policy "vp_update"  on vendor_payments for update  using (vendor_id in (select id from vendors where wedding_id in (select my_wedding_ids())));

-- ops tables
create policy "tl_select"  on timeline_items for select  using (wedding_id in (select my_wedding_ids()));
create policy "tl_insert"  on timeline_items for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "tl_update"  on timeline_items for update  using (wedding_id in (select my_wedding_ids()));

create policy "arr_select" on arrivals for select  using (wedding_id in (select my_wedding_ids()));
create policy "arr_insert" on arrivals for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "arr_update" on arrivals for update  using (wedding_id in (select my_wedding_ids()));

create policy "veh_select" on vehicles for select  using (wedding_id in (select my_wedding_ids()));
create policy "veh_insert" on vehicles for insert  with check (wedding_id in (select my_wedding_ids()) and is_company_member());
create policy "veh_update" on vehicles for update  using (wedding_id in (select my_wedding_ids()));

create policy "pu_select"  on pickups for select  using (wedding_id in (select my_wedding_ids()));
create policy "pu_insert"  on pickups for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "pu_update"  on pickups for update  using (wedding_id in (select my_wedding_ids()));

create policy "fb_select"  on fb_counts for select  using (wedding_id in (select my_wedding_ids()));
create policy "fb_insert"  on fb_counts for insert  with check (wedding_id in (select my_wedding_ids()));

create policy "dc_select"  on decor_items for select  using (wedding_id in (select my_wedding_ids()));
create policy "dc_insert"  on decor_items for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "dc_update"  on decor_items for update  using (wedding_id in (select my_wedding_ids()));

create policy "comm_select" on communications for select  using (wedding_id in (select my_wedding_ids()));
create policy "comm_insert" on communications for insert  with check (wedding_id in (select my_wedding_ids()) and is_company_member());

create policy "inc_select"  on incidents for select  using (wedding_id in (select my_wedding_ids()));
create policy "inc_insert"  on incidents for insert  with check (wedding_id in (select my_wedding_ids()));
create policy "inc_update"  on incidents for update  using (wedding_id in (select my_wedding_ids()));

create policy "med_select"  on media for select  using (wedding_id in (select my_wedding_ids()));
create policy "med_insert"  on media for insert  with check (wedding_id in (select my_wedding_ids()));

-- ─────────────────────────────────────────────────────────────
-- PUBLIC RSVP POLICY (no auth needed — token-based)
-- guest accesses their own record via rsvp_token
-- These are handled via a separate API route using service_role
-- ─────────────────────────────────────────────────────────────

-- NOTE: RSVP endpoints use the service_role key server-side,
-- so no public policies needed. Tokens provide security.
