# AI Usage Log

This document covers every significant AI interaction during the development of this project,
what was verified before using the output, what was rejected or changed, and where the AI
produced something plausible but incorrect.

All architectural decisions referenced here are documented in full in
`decisions.md`. The implementation tracker (what was built, what
deviations were made, what was left out) lives in `TRACKER.md`.

---

## 1. Architecture Planning — Before Writing Any Code

**What I asked:**
Walked through the full spec with the AI and asked it to think through every significant
design decision before writing a single line of code. This produced the decisions log
(`decisions.md`) covering 44 questions across field registry design, state management,
conditional logic, TypeScript typing, PDF export, localStorage schema, drag-and-drop,
and UX flows.

**Key decisions made in this phase:**

- **Field registry as a static map** (Q1) — AI proposed both static map and dynamic
  `registerField()`. Chose static map — no plugin loader, no external consumers,
  no benefit to dynamic registration in a closed app. Dynamic registration documented
  as the natural extension path.

- **Component-per-field config panels** (Q2) — AI initially leaned toward schema-driven
  config rendering. Rejected because the condition editor (present on every config panel)
  needs all other fields in the form — data a generic schema renderer cannot access without
  leaking application domain knowledge into the renderer.

- **Redux Toolkit for state** (Q3/Q4) — AI considered Zustand (simpler), Context+useReducer
  (no deps), MobX (reactive). Redux chosen for familiarity and `createSelector` for derived state.

