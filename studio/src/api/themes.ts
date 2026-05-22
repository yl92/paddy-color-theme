import type { VSCodeTheme, ThemesMeta } from '../types';

export async function listThemes(): Promise<string[]> {
  const res = await fetch('/api/themes');
  if (!res.ok) throw new Error('Failed to list themes');
  return res.json();
}

export async function loadTheme(filename: string): Promise<VSCodeTheme> {
  const res = await fetch(`/api/themes/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}`);
  return res.json();
}

export async function saveTheme(
  filename: string,
  theme: VSCodeTheme,
  dir: 'default' | 'upright' = 'default'
): Promise<void> {
  const url = `/api/themes/${encodeURIComponent(filename)}?dir=${dir}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(theme, null, 2),
  });
  if (!res.ok) throw new Error(`Save failed: ${await res.text()}`);
}

interface ExtensionPackage {
  contributes?: {
    themes?: Array<{
      id?: string;
      label: string;
      uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
      path: string;
    }>;
  };
  [key: string]: unknown;
}

export async function loadPackage(): Promise<ExtensionPackage> {
  const res = await fetch('/api/package');
  if (!res.ok) throw new Error('Failed to load package.json');
  return res.json();
}

export async function savePackage(pkg: ExtensionPackage): Promise<void> {
  const res = await fetch('/api/package', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pkg, null, '\t') + '\n',
  });
  if (!res.ok) throw new Error(`Package save failed: ${await res.text()}`);
}

export async function deleteTheme(filename: string): Promise<void> {
  const res = await fetch(`/api/themes/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed: ${await res.text()}`);
  }
}

export async function loadMeta(): Promise<ThemesMeta> {
  const res = await fetch('/api/meta');
  if (!res.ok) throw new Error('Failed to load meta');
  return res.json();
}

export async function saveMeta(meta: ThemesMeta): Promise<void> {
  const res = await fetch('/api/meta', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(meta, null, 2),
  });
  if (!res.ok) throw new Error(`Meta save failed: ${await res.text()}`);
}
