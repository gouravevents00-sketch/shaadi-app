-- Client preferences (food, music, decor etc.)
create table if not exists client_preferences (
  id          uuid primary key default uuid_generate_v4(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  side        text not null default 'both',
  category    text not null,
  key         text not null,
  value       text not null,
  created_at  timestamptz not null default now(),
  unique(wedding_id, side, key)
);

-- Approval items (coordinator proposes → client approves)
create table if not exists approval_items (
  id           uuid primary key default uuid_generate_v4(),
  wedding_id   uuid not null references weddings(id) on delete cascade,
  category     text not null default 'other',
  title        text not null,
  description  text,
  proposed_by  uuid references users(id),
  status       text not null default 'pending',
  client_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
