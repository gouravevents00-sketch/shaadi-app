-- Documents table: attach files to any entity in a wedding
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  entity_type text not null, -- 'vendor', 'event', 'wedding'
  entity_id uuid,            -- null means wedding-level
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists documents_wedding_id_idx on documents(wedding_id);
create index if not exists documents_entity_idx on documents(entity_type, entity_id);
