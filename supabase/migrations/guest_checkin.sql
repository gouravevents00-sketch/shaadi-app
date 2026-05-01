-- Guest check-in tracking
alter table guests
  add column if not exists checked_in_at timestamptz;
