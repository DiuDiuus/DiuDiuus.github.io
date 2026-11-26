# jiwookim.dev

김지우의 개인 홈페이지예요. 영어가 기본이고 한국어(`/ko/`)도 있어요. Astro로 만들었고, `main` 브랜치에 push하면 GitHub Pages에 자동으로 배포돼요.

## 내용 고치기

내용은 모두 `src/content/` 안의 YAML 파일에 있어요. 코드는 건드리지 않아도 돼요.

| 하고 싶은 일 | 방법 |
|---|---|
| 이름·소개·기술·링크 바꾸기 | `src/content/profile.yaml` 수정. GitHub·LinkedIn·Scholar 주소를 넣으면 버튼이 생겨요 |
| 프로젝트 추가 | `src/content/projects/`에서 파일 하나를 복사해 새 이름으로 저장하고 내용 수정 |
| 논문·발표 추가 | `src/content/research/`에서 같은 방법 |
| 경력·학력 추가 | `src/content/experience/`에서 같은 방법 |
| Beyond Work(취미·취향·가치관) | `src/content/beyond/`에 파일을 하나라도 넣으면 탭이 자동으로 나타나요 |

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

Beyond Work 항목의 `kind`는 세 가지예요. `value`(가치관)는 펼쳐 보는 항목이 되고, `hobby`(취미)와 `taste`(취향)는 태그로 보여요.

## 사진·CV 바꾸기

- **사진:** 새 사진을 `public/images/profile.jpg`로 바꿔 넣은 뒤, 위치 정보 같은 메타데이터를 지워요.

  ```bash
  node scripts/strip-exif.mjs public/images/profile.jpg public/images/profile.jpg
  ```

- **CV:** `public/cv/Jiwoo_Kim_CV.pdf`를 바꿔 넣어요. **전화번호가 없는 버전**이어야 해요. 자동 검사가 전화번호를 찾으면 테스트가 실패해요.

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
