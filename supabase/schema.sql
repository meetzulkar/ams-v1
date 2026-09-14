create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Your Company',
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  late_after time not null default '09:30',
  standard_hours numeric(4,2) not null default 9,
  timezone text not null default 'Asia/Kolkata',
  email_recipients text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  full_name text not null,
  mobile text unique not null,
  email text,
  department text,
  designation text,
  date_of_birth date,
  gender text,
  address text,
  emergency_contact text,
  emergency_phone text,
  date_of_joining date not null,
  id_valid_until date,
  status text not null default 'active' check (status in ('active','inactive')),
  photo_path text,
  documents jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.week_offs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  off_date date not null,
  reason text default 'Week Off',
  unique(employee_id, off_date)
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date unique not null,
  name text not null
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  check_in_photo_path text,
  check_out_photo_path text,
  check_in_ip text,
  check_out_ip text,
  worked_minutes integer generated always as (case when check_in is not null and check_out is not null then greatest(0, floor(extract(epoch from (check_out-check_in))/60)::integer) else null end) stored,
  status text not null default 'present' check (status in ('present','late','half_day','absent','week_off','holiday')),
  penalty boolean not null default false,
  penalty_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create index if not exists attendance_date_idx on public.attendance(attendance_date);
create index if not exists attendance_employee_date_idx on public.attendance(employee_id, attendance_date);

alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.employees enable row level security;
alter table public.week_offs enable row level security;
alter table public.holidays enable row level security;
alter table public.attendance enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

create policy "admin profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admin settings" on public.company_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin employees" on public.employees for all using (public.is_admin()) with check (public.is_admin());
create policy "admin weekoffs" on public.week_offs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin holidays" on public.holidays for all using (public.is_admin()) with check (public.is_admin());
create policy "admin attendance" on public.attendance for all using (public.is_admin()) with check (public.is_admin());

insert into public.company_settings (company_name) select 'Your Company' where not exists(select 1 from public.company_settings);
-- SMTP configuration is managed from Admin Settings.
alter table public.company_settings add column if not exists gmail_from text;
alter table public.company_settings add column if not exists smtp_host text default 'smtp.gmail.com';
alter table public.company_settings add column if not exists smtp_port integer default 465;
alter table public.company_settings add column if not exists smtp_secure boolean default true;
alter table public.company_settings add column if not exists smtp_user text;
alter table public.company_settings add column if not exists smtp_password text;

-- Enterprise v2 additions
alter table public.employees add column if not exists pan_number text;
alter table public.employees add column if not exists aadhaar_last4 text;
alter table public.employees add column if not exists blood_group text;
alter table public.employees add column if not exists employment_type text default 'full_time';
alter table public.employees add column if not exists manager_name text;
alter table public.employees add column if not exists shift_start time default '09:00';
alter table public.employees add column if not exists shift_end time default '18:00';
alter table public.employees add column if not exists standard_hours numeric(4,2) default 9;
alter table public.company_settings add column if not exists late_after time default '09:30';
alter table public.company_settings add column if not exists half_day_hours numeric(4,2) default 9;
alter table public.company_settings add column if not exists currency text default 'INR';
alter table public.company_settings add column if not exists penalty_amount numeric(10,2) default 0;
alter table public.company_settings add column if not exists working_days text[] default array['mon','tue','wed','thu','fri','sat'];
create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),action text not null,entity text,entity_id text,details jsonb default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.notification_logs(id uuid primary key default gen_random_uuid(),attendance_id uuid references public.attendance(id) on delete set null,event_type text not null,recipients text[] not null default '{}',status text not null,provider_message text,created_at timestamptz not null default now());
create index if not exists audit_created_idx on public.audit_logs(created_at desc);
create index if not exists notification_created_idx on public.notification_logs(created_at desc);
alter table public.audit_logs enable row level security;
alter table public.notification_logs enable row level security;
create policy "admin audit" on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin notifications" on public.notification_logs for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.generate_absent_records(p_from date,p_to date) returns integer language plpgsql security definer set search_path=public as $$
declare d date; e record; n integer:=0; dow text; is_off boolean; is_holiday boolean; exists_row boolean;
begin
 for d in select generate_series(p_from,p_to,'1 day')::date loop
   dow:=lower(to_char(d,'Dy')); -- mon/tue/... from PostgreSQL locale
   for e in select id from employees where status='active' loop
     select exists(select 1 from attendance where employee_id=e.id and attendance_date=d) into exists_row;
     if not exists_row then
       select exists(select 1 from week_offs where employee_id=e.id and off_date=d) into is_off;
       select exists(select 1 from holidays where holiday_date=d) into is_holiday;
       if is_off then insert into attendance(employee_id,attendance_date,status,notes) values(e.id,d,'week_off','Scheduled week off'); n:=n+1;
       elsif is_holiday then insert into attendance(employee_id,attendance_date,status,notes) values(e.id,d,'holiday','Company holiday'); n:=n+1;
       elsif extract(isodow from d) between 1 and 6 then insert into attendance(employee_id,attendance_date,status,penalty,penalty_reason,notes) values(e.id,d,'absent',true,'No check-in recorded','Auto-generated absent record'); n:=n+1;
       end if;
     end if;
   end loop;
 end loop;
 return n;
end $$;
