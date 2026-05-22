import { useEffect, useRef, useState } from 'react';
import styles from './Preview.module.scss';
import type { VSCodeTheme } from '../types';
import { getHighlighter } from '../lib/shiki';

import sampleTsx from '../samples/sample.tsx?raw';
import samplePy from '../samples/sample.py?raw';
import sampleMd from '../samples/sample.md?raw';
import sampleJson from '../samples/sample.json?raw';
import sampleHtml from '../samples/sample.html?raw';
import sampleCss from '../samples/sample.css?raw';
import sampleRust from '../samples/sample.rs?raw';
import sampleGo from '../samples/sample.go?raw';
import sampleYaml from '../samples/sample.yaml?raw';
import sampleSh from '../samples/sample.sh?raw';
import sampleSql from '../samples/sample.sql?raw';

interface SampleDef {
  label: string;
  lang: string;
  code: string;
}

const SAMPLES: Record<string, SampleDef> = {
  tsx: { label: 'tsx', lang: 'tsx', code: sampleTsx },
  python: { label: 'python', lang: 'python', code: samplePy },
  markdown: { label: 'markdown', lang: 'markdown', code: sampleMd },
  json: { label: 'json', lang: 'json', code: sampleJson },
  html: { label: 'html', lang: 'html', code: sampleHtml },
  css: { label: 'css', lang: 'css', code: sampleCss },
  rust: { label: 'rust', lang: 'rust', code: sampleRust },
  go: { label: 'go', lang: 'go', code: sampleGo },
  yaml: { label: 'yaml', lang: 'yaml', code: sampleYaml },
  shell: { label: 'shell', lang: 'shellscript', code: sampleSh },
  sql: { label: 'sql', lang: 'sql', code: sampleSql },
};

const SAMPLE_KEYS = Object.keys(SAMPLES);

const DEFAULT_PANELS: [string, string, string, string] = ['tsx', 'python', 'html', 'markdown'];

interface PanelProps {
  themeName: string;
  themeLoaded: boolean;
  langKey: string;
  onLangChange: (key: string) => void;
  highlighter: Awaited<ReturnType<typeof getHighlighter>> | null;
  bg: string;
}

function Panel({ themeName, themeLoaded, langKey, onLangChange, highlighter, bg }: PanelProps) {
  const sample = SAMPLES[langKey] ?? SAMPLES[DEFAULT_PANELS[0]];
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!highlighter || !themeLoaded) {
      setHtml('');
      return;
    }
    try {
      const rendered = highlighter.codeToHtml(sample.code, {
        lang: sample.lang,
        theme: themeName,
      });
      setHtml(rendered);
    } catch (e) {
      console.error('codeToHtml failed', e);
      setHtml('');
    }
  }, [highlighter, themeName, themeLoaded, sample]);

  return (
    <div className={styles.panel}>
      <header className={styles.panelHeader}>
        <select
          value={langKey}
          onChange={(e) => onLangChange(e.target.value)}
          className={styles.langSelect}
        >
          {SAMPLE_KEYS.map((k) => (
            <option key={k} value={k}>
              {SAMPLES[k].label}
            </option>
          ))}
        </select>
      </header>
      <div className={styles.canvas} style={{ background: bg }}>
        <div className={styles.code} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export default function Preview({ theme }: { theme: VSCodeTheme }) {
  const counterRef = useRef(0);
  const [themeName, setThemeName] = useState<string>('');
  const [highlighter, setHighlighter] = useState<Awaited<ReturnType<typeof getHighlighter>> | null>(
    null
  );
  const [panels, setPanels] = useState<string[]>(DEFAULT_PANELS);

  useEffect(() => {
    getHighlighter().then(setHighlighter).catch((e) => console.error('highlighter init', e));
  }, []);

  // Load a fresh theme into Shiki under a unique name on every theme change.
  // This bypasses any in-memory caches keyed by theme name.
  useEffect(() => {
    if (!highlighter) return;
    let cancelled = false;
    const name = `__preview-${++counterRef.current}__`;
    const themeWithName = { ...theme, name } as Parameters<typeof highlighter.loadTheme>[0];
    (async () => {
      try {
        await highlighter.loadTheme(themeWithName);
        if (!cancelled) setThemeName(name);
      } catch (e) {
        console.error('loadTheme failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [theme, highlighter]);

  const bg = theme.colors['editor.background'] || '#000';
  const themeLoaded = themeName !== '';

  const setPanelLang = (idx: number, key: string) => {
    setPanels((prev) => prev.map((p, i) => (i === idx ? key : p)));
  };

  return (
    <div className={styles.preview}>
      <div className={styles.grid}>
        {panels.map((langKey, idx) => (
          <Panel
            key={idx}
            themeName={themeName}
            themeLoaded={themeLoaded}
            langKey={langKey}
            onLangChange={(k) => setPanelLang(idx, k)}
            highlighter={highlighter}
            bg={bg}
          />
        ))}
      </div>
    </div>
  );
}
