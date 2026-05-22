import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [],
      langs: [
        'tsx',
        'typescript',
        'javascript',
        'python',
        'json',
        'markdown',
        'css',
        'html',
        'rust',
        'go',
        'yaml',
        'shellscript',
        'sql',
      ],
    });
  }
  return highlighterPromise;
}