- **Pure function evaluator over dependency graph** (Q6) — AI laid out both options honestly.
  Pure function chosen because at 10–50 fields it runs in under 1ms per keystroke.
  The known limitation (chained visibility doesn't cascade) was documented explicitly.

- **AND only for condition combinator** (Q7) — AI correctly identified that OR is trivially
  cheap to evaluate (`every` → `some`) but expensive for users to reason about. AND only
  with `combinator` field in schema for future OR.

- **Retain hidden field values, strip at output** (Q8) — AI proposed this. Clearing on hide
  was considered and rejected — it destroys user work on transient visibility changes.

- **Hidden iframe + `contentWindow.print()` for PDF** (Q19) — AI correctly identified that
  canvas capture produces rasterized images (text not selectable, not searchable). Browser
  print engine chosen as the only browser-native approach that produces real text output.

- **`fieldSnapshot` on InstanceRecord** (Q23/Q24) — AI flagged this as the detail most
  candidates miss. If the template is edited after submission, re-downloading a PDF must
  use the fields as they were at submission time, not the current template.

- **`crypto.randomUUID()` for all IDs** (Q18) — AI correctly pointed out that index-based
  IDs silently break when fields are reordered. UUIDs are stable regardless of position.

**What I verified:**
Every decision was reviewed against the spec before being locked. Decisions where the spec
was silent (AND/OR, hidden value retention, PDF mechanism) were cross-checked against
how production form builders (Google Forms, Typeform, Jotform) handle the same cases.

---

## 2. TypeScript Type Design — Discriminated Unions and Registry

**What I asked:**
Asked the AI to design the TypeScript type system for fields and conditions, with the
constraint that impossible states should be unrepresentable and switch narrowing should
work without casts.

**Key outputs used:**

- **Discriminated union for `Field`** — each field type is its own TypeScript type with
  `type` as the literal discriminant. TypeScript narrows automatically inside switch cases.
  A generic `BaseField<TConfig>` was considered and rejected — switch narrowing does not
  work with generic type parameters; `field.config` stays `unknown` inside the case block.

- **Discriminated union for `Condition`** — discriminated on `targetFieldType`, not `operator`.
  Each variant has narrowed `operator` and `value` types. The `is within range` operator
  uses a `[number, number]` tuple for its value — keeping the `value` key consistent across
  all NumberCondition operators.

- **`PendingCondition`** — AI introduced this variant (`targetFieldType: ''`) to represent
  a freshly added blank condition row before the user picks a target field. Without it,
  the union couldn't represent an incomplete condition without breaking type safety elsewhere.

- **Registry mapped type with `satisfies`** (Q16) — AI proposed using `satisfies FieldRegistryMap`
  to get compile-time enforcement that every known field type has a registry entry, while
  retaining type inference. Adding a new `Field` variant without registering it is a
  compile error.

**What I changed:**
The initial `Condition` union did not include `PendingCondition`. After implementation,
the condition editor needed to represent blank rows before a target is selected.
The AI's original design didn't account for this UI state — I added `PendingCondition`
as a sixth variant after identifying the gap during implementation.

---

## 3. Conditional Logic Implementation

**What I asked:**
Asked the AI to implement `evaluateForm` as a pure function, `getCyclePath` as a DFS
cycle detector, and the `ConditionEditor` component.

**Key outputs used:**

- **`evaluateForm`** — pure function taking `(fields, fillValues)` and returning
  `{ visibilityMap, requiredMap }`. Fixed evaluation order: visibility first, required
  second, calculations third.

- **`getCyclePath` DFS** — returns the full cycle path as an array of field IDs (not just
  a boolean) so the UI can display the loop chain in the warning modal.

**What the AI got wrong (plausible but incorrect):**

The initial `getCyclePath` implementation traversed **all** conditions regardless of effect.
This was plausible — a cycle is a cycle — but incorrect for this application.

`require` and `unrequire` effects do not create feedback loops. Conditions evaluate against
raw fill values, not derived states. Only `show`/`hide` conditions can create a real
feedback loop where Field A's visibility depends on Field B's value, and Field B's
visibility depends on Field A's value.

Flagging a `require`/`unrequire` condition as a cycle was confusing and wrong — if Field A
marks Field B required when Field A equals "yes", and Field B marks Field A required when
Field B equals "yes", that is not a loop. Both conditions evaluate independently against
raw values.

**Fix applied:** `getCyclePath` DFS was updated to skip conditions where
`effect !== 'show' && effect !== 'hide'`. Verified by manually constructing
require/unrequire condition chains and confirming no false cycle warnings appeared.

---

## 4. Config Panel Race Condition — `useSyncExternalStore`

**What I asked:**
Multiple fields were sharing config state — selecting Field 2 would show Field 1's config.
Asked the AI to diagnose and fix.

**What the AI identified:**
`selectedFieldId` lived in Redux (`uiSlice`). Redux uses `useSyncExternalStore` internally,
which triggers a synchronous re-render immediately when `dispatch` is called — before React
has batched other state updates in the same function call.

When a field was added:
```ts
dispatch(updateForm(withNewField))    // immediate synchronous re-render
setSelectedFieldId(newField.id)       // not yet applied during that render
```

During the re-render, `selectedFieldId` was still `null`. `ConfigPanel` received `null`
and showed an empty panel for one frame, then showed stale data.

**Fix applied:**
`selectedFieldId` moved from Redux `uiSlice` to local `useState` in `BuilderPage`.
Both `fields` and `selectedFieldId` then live in React's state — updates are batched
and flushed together in one render. No cross-store timing issue.

**What I verified:**
Added two Single Line Text fields rapidly, switched between them, and confirmed each
showed its own independent config state. The `uiSlice` was cleaned up to remove the
dead `selectedFieldId` field.

---

## 5. PDF Export Implementation

**What I asked:**
Implement PDF export using browser-native APIs only. Hidden iframe approach was
already decided (Q19). Asked the AI to implement `buildPrintHTML` and `exportPDF`.

**Key outputs used:**
- Hidden `<iframe>` created, form HTML injected, `contentWindow.print()` called,
  iframe removed after 1 second
- `buildPrintHTML` produces a complete HTML document with embedded `@media print` CSS
- Section headers render as structural headings with bottom divider, not as label/value pairs
- Hidden fields are absent from the HTML entirely — not blank, not present
- File upload fields show "Attached: filename (size)" inline
- Calculation fields show the computed value at export time

**What I verified:**
Submitted a Job Application response with the conditional "Daily Rate" field hidden,
then downloaded the PDF. Confirmed the Daily Rate field did not appear in the PDF output.
Confirmed section headers rendered as headings, not as regular field rows.

---

## 6. Pre-seeded Job Application Template

**What I asked:**
Implement the Job Application template covering all field types and the conditional
"Daily Rate" field (shown only when Employment Type equals "Contract").

**Key decision the AI flagged:**
`seedIfNeeded()` must be called **before** `configureStore()` in `store/index.ts`.
The `templatesSlice` calls `loadFromStorage()` during `createSlice` initialization —
at module load time, not on component mount. If seeding runs after the store is created,
the seeded data is not picked up until the next refresh.

**What I verified:**
Cleared `localStorage` completely, refreshed the page, confirmed the Job Application
template appeared immediately on the home screen without a second refresh.

---

## 7. Registry Mapped Type Tightening (Q16)

**What I asked:**
The registry was initially typed as `Record<string, FieldDefinition>`. Asked the AI
to tighten it to a mapped type so adding a new field type without registering it
becomes a compile error.

**Output used:**
```ts
type KnownFieldType = Exclude<Field, UnknownField>['type']
type FieldRegistryMap = { [K in KnownFieldType]: FieldDefinition }

export const fieldRegistry = ({
  singleText: singleTextDefinition as FieldDefinition,
  // ...
} satisfies FieldRegistryMap) as FieldRegistryMap & Record<string, FieldDefinition | undefined>
```

The `satisfies` operator checks completeness at compile time without widening the inferred
type. The outer cast adds string-index access (`FieldDefinition | undefined`) for call sites
that look up by a runtime `field.type` string.

**What I verified:**
Temporarily removed one registry entry, confirmed TypeScript reported a compile error.
Restored the entry, confirmed the build passed clean.

---

## 8. Build Errors After TypeScript Tightening

**What I asked:**
After tightening the `Condition` discriminated union, the production build (`npm run build`)
reported type errors in `ConditionEditor.tsx` that `tsc --noEmit` had not caught.

**What the AI identified:**
Three distinct issues:
1. Unused `ConditionEditor` import in `BuilderPage.tsx` (caught only by build, not `noEmit`)
2. `handleTargetChange` and `handleOperatorChange` passing `string`/`unknown` where the
   discriminated union expected narrow types — needed `as Partial<Condition>` casts
3. `{ ...c, ...partial }` spread loses the discriminant relationship — TypeScript cannot
   verify the merged object is a valid `Condition` variant — needed `as Condition` cast

**What I verified:**
Ran `npm run build` after each fix. Final build: 0 errors, 65 modules transformed.

---

## 9. Spec Gap Analysis — Missing Field Features

**What I asked:**
After the main implementation was complete, asked the AI to compare the spec against the
implementation and identify any gaps.

**What the AI missed (found during this review):**

Two spec requirements had not been implemented:

1. **Section Header XS and XL sizes** — the spec lists five sizes: XS, Small, Medium, Large, XL.
   The implementation only had Small, Medium, Large. XS and XL were not in the `SIZES` array
   or the `sizeClsMap`.

2. **Options reorder in Single Select and Multi Select** — the spec says the options list must
   support "add, remove, reorder." Reorder (up/down) was missing from the `OptionsEditor`
   component in both field types. Only add and remove were implemented.

**Fix applied:**
- Added `xs` and `xl` entries to the `SIZES` array and `sizeClsMap` in `sectionHeader.tsx`
- Added `moveUp(i)` and `moveDown(i)` functions to `OptionsEditor` in both `singleSelect.tsx`
  and `multiSelect.tsx`, with up/down chevron buttons disabled at the list boundaries

**What this shows:**
The AI built a working implementation but did not cross-check every config property against
the spec during initial development. The spec comparison pass was necessary to catch these
omissions. Both fixes were minor once identified.

---

## 10. Dead Code Audit — `wouldCreateCycle`

**What I asked:**
While reviewing `conditionEvaluator.ts`, noticed a function `wouldCreateCycle` that was
exported but seemed unused. Asked the AI to check whether it was actually used anywhere.

**What the AI found:**
`wouldCreateCycle` was exported from `conditionEvaluator.ts` but had zero imports anywhere
in the codebase. It was dead code — likely generated as a companion to `getCyclePath` during
an earlier implementation pass and never wired up. The live cycle detection used `getCyclePath`
directly at the call site.

**Action taken:**
`wouldCreateCycle` was deleted from `conditionEvaluator.ts`. TypeScript build confirmed clean
after removal — no import had been relying on it.

**What this shows:**
AI-generated implementations can produce plausible helper functions that seem useful but are
never actually called. A grep audit of exported symbols against their import sites is a useful
verification step after any significant AI-generated module.

---

## Summary of AI Output Quality

| Area | AI Output Quality | Action Taken |
|---|---|---|
| Architecture planning | Accurate, well-reasoned trade-offs | Used with minor adjustments |
| TypeScript type design | Accurate | Used; added `PendingCondition` after implementation gap found |
| Cycle detection logic | **Plausible but incorrect** — traversed all effects | Fixed to skip `require`/`unrequire` conditions |
| Redux race condition diagnosis | Accurate | Used as-is |
| PDF export | Accurate | Used with layout adjustments |
| Seed timing | Accurate — flagged the before/after store timing issue | Used as-is |
| Registry mapped type | Accurate | Used as-is |
| Build error diagnosis | Accurate | Used as-is |
| Spec gap analysis | **Incomplete** — missed XS/XL sizes and options reorder | Both gaps identified and fixed after explicit spec comparison |
| Dead code (`wouldCreateCycle`) | **Unnecessary output** — exported but never imported | Deleted after grep confirmed zero usages |
