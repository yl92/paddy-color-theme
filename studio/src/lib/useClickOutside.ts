import { useEffect, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, ref, onClose]);
}
