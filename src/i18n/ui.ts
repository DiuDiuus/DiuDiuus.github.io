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
  education: 'Education',
} as const;

export type UiKey = keyof typeof en;

const ko: Record<UiKey, string> = {
  'nav.about': '소개',
  'nav.projects': '프로젝트',
  'nav.research': '연구',
  'nav.experience': '경력',
  'nav.beyond': '일 밖의 나',
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
  experienceTitle: '경력 및 학력',
  languages: '언어',
  related: '관련 프로젝트',
  notFound: '페이지를 찾을 수 없어요',
  backHome: '처음으로',
  emailFallback: '이메일 주소는 CV에 있어요',
  values: '지향',
  hobbies: '취미',
  tastes: '취향',
  education: '학력',
};

export const ui: Record<Lang, Record<UiKey, string>> = { en, ko };

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}
