-- RSVP columns for guests table
alter table guests
  add column if not exists rsvp_submitted_at  timestamptz,
  add column if not exists arrival_date        date,
  add column if not exists departure_date      date,
  add column if not exists arrival_mode        text,        -- self_drive | flight | train | bus
  add column if not exists arrival_datetime    timestamptz,
  add column if not exists arrival_booking_ref text,
  add column if not exists needs_pickup        boolean not null default false,
  add column if not exists family_members      jsonb not null default '[]',
  add column if not exists wishes_message      text;
