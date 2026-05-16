# Form Builder

A browser-based form builder built with React, TypeScript, and Vite. Create forms with a drag-and-drop editor, collect responses, and export submissions as PDFs — all stored locally in the browser.

## Features

- **Drag-and-drop canvas** — drag fields from the palette onto the canvas and reorder them freely
- **9 field types** — Single Line Text, Multi-line Text, Number, Date, Single Select, Multi Select, Section Header, File Upload, Calculation
- **Conditional logic** — show/hide or require/unrequire fields based on other field values; cycle detection prevents circular dependencies
- **PDF export** — download any submitted response as a formatted PDF via the browser's print dialog
- **Pre-seeded template** — a Job Application template is loaded on first run, covering all field types and a conditional "Daily Rate" field
- **Responses view** — see all submissions for a form, newest first, with per-response PDF download
- **Auto-save** — form changes are debounced and persisted to `localStorage` automatically
- **No backend** — everything runs in the browser; data lives in `localStorage`

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, Tailwind CSS v4 |
| State | Redux Toolkit + React Redux |
| Routing | React Router v7 |
| Drag and drop | dnd-kit |
| Build | Vite, TypeScript 6 |

## Getting Started

**Prerequisites:** Node.js 18+ and npm

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with hot reload |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── builder/        # BuilderPage, canvas, config panel, condition editor
│   ├── fill/           # FillPage — form fill and submission
│   ├── home/           # HomePage, FormCard, ResponsesPage
│   └── shared/         # Reusable UI components (ConfigRow, etc.)
├── fields/             # One file per field type; each exports a FieldDefinition
│   └── fieldRegistry.ts
├── store/              # Redux slices: templates, instances, fill, ui
├── types/
│   └── form.ts         # All shared TypeScript types (Field, Condition, FormRecord…)
└── utils/
    ├── conditionEvaluator.ts  # Pure evaluateForm() + cycle detection
    ├── fieldUtils.ts          # Field duplication helpers
    ├── pdfExport.ts           # iframe-based PDF generation
    └── seedTemplates.ts       # First-run template seeding
