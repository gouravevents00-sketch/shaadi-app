-- Guest gift tracker
create table if not exists guest_gifts (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  guest_id    uuid references guests(id) on delete set null,
  giver_name  text not null,           -- can be filled even if no guest record
  gift_type   text not null default 'cash', -- 'cash' | 'item' | 'card'
  amount      numeric,                 -- if cash
  description text,                    -- if item
  received_at date not null default current_date,
  event_id    uuid references events(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists guest_gifts_wedding_id_idx on guest_gifts(wedding_id);
