# Form Builder — Implementation Tracker

Tracks parked items, deviations from decisions.md, and pending work.
Updated as the session progresses.

---

## Parked UX Issues (found during testing, will fix in order)

| # | Area | Issue | Priority | Status |
|---|---|---|---|---|
| P1 | Canvas | No drop position indicator when dragging from palette — user can't see where field will insert | High | ✅ Fixed — violet insertion line appears between cards |
| P2 | Canvas | Drag overlay for canvas reorder shows a blank placeholder — doesn't show field label or type | Medium | ✅ Fixed — overlay now renders actual BuilderPreview for the dragged field |

---

## Architecture Deviations from decisions.md

| Decision | What it says | What's implemented | Status |
|---|---|---|---|
| Q4 | `selectedFieldId` in `uiSlice` | Moved to local `useState` in `BuilderPage` to fix `useSyncExternalStore` race condition. Spirit (ephemeral, never persisted) maintained. `uiSlice` cleaned up. | Intentional deviation — documented |
| Q16 | Registry typed as mapped type `{ [K in Field['type']]: FieldDefinition<...> }` | Uses `Record<string, FieldDefinition>` — no compile-time enforcement of complete registry | Fix when all field types done (now is the time) |
| Q23 | localStorage key `formbuilder_templates` | Was `formbuilder_forms` — **fixed** ✅ | Fixed |
| Q23 | `templateId` on `InstanceRecord` | Uses `formId` — consistent with the rest of the codebase which uses "form" not "template" | Minor naming — leave as is |

---

## Not Yet Implemented (parked, expected)

### Features
- [x] **PDF export** (Q19/Q20) — `exportPDF(formTitle, instance)` in `src/utils/pdfExport.ts`; hidden iframe + `contentWindow.print()`; section headers as headings; hidden fields omitted; Download PDF button on FillPage success screen and ResponsesPage
- [x] **Pre-seeded Job Application template** (Q27/Q28) — `src/utils/seedTemplates.ts`; seeded before store init in `store/index.ts`; `formbuilder_seeded` flag prevents re-seed; covers all field types + conditional Daily Rate field
- [x] **Filled instances list** — `/forms/:formId/responses` route; response count on FormCard is a clickable link; shows all instances newest-first with timestamp + Download PDF per row
- [x] **Registry mapped type** (Q16) — `{ [K in KnownFieldType]: FieldDefinition }` via `satisfies`; adding a new Field variant without registering it is now a compile error
- [x] **Condition discriminated union** (Q15) — `Condition` is now a discriminated union on `targetFieldType`; `operator` and `value` are narrowed per variant; `evaluateCondition` switched to `targetFieldType` branches

---

## Completed

- [x] Home screen — create, delete (with confirmation), form cards with field + response count
- [x] Builder layout — three-panel (palette / canvas / config), full-height canvas
- [x] Canvas — drag from palette, reorder via drag, up/down buttons, delete
- [x] Config panel — all field types implemented
- [x] selectedFieldId sync bug — multiple fields maintain independent config state
- [x] Auto-save — 500ms debounce, writes directly to `formbuilder_templates`
- [x] Fill mode — renders all field types, validates required/constraints, submits
- [x] Instance model — `InstanceRecord` with `fieldSnapshot`, multiple submissions per form
- [x] localStorage keys aligned with decisions.md — `formbuilder_templates`, `formbuilder_instances`
- [x] `uiSlice` cleaned up — dead `selectedFieldId` removed, ready for future UI state
- [x] P1 — Drop position insertion line (violet line shows where palette field will insert)
- [x] P2 — Canvas drag overlay now renders actual `BuilderPreview` for the dragged field
- [x] Hardcoding audit — `defaultConfig` now prefers registry, `FIELD_TYPE_LABELS` removed, FieldPalette labels derived from registry
- [x] Field duplication logic extracted to `src/utils/fieldUtils.ts` — pure, reusable, testable

### Field Types (all registered)
- [x] `singleText` — Single Line Text (label, placeholder, required, min/max length, prefix/suffix)
- [x] `multiText` — Multi-line Text (label, placeholder, required, rows, min/max length)
- [x] `number` — Number (label, required, decimal places, prefix/suffix, min/max)
- [x] `date` — Date (label, required, pre-fill today, min/max date)
- [x] `singleSelect` — Single Select (label, required, options, display: radio/dropdown/tiles)
- [x] `multiSelect` — Multi Select (label, required, options, display: checkboxes/tiles, min/max selections)
- [x] `sectionHeader` — Section Header (heading, description, size: small/medium/large, bottom border)
- [x] `fileUpload` — File Upload (label, required, max files, max size MB, allowed types)
- [x] `calculation` — Calculation (label, source number fields, aggregation: sum/avg/min/max, decimal places; hidden in fill if no source fields; excludes hidden source fields at submit)

