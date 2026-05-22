import { converter, formatHex, parse } from 'culori';
import type { ProceduralParams, VSCodeTheme } from '../types';

const toOklch = converter('oklch');

interface Anchors {
  bg: string;
  fg: string;
  accent1: string;
  accent2: string;
}

/** Read the four anchor colors from a foundation theme. */
function anchorsOf(foundation: VSCodeTheme): Anchors {
  const c = foundation.colors;
  return {
    bg: c['editor.background'],
    fg: c['editor.foreground'],
    accent1: c['editorCursor.foreground'] ?? c['focusBorder'] ?? c['tab.activeBorderTop'],
    accent2: c['activityBarBadge.background'],
  };
}

/**
 * Default border contrast for procedural themes derived from this foundation.
 * Picks the most common `.border` value, reads its alpha, and returns it
 * normalized to [0,1].
 */
export function defaultBorderContrast(foundation: VSCodeTheme): number {
  const counts = new Map<string, number>();
  for (const [k, v] of Object.entries(foundation.colors)) {
    if (!k.endsWith('.border')) continue;
    if (typeof v !== 'string' || v.length !== 9) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: { v: string; c: number } | null = null;
  for (const [v, c] of counts) {
    if (!best || c > best.c) best = { v, c };
  }
  if (!best) return 0.2;
  const alpha = parseInt(best.v.slice(7), 16);
  return Number.isNaN(alpha) ? 0.2 : alpha / 255;
}

/**
 * Default comment contrast — where on the bg→fg axis the foundation's
 * primary `comment` token sits, by lightness. Used as the default knob value.
 */
export function defaultCommentContrast(foundation: VSCodeTheme): number {
  const tokens = foundation.tokenColors ?? [];
  for (const t of tokens) {
    const scopes = Array.isArray(t.scope) ? t.scope : t.scope ? [t.scope] : [];
    if (!scopes.some((s) => matchesTargetScope(s, COMMENT_TARGET))) continue;
    const fg = t.settings?.foreground;
    if (!fg) continue;
    const tokOk = toOklch(parse(fg));
    const bgOk = toOklch(parse(foundation.colors['editor.background']));
    const fgOk = toOklch(parse(foundation.colors['editor.foreground']));
    if (!tokOk || !bgOk || !fgOk) continue;
    const tokL = tokOk.l ?? 0;
    const bgL = bgOk.l ?? 0.1;
    const fgL = fgOk.l ?? 0.9;
    const range = Math.abs(fgL - bgL);
    if (range < 0.001) return 0.4;
    const raw = (tokL - bgL) / (fgL - bgL);
    return Math.max(0, Math.min(1, fgL > bgL ? raw : 1 - raw));
  }
  return 0.4;
}

/** Replace the 6-hex prefix while preserving any alpha suffix. */
function substituteHex(value: string, fromBase: string, toBase: string): string {
  if (typeof value !== 'string' || !value.startsWith('#')) return value;
  const v = value.toLowerCase();
  const from = fromBase.slice(0, 7).toLowerCase();
  const to = toBase.slice(0, 7);
  if (!v.startsWith(from)) return value;
  return to + value.slice(7);
}

function substituteAll(value: string, mapping: Array<[string, string]>): string {
  for (const [from, to] of mapping) {
    const next = substituteHex(value, from, to);
    if (next !== value) return next;
  }
  return value;
}

function tokenScopes(scope: string | string[] | undefined): string[] {
  if (!scope) return [];
  return Array.isArray(scope) ? scope : [scope];
}

/** Shortest-arc lerp between two hue angles (in degrees). */
function lerpHue(a: number, b: number, t: number): number {
  const delta = shortestArc(a, b);
  return (a + delta * t + 360) % 360;
}

/** Signed shortest arc from `from` to `to` (degrees, in [-180, 180]). */
function shortestArc(from: number, to: number): number {
  return (((to - from) % 360) + 540) % 360 - 180;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Mix two colors in OKLCH space at ratio t (0 = a, 1 = b). */
function mixOklch(a: string, b: string, t: number): string | null {
  const ca = toOklch(parse(a));
  const cb = toOklch(parse(b));
  if (!ca || !cb) return null;
  const lA = ca.l ?? 0;
  const lB = cb.l ?? 0;
  const chA = ca.c ?? 0;
  const chB = cb.c ?? 0;
  const hA = ca.h;
  const hB = cb.h;
  let h: number | undefined;
  if (hA !== undefined && hB !== undefined) h = lerpHue(hA, hB, t);
  else if (hA !== undefined) h = hA;
  else if (hB !== undefined) h = hB;
  return (
    formatHex({
      mode: 'oklch',
      l: lerp(lA, lB, t),
      c: lerp(chA, chB, t),
      h,
    }) ?? null
  );
}

type HueTransform = (h: number) => number;

interface OklchPoint {
  l: number;
  c: number;
  h?: number;
}

interface TokenRecolorOptions {
  transformHue: HueTransform;
  chroma: number;
  lightnessOffset: number;
  monotone: number;
  /** Resolved bg in OKLCH (one end of the monotone axis). */
  bgOklch: OklchPoint;
  /** Resolved fg in OKLCH (the other end of the monotone axis). */
  fgOklch: OklchPoint;
  /** Optional bent midpoint of the axis. */
  midtoneOklch: OklchPoint | null;
  bgL: number;
  isDark: boolean;
  minDelta: number;
}

function lerpHueOpt(a: number | undefined, b: number | undefined, t: number): number | undefined {
  if (a !== undefined && b !== undefined) return lerpHue(a, b, t);
  return a ?? b;
}

/** Sample the bg → (midtone) → fg axis at t ∈ [0,1] in OKLCH. */
function pointOnAxis(
  bg: OklchPoint,
  mid: OklchPoint | null,
  fg: OklchPoint,
  t: number
): OklchPoint {
  if (!mid) {
    return {
      l: lerp(bg.l, fg.l, t),
      c: lerp(bg.c, fg.c, t),
      h: lerpHueOpt(bg.h, fg.h, t),
    };
  }
  if (t < 0.5) {
    const u = t * 2;
    return {
      l: lerp(bg.l, mid.l, u),
      c: lerp(bg.c, mid.c, u),
      h: lerpHueOpt(bg.h, mid.h, u),
    };
  }
  const u = (t - 0.5) * 2;
  return {
    l: lerp(mid.l, fg.l, u),
    c: lerp(mid.c, fg.c, u),
    h: lerpHueOpt(mid.h, fg.h, u),
  };
}

function recolorToken(hex: string, opts: TokenRecolorOptions): string {
  const parsed = toOklch(parse(hex));
  if (!parsed) return hex;
  const out = {
    l: parsed.l ?? 0,
    c: (parsed.c ?? 0) * opts.chroma,
    h: parsed.h,
  };

  if (out.h !== undefined) {
    out.h = opts.transformHue(out.h);
  }

  // Lightness shift, interpreted as a lerp toward 1 (positive) or 0 (negative).
  // This gives the slider its full responsive range regardless of where the
  // token's base lightness sits: at +1 every token reaches L=1, at -1 every
  // token reaches L=0, with smooth interpolation in between.
  if (opts.lightnessOffset > 0) {
    out.l = out.l + (1 - out.l) * opts.lightnessOffset;
  } else if (opts.lightnessOffset < 0) {
    out.l = out.l + out.l * opts.lightnessOffset; // since offset is negative, this lerps toward 0
  }

  // Monotone: lerp toward a point on the bg → (midtone) → fg axis at this
  // token's relative lightness. At monotone=1 every token sits exactly on the axis.
  if (opts.monotone > 0) {
    const lo = Math.min(opts.bgOklch.l, opts.fgOklch.l);
    const hi = Math.max(opts.bgOklch.l, opts.fgOklch.l);
    const range = Math.max(0.001, hi - lo);
    const t = Math.max(0, Math.min(1, (out.l - lo) / range));
    const towardFg = opts.fgOklch.l > opts.bgOklch.l ? t : 1 - t;
    const mono = pointOnAxis(opts.bgOklch, opts.midtoneOklch, opts.fgOklch, towardFg);
    out.l = lerp(out.l, mono.l, opts.monotone);
    out.c = lerp(out.c, mono.c, opts.monotone);
    if (out.h !== undefined && mono.h !== undefined) {
      out.h = lerpHue(out.h, mono.h, opts.monotone);
    } else if (mono.h !== undefined) {
      out.h = mono.h;
    }
  }

  // Contrast clamp: tokens must stay readable against bg.
  if (opts.isDark) {
    const min = Math.min(0.97, opts.bgL + opts.minDelta);
    if (out.l < min) out.l = min;
  } else {
    const max = Math.max(0.03, opts.bgL - opts.minDelta);
    if (out.l > max) out.l = max;
  }

  return formatHex({ mode: 'oklch', ...out }) ?? hex;
}

// Match the *target* of a scope selector. VS Code scope selectors can be
// comma-separated lists of space-separated nested selectors; the last
// whitespace-separated segment of each sub-selector is the actual scope
// being targeted. We don't want to misfire on nested selectors like
// "comment.block.documentation storage.type.class.jsdoc" (which targets
// jsdoc tags *inside* comments, not comment text).
function matchesTargetScope(scope: string, prefixRe: RegExp): boolean {
  return scope.split(/\s*,\s*/).some((sub) => {
    const segs = sub.trim().split(/\s+/);
    const last = segs[segs.length - 1];
    return prefixRe.test(last);
  });
}

const KEYWORD_CONTROL_TARGET = /^keyword\.control(\.|$)/;
const COMMENT_TARGET = /^comment(\.|$)/;
const ENTITY_NAME_TAG_TARGET = /^entity\.name\.tag(\.|$)/;
const VARIABLE_TARGET = /^variable(\.|$)/;
// Variable sub-scopes that should NOT be tied to fg — they're conventionally
// colored distinctly (constants, enum members, parameters, language `this`,
// function references). Apply the fg-derivation only to plain variables.
const VARIABLE_EXCLUSIONS = /^variable\.(parameter|language|function|other\.constant|other\.enummember)/;

function isPlainVariableScope(scope: string): boolean {
  return scope.split(/\s*,\s*/).some((sub) => {
    const segs = sub.trim().split(/\s+/);
    const last = segs[segs.length - 1];
    return VARIABLE_TARGET.test(last) && !VARIABLE_EXCLUSIONS.test(last);
  });
}

/**
 * Sample the "variable" color: a slight lightness nudge away from bg
 * (i.e., a touch brighter than fg in dark themes; a touch darker in light
 * themes), keeping fg's chroma and hue. Matches the convention used across
 * the classic Paddy dark themes.
 */
function sampleVariableColor(fg: OklchPoint, isDark: boolean, delta = 0.04): string {
  const l = isDark
    ? Math.min(0.98, fg.l + delta)
    : Math.max(0.02, fg.l - delta);
  return formatHex({ mode: 'oklch', l, c: fg.c, h: fg.h }) ?? '#888';
}

/**
 * Sample the bg → (mid) → fg axis at a position that matches the original
 * token's lightness within the axis range. Used to recolor scopes that should
 * always sit on the axis (e.g. comments).
 */
function sampleAxisAt(
  bg: OklchPoint,
  mid: OklchPoint | null,
  fg: OklchPoint,
  t: number
): string {
  const point = pointOnAxis(bg, mid, fg, t);
  return formatHex({ mode: 'oklch', l: point.l, c: point.c, h: point.h }) ?? '#000';
}

export interface DeriveOptions {
  minContrastL?: number;
}

/**
 * Derive a full VSCodeTheme from a foundation theme and procedural params.
 * Pure: returns a new object, does not mutate `foundation`.
 *
 * Token hue transform:
 *   - explicit tint:   all tokens take on `tint.h` (still keep their L/C).
 *   - no tint, auto:   each token's hue is rotated by (newBg.h − foundation.bg.h),
 *                      so an unchanged bg means no shift.
 */
export function derive(
  foundation: VSCodeTheme,
  params: ProceduralParams,
  displayName: string,
  options: DeriveOptions = {}
): VSCodeTheme {
  const { minContrastL = 0.35 } = options;
  const isDark = foundation.type === 'dark';
  const anchors = anchorsOf(foundation);

  const mapping: Array<[string, string]> = [
    [anchors.accent1, params.accent1],
    [anchors.fg, params.fg],
    [anchors.bg, params.bg],
  ];
  if (params.accent2) mapping.unshift([anchors.accent2, params.accent2]);

  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(foundation.colors)) {
    colors[k] = substituteAll(v, mapping);
  }

  // Direct anchors override (in case prefixes don't exactly match).
  colors['editor.background'] = params.bg;
  colors['editor.foreground'] = params.fg;
  colors['foreground'] = params.fg;
  colors['focusBorder'] = params.accent1;
  if (colors['editorCursor.foreground']) colors['editorCursor.foreground'] = params.accent1;
  if (params.accent2 && colors['activityBarBadge.background']) {
    colors['activityBarBadge.background'] = params.accent2;
  }

  // Borders: solid OKLCH mix of bg ↔ fg at borderContrast.
  // Only ".border" suffix — avoids focusBorder / tab.activeBorderTop / contrastBorder.
  const bc = params.borderContrast ?? defaultBorderContrast(foundation);
  const borderMix = mixOklch(params.bg, params.fg, bc);
  if (borderMix) {
    for (const k of Object.keys(colors)) {
      if (!k.endsWith('.border')) continue;
      const current = colors[k];
      // If the original was fully transparent (e.g. "#0000"), preserve transparency.
      if (current === '#0000' || current === '#00000000') continue;
      colors[k] = borderMix;
    }
  }

  // User overrides win.
  for (const [k, v] of Object.entries(params.overrides)) {
    colors[k] = v;
  }

  // --- Token color recolor ---
  const newBgOklch = toOklch(parse(params.bg));
  const tintOklch = params.tint ? toOklch(parse(params.tint)) : null;

  // Tint is explicit only: no bg-color is involved. When `params.tint` is unset,
  // token hues come straight from the foundation.
  const tintStrength = params.tintStrength ?? 1;
  let transformHue: HueTransform;
  if (tintStrength <= 0 || tintOklch?.h === undefined) {
    transformHue = (h) => h;
  } else {
    const target = tintOklch.h;
    transformHue = (h) => lerpHue(h, target, tintStrength);
  }

  const fgOklch = toOklch(parse(params.fg));
  const midtoneOklch = params.midtone ? toOklch(parse(params.midtone)) : null;
  const safeBg = newBgOklch ?? { l: isDark ? 0.1 : 0.95, c: 0, h: undefined };
  const safeFg = fgOklch ?? { l: isDark ? 0.9 : 0.2, c: 0, h: undefined };

  const tokenOpts: TokenRecolorOptions = {
    transformHue,
    chroma: params.chroma ?? 1,
    lightnessOffset: params.lightness ?? 0,
    monotone: params.monotone ?? 0,
    bgOklch: { l: safeBg.l ?? (isDark ? 0.1 : 0.95), c: safeBg.c ?? 0, h: safeBg.h },
    fgOklch: { l: safeFg.l ?? (isDark ? 0.9 : 0.2), c: safeFg.c ?? 0, h: safeFg.h },
    midtoneOklch: midtoneOklch
      ? { l: midtoneOklch.l ?? 0.5, c: midtoneOklch.c ?? 0, h: midtoneOklch.h }
      : null,
    bgL: newBgOklch?.l ?? (isDark ? 0.1 : 0.95),
    isDark,
    minDelta: minContrastL,
  };

  const tokenOverrides = params.tokenOverrides ?? {};

  const commentT = params.commentContrast ?? defaultCommentContrast(foundation);
  const commentChromaMult = params.commentChroma ?? 1;

  const tokenColors = (foundation.tokenColors ?? []).map((t) => {
    const scopes = tokenScopes(t.scope);
    const fg = t.settings?.foreground;
    const isComment = scopes.some((s) => matchesTargetScope(s, COMMENT_TARGET));
    const isKeywordControl = scopes.some((s) => matchesTargetScope(s, KEYWORD_CONTROL_TARGET));
    const isEntityNameTag = scopes.some((s) => matchesTargetScope(s, ENTITY_NAME_TAG_TARGET));
    const isVariable = scopes.some(isPlainVariableScope);
    let newFg = fg;
    if (isComment) {
      // All comments share one position on the bg → (mid) → fg axis.
      // Chroma can be scaled independently of the axis's natural chroma.
      const point = pointOnAxis(
        tokenOpts.bgOklch,
        tokenOpts.midtoneOklch,
        tokenOpts.fgOklch,
        commentT
      );
      newFg =
        formatHex({
          mode: 'oklch',
          l: point.l,
          c: (point.c ?? 0) * commentChromaMult,
          h: point.h,
        }) ?? newFg;
    } else if (isEntityNameTag && params.accent3) {
      newFg = params.accent3;
    } else if (isKeywordControl && params.accent2) {
      newFg = params.accent2;
    } else if (isVariable) {
      newFg = sampleVariableColor(tokenOpts.fgOklch, isDark);
    } else if (fg) {
      newFg = recolorToken(fg, tokenOpts);
    }
    // Per-scope override wins over the rule pipeline.
    for (const s of scopes) {
      if (tokenOverrides[s]) {
        newFg = tokenOverrides[s];
        break;
      }
    }
    return {
      ...t,
      settings: { ...t.settings, ...(newFg ? { foreground: newFg } : {}) },
    };
  });

  return {
    ...foundation,
    name: displayName,
    colors,
    tokenColors,
  };
}

/**
 * Strip italic styling from a theme's tokenColors. Mirrors what the legacy
 * `bash upright` script does for the existing classic themes.
 */
export function toUpright(theme: VSCodeTheme, displayName: string): VSCodeTheme {
  const stripItalic = (fontStyle?: string): string | undefined => {
    if (!fontStyle) return fontStyle;
    const parts = fontStyle.split(/\s+/).filter((p) => p && p !== 'italic');
    return parts.length > 0 ? parts.join(' ') : undefined;
  };

  const tokenColors = (theme.tokenColors ?? []).map((t) => {
    const next = stripItalic(t.settings?.fontStyle);
    const { fontStyle: _drop, ...restSettings } = t.settings ?? {};
    return {
      ...t,
      settings: next ? { ...restSettings, fontStyle: next } : restSettings,
    };
  });

  return { ...theme, name: displayName, tokenColors };
}
