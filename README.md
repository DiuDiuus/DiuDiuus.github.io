# Jiwoo Kim — personal homepage

김지우의 개인 홈페이지예요. 주소는 https://diudiuus.github.io/ 이고, 영어가 기본이며 한국어(`/ko/`)도 있어요. Astro로 만들었고, `main` 브랜치에 push하면 GitHub Pages에 자동으로 배포돼요.

나중에 도메인(예: `jiwookim.dev`)을 사면 다음 순서로 연결해요.

1. `astro.config.mjs`의 `site`를 새 주소로 바꿔요.
2. `public/CNAME` 파일에 도메인 한 줄을 넣어요.
3. GitHub의 Settings → Pages에서 Custom domain을 입력해요.
4. 도메인 구매처에서 DNS를 설정해요.
5. `tests/dist/site.test.ts`의 주소 검사도 새 주소로 바꿔요.

## 내용 고치기

내용은 모두 `src/content/` 안의 YAML 파일에 있어요. 코드는 건드리지 않아도 돼요.

| 하고 싶은 일 | 방법 |
|---|---|
| 이름·소개·기술·링크 바꾸기 | `src/content/profile.yaml` 수정. GitHub·LinkedIn·Scholar 주소를 넣으면 버튼이 생겨요 |
| 프로젝트 추가 | `src/content/projects/`에서 파일 하나를 복사해 새 이름으로 저장하고 내용 수정 |
| 논문·발표 추가 | `src/content/research/`에서 같은 방법 |
| 경력·학력 추가 | `src/content/experience/`에서 같은 방법 |
| Life & Values(지향·취미·취향) | `src/content/beyond/`에 파일을 넣거나 고쳐요. 파일이 하나도 없으면 탭이 숨겨져요 |

파일 하나에 영어(`en:`)와 한국어(`ko:`)가 함께 들어가요. `ko:`를 비워두면 한국어 페이지에는 영어가 대신 보여요.

```yaml
# src/content/projects/my-new-project.yaml
order: 6               # 목록 순서 (작을수록 위)
featured: false        # true면 첫 화면(About)에도 나와요 (3개 권장)
org: Yonsei University
start: "2025-03"       # 따옴표 안에 "YYYY-MM"
end: "2025-12"         # 진행 중이면 이 줄을 지우세요
tags: [Graph, Anomaly detection]
links:
  - { label: Code, url: "https://github.com/..." }
en:
  title: ...
  summary: ...
  problem: ...
  approach: ...
  result: ...          # 선택. 수치가 있으면 좋아요
ko:
  title: ...
```

Life & Values(`src/content/beyond/`) 항목의 `kind`는 세 가지예요. `value`(지향)는 핵심어와 한 줄 설명으로, `hobby`(취미)는 태그로, `taste`(취향)는 "항목: 내용" 한 줄로 보여요.

## 사진·CV 바꾸기

- **사진:** 새 사진을 긴 변 800px 이하로 줄여 `public/images/profile.jpg`로 저장한 뒤, 위치 정보 같은 메타데이터를 지워요. 사진이 회전 정보에 의존하면(휴대폰 세로 사진에 흔함) 스크립트가 멈추고 안내해요. 그럴 땐 미리보기 앱에서 회전해 다시 저장한 뒤 실행하세요.

  ```bash
  sips -Z 800 새사진.jpg --out public/images/profile.jpg
  ```

  ```bash
  node scripts/strip-exif.mjs public/images/profile.jpg public/images/profile.jpg
  ```

- **CV:** `public/cv/Jiwoo_Kim_CV.pdf`를 바꿔 넣어요. **전화번호가 없는 버전**이어야 해요. 자동 검사가 전화번호를 찾으면 테스트가 실패하고, GitHub도 배포를 멈춰요.

`ko:`나 선택 항목(`result:` 등)은 비워둬도 돼요. 비어 있으면 영어가 대신 보이거나 그 줄이 생략돼요.

## 로컬에서 보기 · 검사하기

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run test:dist
```

- `npm run dev`: http://localhost:4321 에서 미리 보기
- `npm test`: 내용 파일 형식, 날짜, 언어 처리 검사
- `npm run test:dist`: 사이트를 빌드한 뒤, 모든 페이지가 만들어졌는지, 전화번호·이메일 노출이나 예시 문구가 없는지 검사
