import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './App.module.scss';
import { loadTheme, saveTheme, loadMeta, saveMeta, loadPackage, savePackage } from './api/themes';
import type { ProceduralParams, ThemesMeta, VSCodeTheme, FoundationName } from './types';
import VariantPicker, { type VariantSelection } from './components/VariantPicker';
import ColorEditor from './components/ColorEditor';
import ProceduralEditor from './components/ProceduralEditor';
import Preview from './components/Preview';
import SaveBar from './components/SaveBar';
import FontPicker from './components/FontPicker';
import { DEFAULT_FONT_ID, getFont } from './lib/fonts';
import { applyThemeToStudio } from './lib/applyTheme';
import { derive, defaultBorderContrast, defaultCommentContrast, toUpright } from './lib/derive';

const FONT_STORAGE_KEY = 'paddy-studio:font';
const META_STORAGE_KEY = 'paddy-studio:meta';
const CLASSIC_STORAGE_PREFIX = 'paddy-studio:classic:';

const filenameFor = (shortName: string) => `Paddy-${shortName}-color-theme.json`;
const displayNameFor = (shortName: string) =>
  `P. \\ ${shortName.charAt(0).toUpperCase() + shortName.slice(1)}`;

const FOUNDATION_DEFAULTS: Record<FoundationName, Omit<ProceduralParams, 'foundation' | 'overrides' | 'tint'>> = {
  zenith: { bg: '#140d1a', fg: '#f3b8ba', accent1: '#b886ff', accent2: '#2baea3' },
  light: { bg: '#f3e7e2', fg: '#423926', accent1: '#1ba34f', accent2: '#127a35' },
};

function lookupSelection(name: string, meta: ThemesMeta): VariantSelection | null {
  if (meta.procedural[name]) {
    return {
      name,
      kind: 'procedural',
      type: meta.procedural[name].foundation === 'light' ? 'light' : 'dark',
    };
  }
  if (meta.classic.dark.includes(name)) return { name, kind: 'classic', type: 'dark' };
  if (meta.classic.light.includes(name)) return { name, kind: 'classic', type: 'light' };
  return null;
}

