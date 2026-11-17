-- Fit Telegram bot (a second bot, separate from the X one): link a user's fit account to a chat,
-- one-time connect codes, update de-duplication, pending confirmations, and an AI-cap counter the
-- bot can call. The bot writes through the service-role key, always scoped to the linked user_id.

-- One chat per user (and one user per chat).
create table if not exists public.fit_telegram_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id bigint not null unique,
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  linked_at timestamptz not null default now()
);
alter table public.fit_telegram_links enable row level security;
drop policy if exists "fit_telegram_links: read own" on public.fit_telegram_links;
create policy "fit_telegram_links: read own" on public.fit_telegram_links
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "fit_telegram_links: delete own" on public.fit_telegram_links;
create policy "fit_telegram_links: delete own" on public.fit_telegram_links
  for delete to authenticated using ((select auth.uid()) = user_id);

-- One-time connect codes: the site stores only a SHA-256 hash; the bot hashes /start <code>.
create table if not exists public.fit_telegram_link_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.fit_telegram_link_tokens enable row level security;
drop policy if exists "fit_telegram_link_tokens: create own" on public.fit_telegram_link_tokens;
create policy "fit_telegram_link_tokens: create own" on public.fit_telegram_link_tokens
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Telegram retries slow webhooks; remembering update_ids stops double saves. Service role only.
create table if not exists public.fit_telegram_updates (
  update_id bigint primary key,
  seen_at timestamptz not null default now()
);
alter table public.fit_telegram_updates enable row level security;

-- Parsed weigh-ins / gym days / food waiting for the ✅ tap (button data is limited to 64 bytes).
-- Service role only.
create table if not exists public.fit_telegram_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null default now() + interval '1 day'
);
create index if not exists fit_telegram_pending_user_idx on public.fit_telegram_pending (user_id);
alter table public.fit_telegram_pending enable row level security;

-- The same daily AI cap as fit_ai_take(), for callers with no auth.uid() (the bot). Service role only.
create or replace function public.fit_ai_take_for(p_user uuid, p_kind text, p_day date, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare used int;
begin
  if p_user is null or p_kind not in ('meal', 'coach') or p_cap < 1 or p_cap > 200 then
    return false;
  end if;
  insert into public.ai_usage (user_id, day, kind, count) values (p_user, p_day, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count into used;
  return used <= p_cap;
end;
$$;
revoke all on function public.fit_ai_take_for(uuid, text, date, int) from public, anon, authenticated;
grant execute on function public.fit_ai_take_for(uuid, text, date, int) to service_role;
