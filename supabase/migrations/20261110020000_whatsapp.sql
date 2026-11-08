-- WhatsApp bot: same shape as the Telegram tables. The bot writes through the service-role key
-- (server only), always scoped to the linked user_id; RLS only lets creators see/remove their own link.

create table if not exists public.whatsapp_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  wa_id text not null unique check (char_length(wa_id) <= 32),
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  remind boolean not null default true,
  linked_at timestamptz not null default now()
);

alter table public.whatsapp_links enable row level security;

drop policy if exists "WhatsApp links: owner can read" on public.whatsapp_links;
create policy "WhatsApp links: owner can read"
  on public.whatsapp_links for select
  using ((select auth.uid()) = user_id);

drop policy if exists "WhatsApp links: owner can update" on public.whatsapp_links;
create policy "WhatsApp links: owner can update"
  on public.whatsapp_links for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "WhatsApp links: owner can delete" on public.whatsapp_links;
create policy "WhatsApp links: owner can delete"
  on public.whatsapp_links for delete
  using ((select auth.uid()) = user_id);

-- One-time connect codes: the site stores only a SHA-256 hash.
create table if not exists public.whatsapp_link_tokens (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

alter table public.whatsapp_link_tokens enable row level security;

drop policy if exists "WhatsApp tokens: owner can create" on public.whatsapp_link_tokens;
create policy "WhatsApp tokens: owner can create"
  on public.whatsapp_link_tokens for insert
  with check ((select auth.uid()) = user_id);

-- Meta retries webhooks; remembering message ids stops double handling.
-- No policies: only the service role touches it.
create table if not exists public.whatsapp_messages (
  message_id text primary key,
  seen_at timestamptz not null default now()
);

alter table public.whatsapp_messages enable row level security;
