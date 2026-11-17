-- 우리지도 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요. (여러 번 실행해도 안전합니다)

-- ───────────── 테이블 ─────────────
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  kakao_id text,
  name text not null,
  address text not null default '',
  category text not null default '',
  lat double precision not null,
  lng double precision not null,
  url text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (space_id, kakao_id)
);

create table if not exists public.reviews (
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating numeric(2, 1) not null check (rating between 0.5 and 5),
  comment text not null default '',
  visited_on date,
  updated_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists reviews_place_idx on public.reviews (place_id);
create index if not exists photos_place_idx on public.photos (place_id);

-- ───────────── 함수 ─────────────
-- 정책 안에서 쓰는 멤버 확인 (security definer 라서 RLS 재귀가 생기지 않음)
create or replace function public.is_space_member(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members where space_id = sid and user_id = auth.uid());
$$;

create or replace function public.is_place_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from places p join space_members m on m.space_id = p.space_id
    where p.id = pid and m.user_id = auth.uid()
  );
$$;

create or replace function public.create_space(p_name text, p_nickname text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into spaces (name, created_by) values (p_name, auth.uid()) returning id into v_id;
  insert into space_members (space_id, user_id, nickname) values (v_id, auth.uid(), p_nickname);
  return v_id;
end $$;

-- 초대 코드로 참여. 지도 하나에는 두 명까지만 들어올 수 있다.
create or replace function public.join_space(p_code text, p_nickname text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select id into v_id from spaces where invite_code = upper(trim(p_code)) for update;
  if v_id is null then raise exception 'INVALID_CODE'; end if;
  if exists (select 1 from space_members where space_id = v_id and user_id = auth.uid()) then return v_id; end if;
  if (select count(*) from space_members where space_id = v_id) >= 2 then raise exception 'SPACE_FULL'; end if;
  insert into space_members (space_id, user_id, nickname) values (v_id, auth.uid(), p_nickname);
  return v_id;
end $$;

revoke all on function public.is_space_member(uuid), public.is_place_member(uuid),
  public.create_space(text, text), public.join_space(text, text) from public, anon;
grant execute on function public.is_space_member(uuid), public.is_place_member(uuid),
  public.create_space(text, text), public.join_space(text, text) to authenticated;

-- ───────────── 권한 (RLS): 지도 멤버 두 사람만 읽고 쓸 수 있다 ─────────────
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.places enable row level security;
alter table public.reviews enable row level security;
alter table public.photos enable row level security;

drop policy if exists "members read space" on public.spaces;
create policy "members read space" on public.spaces for select to authenticated
  using (public.is_space_member(id));

drop policy if exists "members read members" on public.space_members;
create policy "members read members" on public.space_members for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists "members manage places" on public.places;
create policy "members manage places" on public.places for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

drop policy if exists "members read reviews" on public.reviews;
create policy "members read reviews" on public.reviews for select to authenticated
  using (public.is_place_member(place_id));
drop policy if exists "write own review" on public.reviews;
create policy "write own review" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and public.is_place_member(place_id));
drop policy if exists "update own review" on public.reviews;
create policy "update own review" on public.reviews for update to authenticated
  using (user_id = auth.uid() and public.is_place_member(place_id))
  with check (user_id = auth.uid() and public.is_place_member(place_id));
drop policy if exists "delete own review" on public.reviews;
create policy "delete own review" on public.reviews for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "members read photos" on public.photos;
create policy "members read photos" on public.photos for select to authenticated
  using (public.is_place_member(place_id));
drop policy if exists "add own photo" on public.photos;
create policy "add own photo" on public.photos for insert to authenticated
  with check (user_id = auth.uid() and public.is_place_member(place_id));
drop policy if exists "delete own photo" on public.photos;
create policy "delete own photo" on public.photos for delete to authenticated
  using (user_id = auth.uid());

-- ───────────── 사진 저장소 (비공개 버킷, 경로: {space_id}/{place_id}/{파일}.jpg) ─────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "members read photo files" on storage.objects;
create policy "members read photo files" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_space_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "members upload photo files" on storage.objects;
create policy "members upload photo files" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_space_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "members delete photo files" on storage.objects;
create policy "members delete photo files" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_space_member(((storage.foldername(name))[1])::uuid));

-- ───────────── 실시간 반영 ─────────────
do $$
declare t text;
begin
  foreach t in array array['places', 'reviews', 'photos', 'space_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
