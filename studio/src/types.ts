export interface VSCodeTheme {
  name: string;
  type: 'dark' | 'light';
  colors: Record<string, string>;
  tokenColors?: Array<{
    name?: string;
    scope?: string | string[];
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }>;
  [key: string]: unknown;
}

export type FoundationName = 'zenith' | 'light';

export interface ProceduralParams {
  foundation: FoundationName;
  bg: string;
  fg: string;
  /** Optional designated center of the bg/fg axis. Used by monotone derivation. */
  midtone?: string | null;
  accent1: string;
  /** Optional. When set, forces `keyword.control` tokens to this color. */
  accent2?: string | null;
  /** Optional. When set, forces `entity.name.tag` tokens to this color. */
  accent3?: string | null;
  /** Optional explicit tint hue color; null = no hue shift. */
  tint: string | null;
  /** How strongly the explicit tint shifts token hues. 0 = none, 1 = full. */
  tintStrength?: number;
  /** Token chroma multiplier. 0 = grayscale, 1 = unchanged, 2 = oversaturated. */
  chroma?: number;
  /** Additive token lightness offset in OKLCH-L. -0.5..+0.5, default 0. */
  lightness?: number;
  /** Token monotone amount. 0 = original colors, 1 = every token is a bg/fg interpolation. */
  monotone?: number;
  /** Border contrast vs bg. 0 = bg color, 1 = fg color. */
  borderContrast?: number;
  /** Comment position on the bg→fg axis. 0 = bg, 1 = fg. */
  commentContrast?: number;
  /** Multiplier on the comment color's chroma. 0 = grayscale comments, 1 = axis chroma. */
  commentChroma?: number;
  /** Manual per-key overrides on top of derivation (colors.* keys). */
  overrides: Record<string, string>;
  /** Manual per-scope overrides on top of token derivation. Key = scope string. */
  tokenOverrides?: Record<string, string>;
}

export interface ThemesMeta {
  classic: {
    dark: string[];
    light: string[];
  };
  procedural: Record<string, ProceduralParams>;
}
