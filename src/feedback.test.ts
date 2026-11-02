import { describe, expect, it } from 'vitest';
import { describeContext, issueRepo, newIssueLink, type AppContext } from './feedback';
import { REPO_URL } from './share';

const midway: AppContext = {
  href: 'https://ada.github.io/tessl-carnival/#/',
  userAgent: 'TestBrowser/1.0',
  viewport: { width: 1280, height: 720 },
};

const playing: AppContext = {
  ...midway,
  href: 'https://ada.github.io/tessl-carnival/#/play/water-cannon',
  game: { id: 'water-cannon', name: 'Water Cannon', best: 12 },
};

describe('issueRepo', () => {
  it('sends issues to the fork a GitHub Pages site was built from', () => {
    expect(issueRepo('https://ada.github.io/my-carnival/#/play/water-cannon')).toBe(
      'https://github.com/ada/my-carnival',
    );
  });

  it('handles a user site served from the root', () => {
    expect(issueRepo('https://ada.github.io/')).toBe('https://github.com/ada/ada.github.io');
    expect(issueRepo('https://ada.github.io/index.html#/play/water-cannon')).toBe(
      'https://github.com/ada/ada.github.io',
    );
  });

  it('reads the fork from a project site opened at its index.html', () => {
    expect(issueRepo('https://ada.github.io/my-carnival/index.html')).toBe(
      'https://github.com/ada/my-carnival',
    );
  });

  it('falls back to the original carnival anywhere else', () => {
    expect(issueRepo('http://localhost:5173/')).toBe(REPO_URL);
    expect(issueRepo('https://carnival.example.com/')).toBe(REPO_URL);
  });
});

describe('describeContext', () => {
  it('says where on the midway the report came from', () => {
    const text = describeContext(midway);
    expect(text).toContain('- Page: https://ada.github.io/tessl-carnival/#/');
    expect(text).toContain('- View: The midway');
    expect(text).toContain('- Window: 1280x720');
    expect(text).toContain('- Browser: TestBrowser/1.0');
    expect(text).not.toContain('Best score');
  });

  it('names the game being played and its best score', () => {
    const text = describeContext(playing);
    expect(text).toContain('- View: Playing Water Cannon (`water-cannon`)');
    expect(text).toContain('- Best score: 12');
  });

  it('says when a game has no score yet', () => {
    const text = describeContext({
      ...playing,
      game: { id: 'water-cannon', name: 'Water Cannon' },
    });
    expect(text).toContain('- Best score: none yet');
  });
});

describe('newIssueLink', () => {
  it('opens the issue form with the app context filled in', () => {
    const url = new URL(newIssueLink('https://github.com/ada/tessl-carnival', playing));
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/ada/tessl-carnival/issues/new');
    expect(url.searchParams.get('template')).toBe('01-your-own-idea.yml');
    expect(url.searchParams.get('where')).toBe(describeContext(playing));
  });
});
