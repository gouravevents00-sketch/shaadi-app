-- Add family_group to guests table
alter table guests
  add column if not exists family_group text;