function getInitialName(): string {
  if (typeof window === 'undefined') return 'dark';
  const params = new URLSearchParams(window.location.search);
  return params.get('theme') ?? 'dark';
}

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function shallowEqualJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function App() {
  // Live state (may include unsaved edits).
  const [meta, setMeta] = useState<ThemesMeta | null>(null);
  const [classicTheme, setClassicTheme] = useState<VSCodeTheme | null>(null);

  // "Saved" baselines, mirrors of on-disk content.
  const [savedMeta, setSavedMeta] = useState<ThemesMeta | null>(null);
  const [savedClassicTheme, setSavedClassicTheme] = useState<VSCodeTheme | null>(null);

  const [selection, setSelection] = useState<VariantSelection | null>(null);
  const [foundations, setFoundations] = useState<Partial<Record<FoundationName, VSCodeTheme>>>({});
  const [status, setStatus] = useState<string>('');
  const [showSaved, setShowSaved] = useState(false);
  const [fontId, setFontId] = useState<string>(
    () => localStorage.getItem(FONT_STORAGE_KEY) ?? DEFAULT_FONT_ID
  );

  // --- Font ---
  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, fontId);
    document.documentElement.style.setProperty('--font-mono', getFont(fontId).stack);
  }, [fontId]);

  // --- Initial meta load + initial selection ---
  useEffect(() => {
    loadMeta()
      .then((serverMeta) => {
        setSavedMeta(serverMeta);
        const unsaved = safeReadJson<ThemesMeta>(META_STORAGE_KEY);
        const initialMeta = unsaved ?? serverMeta;
        setMeta(initialMeta);
        const desired = getInitialName();
        const sel = lookupSelection(desired, initialMeta) ?? lookupSelection('dark', initialMeta);
        setSelection(sel);
        if (unsaved && !shallowEqualJson(unsaved, serverMeta)) {
          setStatus('Restored unsaved meta from local storage.');
        }
      })
      .catch((e) => setStatus(`Meta load error: ${e.message}`));
  }, []);

  // --- Load classic theme on selection ---
  useEffect(() => {
    if (!selection || selection.kind !== 'classic') {
      setClassicTheme(null);
      setSavedClassicTheme(null);
      return;
    }
    setStatus(`Loading ${selection.name}…`);
    setShowSaved(false);
    loadTheme(filenameFor(selection.name))
      .then((t) => {
        setSavedClassicTheme(t);
        const unsaved = safeReadJson<VSCodeTheme>(CLASSIC_STORAGE_PREFIX + selection.name);
        if (unsaved && !shallowEqualJson(unsaved, t)) {
          setClassicTheme(unsaved);
          setStatus(`Loaded ${selection.name} (restored unsaved edits)`);
        } else {
          setClassicTheme(t);
          setStatus(`Loaded ${selection.name}`);
        }
      })
      .catch((e) => setStatus(`Error: ${e.message}`));
  }, [selection]);

  // --- Lazy-load foundation themes ---
  useEffect(() => {
    if (!selection || selection.kind !== 'procedural' || !meta) return;
    const params = meta.procedural[selection.name];
    if (!params) return;
    if (foundations[params.foundation]) return;
    loadTheme(filenameFor(params.foundation))
      .then((t) => setFoundations((prev) => ({ ...prev, [params.foundation]: t })))
      .catch((e) => setStatus(`Foundation load error: ${e.message}`));
  }, [selection, meta, foundations]);

  // --- Dirtiness for the current selection ---
  const dirty = useMemo(() => {
    if (!selection) return false;
    if (selection.kind === 'procedural') {
      if (!meta || !savedMeta) return false;
      return !shallowEqualJson(
        meta.procedural[selection.name],
        savedMeta.procedural[selection.name]
      );
    }
    return !shallowEqualJson(classicTheme, savedClassicTheme);
  }, [selection, meta, savedMeta, classicTheme, savedClassicTheme]);

  // --- Persist unsaved edits to localStorage ---
  useEffect(() => {
    if (!meta || !savedMeta) return;
    if (shallowEqualJson(meta, savedMeta)) {
      localStorage.removeItem(META_STORAGE_KEY);
    } else {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    }
  }, [meta, savedMeta]);

  useEffect(() => {
    if (!selection || selection.kind !== 'classic') return;
    if (!classicTheme || !savedClassicTheme) return;
    const key = CLASSIC_STORAGE_PREFIX + selection.name;
    if (shallowEqualJson(classicTheme, savedClassicTheme)) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(classicTheme));
    }
  }, [classicTheme, savedClassicTheme, selection]);

  // --- Derived theme (live OR saved depending on showSaved toggle) ---
  const theme: VSCodeTheme | null = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'classic') {
      const source = showSaved ? savedClassicTheme : classicTheme;
      return source;
    }
    const sourceMeta = showSaved ? savedMeta : meta;
    if (!sourceMeta) return null;
    const params = sourceMeta.procedural[selection.name];
    if (!params) return null;
    const foundation = foundations[params.foundation];
    if (!foundation) return null;
    return derive(foundation, params, displayNameFor(selection.name));
  }, [selection, classicTheme, savedClassicTheme, meta, savedMeta, foundations, showSaved]);

  // --- Apply theme to studio chrome ---
  useEffect(() => {
    if (theme) applyThemeToStudio(theme);
  }, [theme]);

  // --- URL state ---
  useEffect(() => {
    if (!selection) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('theme') !== selection.name) {
      url.searchParams.set('theme', selection.name);
      window.history.replaceState(null, '', url);
    }
  }, [selection]);

  // --- Editing handlers ---
  const handleClassicColorChange = useCallback((key: string, value: string) => {
    setClassicTheme((t) => (t ? { ...t, colors: { ...t.colors, [key]: value } } : t));
    setShowSaved(false);
  }, []);

  const handleProceduralChange = useCallback(
    (next: ProceduralParams) => {
      if (!selection || selection.kind !== 'procedural') return;
      setMeta((m) =>
        m ? { ...m, procedural: { ...m.procedural, [selection.name]: next } } : m
      );
      setShowSaved(false);
    },
    [selection]
  );

  const handleSelect = useCallback((sel: VariantSelection) => {
    setSelection(sel);
    setShowSaved(false);
    setStatus('');
  }, []);

  const handleDiscard = useCallback(() => {
    if (!selection || !dirty) return;
    if (selection.kind === 'procedural') {
      if (!meta || !savedMeta) return;
      const savedEntry = savedMeta.procedural[selection.name];
      if (savedEntry) {
        setMeta({
          ...meta,
          procedural: { ...meta.procedural, [selection.name]: savedEntry },
        });
      } else {
        // Newly-created procedural that was never saved — drop it.
        const { [selection.name]: _drop, ...rest } = meta.procedural;
        setMeta({ ...meta, procedural: rest });
        const fallback = lookupSelection('dark', savedMeta);
        if (fallback) setSelection(fallback);
      }
    } else {
      if (savedClassicTheme) setClassicTheme(savedClassicTheme);
    }
    setShowSaved(false);
    setStatus('Discarded unsaved changes.');
  }, [selection, dirty, meta, savedMeta, savedClassicTheme]);

  const handleBake = useCallback(async () => {
    if (!selection || selection.kind !== 'procedural' || !meta) return;
    const params = meta.procedural[selection.name];
    const foundation = params ? foundations[params.foundation] : null;
    if (!params || !foundation) {
      setStatus('Foundation not loaded yet.');
      return;
    }
    const shortName = selection.name;
    const titleCase = shortName.charAt(0).toUpperCase() + shortName.slice(1);
    const italicTheme = derive(foundation, params, `P. \\ ${titleCase}`);
    const uprightTheme = toUpright(italicTheme, `P. Upright \\ ${titleCase}`);
    const italicFilename = `Paddy-${shortName}-color-theme.json`;
    const uprightFilename = `Paddy-${shortName}-upright-color-theme.json`;
    const uiTheme: 'vs' | 'vs-dark' = params.foundation === 'light' ? 'vs' : 'vs-dark';

    try {
      await Promise.all([
        saveTheme(italicFilename, italicTheme, 'default'),
        saveTheme(uprightFilename, uprightTheme, 'upright'),
      ]);

      // Register in root package.json (upsert by id).
      const pkg = await loadPackage();
      const themes = pkg.contributes?.themes ?? [];
      const upsert = (id: string, label: string, relPath: string) => {
        const i = themes.findIndex((t) => t.id === id);
        const entry = { id, label, uiTheme, path: relPath };
        if (i >= 0) themes[i] = entry;
        else themes.push(entry);
      };
      upsert(
        `paddy-${shortName}`,
        `P. \\ ${titleCase}`,
        `./themes/default/${italicFilename}`
      );
      upsert(
        `paddy-${shortName}-upright`,
        `P. Upright \\ ${titleCase}`,
        `./themes/upright/${uprightFilename}`
      );
      const nextPkg = {
        ...pkg,
        contributes: { ...(pkg.contributes ?? {}), themes },
      };
      await savePackage(nextPkg);

      setStatus(`Baked ${shortName} (italic + upright, registered in package.json)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Bake failed: ${msg}`);
    }
  }, [selection, meta, foundations]);

  const handleRename = useCallback(async () => {
    if (!selection || selection.kind !== 'procedural' || !meta) return;
    const oldName = selection.name;
    const raw = window.prompt(`Rename "${oldName}" to:`, oldName);
    if (!raw) return;
    const newName = raw.trim().toLowerCase();
    if (newName === oldName) return;
    if (!/^[a-z][a-z0-9-]*$/.test(newName)) {
      setStatus('Invalid name. Use lowercase letters, digits, hyphens.');
      return;
    }
    if (
      meta.procedural[newName] ||
      meta.classic.dark.includes(newName) ||
      meta.classic.light.includes(newName)
    ) {
      setStatus(`"${newName}" already exists.`);
      return;
    }
    const oldParams = meta.procedural[oldName];
    const { [oldName]: _drop, ...rest } = meta.procedural;
    const nextMeta: ThemesMeta = {
      ...meta,
      procedural: { ...rest, [newName]: oldParams },
    };
    try {
      await saveMeta(nextMeta);
      setMeta(nextMeta);
      setSavedMeta(nextMeta);
      setSelection({ ...selection, name: newName });
      setStatus(`Renamed to "${newName}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Rename failed: ${msg}`);
    }
  }, [selection, meta]);

  const handleCreateProcedural = useCallback(
    (type: 'dark' | 'light') => {
      if (!meta) return;
      const raw = window.prompt(`New procedural ${type} theme name (lowercase, hyphens ok):`, '');
      if (!raw) return;
      const name = raw.trim().toLowerCase();
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        setStatus('Invalid name. Use lowercase letters, digits, hyphens.');
        return;
      }
      if (
        meta.procedural[name] ||
        meta.classic.dark.includes(name) ||
        meta.classic.light.includes(name)
      ) {
        setStatus(`"${name}" already exists.`);
        return;
      }
      const foundation: FoundationName = type === 'light' ? 'light' : 'zenith';
      const seed = FOUNDATION_DEFAULTS[foundation];
      const params: ProceduralParams = {
        foundation,
        ...seed,
        tint: null,
        overrides: {},
      };
      setMeta({
        ...meta,
        procedural: { ...meta.procedural, [name]: params },
      });
      setSelection({ name, kind: 'procedural', type });
      setShowSaved(false);
      setStatus(`New ${type} theme "${name}" — adjust and save.`);
    },
    [meta]
  );

  const handleSave = useCallback(async () => {
    if (!selection || !meta || !dirty) return;
    try {
      if (selection.kind === 'classic') {
        if (!classicTheme) return;
        await saveTheme(filenameFor(selection.name), classicTheme);
        setSavedClassicTheme(classicTheme);
      } else {
        // Procedural themes are stored as params only — the JSON is regenerated
        // on demand from the foundation. No per-theme file is written here.
        await saveMeta(meta);
        setSavedMeta(meta);
      }
      setShowSaved(false);
      setStatus(`Saved ${selection.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Save failed: ${msg}`);
    }
  }, [selection, classicTheme, meta, dirty]);

  // Cmd/Ctrl + S → save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S');
      if (!isSave) return;
      e.preventDefault();
      handleSave();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Classic themes correspond to a JSON file; procedural ones live in the
  // manifest and have no per-theme file on disk.
  const currentFilename =
    selection?.kind === 'classic'
      ? filenameFor(selection.name)
      : selection
      ? `${selection.name} · procedural`
      : null;
  const isProcedural = selection?.kind === 'procedural';
  const proceduralParams =
    isProcedural && meta && selection ? meta.procedural[selection.name] : null;
  const proceduralFoundation =
    proceduralParams ? foundations[proceduralParams.foundation] ?? null : null;
  const proceduralDefaults = useMemo(
    () => ({
      tintStrength: 1,
      chroma: 1,
      lightness: 0,
      monotone: 0,
      borderContrast: proceduralFoundation
        ? defaultBorderContrast(proceduralFoundation)
        : 0.2,
      commentContrast: proceduralFoundation
        ? defaultCommentContrast(proceduralFoundation)
        : 0.4,
      commentChroma: 1,
    }),
    [proceduralFoundation]
  );

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>paddy studio</h1>
        <FontPicker value={fontId} onChange={setFontId} />
        <span className={styles.status}>{status}</span>
      </header>
      <div className={styles.body}>
        <aside className={styles.variants}>
          <VariantPicker
            meta={meta}
            value={selection}
            onChange={handleSelect}
            onCreateProcedural={handleCreateProcedural}
          />
        </aside>
        <aside className={styles.editor}>
          {isProcedural && proceduralParams && selection ? (
            <ProceduralEditor
              name={selection.name}
              params={proceduralParams}
              foundation={proceduralFoundation}
              derived={theme}
              defaults={proceduralDefaults}
              onChange={handleProceduralChange}
              onRename={handleRename}
              onBake={handleBake}
            />
          ) : classicTheme ? (
            <ColorEditor theme={classicTheme} onChange={handleClassicColorChange} />
          ) : (
            <div className={styles.placeholder}>Pick a variant to begin.</div>
          )}
        </aside>
        <main className={styles.main}>{theme && <Preview theme={theme} />}</main>
      </div>
      <SaveBar
        filename={currentFilename}
        disabled={!theme}
        dirty={dirty}
        showSaved={showSaved}
        onToggleShowSaved={() => setShowSaved((v) => !v)}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
}
