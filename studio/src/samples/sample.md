# Sample Markdown Document

A document showcasing many Markdown features for theme testing.

## Headings

# H1 — main title
## H2 — section
### H3 — subsection
#### H4 — finer
##### H5
###### H6

## Emphasis & inline

This paragraph mixes **bold**, _italic_, ***bold italic***, ~~strikethrough~~,
`inline code`, and a footnote reference[^1].

[^1]: A short footnote, with **emphasis** inside.

## Links & images

A regular [inline link](https://example.com "Example") and an
<https://example.com> autolink.

Reference link: see [the spec][cm-spec] for the gory details.

[cm-spec]: https://commonmark.org "CommonMark"

![alt text describing the image](./paddy-icon.png "Paddy icon")

## Lists

Unordered:

- Item one
- Item two
  - Nested item
  - Another nested
    - Deeply nested
- Item three

Ordered:

1. First
2. Second
   1. Nested first
   2. Nested second
3. Third

Task list:

- [x] Done
- [ ] Pending
- [ ] Also pending

## Blockquotes

> A single-line quote.
>
> A multi-line quote with **bold** and `code`.
>
> > Nested blockquote.

## Code

Inline `code()` and indented:

    function indented() {
      return "this is a four-space code block";
    }

Fenced with language hints:

```js
// Fibonacci, recursive form
const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));
console.log(fib(10));
```

```python
from itertools import islice

def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

print(list(islice(fib(), 10)))
```

## Tables

| Variant   | Background | Mood     |
| --------- | :--------- | -------: |
| dark      | `#111212`  |     warm |
| frost     | `#f2f5f6`  |     cool |
| eggplant  | `#1c1620`  | dramatic |
| genmaicha | `#e8e3d6`  |    cozy  |

## Horizontal rule

---

## HTML inline

<sub>subscript</sub> and <sup>superscript</sup>, plus a <kbd>Ctrl</kbd> +
<kbd>K</kbd> chord.

<details>
  <summary>Click to expand</summary>
  Hidden content with **markdown** inside.
</details>

## Definition list

Term
:   Definition for that term.

Another Term
:   Another definition, with `code` and _emphasis_.
