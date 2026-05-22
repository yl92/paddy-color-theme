import { useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import EyedropperButton from './EyedropperButton';
import styles from './ProceduralEditor.module.scss';
import type { ProceduralParams, VSCodeTheme } from '../types';
import { useClickOutside } from '../lib/useClickOutside';

interface Props {
  name: string;
  params: ProceduralParams;
  foundation: VSCodeTheme | null;
  derived: VSCodeTheme | null;
  defaults: {
    tintStrength: number;
    chroma: number;
    lightness: number;
    monotone: number;
    borderContrast: number;
    commentContrast: number;
    commentChroma: number;
  };
  onChange: (next: ProceduralParams) => void;
  onRename: () => void;
  onBake: () => void;
}

type ColorFieldKey =
  | 'bg'
  | 'fg'
  | 'midtone'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'tint';

interface FieldDef {
  key: ColorFieldKey;
  label: string;
  optional?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'bg', label: 'Background' },
  { key: 'fg', label: 'Foreground' },
  { key: 'midtone', label: 'Midtone (axis center)', optional: true },
  { key: 'accent1', label: 'Accent 1' },
  { key: 'accent2', label: 'Accent 2 · keyword.control', optional: true },
  { key: 'accent3', label: 'Accent 3 · entity.name.tag', optional: true },
  { key: 'tint', label: 'Token tint', optional: true },
];

interface KnobDef {
  key:
    | 'tintStrength'
    | 'chroma'
    | 'lightness'
    | 'monotone'
    | 'borderContrast'
    | 'commentContrast'
    | 'commentChroma';
  label: string;
  min: number;
  max: number;
  step: number;
}

const KNOBS: KnobDef[] = [
  { key: 'tintStrength', label: 'Tint strength', min: 0, max: 1, step: 0.02 },
  { key: 'chroma', label: 'Token chroma', min: 0, max: 2, step: 0.05 },
  { key: 'lightness', label: 'Token lightness', min: -1, max: 1, step: 0.01 },
  { key: 'monotone', label: 'Token monotone', min: 0, max: 1, step: 0.02 },
  { key: 'borderContrast', label: 'Border contrast', min: 0, max: 1, step: 0.01 },
  { key: 'commentContrast', label: 'Comment contrast', min: 0, max: 1, step: 0.01 },
  { key: 'commentChroma', label: 'Comment chroma', min: 0, max: 2, step: 0.05 },
];

type OpenPopover =
  | { kind: 'field'; key: ColorFieldKey }
  | { kind: 'override'; scope: string };

