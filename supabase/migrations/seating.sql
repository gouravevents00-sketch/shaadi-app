-- Seating tables
create table if not exists seating_tables (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  name text not null,
  capacity integer not null default 10,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Guest ↔ table assignments
create table if not exists seating_assignments (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references seating_tables(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  seat_number integer,
  created_at timestamptz not null default now(),
  unique(table_id, guest_id)
);

create index if not exists seating_tables_wedding_id_idx on seating_tables(wedding_id);
create index if not exists seating_assignments_table_id_idx on seating_assignments(table_id);
create index if not exists seating_assignments_guest_id_idx on seating_assignments(guest_id);
