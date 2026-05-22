"""Demo Python module — exercises many syntax forms for theme testing.

Covers: imports, decorators, dataclasses, generics, async/await, pattern
matching, f-strings, raw/bytes literals, comprehensions, context managers,
exceptions, and module-level dunders.
"""

from __future__ import annotations

import asyncio
import re
from collections.abc import Iterable, Mapping
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Generic, Protocol, TypeVar, cast, overload

__all__ = ["User", "Role", "fetch_user", "summarize"]
__version__ = "0.1.0"

# --- numeric & string literals ---
PI: float = 3.14159
HEX_COLOR = 0xFFA430
BIG_NUM = 1_000_000
SCIENTIFIC = 6.022e23
COMPLEX = 1 + 2j
BIN = 0b1010_1010
OCT = 0o755

RAW_PATTERN = re.compile(r"\b(\w+)@(\w+\.\w+)\b")
BYTES_VAL = b"\xde\xad\xbe\xef"
TRIPLE = """line one
line two
line three"""
F_STRING = f"pi rounded: {PI:.2f}"

T = TypeVar("T")
K = TypeVar("K", bound=str)


class Role(Enum):
    ADMIN = auto()
    USER = auto()
    GUEST = auto()


@dataclass(frozen=True, slots=True)
class User(Generic[T]):
    """A user record. T is the payload type carried in metadata."""

    id: str
    name: str
    role: Role = Role.USER
    metadata: T | None = None
    tags: list[str] = field(default_factory=list)

    def greet(self, salutation: str = "Hello") -> str:
        return f"{salutation}, {self.name}!"

    @classmethod
    def anonymous(cls) -> "User[None]":
        return cls(id="0", name="anon")

    @property
    def is_admin(self) -> bool:
        return self.role is Role.ADMIN


class Greetable(Protocol):
    def greet(self, salutation: str = ...) -> str: ...


@overload
def shout(x: User) -> str: ...
@overload
def shout(x: str) -> str: ...
def shout(x):
    if isinstance(x, str):
        return x.upper() + "!"
    return x.greet("Hey").upper() + "!"


@contextmanager
def timer(label: str):
    import time
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label} took {elapsed * 1000:.2f}ms")


async def fetch_user(uid: str) -> User[dict[str, int]] | None:
    """Pretend to fetch a user asynchronously."""
    await asyncio.sleep(0.01)
    if not uid:
        raise ValueError("empty uid")
    try:
        return User(id=uid, name=f"user-{uid}", metadata={"hits": 0})
    except Exception as err:  # noqa: BLE001
        print(f"fetch failed: {err!r}")
        return None
    finally:
        print("done")


def summarize(users: Iterable[User]) -> Mapping[Role, int]:
    counts: dict[Role, int] = {}
    for u in users:
        counts[u.role] = counts.get(u.role, 0) + 1
    return counts


def categorize(value: object) -> str:
    match value:
        case []:
            return "empty list"
        case [single]:
            return f"single: {single!r}"
        case [first, *rest]:
            return f"head={first!r} tail_len={len(rest)}"
        case {"role": Role.ADMIN, **_rest}:
            return "admin record"
        case int() | float() as n if n > 0:
            return f"positive number {n}"
        case _:
            return "unknown"


if __name__ == "__main__":
    with timer("main"):
        users = [User(id=str(i), name=f"u{i}", tags=["t", "p"]) for i in range(5)]
        counts = summarize(users)
        pretty = {role.name: n for role, n in counts.items()}
        assert sum(pretty.values()) == 5, "lost a user"
        print(f"counts = {pretty}")
        print(categorize({"role": Role.ADMIN}))
        result = asyncio.run(fetch_user("42"))
        if result is not None:
            print(cast(User, result).greet())
