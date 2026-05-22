import { useRef, useState } from 'react';
import { HexAlphaColorPicker } from 'react-colorful';
import styles from './ColorEditor.module.scss';
import type { VSCodeTheme } from '../types';
import { useClickOutside } from '../lib/useClickOutside';
import EyedropperButton from './EyedropperButton';

interface Props {
  theme: VSCodeTheme;
  onChange: (key: string, value: string) => void;
}

export default function ColorEditor({ theme, onChange }: Props) {
  const [filter, setFilter] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openRowRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(openRowRef, openKey !== null, () => setOpenKey(null));

  const entries = Object.entries(theme.colors).filter(
    ([key]) => !filter || key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Filter colors (e.g. background, sidebar)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filter}
        />
        <span className={styles.count}>{entries.length}</span>
      </div>
      <div className={styles.list}>
        {entries.map(([key, value]) => {
          const isOpen = openKey === key;
          return (
            <div
              key={key}
              className={styles.row}
              ref={isOpen ? openRowRef : undefined}
            >
              <button
                type="button"
                className={styles.swatch}
                style={{ background: value }}
                onClick={() => setOpenKey(isOpen ? null : key)}
                aria-label={`Edit ${key}`}
              />
              <div className={styles.fields}>
                <div className={styles.key} title={key}>
                  {key}
                </div>
                <div className={styles.hexRow}>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(key, e.target.value)}
                    className={styles.hex}
                    spellCheck={false}
                  />
                  <EyedropperButton onPick={(c) => onChange(key, c)} />
                </div>
              </div>
              {isOpen && (
                <div className={styles.picker}>
                  <HexAlphaColorPicker color={value} onChange={(c) => onChange(key, c)} />
                </div>
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className={styles.empty}>No keys match “{filter}”.</div>
        )}
      </div>
    </div>
  );
}
