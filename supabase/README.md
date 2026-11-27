# 온라인 순위 설정 (Supabase)

GitHub Pages는 정적 사이트라 서버를 따로 둘 수 없어서, 데이터베이스와 실시간 전송을 함께 주는 Supabase(무료 요금제로 충분)를 쓴다.
설정하지 않으면 게임은 이 기기 최고 기록만 보여 준다(지금 배포본 상태).

## 1. 프로젝트 만들기
1. https://supabase.com 에서 가입(GitHub 계정으로 가능) → **New project**.
2. 이름 아무거나(예: `baekje-board`), Region은 **Northeast Asia (Seoul)**, 데이터베이스 비밀번호는 안전한 곳에 적어 둔다(게임에는 필요 없음).

## 2. SQL 실행
1. 왼쪽 **SQL Editor** → **New query**.
2. 이 폴더의 `leaderboard.sql` 내용을 통째로 붙여 넣고 **Run**. "Success"가 나오면 된다(여러 번 실행해도 안전).

## 3. 익명 로그인 켜기
점수는 "익명 사용자"로 로그인해 자기 이름으로만 넣게 했다(도배 제한이 사용자별로 걸린다).
- **Authentication → Sign In / Providers → Allow anonymous sign-ins** 를 켠다.
- (권장) 같은 화면의 **Attack Protection**에서 Captcha를 켜면 익명 계정을 마구 만드는 것을 더 막을 수 있다. 켜면 클라이언트에 캡차 토큰이 필요해 지금 코드로는 로그인이 실패하니, 켜기 전에 말해 달라.

## 4. 주소와 공개 키를 게임에 넣기
**Project Settings → API Keys**(또는 Data API)에서 두 값을 복사한다.
- Project URL: `https://xxxxxxxx.supabase.co`
- **Publishable key** (`sb_publishable_...`, 옛 화면에서는 `anon` `public` 키)

**secret / service_role 키는 절대 쓰지 않는다.** 브라우저에 그대로 보이게 되고 RLS를 무시한다.

둘 중 한 곳에 넣는다.
- `src/game/board-config.js`의 `''` 자리에 직접 적고 커밋한다(공개 키라 커밋해도 된다), 또는
- `.env.local`에 아래 두 줄을 넣는다(이 파일은 커밋되지 않으니 배포하는 컴퓨터에만 있으면 된다).
  ```
  VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
  VITE_SUPABASE_KEY=sb_publishable_xxxxxxxx
  ```

## 5. 다시 빌드·배포
`npm run build` 후 CLAUDE.md의 gh-pages 배포 절차를 따른다. 게임 오른쪽 판의 "온라인 순위"에 "N명 접속 중"이 보이면 연결된 것이다.

## 들어 있는 보호 장치
- RLS: 누구나 순위 읽기, 로그인한(익명 포함) 사용자는 자기 `user_id`로 넣기만. 고치기·지우기 불가.
- 검사(데이터베이스): 점수 1.00–7.00, 닉네임 2–12자·한글/영문/숫자/`_ . -`, 욕설 목록(`banned_words`), 같은 사용자 10초에 1번·1시간에 60번.
- 기록 지우기·욕설 추가는 Supabase 대시보드(Table Editor)에서 관리자만 할 수 있다.
