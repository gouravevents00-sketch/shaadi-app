create table if not exists ai_feedback (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade not null,
  entity_id   uuid        not null,
  entity_type text        not null default 'celebration',
  user_message text       not null default '',
  ai_message  text        not null,
  rating      text        not null check (rating in ('up', 'down')),
  created_at  timestamptz not null default now()
);

create index ai_feedback_entity_idx on ai_feedback(entity_id, entity_type);
create index ai_feedback_rating_idx  on ai_feedback(rating, created_at desc);

alter table ai_feedback enable row level security;

create policy "users_insert_own_feedback" on ai_feedback
  for insert to authenticated with check (auth.uid() = user_id);

create policy "users_read_own_feedback" on ai_feedback
  for select to authenticated using (auth.uid() = user_id);

-- Service role reads all (for reviewing poor responses)
create policy "service_read_all_feedback" on ai_feedback
  for select to service_role using (true);
