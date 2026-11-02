import { REPO_URL } from './share';

/** What the carnival was doing when someone reported an issue. */
export interface AppContext {
  href: string;
  /** The game being played, or undefined on the midway. */
  game?: { id: string; name: string; best?: number };
  userAgent: string;
  viewport: { width: number; height: number };
}

/**
 * The repository a carnival at `href` was built from. A GitHub Pages site at
 * https://<owner>.github.io/<repo>/ comes from github.com/<owner>/<repo>, so
 * each fork's issues go to that fork. Anywhere else, such as a local dev
 * server, there is no way to tell, so issues go to the original carnival.
 */
export function issueRepo(href: string): string {
  const url = new URL(href);
  const pages = url.hostname.match(/^([\w-]+)\.github\.io$/i);
  if (!pages) return REPO_URL;
  const repo = url.pathname.split('/').find(Boolean) ?? url.hostname;
  return `https://github.com/${pages[1]}/${repo}`;
}

/** The app context as Markdown, for the body of a new issue. */
export function describeContext(context: AppContext): string {
  const { game } = context;
  const view = game ? `Playing ${game.name} (\`${game.id}\`)` : 'The midway';
  const lines = ['**App context**', '', `- Page: ${context.href}`, `- View: ${view}`];
  if (game) lines.push(`- Best score: ${game.best ?? 'none yet'}`);
  lines.push(
    `- Window: ${context.viewport.width}x${context.viewport.height}`,
    `- Browser: ${context.userAgent}`,
  );
  return lines.join('\n');
}

/**
 * A link that opens a new GitHub issue on `repoUrl` with the "Your own idea"
 * form, its "Where" field filled in with the app context.
 */
export function newIssueLink(repoUrl: string, context: AppContext): string {
  const params = new URLSearchParams({
    template: '01-your-own-idea.yml',
    where: describeContext(context),
  });
  return `${repoUrl}/issues/new?${params}`;
}
