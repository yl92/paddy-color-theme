import '@fontsource/commit-mono/400.css';
import '@fontsource/commit-mono/400-italic.css';
import '@fontsource/commit-mono/700.css';

import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/400-italic.css';
import '@fontsource/jetbrains-mono/700.css';

import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/400-italic.css';
import '@fontsource/ibm-plex-mono/600.css';

import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/600.css';

import '@fontsource/fira-code/400.css';
import '@fontsource/fira-code/600.css';

export interface FontOption {
  id: string;
  label: string;
  stack: string;
}

export const FONTS: FontOption[] = [
  {
    id: 'commit-mono',
    label: 'Commit Mono',
    stack: '"Commit Mono", ui-monospace, monospace',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: '"JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    stack: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: 'geist-mono',
    label: 'Geist Mono',
    stack: '"Geist Mono", ui-monospace, monospace',
  },
  {
    id: 'fira-code',
    label: 'Fira Code',
    stack: '"Fira Code", ui-monospace, monospace',
  },
  {
    id: 'system',
    label: 'System mono',
    stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
];

export const DEFAULT_FONT_ID = 'commit-mono';

export function getFont(id: string): FontOption {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
