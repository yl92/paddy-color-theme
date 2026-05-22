/**
 * Demo TSX file — exercises a wide range of TypeScript & JSX syntax to
 * stress-test theme token coloring.
 *
 * @module demo
 */
import { useCallback, useEffect, useMemo, useReducer, type FC, type ReactNode } from 'react';
import * as Icons from './icons';
import defaultExport, { namedExport } from 'some-module';

// --- numeric literals ---
const PI = 3.14159;
const HEX = 0xff_a4_30;
const BIG = 1_000_000n;
const SCI = 6.022e23;
const BIN = 0b1010_1010;

enum Direction {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W',
}

type Coords = readonly [x: number, y: number];

interface User<TRole extends string = 'admin' | 'user' | 'guest'> {
  readonly id: string;
  name: string;
  role: TRole;
  metadata?: Record<string, unknown>;
}

abstract class Shape {
  abstract area(): number;
  protected scale = 1;
}

class Circle extends Shape implements Iterable<Coords> {
  static readonly TWO_PI = Math.PI * 2;

  constructor(public radius: number, public center: Coords = [0, 0]) {
    super();
  }

  override area(): number {
    return Math.PI * this.radius ** 2;
  }

  static fromDiameter(d: number): Circle {
    return new Circle(d / 2);
  }

  *[Symbol.iterator](): Generator<Coords> {
    const [cx, cy] = this.center;
    for (let i = 0; i < 360; i += 30) {
      const rad = (i * Math.PI) / 180;
      yield [cx + Math.cos(rad) * this.radius, cy + Math.sin(rad) * this.radius];
    }
  }
}

const fetchUser = async <T extends User>(id: string): Promise<T | null> => {
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as T;
    return data;
  } catch (err) {
    console.error('fetchUser failed', err);
    return null;
  }
};

const isAdmin = (u: User): u is User<'admin'> => u.role === 'admin';

interface Props {
  user: User;
  children?: ReactNode;
  onClick?: (id: string) => void;
}

export const Profile: FC<Props> = ({ user, children, onClick }) => {
  const greeting = useMemo(() => `Hello, ${user.name ?? 'stranger'}!`, [user]);

  const [count, dispatch] = useReducer((n: number, a: 'inc' | 'dec' | 'reset') => {
    switch (a) {
      case 'inc': return n + 1;
      case 'dec': return n - 1;
      case 'reset': return 0;
      default: return n;
    }
  }, 0);

  const handleClick = useCallback(() => onClick?.(user.id), [onClick, user.id]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch('inc'), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <article className={isAdmin(user) ? 'profile admin' : 'profile'} onClick={handleClick}>
      <h2 data-id={user.id}>{greeting}</h2>
      <p>You have been here {count} second{count === 1 ? '' : 's'}.</p>
      <ul>
        {Object.entries(user.metadata ?? {}).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {String(value)}
          </li>
        ))}
      </ul>
      {children ?? <em>No bio yet.</em>}
      <Icons.Logo size={48} aria-hidden />
    </article>
  );
};

export default Profile;
export { Circle, Direction };
export type { User, Props };