### Conditional Logic (Q6–Q13)
- [x] Schema — `defaultVisibility: 'visible' | 'hidden'` and `combinator: 'and'` on all Field types (Q7)
- [x] Pure function evaluator — `evaluateForm(fields, fillValues)` → `{ visibilityMap, requiredMap }` (Q6, Q10)
- [x] Evaluation order — visibility → required (Q10)
- [x] Hidden field handling — retain value in Redux, strip at submit and PDF (Q8)
- [x] Effective required — hidden fields never required; condition effects override base config (Q13)
- [x] AND combinator — all conditions must be true for effects to fire (Q7)
- [x] Self-condition prevention — field excluded from its own target dropdown (Q11)
- [x] Cycle detection — inline warning on ConditionRow when cycle detected (Q11)
- [x] Deleted source field warning — `window.confirm` with affected condition list, atomic cleanup (Q12)
- [x] Operators by field type — text: equals/does not equal/contains; number: equals/gt/lt/within range; date: equals/before/after; singleSelect: equals/does not equal; multiSelect: contains any/all/none of (Q15)
- [x] Value input adapts to target field type and operator (range → two inputs, singleSelect → dropdown, multiSelect → checkboxes, date → date picker)

### Known Limitations (documented, intentional)
- Chained visibility does not cascade — pure function uses raw fill values; if A hides B and C depends on B's value, C stays visible (Q6 semantic gap, dependency graph deferred)
- `combinator: 'or'` not yet supported in UI (schema ready, type is `'and'` literal — widening is a non-breaking change per Q7)
- Nested condition groups not supported (flat `Condition[]` only — tree model deferred per Q7)

---

## Intentionally Out of Scope — Frontend Quality

These are deliberate exclusions, not oversights. The focus was on correctness of data model, state architecture, and feature completeness. None of these would change the architectural decisions but all would be required before shipping to production.

### Rendering Performance
| What | Why not done |
|---|---|
| `useMemo` on derived values (e.g. `selectedField`, filtered lists) | Forms are small (10–50 fields) — recompute cost is sub-millisecond, memoisation adds noise |
| `useCallback` on handler functions passed as props | No evidence of unnecessary re-renders; premature without profiling |
| `React.memo` on `SortableFieldCard`, `FormCard`, field renderers | Same — optimise after measuring, not before |
| Virtualised list for canvas fields | Not needed at typical form scale; relevant at 200+ fields |
| `createSelector` memoisation in fill mode | `evaluateForm` is a pure function called on every keystroke — acceptable at this scale |

### Accessibility
| What | Why not done |
|---|---|
| ARIA roles and labels on custom controls (toggle, tile selector, drag handles) | Out of scope for assignment; required for production |
| Focus management after add/delete field | Field is selected but focus is not moved to config panel |
| Keyboard trap in modals (cycle detection popup, delete confirmation) | Tab can escape the modal |
| Screen reader announcements for dynamic content (field added, condition removed) | No `aria-live` regions implemented |
| Colour contrast audit | Tailwind defaults used — not verified against WCAG AA |

### Mobile / Responsive
| What | Why not done |
|---|---|
| Builder on small screens | Three-panel layout requires ~1100px minimum; collapses badly below that |
| Touch drag-and-drop | `@dnd-kit` supports it but not tested on touch devices |
| Fill mode on mobile | Likely usable but not tested or optimised |

### Keyboard Navigation
| What | Why not done |
|---|---|
| Keyboard shortcut to add fields | Not in spec |
| Arrow keys to navigate between fields on canvas | Up/down buttons are the fallback — keyboard equivalent not wired |
| `Escape` to deselect field / close panels | Not implemented |

### Error Boundaries
| What | Why not done |
|---|---|
| React error boundaries around canvas, config panel, fill renderer | A crash in one field's renderer would crash the entire page |
| Graceful handling of corrupted localStorage data | `JSON.parse` failure returns `[]` but malformed field shapes are not caught |

### Other
| What | Why not done |
|---|---|
| Loading states / skeleton screens | All data is local — loads instantly; not needed |
| Animations and transitions | Not an evaluation criterion |
| Unit / integration tests | Architecture is designed to be testable (pure functions, isolated components) but no test suite written |
| i18n / localisation | English only |
