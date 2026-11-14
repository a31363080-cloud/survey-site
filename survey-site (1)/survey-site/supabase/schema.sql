-- شغّل هذا الملف كاملًا في Supabase: SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  respondent text,                       -- رمز المتصفح، يُستخدم فقط لخيار "رد واحد لكل شخص"
  answers jsonb not null,
  score numeric,
  max numeric,
  created_at timestamptz not null default now(),
  unique (form_id, respondent)           -- القيم الفارغة لا تتعارض فيما بينها
);

create index if not exists responses_form_idx on public.responses (form_id, created_at desc);
create index if not exists forms_owner_idx on public.forms (owner, created_at desc);

alter table public.forms enable row level security;
alter table public.responses enable row level security;

-- المالك فقط يقرأ ويكتب استبياناته
drop policy if exists "owner manages forms" on public.forms;
create policy "owner manages forms" on public.forms
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- المالك فقط يقرأ ردود استبياناته ويحذفها
drop policy if exists "owner reads responses" on public.responses;
create policy "owner reads responses" on public.responses
  for select using (exists (select 1 from public.forms f where f.id = form_id and f.owner = auth.uid()));

drop policy if exists "owner deletes responses" on public.responses;
create policy "owner deletes responses" on public.responses
  for delete using (exists (select 1 from public.forms f where f.id = form_id and f.owner = auth.uid()));

-- لا توجد سياسات للزوار: قراءة الاستبيان العام وإرسال الردود يمران عبر واجهات الخادم (service role)
-- حتى لا تصل الإجابات الصحيحة للاختبارات إلى المتصفح.
