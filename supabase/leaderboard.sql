-- 백제 결구 물리학 · 온라인 순위 (Supabase SQL Editor에 통째로 붙여 넣고 Run)
-- 클라이언트(공개 키)는: 순위 읽기 + 자기 이름으로 점수 넣기만 할 수 있다. 고치기·지우기는 못 한다.
-- 점수 범위·닉네임 길이·글자·욕설·도배 제한은 여기서 다시 검사한다(브라우저 검사는 믿지 않는다).

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid(),
  nickname    text        not null,
  stage       smallint    not null,
  disaster    text        not null default 'quake',
  score       numeric(4,2) not null,
  created_at  timestamptz not null default now(),
  constraint scores_stage_ck    check (stage in (1, 2, 3)),
  constraint scores_dis_ck      check (disaster in ('quake', 'wind', 'storm', 'flood', 'snow')),
  constraint scores_score_ck    check (score >= 1.00 and score <= 7.00),
  constraint scores_nick_len_ck check (char_length(nickname) between 2 and 12),
  constraint scores_nick_chr_ck check (nickname ~ '^[가-힣A-Za-z0-9_ .-]+$' and nickname = btrim(nickname))
);
create index if not exists scores_stage_score_idx on public.scores (stage, disaster, score desc);
create index if not exists scores_user_time_idx  on public.scores (user_id, created_at desc);

-- 기본 욕설 목록(필요하면 insert로 더 넣는다). 클라이언트는 이 표를 읽을 수 없다.
create table if not exists public.banned_words (word text primary key);
alter table public.banned_words enable row level security;
insert into public.banned_words (word) values
  ('씨발'),('시발'),('씨바'),('ㅅㅂ'),('ㅆㅂ'),('병신'),('ㅂㅅ'),('븅신'),('좆'),('존나'),('졸라'),('개새'),('새끼'),('썅'),('지랄'),('ㅈㄹ'),
  ('닥쳐'),('꺼져'),('엿먹'),('느금'),('니미'),('니애미'),('애미'),('애비'),('미친놈'),('미친년'),('또라이'),
  ('fuck'),('shit'),('bitch'),('asshole'),('dick'),('pussy'),('cunt'),('nigger'),('nigga'),('faggot'),('porn'),('sex')
on conflict do nothing;

-- 넣기 전 검사: 로그인(익명 포함) 필수, 욕설, 도배(같은 사용자 10초에 1번, 1시간에 60번)
create or replace function public.scores_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare flat text;
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'sign-in required'; end if;
  new.nickname := btrim(new.nickname);
  new.created_at := now();
  flat := lower(regexp_replace(new.nickname, '[\s_.-]', '', 'g'));
  if exists (select 1 from public.banned_words b where position(b.word in flat) > 0) then
    raise exception 'nickname not allowed';
  end if;
  if exists (select 1 from public.scores s where s.user_id = new.user_id and s.created_at > now() - interval '10 seconds') then
    raise exception 'too many submissions';
  end if;
  if (select count(*) from public.scores s where s.user_id = new.user_id and s.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'hourly limit reached';
  end if;
  return new;
end $$;
drop trigger if exists scores_guard on public.scores;
create trigger scores_guard before insert on public.scores for each row execute function public.scores_guard();

-- Row Level Security: 누구나 읽기, 로그인한 사용자는 자기 user_id로 넣기만
alter table public.scores enable row level security;
drop policy if exists "scores read" on public.scores;
create policy "scores read" on public.scores for select to anon, authenticated using (true);
drop policy if exists "scores insert own" on public.scores;
create policy "scores insert own" on public.scores for insert to authenticated with check (user_id = auth.uid());
revoke update, delete, truncate on public.scores from anon, authenticated;

-- 마당·재해별 순위: 닉네임마다 최고 점수 하나, 같은 점수면 먼저 낸 사람이 위
drop function if exists public.top_scores(smallint, int);
create or replace function public.top_scores(p_stage smallint, p_disaster text default 'quake', p_limit int default 10)
returns table (nickname text, score numeric, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select nickname, score, created_at from (
    select distinct on (s.nickname) s.nickname, s.score, s.created_at
    from public.scores s where s.stage = p_stage and s.disaster = p_disaster
    order by s.nickname, s.score desc, s.created_at asc
  ) best
  order by score desc, created_at asc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.top_scores(smallint, text, int) to anon, authenticated;

-- 실시간: 새 점수가 들어오면 모두의 화면이 순위를 다시 읽는다
do $$ begin
  alter publication supabase_realtime add table public.scores;
exception when duplicate_object then null; end $$;
