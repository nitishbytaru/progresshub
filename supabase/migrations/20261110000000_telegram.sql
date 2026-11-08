-- Telegram bot: link a creator's account to a Telegram chat, one-time connect codes,
-- and update de-duplication. The bot itself writes through the service-role key (server only),
-- always scoped to the linked user_id; RLS below only lets creators see/remove their own link.

-- ---------------------------------------------------------------------------
-- One Telegram chat per creator (and one creator per chat).
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  chat_id bigint not null unique,
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  remind boolean not null default true,
  linked_at timestamptz not null default now()
);
  
alter table public.telegram_links enable row level security;

drop policy if exists "Telegram links: owner can read" on public.telegram_links;
create policy "Telegram links: owner can read"
  on public.telegram_links for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Telegram links: owner can update" on public.telegram_links;
create policy "Telegram links: owner can update"
  on public.telegram_links for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Telegram links: owner can delete" on public.telegram_links;
create policy "Telegram links: owner can delete"
  on public.telegram_links for delete
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- One-time connect codes: the site stores only a SHA-256 hash; the bot hashes /start <code>.
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_link_tokens (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

alter table public.telegram_link_tokens enable row level security;

drop policy if exists "Telegram tokens: owner can create" on public.telegram_link_tokens;
create policy "Telegram tokens: owner can create"
  on public.telegram_link_tokens for insert
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Telegram retries slow webhooks; remembering update_ids stops double saves.
-- No policies: only the service role touches it.
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_updates (
  update_id bigint primary key,
  seen_at timestamptz not null default now()
);

alter table public.telegram_updates enable row level security;
