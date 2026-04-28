-- Per-company checklist templates
create table if not exists checklist_templates (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists checklist_template_items (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  title       text not null,
  category    text not null,
  side        text not null default 'shared',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_checklist_templates_company on checklist_templates(company_id);
create index if not exists idx_checklist_template_items_template on checklist_template_items(template_id);