```

## Data Storage

All data is stored in `localStorage` under three keys:

| Key | Contents |
|---|---|
| `formbuilder_templates` | All form definitions (fields, config, conditions) |
| `formbuilder_instances` | All submitted responses with a field snapshot |
| `formbuilder_seeded` | Flag to prevent re-seeding the default template |

## Key Architectural Decisions

### Component Structure — Field Registry

Every field type is a self-contained `FieldDefinition` object in its own file under `src/fields/`. The registry (`fieldRegistry.ts`) is a static map of all definitions:

```
src/fields/
├── singleText.tsx       # definition + config panel + fill renderer
├── number.tsx
├── sectionHeader.tsx
└── fieldRegistry.ts     # one-line entry per type
```

**Adding an 11th field type touches exactly 2 places:** one new file, one line in `fieldRegistry.ts`. Nothing else changes — `FieldPalette`, `BuilderCanvas`, `FillPage`, and `ConfigPanel` all derive behaviour from the registry at runtime. No switch statements, no imports to add.

**Why not schema-driven config panels?** The conditional logic editor (present on every field) needs the list of all other fields in the template to populate its target dropdown. A generic schema renderer has no natural access to this application-level state — you'd have to pass it as a context prop, coupling the renderer to the domain and defeating the purpose. React components have store access by design; the schema renderer approach doesn't.

**Why a static map over dynamic `registerField()`?** This is a closed application with no plugin loader, no lazy loading, and no external consumers. Dynamic registration adds indirection with no benefit. It remains the natural extension path if external teams need to ship field packages as independent modules.

### Conditional Logic

Conditions are evaluated by a pure function: `evaluateForm(fields, fillValues) → { visibilityMap, requiredMap }`. Fixed evaluation order: visibility first, required second (required evaluation reads the visibility result to enforce that hidden fields are never validated as required).

**Why a pure function over a dependency graph?** At 10–50 fields, the pure evaluator runs in under 1ms per keystroke — fast enough that there is no case for the added complexity of a reactive dependency graph. The known limitation is documented: chained visibility doesn't cascade (if Field A hides Field B and Field C conditions on Field B's value, C doesn't re-evaluate when B disappears). The schema includes a `combinator` field reserved for future OR logic.

**AND-only combinators:** Multiple conditions on a field combine with AND. OR is trivially cheap to evaluate (`every` → `some`) but expensive for users to reason about. AND-only was chosen for predictability; the `combinator` field in the schema makes OR a non-breaking addition later.

**Hidden field values are retained, stripped at output.** Clearing values on hide destroys user work when visibility changes transiently (e.g. flip a toggle, flip it back — data should survive). Values are stripped at submit time and excluded from PDF output.

**Cycle detection is scoped to `show`/`hide` only.** `require`/`unrequire` conditions evaluate against raw fill values and cannot create feedback loops — flagging them as cycles would be confusing and wrong. The DFS only follows `show`/`hide` edges.

### State Management — Four Layers, None Mixed

| Layer | Where | Persisted? | Examples |
|---|---|---|---|
| Domain state | Redux `templatesSlice` + `instancesSlice` | localStorage | Form schemas, submitted instances |
| UI state | Redux `uiSlice` | Memory only | Selected field, panel open/closed |
| Fill runtime | Redux `fillSlice` | Memory only | Values being typed in fill mode |
| Derived state | Redux `createSelector` | Computed fresh | Visibility map, required map, calculated values |

`BuilderPage` additionally holds `fields` in local `useState` (the live editing state) and syncs to Redux after a 500ms debounce. Redux is the persistence target, not the source of truth during editing.

**Why local state at all?** Redux uses `useSyncExternalStore` internally, which triggers a synchronous re-render immediately when `dispatch` is called — before React has batched other state updates in the same call. If `selectedFieldId` lived in Redux, dispatching `updateForm(withNewField)` would cause `ConfigPanel` to render with the new `selectedFieldId` before `fields` had updated, showing stale or empty config. Moving `selectedFieldId` to local `useState` puts both updates in the same React batch, eliminating the timing gap.

### PDF Export — Hidden iframe

`exportPDF()` creates a hidden `<iframe>`, writes a complete HTML document into it (with embedded `@media print` CSS), calls `contentWindow.print()`, then removes the iframe. No third-party libraries.

The alternative — canvas capture — produces a rasterized image: text is not selectable, not searchable, and resolution-dependent. The browser print engine is the only browser-native path that produces real, selectable text output.

**`fieldSnapshot` on `InstanceRecord`:** At submission time, a copy of the current field definitions is stored alongside the response. If the template is later edited (fields renamed, removed, reordered), re-downloading an old PDF uses the fields as they were at submission time, not the current template state.

### TypeScript — Discriminated Unions and Mapped Registry

`Field` and `Condition` are both discriminated unions — each variant is its own type, narrowed automatically inside `switch` blocks. `switch (field.type) { case 'number': ... }` gives access to `field.config.decimalPlaces` with no casts.

The registry is typed as a mapped type (`{ [K in KnownFieldType]: FieldDefinition }`), enforced with `satisfies`. Adding a new `Field` variant without adding a registry entry is a compile error.

---

## What I Would Improve With More Time

### Correctness

- **Cascading visibility** — the pure evaluator is single-pass; if Field A hides Field B and Field C conditions on Field B's value, C doesn't re-evaluate when B becomes hidden. A multi-pass evaluator (run until stable) or a reactive dependency graph would fix this. Documented as the production-scale answer.
- **OR combinators** — the schema is ready (`combinator: 'and'`); the evaluator change is one line (`every` → `some`). The missing piece is UI to configure it.
- **Fill values lost on refresh** — fill state lives in Redux memory only. Refreshing mid-fill restarts the form. Persisting to `sessionStorage` would fix this.
- **Corrupted localStorage recovery** — `JSON.parse` failure returns `[]` but malformed field shapes inside a valid array are not caught. Replacing raw JSON with Zod schemas (deriving TypeScript types from Zod) would give both runtime validation and type safety from a single source.
- **Schema versioning and migrations** — no version field on stored records. Changing the data shape today would silently break existing data. A `schemaVersion` key and a migration runner are the standard answer; out of scope here but documented as the next infrastructure addition.

### Architecture

- **Field-level unit tests** — `evaluateForm`, `getCyclePath`, `buildPrintHTML`, and all field config panels are pure or near-pure. No test suite exists; the architecture is designed to support one.
- **`createSelector` in fill mode** — `evaluateForm` runs on every keystroke; memoising with `createSelector` would skip recomputation when unrelated fill values change.
- **Dynamic field registration** — `registerField()` as the extension point if external teams need to ship field packages as independent modules.
- **Schema-driven config panels** — once the `ConditionEditor` is extracted as a shared component (so it no longer needs to be embedded directly in each field's panel), the remaining config controls are simple enough for a JSON schema renderer. This would reduce boilerplate per field significantly.

### PDF

- **Page numbers** — achievable with a CSS `@counter` rule inside `@media print`; not included.
- **Submission timestamp on re-downloads** — currently the PDF shows the original submission time. A "generated at" timestamp would distinguish a re-download from the original export.
- **App branding** — a header section in the print HTML with a logo or app name.

### UX

- **Accessibility** — ARIA roles, keyboard navigation, focus management, and WCAG colour contrast are all unaddressed. Required before any real-user deployment.
- **Mobile support** — the three-panel builder layout requires ~1100px minimum; it collapses badly below that.
- **Undo/redo** — Redux's immutable state makes this achievable (snapshot on each action), but it was out of scope.
- **Form versioning** — currently, editing a template changes it for all future responses. `fieldSnapshot` on `InstanceRecord` already protects existing submissions' PDFs, but the form itself has no version history. Formal versioning would let users see what changed between two versions of a template.
