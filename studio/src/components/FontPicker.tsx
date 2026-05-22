import styles from './FontPicker.module.scss';
import { FONTS } from '../lib/fonts';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export default function FontPicker({ value, onChange }: Props) {
  return (
    <label className={styles.picker}>
      <span>Font:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {FONTS.map((f) => (
          <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}
