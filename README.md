# 우리지도

친구와 함께 다녀온 식당·카페를 지도에 표시하고, 둘만의 평점·후기·사진을 남기는 웹앱(PWA)입니다.

- 카카오맵에서 장소를 검색해 핀으로 기록 (검색에 없는 곳은 지도 중심에 직접 추가)
- 장소마다 각자 별점(0.1점 단위)·후기·방문일을 남기고, 둘의 평균을 "우리 평점"으로 표시
- 사진 업로드 (올리기 전에 자동으로 용량 축소)
- 목록 보기: 분류 필터, 최근순/평점순/이름순 정렬
- 초대 코드로 친구 한 명과 연결 — 지도 하나는 두 사람만 볼 수 있음
- 상대가 기록하면 실시간으로 반영, 폰 홈 화면에 추가해 앱처럼 사용

기술: Vite + React + TypeScript, 카카오맵 JavaScript SDK, Supabase(로그인·DB·사진 저장).

## 실행

```bash
npm install
cp .env.example .env   # 아래 키를 채워 넣기
npm run dev
```

키를 넣지 않아도 실행은 됩니다. Supabase 키가 없으면 **체험 모드**(이 기기에만 저장, 공유 안 됨)로 동작하고,
카카오 키가 없으면 지도 대신 안내 문구가 나옵니다.

## 1. 카카오맵 키

1. <https://developers.kakao.com> 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
2. **앱 키**의 *JavaScript 키*를 `.env`의 `VITE_KAKAO_JS_KEY`에 입력
3. **플랫폼 → Web**에 사이트 도메인 등록: `http://localhost:5173` 과 배포 주소
4. 카카오맵 사용 설정이 꺼져 있으면 **제품 설정 → 카카오맵**에서 활성화

## 2. Supabase

1. <https://supabase.com> 에서 무료 프로젝트 생성
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 Run
3. **Project Settings → API**의 *Project URL*과 *anon public* 키를 `.env`의
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`에 입력
4. (선택) 가입 시 이메일 인증을 생략하려면 **Authentication → Sign In / Providers → Email**에서 *Confirm email* 끄기

두 키 모두 브라우저에 공개되는 키라 코드에 들어가도 괜찮습니다. 데이터는 `schema.sql`의 RLS 정책으로 보호됩니다.

## 3. 사용 방법

1. 한 명이 가입 → **새로 만들기**로 지도를 만든 뒤, *우리* 탭의 초대 코드를 친구에게 전달
2. 친구가 가입 → **초대 코드로 참여**
3. 지도 탭에서 장소 검색 → **여기 기록하기** → 별점·후기·사진 남기기

## 배포

`npm run build` 결과물(`dist/`)은 정적 파일이라 Vercel, Netlify, Cloudflare Pages 등에 그대로 올리면 됩니다.
호스팅 서비스의 환경 변수에 `.env`의 세 값을 똑같이 등록하고, 배포 주소를 카카오 개발자 콘솔의 Web 플랫폼에 추가하세요.
