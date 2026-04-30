-- Add assignee to checklist_items
alter table checklist_items
  add column if not exists assignee text;
