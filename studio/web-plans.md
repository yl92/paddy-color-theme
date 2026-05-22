# Web — design considerations

Working notes for shipping the studio as a hosted web app where users tweak
procedural themes in-browser and download installable artifacts.

## Direction

- Primary product is a **static web app**: zero backend, deploys to Vercel /
  Netlify / Cloudflare Pages.
- Users explore the studio, design a theme, and **download a `.vsix`** they
  install in VS Code with `code --install-extension` or drag-drop.
- The current studio is ~90% of this product already; the work is to remove
  the dev-server filesystem API and add export + share flows.

## Architecture changes from current state

- **Bundle the foundations** (`zenith`, `light`) into the JS bundle at build
  time. Drop the `themesApiPlugin` Vite middleware entirely.
- **State persistence:** localStorage already handles unsaved drafts. Extend
  it to hold saved presets (the "saved" baseline becomes a localStorage
  snapshot rather than a server fetch).
- **No `themes-meta.json` on disk** — manifest moves into localStorage too.
- **Classic themes** could be bundled as additional read-only foundations
  (zenith + light + paddy's curated 25) or dropped to keep bundle small.

## Export modes

### Download as VS Code extension (`.vsix`)

Fully client-side. A `.vsix` is just a zip with a fixed structure:

```
extension/
  package.json        ← contributes.themes manifest
  themes/<name>.json  ← the derived theme
[Content_Types].xml
extension.vsixmanifest
```

Use `JSZip` (or `fflate` if bundle size matters) in the browser to assemble
the zip and trigger a download.

### Download raw theme JSON

For power users — skip the `.vsix` wrapper, install with whichever method
they prefer (drop into `~/.vscode/extensions/`, paste into
`workbench.colorCustomizations`, etc.).

## Sharing

- **URL-encoded params:** stick `ProceduralParams` into the URL as
  `?p=<base64-json>` or individual query params. Long-ish URLs but no
  backend needed.
- **Short codes:** optional later — a tiny serverless function that maps
  short codes ↔ params blobs. Nice-to-have, not blocking.

## Live preview tradeoff

- **What we lose vs a VS Code extension:** the killer feature of seeing the
  theme update in the user's actual editor, against their actual codebase.
- **What we keep:** Shiki-rendered samples already give an accurate enough
  preview for *authoring*. The gap shows up during *iteration* — users have
  to download, install, restart, and look at their real code to verify.
- **Mitigation:** make the sample grid generous (already 2×2 with 6
  languages). Consider letting users paste their own code into a panel.

## Trust & safety for downloaded `.vsix`

The .vsix install path bypasses Microsoft's marketplace scanning. Users
need to trust that what we hand them is safe.

### Why theme-only `.vsix` is structurally inert

A VS Code extension only executes code if its `package.json` declares a
`main` entry and a JS file gets loaded at activation. A theme-only extension
declares `contributes.themes` and **nothing else** — VS Code parses JSON,
no JS runs.

### Verification paths to expose in the UI

1. **Deterministic export.** Generator only ever emits:
   - `extension/package.json` with `contributes.themes`, no `main`, no
     `activationEvents`, no `scripts`.
   - `extension/themes/*.json`.
   - Manifest + content-types XML.
   Hardcoded — no codepath can include a `.js` file even by accident.
   Generator source is open so people can audit.

2. **Show contents before download.** Inline file tree:
   "this `.vsix` contains 2 files — `package.json` (524 bytes),
   `theme.json` (38 KB). No executable code." Plus a "view manifest" button
   that pops the package.json so users can inspect.

3. **Manual verification recipe.** Document: `unzip -l <file>.vsix` lists
   the contents. If they see `.js`, `.mjs`, `.cjs`, `.node` → don't install.

4. **SHA-256 of the generated `.vsix`** shown in the UI for users who want
   to verify the download wasn't tampered with in transit.

### Residual risks worth flagging

- **Typo-squat clones.** Someone stands up a malicious copy at a similar
  domain. Mitigation is brand + clear official URL, not technical.
- **Theme JSON parser bugs.** VS Code's own theme parser is the trust
  boundary. No known RCE via crafted theme JSON, but not proven impossible.

## Companion extension (later, optional)

If usage shows people want the tight live loop, ship a companion VS Code
extension that:

- Pastes a `paddy-studio` URL → fetches params → applies via
  `workbench.colorCustomizations` + `[Paddy Studio]` selector pattern.
- Live-tweaks against the user's real editor.

Web app remains the **authoring + discovery + sharing** product; the
extension is the **live application** add-on.

## Why not ship as a VS Code extension primarily

- File-watching contributed theme JSONs is not built into VS Code. Forcing
  a re-activation (the only "reload" path) flickers visibly and is what
  every prior theme tweaker abandoned.
- `workbench.colorCustomizations` + `editor.tokenColorCustomizations` are
  the only native live-reload mechanism. Workable, but a smaller market
  than a web app: install friction, marketplace approval, etc.
- Web-first lowers the bar to entry, increases shareability (URLs vs.
  marketplace pages), and the export path is honest about what users get
  (a frozen `.vsix` snapshot, not a live-evolving thing).

## Open design questions

- **Foundations: just zenith/light, or any installed VS Code theme as
  source?** Universal is a much bigger market but requires
  `defaultBorderContrast` / `defaultCommentContrast` / anchor detection to
  work robustly against themes that don't share Paddy's conventions.
- **Account-less by default?** localStorage + URL sharing only, no
  sign-in. Could add later if a gallery / public presets become a feature.
- **Pricing / model.** Free is the obvious default. If there's a hub of
  community-shared themes later, that's a different conversation.
