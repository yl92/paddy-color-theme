import styles from './VariantPicker.module.scss';
import type { ThemesMeta } from '../types';

export interface VariantSelection {
  name: string;
  kind: 'classic' | 'procedural';
  type: 'dark' | 'light';
}

interface Props {
  meta: ThemesMeta | null;
  value: VariantSelection | null;
  onChange: (sel: VariantSelection) => void;
  onCreateProcedural: (type: 'dark' | 'light') => void;
}

interface SectionProps {
  title: string;
  items: string[];
  kind: 'classic' | 'procedural';
  type: 'dark' | 'light';
  value: VariantSelection | null;
  onSelect: (sel: VariantSelection) => void;
  onCreate?: () => void;
}

function Section({ title, items, kind, type, value, onSelect, onCreate }: SectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <span>{title}</span>
        {onCreate && (
          <button
            type="button"
            className={styles.addButton}
            onClick={onCreate}
            title={`New procedural ${type} theme`}
          >
            +
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <div className={styles.empty}>—</div>
      ) : (
        <ul>
          {items.map((name) => {
            const active = value?.name === name && value?.kind === kind;
            return (
              <li key={`${kind}-${type}-${name}`}>
                <button
                  type="button"
                  className={`${styles.item} ${active ? styles.active : ''}`}
                  onClick={() => onSelect({ name, kind, type })}
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function VariantPicker({ meta, value, onChange, onCreateProcedural }: Props) {
  if (!meta) {
    return <nav className={styles.list} aria-busy="true" />;
  }

  const procedural = Object.entries(meta.procedural);
  const procDark = procedural.filter(([, p]) => p.foundation === 'zenith').map(([n]) => n).sort();
  const procLight = procedural.filter(([, p]) => p.foundation === 'light').map(([n]) => n).sort();

  return (
    <nav className={styles.list} aria-label="Theme variants">
      <Section
        title="Procedural · Dark"
        items={procDark}
        kind="procedural"
        type="dark"
        value={value}
        onSelect={onChange}
        onCreate={() => onCreateProcedural('dark')}
      />
      <Section
        title="Procedural · Light"
        items={procLight}
        kind="procedural"
        type="light"
        value={value}
        onSelect={onChange}
        onCreate={() => onCreateProcedural('light')}
      />
      <Section
        title="Classic · Dark"
        items={[...meta.classic.dark].sort()}
        kind="classic"
        type="dark"
        value={value}
        onSelect={onChange}
      />
      <Section
        title="Classic · Light"
        items={[...meta.classic.light].sort()}
        kind="classic"
        type="light"
        value={value}
        onSelect={onChange}
      />
    </nav>
  );
}
