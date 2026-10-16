-- What the developer teaches the Tools site's own AI (teach/). Already applied to the shared Supabase project (2026-10-16).
-- Everyone can read (ai.js adds them to prompts for FF777 tarius/lectus); only ff_is_admin() can write. Also used as training examples.
create table if not exists public.ff_ai_facts (
  id bigint generated always as identity primary key,
  model text not null default 'all' check (model in ('all','tarius','lectus')),
  question text not null default '' check (char_length(question) <= 300),
  fact text not null check (char_length(fact) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.ff_ai_facts enable row level security;
create policy "ai facts readable by all" on public.ff_ai_facts for select using (true);
create policy "ai facts admin insert" on public.ff_ai_facts for insert with check (public.ff_is_admin());
create policy "ai facts admin update" on public.ff_ai_facts for update using (public.ff_is_admin()) with check (public.ff_is_admin());
create policy "ai facts admin delete" on public.ff_ai_facts for delete using (public.ff_is_admin());
grant select on public.ff_ai_facts to anon, authenticated;
grant insert, update, delete on public.ff_ai_facts to authenticated;
