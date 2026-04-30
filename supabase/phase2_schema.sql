-- ═══════════════════════════════════════════════════════════════
-- SHAADI APP — Phase 2: Corporate / Government / Public Events
-- Safe to re-run: uses IF NOT EXISTS + ON CONFLICT throughout
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- NEW ENUMS (skip if already exist)
-- ─────────────────────────────────────────────────────────────

do $$ begin
  create type org_event_type as enum ('corporate', 'government', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_type as enum ('keynote', 'panel', 'workshop', 'break', 'networking', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('scheduled', 'live', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type speaker_status as enum ('invited', 'confirmed', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type speaker_role as enum ('speaker', 'moderator', 'panelist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delegate_status as enum ('registered', 'confirmed', 'checked_in', 'cancelled');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

create table if not exists org_events (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  name            text not null,
  event_code      text not null unique,
  type            org_event_type not null default 'corporate',
  status          wedding_status not null default 'setup',
  start_date      date,
  end_date        date,
  venue           text,
  city            text,
  expected_count  integer not null default 0,
  budget_total    numeric(12,2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists agenda_sessions (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  title         text not null,
  description   text,
  date          date,
  start_time    time not null,
  end_time      time,
  venue         text,
  type          session_type not null default 'other',
  status        session_status not null default 'scheduled',
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists speakers (
  id               uuid primary key default uuid_generate_v4(),
  org_event_id     uuid not null references org_events(id) on delete cascade,
  name             text not null,
  title            text,
  organization     text,
  bio              text,
  photo_url        text,
  phone            text,
  email            text,
  linkedin_url     text,
  fill_token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  status           speaker_status not null default 'invited',
  token_filled_at  timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists session_speakers (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references agenda_sessions(id) on delete cascade,
  speaker_id  uuid not null references speakers(id) on delete cascade,
  role        speaker_role not null default 'speaker',
  unique(session_id, speaker_id)
);

create table if not exists delegates (
  id              uuid primary key default uuid_generate_v4(),
  org_event_id    uuid not null references org_events(id) on delete cascade,
  name            text not null,
  title           text,
  organization    text,
  phone           text,
  email           text,
  dietary         dietary_pref not null default 'veg',
  dietary_notes   text,
  is_vip          boolean not null default false,
  badge_printed   boolean not null default false,
  checked_in      boolean not null default false,
  checked_in_at   timestamptz,
  status          delegate_status not null default 'registered',
  rsvp_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists delegate_sessions (
  id           uuid primary key default uuid_generate_v4(),
  delegate_id  uuid not null references delegates(id) on delete cascade,
  session_id   uuid not null references agenda_sessions(id) on delete cascade,
  rsvp_status  rsvp_status not null default 'pending',
  created_at   timestamptz not null default now(),
  unique(delegate_id, session_id)
);

create table if not exists org_checklist_items (
  id            uuid primary key default uuid_generate_v4(),
  org_event_id  uuid not null references org_events(id) on delete cascade,
  title         text not null,
  category      text not null default 'General',
  status        checklist_status not null default 'pending',
  due_date      date,
  assigned_to   uuid references users(id),
  notes         text,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Drop and recreate checklist_templates fresh (no real data in this table)
drop table if exists checklist_templates cascade;

create table checklist_templates (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid references companies(id) on delete cascade,
  event_type  text not null,
  title       text not null,
  category    text not null,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_org_events_company        on org_events(company_id);
create index if not exists idx_org_events_code           on org_events(event_code);
create index if not exists idx_agenda_sessions_event     on agenda_sessions(org_event_id);
create index if not exists idx_speakers_event            on speakers(org_event_id);
create index if not exists idx_speakers_fill_token       on speakers(fill_token);
create index if not exists idx_session_speakers_session  on session_speakers(session_id);
create index if not exists idx_session_speakers_speaker  on session_speakers(speaker_id);
create index if not exists idx_delegates_event           on delegates(org_event_id);
create index if not exists idx_delegates_rsvp_token      on delegates(rsvp_token);
create index if not exists idx_delegate_sessions_del     on delegate_sessions(delegate_id);
create index if not exists idx_delegate_sessions_ses     on delegate_sessions(session_id);
create index if not exists idx_org_checklist_event       on org_checklist_items(org_event_id);
create index if not exists idx_checklist_templates_type  on checklist_templates(event_type);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table org_events           enable row level security;
alter table agenda_sessions      enable row level security;
alter table speakers             enable row level security;
alter table session_speakers     enable row level security;
alter table delegates            enable row level security;
alter table delegate_sessions    enable row level security;
alter table org_checklist_items  enable row level security;
alter table checklist_templates  enable row level security;

-- Helper function
create or replace function my_org_event_ids()
returns setof uuid language sql stable security definer as $$
  select id from org_events where company_id = my_company_id();
$$;

-- ── POLICIES (skip if already exist) ─────────────────────────

do $$ begin create policy "oe_select" on org_events for select using (company_id = my_company_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "oe_insert" on org_events for insert with check (company_id = my_company_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "oe_update" on org_events for update using (company_id = my_company_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "oe_delete" on org_events for delete using (company_id = my_company_id() and is_company_member()); exception when duplicate_object then null; end $$;

do $$ begin create policy "as_select" on agenda_sessions for select using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "as_insert" on agenda_sessions for insert with check (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "as_update" on agenda_sessions for update using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "as_delete" on agenda_sessions for delete using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;

do $$ begin create policy "spk_select" on speakers for select using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "spk_insert" on speakers for insert with check (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "spk_update" on speakers for update using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "spk_delete" on speakers for delete using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;

do $$ begin create policy "ss_select" on session_speakers for select using (session_id in (select id from agenda_sessions where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;
do $$ begin create policy "ss_insert" on session_speakers for insert with check (session_id in (select id from agenda_sessions where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;
do $$ begin create policy "ss_delete" on session_speakers for delete using (session_id in (select id from agenda_sessions where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;

do $$ begin create policy "del_select" on delegates for select using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "del_insert" on delegates for insert with check (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "del_update" on delegates for update using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "del_delete" on delegates for delete using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;

do $$ begin create policy "ds_select" on delegate_sessions for select using (delegate_id in (select id from delegates where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;
do $$ begin create policy "ds_insert" on delegate_sessions for insert with check (delegate_id in (select id from delegates where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;
do $$ begin create policy "ds_update" on delegate_sessions for update using (delegate_id in (select id from delegates where org_event_id in (select my_org_event_ids()))); exception when duplicate_object then null; end $$;

do $$ begin create policy "ocl_select" on org_checklist_items for select using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "ocl_insert" on org_checklist_items for insert with check (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "ocl_update" on org_checklist_items for update using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;
do $$ begin create policy "ocl_delete" on org_checklist_items for delete using (org_event_id in (select my_org_event_ids())); exception when duplicate_object then null; end $$;

do $$ begin create policy "ct_select" on checklist_templates for select using (company_id is null or company_id = my_company_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "ct_insert" on checklist_templates for insert with check (company_id = my_company_id() and is_company_member()); exception when duplicate_object then null; end $$;
do $$ begin create policy "ct_delete" on checklist_templates for delete using (company_id = my_company_id() and is_company_member()); exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- SEED: BUILT-IN CHECKLIST TEMPLATES
-- Delete system rows first so re-run is safe
-- ─────────────────────────────────────────────────────────────

delete from checklist_templates where company_id is null;

insert into checklist_templates (company_id, event_type, title, category, "order") values

-- ── CORPORATE ────────────────────────────────────────────────
(null, 'corporate', 'Confirm venue booking and payment',        'Venue & Logistics', 1),
(null, 'corporate', 'Arrange AV / projector / screen setup',    'Venue & Logistics', 2),
(null, 'corporate', 'Confirm high-speed internet / Wi-Fi',      'Venue & Logistics', 3),
(null, 'corporate', 'Arrange parking and valet if needed',      'Venue & Logistics', 4),
(null, 'corporate', 'Set up registration / reception desk',     'Venue & Logistics', 5),
(null, 'corporate', 'Arrange security personnel',               'Venue & Logistics', 6),

(null, 'corporate', 'Finalise agenda and session timings',      'Programme', 7),
(null, 'corporate', 'Confirm all speakers and their topics',    'Programme', 8),
(null, 'corporate', 'Collect speaker presentations / decks',    'Programme', 9),
(null, 'corporate', 'Print and distribute schedule booklets',   'Programme', 10),
(null, 'corporate', 'Arrange MC / anchor for the event',        'Programme', 11),
(null, 'corporate', 'Conduct speaker rehearsal / AV check',     'Programme', 12),

(null, 'corporate', 'Send invitations to delegates',            'Delegates', 13),
(null, 'corporate', 'Track RSVPs and confirmations',            'Delegates', 14),
(null, 'corporate', 'Print delegate badges',                    'Delegates', 15),
(null, 'corporate', 'Prepare welcome kits / delegate bags',     'Delegates', 16),
(null, 'corporate', 'Confirm dietary requirements',             'Delegates', 17),
(null, 'corporate', 'Arrange VIP seating / reserved areas',     'Delegates', 18),

(null, 'corporate', 'Confirm head count for each meal / break', 'Catering', 19),
(null, 'corporate', 'Set up tea / coffee break stations',       'Catering', 20),
(null, 'corporate', 'Arrange Jain / special dietary options',   'Catering', 21),
(null, 'corporate', 'Confirm lunch / dinner seating plan',      'Catering', 22),

(null, 'corporate', 'Design and print branded banners / standees', 'Branding', 23),
(null, 'corporate', 'Arrange branded stage backdrop',           'Branding', 24),
(null, 'corporate', 'Prepare branded collateral / gifts',       'Branding', 25),

(null, 'corporate', 'Send pre-event reminder to all delegates', 'Communications', 26),
(null, 'corporate', 'Share final schedule and venue details',   'Communications', 27),
(null, 'corporate', 'Send post-event thank-you note',           'Communications', 28),

-- ── GOVERNMENT ───────────────────────────────────────────────
(null, 'government', 'Confirm venue and government protocol approval', 'Protocol & Security', 1),
(null, 'government', 'Prepare official protocol sheet (dignitaries)',  'Protocol & Security', 2),
(null, 'government', 'Coordinate VIP / VVIP security requirements',    'Protocol & Security', 3),
(null, 'government', 'Arrange security sweep of venue',                'Protocol & Security', 4),
(null, 'government', 'Prepare seating allocation for dignitaries',     'Protocol & Security', 5),
(null, 'government', 'Plan and confirm motorcade / route plan',        'Protocol & Security', 6),

(null, 'government', 'Confirm official programme and timings',         'Programme', 7),
(null, 'government', 'Finalise speech order and duration',             'Programme', 8),
(null, 'government', 'Arrange cultural programme if applicable',       'Programme', 9),
(null, 'government', 'Arrange national anthem / guard of honour',      'Programme', 10),
(null, 'government', 'Prepare dais / podium and nameplate signage',    'Programme', 11),

(null, 'government', 'Issue official invitations on letterhead',       'Invitations', 12),
(null, 'government', 'Track RSVP and attendance confirmations',        'Invitations', 13),
(null, 'government', 'Issue entry passes / accreditation badges',      'Invitations', 14),
(null, 'government', 'Set up separate VVIP and guest entry lanes',     'Invitations', 15),

(null, 'government', 'Arrange government-approved catering agency',    'Catering', 16),
(null, 'government', 'Confirm dietary requirements (halal / veg)',     'Catering', 17),
(null, 'government', 'Set up VVIP dining area separately if needed',   'Catering', 18),

(null, 'government', 'Arrange press / media staging area',             'Media & Press', 19),
(null, 'government', 'Issue press credentials',                        'Media & Press', 20),
(null, 'government', 'Confirm official videography / photography',     'Media & Press', 21),
(null, 'government', 'Arrange live-streaming if required',             'Media & Press', 22),

(null, 'government', 'Prepare souvenir / momento for chief guest',     'Logistics', 23),
(null, 'government', 'Arrange interpreter / translation if needed',    'Logistics', 24),
(null, 'government', 'Confirm podium microphone and PA system test',   'Logistics', 25),

-- ── PUBLIC ───────────────────────────────────────────────────
(null, 'public', 'Obtain event permit from local authority',        'Permits & Legal', 1),
(null, 'public', 'Get police NOC / permission',                     'Permits & Legal', 2),
(null, 'public', 'Obtain noise / music permit if applicable',       'Permits & Legal', 3),
(null, 'public', 'Arrange public liability insurance',              'Permits & Legal', 4),
(null, 'public', 'Comply with fire safety regulations',             'Permits & Legal', 5),

(null, 'public', 'Confirm stage and event structure setup',         'Venue & Production', 6),
(null, 'public', 'Arrange crowd barriers and queue management',     'Venue & Production', 7),
(null, 'public', 'Set up entry / exit gates clearly',               'Venue & Production', 8),
(null, 'public', 'Mark all emergency exits',                        'Venue & Production', 9),
(null, 'public', 'Arrange adequate lighting (day + night)',         'Venue & Production', 10),
(null, 'public', 'Set up PA system and sound check',                'Venue & Production', 11),

(null, 'public', 'Confirm performers / acts and schedule',          'Programme', 12),
(null, 'public', 'Finalise stage programme / run of show',          'Programme', 13),
(null, 'public', 'Confirm MC / anchor',                             'Programme', 14),
(null, 'public', 'Arrange backstage / green room for performers',   'Programme', 15),

(null, 'public', 'Set up online ticketing platform',                'Ticketing', 16),
(null, 'public', 'Arrange on-site box office / gate sales',         'Ticketing', 17),
(null, 'public', 'Print and distribute complimentary passes',       'Ticketing', 18),
(null, 'public', 'Deploy gate management / ticket scanning team',   'Ticketing', 19),

(null, 'public', 'Deploy first aid / medical team on-site',         'Safety & Security', 20),
(null, 'public', 'Hire security / crowd management personnel',      'Safety & Security', 21),
(null, 'public', 'Arrange crowd control briefing for staff',        'Safety & Security', 22),
(null, 'public', 'Mark fire extinguisher locations',                'Safety & Security', 23),

(null, 'public', 'Set up F&B stalls and vendors',                   'Catering', 24),
(null, 'public', 'Verify food safety / health permits for stalls',  'Catering', 25),
(null, 'public', 'Arrange water points / hydration stations',       'Catering', 26),
(null, 'public', 'Plan waste management and clean-up crew',         'Catering', 27),

(null, 'public', 'Promote event on social media',                   'Marketing', 28),
(null, 'public', 'Send press releases to local media',              'Marketing', 29),
(null, 'public', 'Arrange event photographer / videographer',       'Marketing', 30)

;
