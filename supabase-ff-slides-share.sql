-- Fry Slides: 같이 고치기 (공유 링크로 두 사람이 같은 발표 자료를 편집). 여러 번 실행해도 안전해요 (다시 실행 가능).
-- 실행: Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run. 먼저 ff-auth 계정 시스템이 있는 프로젝트여야 해요 (auth.users 사용).
-- 구조: 표(public.ff_slides_share)에는 만든 사람(owner)만 직접 접근할 수 있고, 링크를 가진 사람은 아래 함수(RPC)로만 읽고 써요.
--       링크 안의 id(무작위 uuid)가 열쇠 역할이에요. 함수는 security definer 라서 표의 RLS를 거치지 않고, id를 모르면 아무것도 못 해요.
--       만들기는 로그인한 사람만, 읽기·쓰기는 로그인하지 않아도 (링크를 아는 사람이면) 가능해요.

create table if not exists public.ff_slides_share (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  data jsonb not null,
  rev integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ff_slides_share_owner_idx on public.ff_slides_share (owner, updated_at desc);

alter table public.ff_slides_share enable row level security;
drop policy if exists "slides share owner select" on public.ff_slides_share;
drop policy if exists "slides share owner delete" on public.ff_slides_share;
create policy "slides share owner select" on public.ff_slides_share for select to authenticated using (owner = auth.uid());
create policy "slides share owner delete" on public.ff_slides_share for delete to authenticated using (owner = auth.uid());
revoke all on public.ff_slides_share from anon, authenticated;
grant select, delete on public.ff_slides_share to authenticated;

-- 새 공유 만들기: 로그인 필요, 한 사람이 30개까지, 자료 크기 4MB까지. 새 id(uuid)를 돌려줘요.
create or replace function public.ff_slides_share_create(p_name text, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'login_required' using errcode = '28000'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad_data'; end if;
  if octet_length(p_data::text) > 4000000 then raise exception 'too_big'; end if;
  if (select count(*) from public.ff_slides_share where owner = auth.uid()) >= 30 then raise exception 'too_many'; end if;
  insert into public.ff_slides_share (owner, name, data) values (auth.uid(), left(coalesce(p_name, ''), 120), p_data) returning id into v_id;
  return v_id;
end $$;

-- 읽기: p_since 가 지금 번호(rev)와 같으면 {"same":true} 만, 다르면 자료 전체. 없으면 {"gone":true}.
create or replace function public.ff_slides_share_get(p_id uuid, p_since integer default 0)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r public.ff_slides_share%rowtype;
begin
  select * into r from public.ff_slides_share where id = p_id;
  if not found then return jsonb_build_object('gone', true); end if;
  if r.rev = p_since then return jsonb_build_object('same', true, 'rev', r.rev); end if;
  return jsonb_build_object('rev', r.rev, 'name', r.name, 'data', r.data, 'updated_at', r.updated_at);
end $$;

-- 쓰기: 내가 본 번호(p_base)가 지금 번호와 같을 때만 저장하고 번호를 올려요.
-- 그 사이 다른 사람이 저장했으면 {"conflict":true, rev, data} 를 돌려주고, 앱이 두 쪽을 합쳐서 다시 저장해요.
create or replace function public.ff_slides_share_put(p_id uuid, p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.ff_slides_share%rowtype;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad_data'; end if;
  if octet_length(p_data::text) > 4000000 then raise exception 'too_big'; end if;
  select * into r from public.ff_slides_share where id = p_id for update;
  if not found then return jsonb_build_object('gone', true); end if;
  if r.rev <> p_base then return jsonb_build_object('conflict', true, 'rev', r.rev, 'data', r.data); end if;
  update public.ff_slides_share set data = p_data, rev = r.rev + 1, updated_at = now(),
    name = left(coalesce(p_data->>'name', r.name), 120) where id = p_id;
  return jsonb_build_object('ok', true, 'rev', r.rev + 1);
end $$;

-- 공유 끄기(만든 사람만): 서버에서 지워요. 링크를 열면 "없어졌어요"가 보여요.
create or replace function public.ff_slides_share_delete(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login_required' using errcode = '28000'; end if;
  delete from public.ff_slides_share where id = p_id and owner = auth.uid();
  return found;
end $$;

revoke all on function public.ff_slides_share_create(text, jsonb) from public;
revoke all on function public.ff_slides_share_get(uuid, integer) from public;
revoke all on function public.ff_slides_share_put(uuid, integer, jsonb) from public;
revoke all on function public.ff_slides_share_delete(uuid) from public;
grant execute on function public.ff_slides_share_create(text, jsonb) to authenticated;
grant execute on function public.ff_slides_share_delete(uuid) to authenticated;
grant execute on function public.ff_slides_share_get(uuid, integer) to anon, authenticated;
grant execute on function public.ff_slides_share_put(uuid, integer, jsonb) to anon, authenticated;
