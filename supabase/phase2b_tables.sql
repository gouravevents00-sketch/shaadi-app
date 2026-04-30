-- ─────────────────────────────────────────────────────────────
-- Phase 2b: All new org-event tables
-- Run in Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- Org Event Guests (VIPs, dignitaries)
create table if not exists org_guests (
  id                uuid primary key default uuid_generate_v4(),
  org_event_id      uuid not null references org_events(id) on delete cascade,
  salutation        text,
  name              text not null,
  designation       text,
  organisation      text,
  email             text,
  phone             text,
  category          text,
  is_vvip           boolean not null default false,
  requires_escort   boolean not null default false,
  requires_vehicle  boolean not null default false,
  dietary           text,
  notes             text,
  checked_in        boolean not null default false,
  checked_in_at     timestamptz,
  created_at        timestamptz not null default now()
);

-- Artists / Performers
create table if not exists org_artists (
  id                  uuid primary key default uuid_generate_v4(),
  org_event_id        uuid not null references org_events(id) on delete cascade,
  name                text not null,
  act_type            text,
  contact_name        text,
  contact_phone       text,
  contact_email       text,
  performance_slot    text,
  duration_mins       integer,
  fee                 numeric(12,2),
  fee_paid            numeric(12,2) not null default 0,
  tech_rider          text,
  hospitality_rider   text,
  arrival_time        text,
  soundcheck_time     text,
  notes               text,
  created_at          timestamptz not null default now()
);

-- Volunteers
create table if not exists org_volunteers (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  role          text,
  zone          text,
  shift_start   text,
  shift_end     text,
  t_shirt_size  text,
  checked_in    boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Vendors
create table if not exists org_vendors (
  id                uuid primary key default uuid_generate_v4(),
  org_event_id      uuid not null references org_events(id) on delete cascade,
  name              text not null,
  category          text,
  contact_name      text,
  contact_phone     text,
  contact_email     text,
  quoted_amount     numeric(12,2),
  contract_signed   boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists org_vendor_payments (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references org_vendors(id) on delete cascade,
  amount      numeric(12,2) not null,
  paid_on     date,
  method      text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Accommodation
create table if not exists org_rooms (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  room_number   text not null,
  room_type     text,
  floor         text,
  capacity      integer,
  is_allocated  boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists org_room_allocations (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references org_rooms(id) on delete cascade,
  guest_name  text not null,
  check_in    date,
  check_out   date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Sponsors
create table if not exists org_sponsors (
  id               uuid primary key default uuid_generate_v4(),
  org_event_id     uuid not null references org_events(id) on delete cascade,
  name             text not null,
  tier             text,   -- title | co_presenting | powered_by | associate | supported_by | in_association
  logo_url         text,
  contact_name     text,
  contact_phone    text,
  contact_email    text,
  amount           numeric(12,2),
  amount_received  numeric(12,2) not null default 0,
  deliverables     text,
  notes            text,
  created_at       timestamptz not null default now()
);

-- Run of Show / Timeline
create table if not exists org_timeline_items (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  time          text not null,
  end_time      text,
  activity      text not null,
  owner         text,
  venue         text,
  category      text,
  notes         text,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Budget categories + line items
create table if not exists org_budget_categories (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  name          text not null,
  estimated     numeric(12,2) not null default 0,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists org_budget_items (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  category_id   uuid not null references org_budget_categories(id) on delete cascade,
  description   text not null,
  quoted        numeric(12,2) not null default 0,
  paid          numeric(12,2) not null default 0,
  due_date      date,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Add budget_total to org_events if missing
-- ─────────────────────────────────────────────────────────────
alter table org_events add column if not exists budget_total numeric(12,2) not null default 0;

-- ─────────────────────────────────────────────────────────────
-- RLS: enable + basic policies (service_role bypasses anyway)
-- ─────────────────────────────────────────────────────────────
alter table org_guests            enable row level security;
alter table org_artists           enable row level security;
alter table org_volunteers        enable row level security;
alter table org_vendors           enable row level security;
alter table org_vendor_payments   enable row level security;
alter table org_rooms             enable row level security;
alter table org_room_allocations  enable row level security;
alter table org_sponsors          enable row level security;
alter table org_timeline_items    enable row level security;
alter table org_budget_categories enable row level security;
alter table org_budget_items      enable row level security;

-- Allow authenticated company members to read their own event data
create policy "org_guests_select" on org_guests for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_artists_select" on org_artists for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_volunteers_select" on org_volunteers for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_vendors_select" on org_vendors for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_vendor_payments_select" on org_vendor_payments for select using (
  vendor_id in (select id from org_vendors where org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1)))
);
create policy "org_rooms_select" on org_rooms for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_room_allocations_select" on org_room_allocations for select using (
  room_id in (select id from org_rooms where org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1)))
);
create policy "org_sponsors_select" on org_sponsors for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_timeline_items_select" on org_timeline_items for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_budget_categories_select" on org_budget_categories for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
create policy "org_budget_items_select" on org_budget_items for select using (
  org_event_id in (select id from org_events where company_id = (select company_id from company_members where user_id = auth.uid() limit 1))
);
