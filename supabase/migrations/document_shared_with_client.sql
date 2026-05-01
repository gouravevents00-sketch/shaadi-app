-- Allow documents to be shared with the client portal
alter table documents
  add column if not exists shared_with_client boolean not null default false;
