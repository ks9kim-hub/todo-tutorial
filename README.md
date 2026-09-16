# Todo Tutorial

[Claude Code Playbook](https://docs.claude-hunt.com) 강의의 실습용 저장소입니다. Next.js 와 shadcn/ui 로 시작하는 작은 Todo 앱을 단계별로 발전시키며 Claude Code 사용법을 익힙니다.

## 프로젝트 소개

할 일을 추가·완료·삭제·편집할 수 있는 Todo 앱입니다.

- 할 일 목록 관리 (추가 / 완료 토글 / 삭제 / 더블클릭으로 인라인 편집)
- 우선순위(높음·보통·낮음), 마감일, 카테고리(업무·개인·쇼핑) 지정
- 검색, 상태별 필터(전체/진행중/완료), 카테고리별 필터, 정렬(생성일순/이름순/마감일순)
- 다크 모드 전환 (`d` 단축키)
- Vercel Blob을 이용한 서버 측 데이터 저장 (`app/api/todos`)

## 관련 링크

- 강의 본문: https://docs.claude-hunt.com
- 수강생 결과물 공유: https://claude-hunt.com

## 기술 스택

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- shadcn/ui (radix-mira 스타일, taupe 베이스)
- TypeScript / ESLint / Prettier
- 패키지 매니저: bun
- 테스트: Vitest, Testing Library

## 시작하기

### 환경 변수

할 일 데이터는 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)에 저장됩니다. 로컬에서 실행하려면 프로젝트 루트에 `.env.local` 파일을 만들고 Blob 스토어의 읽기/쓰기 토큰을 설정하세요.

```bash
BLOB_READ_WRITE_TOKEN=your_token_here
```

Vercel 프로젝트와 연결되어 있다면 `vercel env pull .env.local` 명령으로 값을 받아올 수 있습니다.

### 설치 및 실행

```bash
bun install
bun dev
```

개발 서버는 기본적으로 [http://localhost:3000](http://localhost:3000) 에서 열립니다.

자주 쓰는 스크립트:

```bash
bun dev            # 개발 서버 실행
bun run build      # 프로덕션 빌드
bun run start      # 빌드 결과 실행
bun run lint       # ESLint
bun run typecheck  # tsc --noEmit
bun run format     # Prettier 포맷팅
bun run test       # Vitest 테스트 실행
```

## 컴포넌트 추가

shadcn/ui 컴포넌트는 다음과 같이 추가합니다.

```bash
bunx --bun shadcn@latest add button
```

`components/ui` 디렉토리에 컴포넌트가 추가됩니다.

## 컴포넌트 사용

```tsx
import { Button } from "@/components/ui/button";
```

## Contributors

- 토이크레인 - Frontend Developer
