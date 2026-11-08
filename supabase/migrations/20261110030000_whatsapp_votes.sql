-- One "bring WhatsApp" vote per creator, while the WhatsApp bot is held back from public use.
create table if not exists public.whatsapp_votes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  voted_at timestamptz not null default now()
);

alter table public.whatsapp_votes enable row level security;

drop policy if exists "WhatsApp votes: owner can read" on public.whatsapp_votes;
create policy "WhatsApp votes: owner can read"
  on public.whatsapp_votes for select
  using ((select auth.uid()) = user_id);

drop policy if exists "WhatsApp votes: owner can vote" on public.whatsapp_votes;
create policy "WhatsApp votes: owner can vote"
  on public.whatsapp_votes for insert
  with check ((select auth.uid()) = user_id);
