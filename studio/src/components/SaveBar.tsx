import styles from './SaveBar.module.scss';

interface Props {
  filename: string | null;
  disabled: boolean;
  dirty: boolean;
  showSaved: boolean;
  onToggleShowSaved: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export default function SaveBar({
  filename,
  disabled,
  dirty,
  showSaved,
  onToggleShowSaved,
  onDiscard,
  onSave,
}: Props) {
  return (
    <footer className={styles.bar}>
      <span className={styles.filename}>{filename ?? '—'}</span>
      <span className={`${styles.indicator} ${dirty ? styles.dirty : ''}`}>
        {dirty ? '● has unsaved changes' : 'saved'}
      </span>
      {dirty && (
        <>
          <button
            type="button"
            className={`${styles.toggle} ${showSaved ? styles.active : ''}`}
            onClick={onToggleShowSaved}
            title="Toggle between current edits and on-disk saved version"
          >
            {showSaved ? 'viewing saved' : 'view saved'}
          </button>
          <button type="button" className={styles.discard} onClick={onDiscard}>
            discard
          </button>
        </>
      )}
      <button disabled={disabled || !dirty} onClick={onSave}>
        Save
      </button>
    </footer>
  );
}
