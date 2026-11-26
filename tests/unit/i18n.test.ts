import { describe, expect, it } from 'vitest';
import { langFromPath, locText, switchLangPath, tabPath } from '../../src/i18n/utils';
import { t } from '../../src/i18n/ui';

describe('locText', () => {
  it('returns English when Korean is missing', () => {
    expect(locText({ title: 'A', body: 'B' }, undefined, 'ko')).toEqual({ title: 'A', body: 'B' });
  });
  it('overrides only the Korean fields that are present', () => {
    expect(locText({ title: 'A', body: 'B' }, { title: '가' }, 'ko')).toEqual({ title: '가', body: 'B' });
  });
  it('ignores empty Korean strings', () => {
    expect(locText({ title: 'A', body: 'B' }, { title: '', body: '나' }, 'ko')).toEqual({ title: 'A', body: '나' });
  });
  it('always returns English for en', () => {
    expect(locText({ title: 'A' }, { title: '가' }, 'en')).toEqual({ title: 'A' });
  });
});

describe('paths', () => {
  it('maps tabs to URLs per language', () => {
    expect(tabPath('about', 'en')).toBe('/');
    expect(tabPath('about', 'ko')).toBe('/ko/');
    expect(tabPath('projects', 'en')).toBe('/projects/');
    expect(tabPath('projects', 'ko')).toBe('/ko/projects/');
  });
  it('switches the language while keeping the tab', () => {
    expect(switchLangPath('/projects/', 'ko')).toBe('/ko/projects/');
    expect(switchLangPath('/ko/research/', 'en')).toBe('/research/');
    expect(switchLangPath('/', 'ko')).toBe('/ko/');
    expect(switchLangPath('/ko/', 'en')).toBe('/');
    expect(switchLangPath('/ko/projects/', 'ko')).toBe('/ko/projects/');
  });
  it('reads the language from a path', () => {
    expect(langFromPath('/ko/experience/')).toBe('ko');
    expect(langFromPath('/experience/')).toBe('en');
  });
});

describe('ui strings', () => {
  it('translates navigation labels', () => {
    expect(t('en', 'nav.projects')).toBe('Projects');
    expect(t('ko', 'nav.projects')).toBe('Projects'); // menu stays English on Korean pages
    expect(t('ko', 'skills')).toBe('기술');
  });
});
