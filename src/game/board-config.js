// 온라인 순위(Supabase) 연결 정보. 둘 다 "공개해도 되는" 값만 넣는다:
//   url = 프로젝트 URL(https://xxxx.supabase.co), key = publishable 키(sb_publishable_...) 또는 옛 anon 키.
// service_role·secret 키는 절대 넣지 말 것(브라우저에 그대로 노출된다). 설정 방법은 supabase/README.md.
// 빈 값이면 온라인 순위 없이 이 기기 최고 기록만 보인다. .env.local의 VITE_SUPABASE_URL / VITE_SUPABASE_KEY가 있으면 그 값이 먼저다.
export default {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  key: import.meta.env.VITE_SUPABASE_KEY || '',
};
