import type { Lang } from './utils';

const en = {
  'nav.about': 'About',
  'nav.projects': 'Projects',
  'nav.research': 'Research',
  'nav.experience': 'Experience',
  'nav.beyond': 'Life & Values',
  cv: 'CV',
  email: 'Email',
  seeAll: 'See all →',
  now: 'Now',
  next: 'Next',
  basedIn: 'Based in',
  skills: 'Skills',
  featured: 'Featured projects',
  currentResearch: 'Current research',
  interests: 'Research interests',
  publications: 'Publications',
  problem: 'Problem',
  approach: 'Approach',
  result: 'Result',
  where: 'Where',
  authors: 'Authors',
  summary: 'Summary',
  experienceTitle: 'Experience & Education',
  languages: 'Languages',
  related: 'Related projects',
  notFound: 'Page not found',
  backHome: 'Back to home',
  emailFallback: 'Email address is in the CV',
  values: 'What drives me',
  hobbies: 'Hobbies',
  tastes: 'Tastes',
  work: 'Experience',
  education: 'Education',
  focus: 'Research',
  projectsSub: 'Data and AI systems built in industry, 2021–2025.',
  projectCount: '{n} projects',
} as const;

export type UiKey = keyof typeof en;

const ko: Record<UiKey, string> = {
  // the menu and page titles stay in English on Korean pages too
  'nav.about': en['nav.about'],
  'nav.projects': en['nav.projects'],
  'nav.research': en['nav.research'],
  'nav.experience': en['nav.experience'],
  'nav.beyond': en['nav.beyond'],
  cv: 'CV',
  email: '이메일',
  seeAll: '전체 보기 →',
  now: '지금',
  next: '다음',
  basedIn: '거주',
  skills: '기술',
  featured: '대표 프로젝트',
  currentResearch: '현재 연구',
  interests: '연구 관심사',
  publications: '논문',
  problem: '문제',
  approach: '접근',
  result: '결과',
  where: '소속',
  authors: '저자',
  summary: '요약',
  experienceTitle: en.experienceTitle,
  languages: '언어',
  related: '관련 프로젝트',
  notFound: '페이지를 찾을 수 없어요',
  backHome: '처음으로',
  emailFallback: '이메일 주소는 CV에 있어요',
  values: '지향',
  hobbies: '취미',
  tastes: '취향',
  work: '경력',
  education: '학력',
  focus: '연구',
  projectsSub: '산업 현장에서 만든 데이터·AI 시스템, 2021–2025.',
  projectCount: '프로젝트 {n}개',
};

export const ui: Record<Lang, Record<UiKey, string>> = { en, ko };

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

/** "5 projects" / "프로젝트 5개" — built from the real count so it stays right when items are added. */
export function countLabel(lang: Lang, n: number): string {
  return t(lang, 'projectCount').replace('{n}', String(n));
}