export default function ProceduralEditor({
  name,
  params,
  foundation,
  derived,
  defaults,
  onChange,
  onRename,
  onBake,
}: Props) {
  const [open, setOpen] = useState<OpenPopover | null>(null);
  const [scopeQuery, setScopeQuery] = useState('');
  const [scopeOpen, setScopeOpen] = useState(false);
  const openFieldRef = useRef<HTMLDivElement | null>(null);
  const openOverrideRef = useRef<HTMLLIElement | null>(null);
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(openFieldRef, open?.kind === 'field', () => setOpen(null));
  useClickOutside(openOverrideRef, open?.kind === 'override', () => setOpen(null));
  useClickOutside(scopeRef, scopeOpen, () => {
    setScopeOpen(false);
    setScopeQuery('');
  });

  const setField = (key: ColorFieldKey, value: string | null) => {
    onChange({ ...params, [key]: value });
  };

  const setKnob = (key: KnobDef['key'], value: number) => {
    onChange({ ...params, [key]: value });
  };

  const overrideEntries = Object.entries(params.tokenOverrides ?? {});
  const overrideSet = new Set(overrideEntries.map(([k]) => k));

  // All distinct scopes pulled from the foundation tokenColors, minus already-overridden.
  const availableScopes = useMemo(() => {
    if (!foundation) return [];
    const set = new Set<string>();
    for (const t of foundation.tokenColors ?? []) {
      if (!t.scope) continue;
      const arr = Array.isArray(t.scope) ? t.scope : [t.scope];
      for (const s of arr) set.add(s);
    }
    return Array.from(set).sort();
  }, [foundation]);

  const filteredScopes = useMemo(() => {
    const q = scopeQuery.toLowerCase();
    return availableScopes
      .filter((s) => !overrideSet.has(s))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 50);
  }, [availableScopes, overrideSet, scopeQuery]);

  // Look up the current derived foreground for a scope.
  const currentDerivedFor = (scope: string): string => {
    if (!derived) return '#888888';
    for (const t of derived.tokenColors ?? []) {
      if (!t.scope) continue;
      const arr = Array.isArray(t.scope) ? t.scope : [t.scope];
      if (arr.includes(scope) && t.settings?.foreground) return t.settings.foreground;
    }
    return '#888888';
  };

  const addOverride = (scope: string) => {
    const initial = currentDerivedFor(scope);
    onChange({
      ...params,
      tokenOverrides: { ...(params.tokenOverrides ?? {}), [scope]: initial },
    });
    setScopeOpen(false);
    setScopeQuery('');
  };

  const setOverride = (scope: string, value: string) => {
    onChange({
      ...params,
      tokenOverrides: { ...(params.tokenOverrides ?? {}), [scope]: value },
    });
  };

  const removeOverride = (scope: string) => {
    const { [scope]: _drop, ...rest } = params.tokenOverrides ?? {};
    onChange({ ...params, tokenOverrides: rest });
  };

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <span className={styles.label}>Procedural</span>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          <button type="button" className={styles.renameBtn} onClick={onRename} title="Rename">
            rename
          </button>
          <button
            type="button"
            className={styles.renameBtn}
            onClick={onBake}
            title="Write italic + upright JSONs and register in package.json"
          >
            bake
          </button>
        </div>
        <span className={styles.foundation}>base · {params.foundation}</span>
      </header>

      <div className={styles.fields}>
        {FIELDS.map(({ key, label, optional }) => {
          const value = (params as unknown as Record<string, string | null | undefined>)[key];
          const isOpen = open?.kind === 'field' && open.key === key;
          return (
            <div
              key={key}
              className={styles.field}
              ref={isOpen ? openFieldRef : undefined}
            >
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.swatch}
                  style={{ background: value ?? 'transparent' }}
                  onClick={() => setOpen(isOpen ? null : { kind: 'field', key })}
                  aria-label={`Edit ${label}`}
                />
                <div className={styles.fieldBody}>
                  <div className={styles.fieldLabel}>{label}</div>
                  <div className={styles.hexRow}>
                    <input
                      type="text"
                      value={value ?? ''}
                      placeholder={optional ? '(none)' : '#000000'}
                      onChange={(e) =>
                        setField(key, e.target.value || (optional ? null : ''))
                      }
                      spellCheck={false}
                      className={styles.hex}
                    />
                    <EyedropperButton onPick={(c) => setField(key, c)} />
                    {optional && value && (
                      <button
                        type="button"
                        className={styles.clear}
                        onClick={() => setField(key, null)}
                        title="Clear"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className={styles.picker}>
                  <HexColorPicker
                    color={value ?? '#000000'}
                    onChange={(c) => setField(key, c)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.knobs}>
        <header className={styles.sectionHeader}>Knobs</header>
        {KNOBS.map(({ key, label, min, max, step }) => {
          const effective = params[key] ?? defaults[key];
          const isExplicit = params[key] !== undefined;
          return (
            <div key={key} className={styles.knob}>
              <div className={styles.knobLabel}>
                <span>{label}</span>
                <span className={styles.knobValue}>
                  {effective.toFixed(2)}
                  {!isExplicit && <span className={styles.knobAuto}> · auto</span>}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={effective}
                onChange={(e) => setKnob(key, parseFloat(e.target.value))}
                className={styles.slider}
                style={{ ['--val' as string]: (effective - min) / (max - min) }}
              />
            </div>
          );
        })}
      </div>

      <div className={styles.overrides}>
        <header className={styles.overridesHeader}>
          <span>Token overrides</span>
          <span className={styles.count}>{overrideEntries.length}</span>
        </header>

        <div className={styles.addRow} ref={scopeOpen ? scopeRef : undefined}>
          <input
            type="search"
            value={scopeQuery}
            placeholder="Add scope override (e.g. variable.parameter)…"
            onChange={(e) => setScopeQuery(e.target.value)}
            onFocus={() => setScopeOpen(true)}
            className={styles.scopeInput}
          />
          {scopeOpen && filteredScopes.length > 0 && (
            <ul className={styles.scopeList}>
              {filteredScopes.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className={styles.scopeItem}
                    style={{
                      borderLeft: `3px solid ${currentDerivedFor(s)}`,
                    }}
                    onClick={() => addOverride(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {overrideEntries.length === 0 ? (
          <div className={styles.empty}>No overrides.</div>
        ) : (
          <ul className={styles.overrideList}>
            {overrideEntries.map(([scope, v]) => {
              const isOpen = open?.kind === 'override' && open.scope === scope;
              return (
                <li
                  key={scope}
                  className={styles.overrideRow}
                  ref={isOpen ? openOverrideRef : undefined}
                >
                  <button
                    type="button"
                    className={styles.miniSwatch}
                    style={{ background: v }}
                    onClick={() =>
                      setOpen(isOpen ? null : { kind: 'override', scope })
                    }
                    aria-label={`Edit ${scope}`}
                  />
                  <span className={styles.overrideKey} title={scope}>
                    {scope}
                  </span>
                  <EyedropperButton onPick={(c) => setOverride(scope, c)} />
                  <button
                    type="button"
                    className={styles.clear}
                    onClick={() => removeOverride(scope)}
                    title="Remove override"
                  >
                    ×
                  </button>
                  {isOpen && (
                    <div className={styles.picker}>
                      <HexColorPicker color={v} onChange={(c) => setOverride(scope, c)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
