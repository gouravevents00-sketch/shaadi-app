-- vendor_events: many-to-many between vendors and events
-- A vendor (e.g. Decorator, Anchor) can be assigned to one or more ceremonies

create table if not exists vendor_events (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  event_id   uuid not null references events(id)  on delete cascade,
  notes      text,           -- optional: role at this specific event
  created_at timestamptz default now(),
  unique (vendor_id, event_id)
);

create index if not exists vendor_events_vendor_id_idx on vendor_events(vendor_id);
create index if not exists vendor_events_event_id_idx  on vendor_events(event_id);
