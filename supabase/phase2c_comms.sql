-- Comms log for org events
create table if not exists org_comms_log (
  id               uuid primary key default uuid_generate_v4(),
  org_event_id     uuid not null references org_events(id) on delete cascade,
  sent_by          uuid not null references users(id),
  channel          text not null,           -- whatsapp | email | sms
  audience_label   text not null,           -- human-readable audience description
  recipient_count  integer not null,
  message          text not null,
  created_at       timestamptz not null default now()
);

alter table org_comms_log enable row level security;
drop policy if exists "org_comms_log_select" on org_comms_log;
create policy "org_comms_log_select" on org_comms_log for select using (
  org_event_id in (
    select id from org_events where company_id = (
      select company_id from company_members where user_id = auth.uid() limit 1
    )
  )
);
