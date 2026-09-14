-- Run in the Supabase SQL Editor. Safe to run more than once.
alter table public.company_settings add column if not exists gmail_from text;
alter table public.company_settings add column if not exists smtp_host text default 'smtp.gmail.com';
alter table public.company_settings add column if not exists smtp_port integer default 465;
alter table public.company_settings add column if not exists smtp_secure boolean default true;
alter table public.company_settings add column if not exists smtp_user text;
alter table public.company_settings add column if not exists smtp_password text;
alter table public.company_settings add column if not exists late_after time default '09:30';
alter table public.company_settings add column if not exists standard_hours numeric(4,2) default 9;
alter table public.company_settings add column if not exists half_day_hours numeric(4,2) default 9;
alter table public.company_settings add column if not exists email_recipients text[] not null default '{}';
alter table public.company_settings add column if not exists currency text default 'INR';
alter table public.company_settings add column if not exists penalty_amount numeric(10,2) default 0;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('attendance-photos','attendance-photos',false,6000000,array['image/jpeg'])
on conflict (id) do nothing;
