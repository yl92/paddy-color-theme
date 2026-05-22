import styles from './EyedropperButton.module.scss';

type EyeDropperResult = { sRGBHex: string };
type EyeDropperLike = { open: (opts?: { signal?: AbortSignal }) => Promise<EyeDropperResult> };
type EyeDropperCtor = { new (): EyeDropperLike };

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { EyeDropper?: EyeDropperCtor };
  return w.EyeDropper ?? null;
}

interface Props {
  onPick: (hex: string) => void;
  title?: string;
}

export default function EyedropperButton({ onPick, title = 'Pick color from screen' }: Props) {
  const Ctor = getEyeDropper();
  if (!Ctor) return null;

  const handle = async () => {
    try {
      const eye = new Ctor();
      const { sRGBHex } = await eye.open();
      onPick(sRGBHex);
    } catch {
      // Cancelled or unavailable — silently ignore.
    }
  };

  return (
    <button type="button" className={styles.btn} onClick={handle} title={title} aria-label={title}>
      <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <path d="M2 6H3V7H2V8H0V6H1V5H2V6ZM4 6H3V5H4V6ZM3 5H2V4H3V5ZM5 5H4V4H5V5ZM7 5H6V4H7V5ZM4 4H3V3H4V4ZM8 3H6V4H5V3H4V2H5V0H8V3ZM4 2H3V1H4V2Z" fill="currentColor" />
      </svg>
    </button>
  );
}
