# Developer Guide

Internal notes for hacking on the obsidian-diagrams-net plugin.

## Stack

- **Obsidian Plugin API** (see `manifest.json`).
- **React 17** for the editor view (`ReactDOM.render`, legacy API — not React 18 `createRoot`).
- **TypeScript** everywhere. `tsconfig.json` has `allowJs` true for historical reasons but the source tree is now fully `.ts` / `.tsx`.
- **esbuild** bundles `src/main.tsx` → `main.js` at the repo root. `manifest.json` points Obsidian at that file.

## File layout

```
src/
├── main.tsx           Plugin entry. Registers view, commands, vault event handlers.
├── diagrams-view.tsx  ItemView subclass. Mounts DiagramsApp into the leaf container.
├── DiagramsApp.tsx    React component. Loads XML data, hands it to useDiagramsNet.
├── useDiagramsNet.tsx React hook. Owns the diagrams.net iframe + message bridge.
├── constants.tsx      Shared string literals (view type, URL, icon, base64 blank diagram).
└── types.ts           Shared type definitions (FileInfo, export/save payloads, props).
```

## How a diagram is stored

Each diagram lives as a pair of files in the vault:

- `<name>.svg` — the rendered image embedded in the markdown note.
- `<name>.svg.xml` — the editable diagrams.net source (mxfile XML).

The `.xml` suffix is tracked via `XML_EXTENSION` in `constants.tsx` and the `getXmlPath()` helper in `main.tsx`. The markdown note references the diagram with a standard embed: `![[<name>.svg]]`.

## Lifecycle

1. User triggers "New diagram" or "Edit diagram" (command palette, file menu, editor menu).
2. `DiagramsNet#initView` (in `main.tsx`) opens a new workspace leaf and instantiates `DiagramsView`, passing a `FileInfo`.
3. `DiagramsView#onOpen` renders `<DiagramsApp />` into the leaf's container.
4. `DiagramsApp` reads the existing `.svg.xml` (if `diagramExists`), then invokes `useDiagramsNet#startEditing`.
5. `useDiagramsNet` injects an `<iframe>` pointing at `DIAGRAMS_NET_URL` and listens for `postMessage` traffic.
6. On save, the hook asks the iframe to export as both SVG and PNG, then calls `handleSaveAndExit` once both halves arrive.
7. `DiagramsView` writes the binary SVG and the XML source to the vault (creating new files, or modifying existing ones).
8. For new diagrams only, an embed `![[...]]` is inserted at the host editor's cursor.

## The diagrams.net message protocol

Docs: https://desk.draw.io/support/solutions/articles/16000042544

We only handle these events from the iframe:

- `init` — respond with `action: 'load'` and the current XML.
- `save` — respond with two `action: 'export'` calls (one SVG, one PNG). `exit` propagates so the editor closes after save.
- `export` — we collect both formats in `pngSave` / `svgSave` state; when both are present we flush via `onSaveCallback`.
- `autosave` — ignored.
- `exit` — tear down the iframe.

## Building

```
npm run dev     # esbuild watch mode
npm run build   # tsc --noEmit check, then production bundle
```

`npm run build` is what CI / releases should use — it type-checks before bundling. Plain `npm run dev` skips the type check.

## Known pitfalls

- **React 17 render API.** `ReactDOM.render` is deprecated in 18 but is what we use because Obsidian itself still ships on React 17-era tooling. Don't "modernize" to `createRoot` without verifying the host version.
- **`useEffect` deps in `useDiagramsNet`.** Inner functions (`stopEditing`, etc.) are recreated each render, so they aren't in the dep array — the effect fires only when the save payload arrives. Changing this without care can produce render loops or missed saves.
- **Refresh-after-save.** Editing a diagram doesn't force the markdown preview to reload the SVG. See the "Known issues" note in the README; there's currently no programmatic refresh hook for the host `View`.
- **`@ts-ignore` on `getAvailablePathForAttachments`.** That vault method isn't in the public Obsidian typings; keep the ignore until the typings ship it.
