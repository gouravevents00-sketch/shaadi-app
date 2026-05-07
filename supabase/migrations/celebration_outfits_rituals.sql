-- celebration_outfits: track outfits per person per function
create table if not exists celebration_outfits (
  id uuid primary key default gen_random_uuid(),
  celebration_id uuid not null references celebrations(id) on delete cascade,
  person_name text not null,
  person_role text, -- 'bride' | 'groom' | 'family' | 'other'
  function_name text, -- which function this outfit is for
  outfit_description text,
  color text,
  designer_vendor text,
  status text not null default 'planned', -- 'planned' | 'ordered' | 'trial_done' | 'ready'
  notes text,
  created_at timestamptz not null default now()
);

alter table celebration_outfits enable row level security;
create policy "service role all" on celebration_outfits using (true) with check (true);

-- celebration_rituals: track rituals/ceremonies per function
create table if not exists celebration_rituals (
  id uuid primary key default gen_random_uuid(),
  celebration_id uuid not null references celebrations(id) on delete cascade,
  function_id uuid references celebration_functions(id) on delete set null,
  name text not null,
  description text,
  time_of_day text, -- 'morning' | 'afternoon' | 'evening' | 'night'
  duration_minutes int,
  pandit_required boolean default false,
  items_required text[], -- puja samagri etc
  is_done boolean not null default false,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

alter table celebration_rituals enable row level security;
create policy "service role all" on celebration_rituals using (true) with check (true);
