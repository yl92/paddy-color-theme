import type { VSCodeTheme } from '../types';

const DEFAULTS_DARK = {
  bg: '#1a1a1a',
  text: '#e5e5e5',
  accent: '#c7e9cc',
};

const DEFAULTS_LIGHT = {
  bg: '#ffffff',
  text: '#222222',
  accent: '#3a7d3a',
};

const pick = (...candidates: (string | undefined)[]): string | undefined =>
  candidates.find((c) => typeof c === 'string' && c.length > 0);

/**
 * Map a VSCodeTheme's anchor colors to the studio's `--studio-*` CSS vars.
 *
 * The mapping is intentionally narrow: we only read `editor.background`,
 * the foreground, and an accent (focusBorder / cursor). Panel, hover,
 * border, and muted are then derived in CSS via `color-mix()` from those
 * anchors — that way the chrome always tracks the bg the user picked,
 * regardless of whether the foundation's sideBar/panel keys happen to
 * match editor.background.
 */
export function applyThemeToStudio(theme: VSCodeTheme): void {
  const c = theme.colors;
  const isLight = theme.type === 'light';
  const d = isLight ? DEFAULTS_LIGHT : DEFAULTS_DARK;

  const bg = pick(c['editor.background']) ?? d.bg;
  const text = pick(c['foreground'], c['editor.foreground']) ?? d.text;
  const accent =
    pick(c['focusBorder'], c['editorCursor.foreground'], c['tab.activeBorderTop']) ?? d.accent;
  const accentFg = bg;

  // Pull a real derived border from the theme so the studio chrome reflects
  // the user's borderContrast knob. Fall back to a hardcoded mix if no
  // `.border` key is set on the theme.
  const themeBorder = pick(c['sideBar.border'], c['panel.border'], c['activityBar.border']);

  // Text selection — prefer the theme's selection tokens (typically a
  // semi-transparent accent-tinted color), fall back to a translucent accent.
  const selection =
    pick(c['editor.selectionBackground'], c['selection.background']) ??
    `color-mix(in oklch, ${accent} 30%, transparent)`;

  const root = document.documentElement.style;
  root.setProperty('--studio-bg', bg);
  root.setProperty('--studio-text', text);
  root.setProperty('--studio-accent', accent);
  root.setProperty('--studio-accent-fg', accentFg);

  // Derived chrome colors — let CSS handle the rest.
  root.setProperty('--studio-panel', bg);
  root.setProperty('--studio-panel-hover', `color-mix(in oklch, ${bg} 92%, ${text} 8%)`);
  root.setProperty('--studio-border', themeBorder ?? `color-mix(in oklch, ${bg} 78%, ${text} 22%)`);
  root.setProperty('--studio-border-soft', `color-mix(in oklch, ${bg} 92%, ${text} 8%)`);
  root.setProperty('--studio-muted', `color-mix(in oklch, ${bg} 50%, ${text} 50%)`);
  root.setProperty('--studio-selection', selection);
}
