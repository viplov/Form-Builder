# Form Builder — Architectural Decisions Log

This document records every significant architectural decision made during scoping,
including the options considered, trade-offs discussed, and the reasoning behind the final call.
Intended for the README and AI usage log.

---

## Q1 — Field Registry: Static Map vs Dynamic Registration

### Options Considered

**Static map** — each field type is imported and keyed in a single `fieldRegistry.ts` file.
```ts
export const fieldRegistry: Record<FieldType, FieldDefinition> = {
  singleText: singleTextDefinition,
  number: numberDefinition,
  // ...
}
```

**Dynamic registration** — a `registerField(def)` function, each field self-registers on import.
```ts
const registry = new Map<FieldType, FieldDefinition>()
export const registerField = (def: FieldDefinition) => registry.set(def.type, def)
```

### Decision: Static Map

### Reasoning
Dynamic registration adds a layer of indirection with no real payoff for this scope.
There is no plugin loader, no external consumer, and no lazy loading requirement.
The static map still fully satisfies the "add an 11th field without editing 6 files" constraint:
- 1 new file (the field definition)
- 1 line added to `fieldRegistry.ts`

That is the entire change surface. Adding a `registerField()` abstraction on top of this
buys nothing in a closed application.

### Future Extension
`registerField()` is the natural next step if external teams need to ship field packages
as independent modules. Document in README as a clear evolution path.

---

## Q2 — Config Panel: Component-per-field vs Schema-driven

### Options Considered

**Schema-driven** — each field type declares a config schema (array of control descriptors).
A single generic `<SchemaRenderer>` reads the schema and renders the appropriate controls
from a `schemaControlMap`.

```ts
configSchema: [
  { key: 'label',    type: 'text',    required: true },
  { key: 'required', type: 'toggle'                  },
  { key: 'options',  type: 'options-list'            },
]
```

**Component-per-field** — each field type owns its config UI as a React component.
The component lives in the same file as the field definition and is referenced in the registry.

```ts
export const singleSelectDefinition: FieldDefinition = {
  // ...
  ConfigPanel: SingleSelectConfigPanel,
}
```

### Why Schema-driven Was Considered Seriously
A richer `schemaControlMap` (with `options-list`, `segmented-control`, `size-selector` types)
handles most field configs declaratively without needing `type: 'custom'` escape hatches.
This approach is more inspectable and consistent across panels.

### Why Schema-driven Was Rejected
The conditional logic editor — present in every field's config panel — requires data
from outside the field's own config: specifically, all other fields in the current template
(to populate the target field dropdown).

A generic schema renderer has no access to this. The two ways to fix it both introduce leaks:

1. **Context prop on the renderer** — `<SchemaRenderer context={{ allTemplateFields }} />`.
   The renderer now understands the application domain. Every new control needing external
   data adds another context property. The renderer is no longer generic.

2. **Data baked into the schema** — `buildConfigSchema(template.fields)` called each render.
   The schema is no longer a static data object on the field type — it is a function of
   runtime state, requiring template data to be piped into the registry.

Both options couple the schema renderer to the application domain, defeating the purpose.

### Decision: Component-per-field

### Reasoning
A React component has natural access to stores, context, and props. The conditional logic
editor can read `template.fields` directly from the store with no indirection.

The "11th field" constraint is still fully satisfied: the `ConfigPanel` component lives
inside the field's own definition file, not in a shared file that would require editing.

Consistency across panels is achieved by sharing primitive config components
(`<ConfigToggle />`, `<ConfigTextInput />`, `<ConfigNumberInput />`) — not a schema renderer.

### Future Extension
Schema-driven config is the right evolution path once conditional logic UI is extracted
into a shared `<ConditionEditor>` component that handles its own context needs.
At that point, remaining config controls (label, required, min/max, prefix/suffix)
are simple enough for a schema renderer with no context leaks.

---

## Q3 — State Management: Library Choice

### Context: Four Distinct Layers of State

Before choosing a library, it's important to separate what kinds of state exist:

| Layer | Contents | Persisted? |
|---|---|---|
| Domain state | Templates, field schemas, conditions, submitted instances | Yes — localStorage |
| UI state | Selected field ID, panel open/closed, drag hover state | No — memory only |
| Derived runtime state | Visibility map, required map, calculated values, validation errors | No — computed fresh |
| Fill runtime state | User-entered values in a live fill session | Draft optional |

**Derived runtime state explained:**
- **Visibility map** — `{ [fieldId]: boolean }` — is each field currently visible or hidden, computed by evaluating all conditions against current fill values
- **Effective required map** — `{ [fieldId]: boolean }` — is each field currently required, combining base config + active "mark as required" conditions
- **Calculated values** — `{ [fieldId]: number }` — live computed results for Calculation fields (sum/avg/min/max of source fields as user types)

These are never stored. They are computed fresh on every value change from `(currentFillValues, template)`.

### localStorage vs In-Memory

Load once into the store on app start, work entirely in memory, sync back to localStorage on changes. Components never call `localStorage.getItem` directly.

```
App starts → read localStorage once → load into Redux store (in-memory)
User makes changes → update store → subscriber syncs to localStorage (debounced)
Page refresh → read localStorage again → back in memory
```

localStorage is the persistence layer. The Redux store is the working memory.

### Options Considered

| Library | Pro | Con |
|---|---|---|
| **Redux Toolkit** | Clear action semantics, immer built-in, devtools, familiar to the team, state shape is documentation | More boilerplate than Zustand |
| **Zustand** | Minimal ceremony, selector pattern built-in, no Provider needed | Less familiar, collapses actions/reducers/state into one |
| **Context + useReducer** | Zero dependencies | Requires rebuilding selector memoization manually; re-renders entire canvas on any config change |
| **MobX** | Reactive computed values fit Calculation fields naturally | Class-based model, out of step with modern React |

### Decision: Redux Toolkit

### Reasoning
The user is already familiar with Redux Toolkit and uses it in existing projects.
Familiarity matters — knowing the patterns reduces mistakes.
RTK's explicit action semantics and `createSelector` memoization are well-suited
to normalized domain state with clear update boundaries.

Derived state (visibility map, required map, calculated values) implemented as
`createSelector` selectors — computed from template slice + fill values, memoized automatically.

### Suggested Slice Structure
```
store/
  templatesSlice.ts    // template schemas, fields, conditions
  instancesSlice.ts    // submitted fill instances
  uiSlice.ts           // selected field ID, panel state, drag state
  fillSlice.ts         // current fill session values (in-progress)
```

### Future Extension
Zustand remains a simpler alternative if the RTK boilerplate becomes a burden.
Migration is straightforward since the state shape and selector logic stay the same.

---

## Q4 — State Management: UI State vs Domain State Separation

### Decision: UI State is Ephemeral — Never Persisted

UI state (selected field, panel open/closed, drag state) lives exclusively in Redux
`uiSlice` and is never written to localStorage. On every page refresh it resets to
a neutral state — no field selected, no panel open.

### Reasoning
Persisting UI state creates a class of bugs where stale pointers survive refresh:
a `selectedFieldId` that references a field the user subsequently deleted, a panel
marked open for a template that no longer exists. Keeping UI state ephemeral
eliminates this entirely.

Users do not expect the builder to remember which field they had selected.
They do expect their template content to be there — that is handled by domain state persistence.

### uiSlice Shape
```ts
{
  selectedFieldId: string | null,  // which field is selected in builder
  previewModalOpen: boolean,       // is preview modal open
  dragActiveId: string | null,     // which field is currently being dragged
}
```

---

## Q5 — State Management: localStorage Persistence Strategy

### The Question
When does builder state get written to localStorage, and what is the persistence
model for fill mode?

### Initial Consideration (Rejected)
A two-tier model was considered:
- **Draft key** (`draft_${templateId}`) — auto-saved on every change
- **Main template record** — written only on explicit Save button click
- On refresh: load draft, show "unsaved changes" banner

**Rejected because:** auto-save and commit become redundant. If auto-save exists,
the Save button adds nothing meaningful. Maintaining two versions of the same
template in localStorage adds complexity with no real benefit.

### Decision: Auto-save Directly to Main Record + Debouncer

**Builder persistence:**
```
User edits any field config or adds/removes a field
    → Redux store updates immediately (in-memory, instant)
    → debounced auto-save fires after 500ms of inactivity
    → writes directly to main template record in localStorage
    → no draft key, no separate commit step
```

On page refresh the user simply continues where they left off.
No "unsaved changes" banner, no draft vs committed distinction.
The template in localStorage is always the latest state.

The Save button (required by spec) is kept as an explicit UI affordance — it triggers
an immediate save. Auto-save handles it anyway within 500ms. This is documented
as intentional: **Save button = force immediate sync; auto-save = crash protection.**

**Why 500ms debounce:**
Typing in a label field would otherwise fire a localStorage write on every keystroke.
500ms means the write fires once the user pauses, not on every character.
Fast enough to be invisible, slow enough to batch rapid changes.

**Fill mode persistence:**
Fill values live entirely in Redux `fillSlice` (memory only) during an active fill session.
No auto-save, no draft, no localStorage writes mid-fill.
If the user refreshes mid-fill, they start over — documented as a known limitation,
acceptable for assignment scope.

Submit button is the "API call equivalent" — it validates, then writes the completed
instance to `localStorage: instances`.

### Final Persistence Model

| Data | Location | When Written | When Cleared |
|---|---|---|---|
| Template schema | `localStorage: templates` | Auto-save on builder change (debounced 500ms) | On template delete |
| Working copy | Redux `templatesSlice` (memory) | On template open | On navigate away |
| Fill values | Redux `fillSlice` (memory) | As user types | On Submit or navigate away |
| Submitted instances | `localStorage: instances` | On Submit only | On instance delete |
| UI state | Redux `uiSlice` (memory) | On UI interactions | On every page refresh |

---

## Q6 — What Triggers Recalculation of Derived State

### Context: What Is Derived State
Three values are computed fresh from `(template, fillValues)` — never stored:
- **Visibility map** `{ [fieldId]: boolean }` — is each field currently visible?
- **Effective required map** `{ [fieldId]: boolean }` — is each field currently required?
- **Calculated values** `{ [fieldId]: number }` — live results for Calculation fields

### Two Approaches Considered

**Dependency graph + effective values:**
Builds a directed graph of which fields depend on which. Evaluates in topological order.
A hidden field's effective value is treated as `null`, so downstream conditions cascade correctly.

Example of correct cascading:
```
Field A = "free" → Field B hides → Field B effective value = null
                                  → Field C (depends on B = "annual") hides correctly
```

Cycles in conditions require explicit detection (topological sort fails on cycles).

**Pure function + raw fill values:**
```ts
const evaluateForm = (
  template: Template,
  fillValues: Record<string, unknown>
): DerivedFormState => ({
  visibilityMap:    computeVisibility(template, fillValues),
  requiredMap:      computeRequired(template, fillValues),
  calculatedValues: computeCalculations(template, fillValues),
})
```
Single pass over all fields using raw fill values (what the user typed).
No ordering dependency. Cycle-safe — always terminates in one pass.

### Known Semantic Gap with Pure Function
Chained visibility does not cascade correctly:
```
A = "free" → B hides, but B's raw fill value is still "annual"
           → C (depends on B = "annual") stays visible incorrectly
```
C remains visible even though its parent chain (B) is hidden.
With a dependency graph this would correctly cascade to hide C.

### Decision: Pure Function

### Reasoning
At typical form sizes (10–50 fields), the pure function runs in under a millisecond
on every keystroke — the performance difference vs a graph is immeasurable.

The dependency graph is the correct production answer at scale (200+ fields, 150+
conditions) where O(all conditions) per keystroke becomes wasteful, and where
chained visibility cascading correctness is a hard requirement.

For this assignment scope, the pure function is sufficient. The semantic gap
(chained visibility not cascading) is documented as a known limitation.

### Triggering
Recalculation runs only when `fillValues` changes — i.e. when the user types
in a fill session. Template schema changes in the builder do not trigger it
(no fill values exist). UI state changes never trigger it.

Implemented as a `createSelector` in Redux — memoized automatically,
only recomputes when `template` or `fillValues` actually change.

### Cycle Handling
With pure function + raw values, conditional logic cycles (A depends on B, B depends on A)
do not cause infinite computation — the single pass always terminates.
The result may be confusing UX (both fields hidden simultaneously) but is never broken.
Builder-time cycle detection shows a warning rather than blocking the user.

Calculation cycles are prevented by spec: a Calculation field cannot source from
another Calculation field. Enforced in UI by excluding Calculation fields from
the source field dropdown.

### Future: Dependency Graph (To-Do)
A dependency graph evaluator should replace the pure function when:
- Forms regularly exceed 100 fields with complex condition chains
- Chained visibility cascading correctness becomes a hard requirement
- The app moves to server-side evaluation (collaborative editing, server validation)

The `evaluateForm` function signature stays identical — the graph is an internal
implementation swap, not an API change.

---

## Q7 — Conditional Logic: AND vs OR for Multiple Conditions

### The Question
If a field has multiple conditions, must all be true (AND) or any one (OR)?
The spec explicitly requires this decision to be documented.

### Key Clarification: AND/OR is Unrelated to Dependency Graph
These are orthogonal concerns:
- **AND/OR** — how to combine multiple conditions on a single field
- **Dependency graph** — which fields to re-evaluate when a source value changes

Adding OR does not increase evaluation complexity with the pure function approach.
It is literally `every` vs `some`:

```ts
const isVisible = field.combinator === 'and'
  ? field.conditions.every(cond => evaluateCondition(cond, fillValues))
  : field.conditions.some(cond => evaluateCondition(cond, fillValues))
```

### What OR Actually Adds
| Area | Impact |
|---|---|
| Evaluation logic | Trivial — `every` vs `some` |
| Data model | One extra field: `combinator: 'and' \| 'or'` |
| Builder UI | One toggle: "All conditions must match / Any condition must match" |
| User mental model | Harder to reason about — the real cost |

### Decision: AND Only

### Reasoning
Most form builders (Google Forms, Typeform, Jotform) default to AND.
Users mentally model multiple conditions as "all of these must be true."
OR introduces combinatorial confusion without a visual rule builder to support it.

The real cost of OR is not evaluation complexity (zero) — it is UX complexity
for the user configuring conditions.

### Data Model
`combinator` is included in the schema now at no cost, making OR a non-breaking
UI-only addition later:

```ts
type FieldConditions = {
  combinator: 'and'             // 'or' unlocked later by removing the literal type
  conditions: Condition[]
  effect: 'show' | 'hide' | 'require' | 'unrequire'
  defaultVisibility: 'visible' | 'hidden'
}
```

### Explicit Exclusions (Out of Scope)

**Nested condition groups are explicitly NOT supported.**

Example of what is not supported:
```
Show this field if:
  (name contains "John" AND age > 30)
  OR
  (plan equals "premium" AND country equals "US")
```

This requires a tree-structured condition model, not a flat list.
Evaluating it correctly requires traversing the tree — a meaningfully different
data model and UI (visual rule builder with grouping).

This is excluded because:
- The spec does not require it
- It significantly increases UI complexity (drag-to-group, nested rule blocks)
- The data model change is breaking — a flat `Condition[]` cannot represent groups
- It is beyond typical form builder scope at this level

Documented in README as an intentional exclusion with reasoning.

### Future: OR Support and Nested Groups (To-Do)
**Flat OR** — evaluation complexity is identical (one word change), unlocked by:
1. Widening the type: `combinator: 'and' | 'or'`
2. Adding a toggle in the condition editor UI: "All conditions / Any condition"
3. No changes to `evaluateCondition` logic

**Nested groups** — requires replacing `Condition[]` with a tree model,
a visual group builder in the UI, and recursive tree evaluation.
Significantly larger scope — separate work item.

---

## Q9 — Conditional Logic: Centralized Selector vs Per-Field Evaluation

### The Question
The pure function `evaluateForm` is decided (Q6). The question is where it runs —
once centrally, or independently inside each field component.

### Option A: Per-Field Evaluation
Each field component evaluates its own conditions independently:
```ts
// Inside each FillRenderer component
const isVisible = evaluateConditions(field.conditions, fillValues)
```

### Option B: Centralized createSelector (Decided in Q6, reasoning documented here)
One selector runs once per `fillValues` change, result shared across all components:
```ts
const selectDerivedFormState = createSelector(
  [selectTemplate, selectFillValues],
  (template, fillValues) => evaluateForm(template, fillValues)
)
```

### Why Per-Field Evaluation Breaks Down

**Problem 1 — Calculation fields need other fields' visibility:**
A Calculation field sums visible source Number fields. With per-field evaluation,
the Calculation field has no way to know which source fields are currently hidden
without evaluating their conditions itself — duplicating logic.

```ts
// Per-field: Calculation cannot know Tax field is hidden
// → Total incorrectly includes hidden Tax value

// Centralized: visibilityMap already computed before calculations run
const calcValue = sourceFields
  .filter(f => visibilityMap[f.id])   // ← Tax correctly excluded
  .map(f => fillValues[f.id] ?? 0)
  .reduce((sum, v) => sum + v, 0)
```

**Problem 2 — Submit validation needs the full picture:**
On submit, validating all required visible fields requires knowing every field's
visibility and required state. Per-field evaluation means the submit handler
must either reach into field components or re-evaluate all conditions itself —
evaluating twice. Centralized evaluation gives one source of truth for both.

**Problem 3 — Performance:**
```
30 fields, user types in Field 3.

Per-field:    30 separate condition evaluations across components
Centralized:  evaluateForm() runs once → only changed components re-render
```

**Problem 4 — Consistency risk:**
If Field B and Field C both have a condition on Field A, per-field evaluation
risks subtle disagreement (stale closures, timing). Centralized evaluation
means both read the same `visibilityMap[fieldA]` — impossible to disagree.

### Decision: Centralized createSelector

### Summary
| | Per-field | Centralized |
|---|---|---|
| Calculation visibility awareness | ❌ Cannot know other fields' state | ✅ visibilityMap available |
| Submit validation | ❌ Must re-evaluate or reach into components | ✅ Reads selector directly |
| Performance | ❌ N evaluations per change | ✅ 1 evaluation per change |
| Consistency | ❌ Risk of disagreement | ✅ Single source of truth |

---

## Q8 — Conditional Logic: Hidden Field Value Handling

### The Question
When a field hides due to a condition, do we immediately clear its value from
`fillValues`, or retain it silently and strip it only at output time?

### Options Considered

**Clear on hide:**
```
Field B hides → fillValues[B] deleted from Redux immediately
User re-shows B (condition changes) → B starts blank
```

**Retain and strip:**
```
Field B hides → fillValues[B] stays in Redux (memory) untouched
User re-shows B → B reappears with the value they previously typed
Submit / PDF  → hidden field values filtered out at output time only
```

### Decision: Retain and Strip

### Reasoning
Clearing on hide destroys user work. If a user fills Field B, something causes
it to hide, and then the condition changes to show it again — finding their
value gone is jarring. Retaining it feels like the app remembers their work.

The strip is applied at the two output boundaries:

```ts
// On Submit — filter out hidden fields before writing instance to localStorage
const submittedValues = Object.fromEntries(
  Object.entries(fillValues).filter(([fieldId]) => visibilityMap[fieldId])
)

// PDF serializer — same filter applied before generating output
const visibleFields = template.fields.filter(f => visibilityMap[f.id])
```

`fillValues` in Redux always holds everything the user has typed.
The visibility map is the gate — applied only at submit and PDF generation.

### Edge Case: Historical Instances
If Field B is hidden when the user submits, B's value is stripped from the
stored instance. If the template is later edited so B is always visible,
old instances correctly show no value for B — because the strip happened
at submit time, not at a later point. The instance is a clean snapshot
of what was visible and submitted.

### Validation Rule (Related)
Hidden fields must never be validated as required, even if their base config
marks them required. The effective required check always gates on visibility first:

```ts
const isEffectivelyRequired = (fieldId: string) =>
  visibilityMap[fieldId] && requiredMap[fieldId]
```

A hidden field with `required: true` in its config will never block form submission.

---

## Q10 — Conditional Logic: Condition Evaluation Order

### The Question
Inside `evaluateForm`, does the order in which visibility, required state,
and calculated values are computed matter?

### Decision: Fixed Order — Visibility → Required → Calculations → Validation

### Reasoning
Each step gates on the output of the previous step.

**Step 1 — Visibility first:**
Every subsequent step needs to know which fields are currently visible.
Nothing can run before this.

**Step 2 — Required map second:**
A hidden field must never be required, regardless of its base config or conditions.
Required map gates on visibility:
```ts
const isEffectivelyRequired = (fieldId: string) =>
  visibilityMap[fieldId] && requiredMap[fieldId]
```

**Step 3 — Calculated values third:**
Calculation fields must only include visible source fields in their computation.
Gates on visibility:
```ts
const calcValue = sourceFields
  .filter(f => visibilityMap[f.id])   // hidden source fields excluded
  .map(f => fillValues[f.id] ?? 0)
  .reduce(aggregate, 0)
```

**Step 4 — Validation last (on submit only):**
Validation gates on both visibility (hidden fields skip validation) and
required map (only required fields are validated for presence).
Runs only on submit — not on every keystroke.

### Implementation
```ts
const evaluateForm = (template: Template, fillValues: FillValues): DerivedFormState => {
  const visibilityMap    = computeVisibility(template, fillValues)    // step 1
  const requiredMap      = computeRequired(template, fillValues, visibilityMap)  // step 2
  const calculatedValues = computeCalculations(template, fillValues, visibilityMap) // step 3
  // step 4 (validation) runs separately on submit, not here
  return { visibilityMap, requiredMap, calculatedValues }
}
```

This ordering is a natural consequence of Q6 (pure function) and Q8 (retain and strip)
decisions — not an independent design choice.

---

## Q11 — Conditional Logic: Cycle Detection

### The Question
The spec prevents self-conditions (a field conditioning on itself) but does not
prevent A→B→C→A chains. Do we detect and handle these?

### Context from Q6
Cycles do not break the pure function evaluator — it always terminates in one pass
using raw fill values. Cycle detection is a UX concern, not a correctness requirement.

### Decision: Builder-time Detection with Confirmation Popup

When the user adds a condition in the config panel, run a lightweight cycle check
before committing the condition:

```ts
const wouldCreateCycle = (fromFieldId: string, toFieldId: string, template: Template): boolean => {
  // DFS: starting from toFieldId, can we reach fromFieldId?
  const visited = new Set<string>()
  const dfs = (currentId: string): boolean => {
    if (currentId === fromFieldId) return true
    if (visited.has(currentId)) return false
    visited.add(currentId)
    return getDependents(currentId, template).some(dfs)
  }
  return dfs(toFieldId)
}
```

If a cycle is detected, show a confirmation popup — not a hard block:

```
⚠ Circular Condition Detected

Adding this condition creates a loop:
  "Employment Type" → "Contract Rate" → "Employment Type"

Both fields may end up hidden simultaneously depending
on each other's values.

[ Cancel — don't add this condition ]   [ I understand, add anyway ]
```

### Reasoning
A hard block is too restrictive — the user may have a valid reason.
A passive inline warning is too easy to miss.
A confirmation popup makes the cycle explicit and visible, puts the decision
in the user's hands, and ensures informed consent before proceeding.

The pure function evaluation handles cycles gracefully regardless — the popup
is purely a UX safeguard, not a technical necessity.

### Behaviour After Confirmation
If user clicks **Cancel** — condition is not added, no state change.
If user clicks **I understand** — condition is added, cycle exists in the template,
evaluation still terminates correctly (pure function, one pass).

### Self-condition Prevention
A field cannot condition on itself — enforced by excluding the current field
from the target field dropdown in the condition editor. No popup needed,
simply not offered as an option.

---

## Q12 — Conditional Logic: Deleted Source Field Handling

### The Question
Field B has a condition targeting Field A. The builder deletes Field A.
What happens to Field B's orphaned condition?

### Options Considered

**Option A — Silent deletion:**
Delete Field A → all conditions referencing A removed automatically, no warning.
Problem: Destroys conditions the user configured without any acknowledgment.

**Option B — Block deletion:**
Refuse to delete Field A while any conditions reference it.
User must manually remove conditions first.
Problem: Too restrictive and frustrating — user may want to delete the field
and clean up conditions in one step.

**Option C — Warn before deletion, then clean up:**
Show a confirmation popup listing what will be affected, then delete atomically.

### Decision: Option C — Warn + Clean Up on Confirm

### Popup Content
```
⚠ "Employment Type" is used in conditions on other fields.

Deleting it will remove 2 conditions:
  • "Contract Rate" — Show when Employment Type equals "Contract"
  • "Benefits Package" — Hide when Employment Type equals "Full-time"

[ Cancel ]   [ Delete field and remove affected conditions ]
```

### Reasoning
Same principle as Q11 (cycle detection popup):
- Hard block is too restrictive
- Silent deletion destroys user-configured work without acknowledgment
- Explicit popup makes consequences visible, gives user the choice to cancel

### Implementation
On field delete:
1. Scan all other fields' conditions for references to the deleted field ID
2. If any found — show popup with the full list of affected conditions
3. If none found — delete silently (no popup needed)
4. On confirm — dispatch a single Redux action that:
   - Removes the field from `template.fields`
   - Removes all conditions across all fields that reference the deleted field ID

Atomic — either everything is cleaned up or nothing is. No orphaned condition references
can survive in the template.

---

## Q13 — Conditional Logic: "Mark as Required" — Derived vs Stored

### Decision: Effective Required State is Always Derived, Never Stored

A consequence of the evaluation model established in Q6 and Q10.

### Reasoning
If effective required state were stored, it would go stale the moment a condition
deactivates. The field would remain required even after its condition is no longer met.

The correct model: `requiredMap` is recomputed fresh on every `evaluateForm` call.
When a condition deactivates, the next evaluation automatically reverts the field
to its base config required state — no manual cleanup, no stale state possible.

```ts
// Effective required = base config OR any active condition marking it required
// AND the field must be visible (hidden fields are never required)
const effectivelyRequired = (fieldId: string): boolean =>
  visibilityMap[fieldId] && (
    baseConfig[fieldId].required ||
    activeConditions.some(c => c.targetFieldId === fieldId && c.effect === 'require')
  )
```

### What Is Stored vs Derived

| | Location | When Set |
|---|---|---|
| Base required | `field.config.required` (template) | Builder config panel |
| Effective required | `requiredMap[fieldId]` (derived) | Recomputed every evaluateForm call |

Base required is the author's intent. Effective required is the runtime truth.
They are never conflated.

---

## Q14 — TypeScript: Discriminated Unions vs Generic Base Interface

### The Question
How do we model the 10 field types in TypeScript — discriminated unions per field type,
or a generic base interface `BaseField<TConfig>`?

### Option A: Discriminated Unions
```ts
type Field =
  | SingleLineTextField
  | NumberField
  | DateField
  | SingleSelectField
  // ...

type NumberField = {
  type: 'number'         // ← discriminant
  id: string
  label: string
  config: NumberFieldConfig
}

type NumberFieldConfig = {
  required: boolean
  min?: number
  max?: number
  decimalPlaces: 0 | 1 | 2 | 3 | 4
  prefix?: string
  suffix?: string
}
```

TypeScript narrows automatically on `field.type` switch — inside `case 'number'`,
`field.config.decimalPlaces` is valid; `field.config.minLength` is a compile error.
Impossible states are unrepresentable.

### Option B: Generic Base Interface
```ts
interface BaseField<TConfig> {
  type: string
  id: string
  label: string
  config: TConfig
}

type NumberField = BaseField<NumberFieldConfig>
```

Avoids repeating `id`, `label`, `type` on every field type. Looks DRY.

### Why Generic Base Causes Pain

**Pain 1 — Switch narrowing does not work:**
```ts
const renderField = (field: BaseField<unknown>) => {
  switch (field.type) {
    case 'number':
      field.config.decimalPlaces  // ❌ config is still unknown — TypeScript cannot narrow TConfig
  }
}
```

**Pain 2 — Registry cannot be typed cleanly:**
```ts
// Registry needs to know TConfig per entry — ends up as any or massive union
type FieldRegistry = {
  [key: string]: FieldDefinition<SingleLineTextConfig | NumberConfig | DateConfig | ...>
}
// Every registry access loses type safety
```

**Pain 3 — Component props require type guards or casts:**
```ts
const renderField = (field: BaseField<unknown>) => {
  if (field.type === 'number') {
    // field.config still unknown — forced cast required
    return <NumberRenderer field={field as BaseField<NumberFieldConfig>} />
  }
}
```

### Decision: Discriminated Unions

### Reasoning
| | Discriminated Unions | Generic Base |
|---|---|---|
| Switch narrowing | ✅ Works automatically | ❌ Config stays unknown |
| Registry typing | ✅ Clean mapped type | ❌ Needs any or massive union |
| Component props | ✅ Pass NumberField directly | ❌ Needs type guards or casts |
| Impossible states | ✅ Compile error | ❌ Allowed silently |
| Code repetition | Repeats id, label, type | DRY on shared fields |

The only benefit of generics is not repeating `id: string` and `label: string`.
That is not worth losing switch narrowing, registry type safety, and component prop clarity.

Evaluators read types before components — discriminated unions communicate the
design immediately and unambiguously.

---

## Q15 — TypeScript: Typing Conditions

### The Question
Conditions have operators that depend on the target field's type.
How strictly do we enforce this in TypeScript?

### Decision: Discriminated Union per Target Field Type

```ts
type Condition =
  | TextCondition
  | NumberCondition
  | DateCondition
  | SingleSelectCondition
  | MultiSelectCondition

type TextCondition = {
  targetFieldId: string
  targetFieldType: 'singleText' | 'multiText'
  operator: 'equals' | 'does not equal' | 'contains'
  value: string
  effect: ConditionEffect
}

type NumberCondition = {
  targetFieldId: string
  targetFieldType: 'number'
  operator: 'equals' | 'is greater than' | 'is less than' | 'is within range'
  value: number | [number, number]   // range operator needs min and max
  effect: ConditionEffect
}

type DateCondition = {
  targetFieldId: string
  targetFieldType: 'date'
  operator: 'equals' | 'is before' | 'is after'
  value: string                      // ISO date string
  effect: ConditionEffect
}

type SingleSelectCondition = {
  targetFieldId: string
  targetFieldType: 'singleSelect'
  operator: 'equals' | 'does not equal'
  value: string
  effect: ConditionEffect
}

type MultiSelectCondition = {
  targetFieldId: string
  targetFieldType: 'multiSelect'
  operator: 'contains any of' | 'contains all of' | 'contains none of'
  value: string[]
  effect: ConditionEffect
}

type ConditionEffect = 'show' | 'hide' | 'require' | 'unrequire'
```

### Reasoning
Same as Q14 — the operator set and value type both vary by `targetFieldType`,
making it a natural discriminated union. TypeScript prevents `operator: 'contains'`
on a `NumberCondition` at compile time.

### Notable Detail: Range Operator Value
`is within range` needs two values (min and max).
Typed as a tuple `[number, number]` rather than two separate fields —
keeps the `value` key consistent across all operators on NumberCondition
and makes serialization/deserialization straightforward.

### Operator Source of Truth
Each field type's condition operators are also declared in the field registry entry:
```ts
// In NumberField registry definition
conditionOperators: ['equals', 'is greater than', 'is less than', 'is within range']
```
The registry drives the condition editor UI dropdown.
The TypeScript union enforces correctness at compile time.
Both must stay in sync — the registry is the runtime list, the type is the compile-time guard.

---

## Q16 — TypeScript: Registry Generic Type

### The Question
How do we type the field registry so each entry's components are known to work
with their specific field type, not just the broad `Field` union?

### Decision: Mapped Type over the Field Union

```ts
// Registry is a mapped type — one entry per field type variant
type FieldRegistry = {
  [K in Field['type']]: FieldDefinition<Extract<Field, { type: K }>>
}

// Extract<Field, { type: 'number' }> resolves to exactly NumberField
// So fieldRegistry['number'] is FieldDefinition<NumberField>
```

### FieldDefinition Generic
```ts
type FieldDefinition<F extends Field> = {
  type: F['type']
  label: string
  icon: React.ComponentType
  defaultConfig: F['config']
  ConfigPanel:     React.ComponentType<ConfigPanelProps<F>>
  FillRenderer:    React.ComponentType<FillRendererProps<F>>
  BuilderPreview:  React.ComponentType<BuilderPreviewProps<F>>
  pdfSerializer:   (field: F, value: unknown) => string
  conditionOperators: Condition['operator'][]
  validate:        (value: unknown, config: F['config']) => string | null
}
```

### What This Enforces
- `fieldRegistry['number'].ConfigPanel` is typed as `React.ComponentType<ConfigPanelProps<NumberField>>`
- `fieldRegistry['singleText'].defaultConfig` is typed as `SingleLineTextFieldConfig`
- A `ConfigPanel` written for `NumberField` cannot be assigned to `singleText`'s registry entry
- TypeScript catches mismatches between a field type and its registry components at compile time

### Reasoning
The registry is the central extensibility point of the entire application.
Typing it loosely (`Record<string, FieldDefinition>`) means the registry itself
provides no safety guarantees — errors surface at runtime, not compile time.

The mapped type approach makes the registry a compile-time contract:
adding an 11th field type without providing all required registry properties
is a TypeScript error, not a runtime surprise.

### Supporting Prop Types
```ts
type ConfigPanelProps<F extends Field> = {
  field: F
  onChange: (updated: F) => void
}

type FillRendererProps<F extends Field> = {
  field: F
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

type BuilderPreviewProps<F extends Field> = {
  field: F
  isSelected: boolean
}
```

---

## Q17 — TypeScript: Runtime Schema Validation of localStorage

### The Question
On page load, localStorage data is deserialized as untyped JSON.
TypeScript types disappear at runtime — do we validate the data against our schema?

### Decision: Trust for Now — Zod Validation as Future To-Do

### Current Approach
```ts
const raw = localStorage.getItem('formbuilder_templates')
const templates = JSON.parse(raw) as Template[]  // typed cast, no runtime check
```

Data is trusted at the localStorage boundary. If data is malformed (corrupted,
manually edited, from an old schema), errors surface downstream at the point
of use — harder to debug but acceptable for assignment scope.

### Reasoning
Writing Zod schemas alongside TypeScript types adds duplication and upfront cost.
The primary failure mode (data corruption) is unlikely in a controlled assignment
environment where localStorage is only written by our own code.

The cast approach is common in production apps that do not have schema migration
concerns — it is not incorrect, just less defensive.

### Future: Zod Validation (To-Do)
Replace the cast with a `safeParse` at the localStorage boundary:

```ts
const result = TemplateSchema.safeParse(JSON.parse(raw))
if (!result.success) {
  // graceful recovery — log error, reset to empty default state
  return []
}
return result.data
```

Key pattern: derive TypeScript types from Zod schemas to eliminate duplication:
```ts
const TemplateSchema = z.object({ ... })
type Template = z.infer<typeof TemplateSchema>  // one source of truth
```

Validation lives only at the localStorage boundary — not inside components.
Components trust the Redux store which has already been validated.
This is the "validate at system boundaries" principle.

---

## Q18 — TypeScript: UUID-based Field IDs

### Decision: UUID for All Entity Identifiers

All entities — templates, fields, conditions, instances — use UUIDs generated
at creation time via `crypto.randomUUID()`. No array indexes, no sequential numbers.

```ts
// On field add to canvas
const newField: NumberField = {
  type: 'number',
  id: crypto.randomUUID(),   // stable forever regardless of position
  label: 'New Number Field',
  config: { ... }
}

// Condition references field by ID, not position
const condition: NumberCondition = {
  targetFieldId: 'f3a9c2b1-4d2e-...',   // survives reorder, delete, undo
  operator: 'is greater than',
  value: 100,
  effect: 'show'
}
```

### Why Index-based IDs Break
```
Form has fields: [A, B, C]
Condition on field C: targetFieldIndex = 2

User reorders to: [C, A, B]
Condition now targets index 2 = B  ← silently wrong, no error
```

With UUIDs, reordering changes nothing — the ID is stable regardless of position.

### Entities Using UUIDs
| Entity | ID field | Generated when |
|---|---|---|
| Template | `template.id` | "New Template" clicked |
| Field | `field.id` | Field added to canvas |
| Condition | `condition.id` | Condition added in config panel |
| Instance | `instance.id` | Submit clicked in fill mode |

### Implementation
`crypto.randomUUID()` — built into all modern browsers, no library needed.

---

## Q19 — PDF Export: Mechanism

### The Question
Browser-native only (spec requirement). Which API generates the PDF?

### Options Considered

| Approach | Output | Issue |
|---|---|---|
| `window.print()` directly | Prints entire page | Prints builder UI unless carefully hidden |
| Hidden iframe + `contentWindow.print()` | Scoped to form content only | Clean, real text |
| Canvas capture (`html2canvas` + embed) | Rasterized image PDF | Third-party library risk + image-only output |
| Manual canvas drawing | Pixel-perfect | Writing a layout engine + manual PDF binary format |

### Why Canvas Was Considered and Rejected
The intuition was: render the form in preview mode, capture it as canvas, export as PDF.

The gap: `canvas.toBlob()` produces a bitmap image (PNG/JPEG), not a PDF.
Getting from canvas to PDF without a library requires writing the PDF binary format manually
(`%PDF-1.4` spec) — that is genuinely high effort.

`html2canvas` bridges this but is a third-party library — the spec forbids third-party
PDF generation libraries. Even if not strictly a "PDF library," it is risky for evaluation.

More importantly, a canvas-captured PDF is a rasterized image:
- Text is not selectable
- Text is not searchable
- Zooming produces blurry output
- Fails the "looks like a real export" evaluation criterion

### Decision: Hidden iframe + `contentWindow.print()`

### Reasoning
The browser's print engine is itself a PDF generator. `contentWindow.print()` produces:
- Real selectable, searchable text
- Proper pagination with automatic page breaks
- Correct font rendering
- Small file size
- Output indistinguishable from a designed document export

The rendered form HTML (same as preview mode) is injected into the iframe.
`@media print` CSS controls typography, spacing, page breaks, and hides
non-printable elements. The browser handles all layout.

### Implementation
```ts
const exportPDF = (
  template: Template,
  instance: Instance,
  visibilityMap: VisibilityMap
) => {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  iframe.contentDocument.write(buildPrintHTML(template, instance, visibilityMap))
  iframe.contentDocument.close()

  iframe.contentWindow.focus()
  iframe.contentWindow.print()  // browser opens Save as PDF dialog

  document.body.removeChild(iframe)
}
```

`buildPrintHTML` returns a complete HTML document with embedded print CSS —
form title, fields in order, values, submission timestamp, page numbers in footer.
Hidden fields (filtered by visibilityMap) are not included in the HTML at all.

---

## Q20 — PDF Export: Branding and Layout

### The Question
What does the exported PDF contain and how is it structured?

### Context: Two PDF Export Scenarios
PDF export can happen in two distinct contexts:
1. **Mid-fill download** — user clicks "Download PDF" during fill mode, form may not be submitted yet
2. **Re-download** — user re-downloads a previously submitted instance from the instances list

"Submitted" as a label is misleading for mid-fill downloads where no submission has occurred.

### Decision: Clean Layout With Submission Timestamp

Keep the PDF focused on form content. Submission timestamp is required by spec. App name and page numbers remain To-Dos.

### PDF Structure
```
┌──────────────────────────────────────┐
│  Job Application Form                │  ← form title (prominent)
│  Submitted: 15 May 2026, 14:32       │  ← submission timestamp (required by spec)
├──────────────────────────────────────┤
│  PERSONAL INFORMATION                │  ← Section Header as bold heading + divider
│                                      │
│  Full Name                           │  ← field label (muted, small)
│  John Smith                          │  ← field value (prominent)
│                                      │
│  Employment Type                     │
│  Full-time                           │
│                                      │
│  Attached files: resume.pdf (240 KB) │  ← file upload — filename + size inline
└──────────────────────────────────────┘
```

### Rules
- Form title at top, prominent
- Submission timestamp directly below title (from `instance.submittedAt`)
- Section Headers render as bold headings with a bottom divider — not as label/value pairs
- Each field: label in muted smaller text, value in regular readable text below it
- File upload fields: "Attached files: filename (size)" inline
- Calculation fields: show computed value at time of export, labeled as read-only
- Hidden fields: entirely absent — not shown as blank, not in HTML at all
- No page numbers
- No app name or branding

### Future To-Dos
- App name / logo in header
- Page numbers via `@media print` CSS counter

---

## Q21 — PDF Export: File Upload Fields

### Decision: Filename + Size Inline

File upload fields store metadata only (filename, size, type) — no file contents.
In the PDF, show what was attached:

```
CV / Resume
Attached: resume.pdf (240 KB) · photo.jpg (1.2 MB)
```

### Reasoning
- Skipping entirely loses meaningful information — the user did attach files
- "N files attached" is vague — filenames are what matter
- Filename + size is honest (files are not embedded) and informative

If no files were attached to an optional file upload field, the field is shown
with a dash value: `—` (same treatment as any other empty optional field).

---

## Q22 — PDF Export: Calculation Fields

### Decision: Snapshot Computed Value at Export Time

Calculation fields show the value as computed at the moment of PDF export —
not the formula, not the source field references.

```
Total Expenses
$4,750.00
```

### Reasoning
The PDF is a record of what the user saw when they exported. The formula
(`Sum of: Price + Tax + Shipping`) is builder metadata, not user-facing data.
The computed value is what the user filled — even though they didn't type it,
it represents the state of their form at export time.

If a source field was hidden at export time, it was excluded from the calculation
(per Q10 evaluation order) — the exported value already reflects this correctly.

---

## Q23 — localStorage: Normalized vs Denormalized Storage

### The Question
How is data structured in localStorage — one blob per template, or separate normalized keys?

### Decision: Denormalized Templates + Separate Instances Key

### localStorage Schema
```
formbuilder_templates   → TemplateRecord[]     (array of complete template documents)
formbuilder_instances   → InstanceRecord[]     (all submitted instances, all templates)
formbuilder_seeded      → boolean              (seed flag — prevents re-seeding on refresh)
```

### Template Document Shape
```ts
type TemplateRecord = {
  id: string
  title: string
  createdAt: string         // ISO datetime
  updatedAt: string         // ISO datetime
  isDefault: boolean        // true for pre-seeded templates
  fields: Field[]           // fields embedded — ordered array
}
// Conditions live inside each Field as field.conditions: Condition[]
```

### Instance Document Shape
```ts
type InstanceRecord = {
  id: string
  templateId: string        // reference to parent template
  submittedAt: string       // ISO datetime
  values: Record<string, unknown>  // fieldId → submitted value (hidden fields stripped)
  fieldSnapshot: Field[]    // snapshot of template fields at submission time
}
```

### Reasoning
Fields and conditions only exist within a template — they have no meaning outside it.
There are no cross-template field relationships. Normalizing into separate keys would
require multiple reads to reconstruct a template with no benefit for this data shape.

Instances are stored separately because they are queried independently —
"show all instances for template X" — and could grow large independently of templates.

### Why fieldSnapshot on Instances
If a template is edited after instances are submitted, old instances must still
render correctly. Storing the complete field array at submission time means
the instance is self-contained — it does not depend on the current template state.

This was identified in Q5 as a key decision most candidates miss.

---

## Q27 — Pre-seeded Templates: Content

### Decision: One Template to Start — Job Application

Ship with one pre-seeded template that covers the most field types and
demonstrates conditional logic. Add remaining templates as a To-Do.

**Job Application** covers:
- Single-line text (name, email)
- Multi-line text (cover letter)
- Date (available start date)
- File upload (CV/resume)
- Single select with all 3 display types across different fields (employment type as radio, department as dropdown, work location as tiles)
- Section headers (Personal Info, Work Details)
- Conditional logic (if employment type = "Contract" → show daily rate field)
- Number (years of experience)

### Future To-Dos
- Event Registration — date pre-fill, multi-select, tiles display type
- Expense Report — number with $ prefix, calculation field, section headers

---

## Q30–Q33 — Drag and Drop

### Q30 — Library: @dnd-kit/core
Actively maintained, accessible by default, handles both DnD use cases cleanly.
`react-beautiful-dnd` is archived/unmaintained. `react-dnd` is verbose.

### Q31 — Single Unified DndContext
One `DndContext` wraps the entire builder. Drag from left panel to canvas
crosses panel boundaries — separate contexts would block this.

Droppables are typed. `onDragEnd` discriminates copy vs move by checking source:

```ts
const onDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (!over) return

  if (active.data.current?.type === 'palette-item') {
    // Left panel → canvas: create new field at drop position
    dispatch(addField({ fieldType: active.data.current.fieldType, insertAt: over.id }))
  } else {
    // Canvas → canvas: reorder existing field
    dispatch(reorderField({ fromId: String(active.id), toId: String(over.id) }))
  }
}
```

### Q32 — Insert at Position (not Append)
Dropping from the left panel inserts the new field between existing fields
at the cursor position — not always at the bottom.

`@dnd-kit` supports this via `DragOverlay` + position-aware droppable zones
between each field card. Meaningfully better UX than append-only.

### Q33 — Keyboard Accessibility Fallback
Up/Down arrow buttons on each field card in the canvas as a fallback
for users who cannot use drag-and-drop. Spec calls this "acceptable."
Included regardless as basic accessibility — low effort with `@dnd-kit`'s
built-in keyboard sensor.

---

## Q36 — UX: Form/Instance Model and Deletion

### Mental Model

**Builder Mode** — design the form schema
**Fill/Preview Mode** — fill out and submit the form

There are no separate "instance" entities. A form holds its own submitted values.

### Data Model
```ts
type FormRecord = {
  id: string
  title: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  fields: Field[]
  submittedValues?: Record<string, unknown>  // present only after submit
  submittedAt?: string                        // present only after submit
}
```

### Fill Flow
```
Home screen
  → "Fill / Preview" on a form   → Fill Mode (always starts blank/fresh)
        → User fills fields
        → Submit                  → saves values into form.submittedValues
                                  → form.submittedAt set to now
                                  → user can download PDF
  → "Fill / Preview" again       → starts blank again
        → Submit                  → overwrites previous submittedValues
```

"New Response" (spec terminology) = open Fill Mode fresh. No new entity created.
Submitting again simply overwrites the previous submitted values on the same form.

### Two Types of Forms

**Pre-seeded templates (isDefault: true):**
- Permanently protected — cannot be deleted or edited directly
- "Use this template" on home screen → creates a user copy in Builder Mode
- Original pre-seeded form is never modified

**User-created forms:**
- Created from scratch ("New Form") or copied from a pre-seeded template
- Can be deleted with a confirmation dialog
- Deleting the form removes it and all its associated InstanceRecords

### Instance Model

Each "New Response" creates a new `InstanceRecord` on submit:
```ts
type InstanceRecord = {
  id: string
  formId: string
  submittedAt: string       // ISO datetime
  values: Record<string, unknown>  // hidden fields already stripped
  fieldSnapshot: Field[]   // template fields copied at submission time
}
```

`fieldSnapshot` is critical — if a template is edited after submission, re-downloading the PDF still produces the correct output because it uses the snapshot, not the current template.

### Filled Instances List
Accessible from each form card on the home screen. Shows all InstanceRecords for that form, newest first. Each row shows the formatted `submittedAt` timestamp and a Re-download PDF button.

### Deletion Rules
| Entity | Can Delete? | What Happens |
|---|---|---|
| Pre-seeded template | ❌ No | Protected permanently |
| User-created form | ✅ Yes | Confirm dialog → removes form + all InstanceRecords |
| Individual InstanceRecord | ❌ No | Submissions are immutable; delete the form to remove all |

### Confirmation Dialog
```
⚠ Delete "Job Application Copy"?

This will permanently delete the form and all 3 submitted responses.
This cannot be undone.

[ Cancel ]   [ Delete ]
```

---

## Decision Tracker

| # | Area | Question | Decision | Status |
|---|---|---|---|---|
| Q1 | Field Registry | Static map vs dynamic registration | Static map | ✅ Locked |
| Q2 | Config Panel | Component-per-field vs schema-driven | Component-per-field | ✅ Locked |
| Q3 | State Management | Library choice | Redux Toolkit | ✅ Locked |
| Q4 | State Management | UI state vs domain state separation | Ephemeral, never persisted | ✅ Locked |
| Q5 | State Management | localStorage persistence strategy | Auto-save debounced 500ms, fill is memory-only | ✅ Locked |
| Q6 | State Management | What triggers recalculation | Pure function via createSelector, triggered by fillValues change only | ✅ Locked |
| Q7 | Conditional Logic | AND vs OR | AND only, combinator field in schema for future OR | ✅ Locked |
| Q8 | Conditional Logic | Hidden field value handling | Retain in memory, strip at submit and PDF boundaries | ✅ Locked |
| Q9 | Conditional Logic | Evaluation model | Centralized createSelector — one evaluation per fillValues change | ✅ Locked |
| Q10 | Conditional Logic | Condition evaluation order | Visibility → Required → Calculations → Validation | ✅ Locked |
| Q11 | Conditional Logic | Cycle detection | Builder-time DFS check + confirmation popup, no hard block | ✅ Locked |
| Q12 | Conditional Logic | Deleted source field handling | Warn with affected conditions list, clean up atomically on confirm | ✅ Locked |
| Q13 | Conditional Logic | Mark as required — derived vs stored | Always derived in requiredMap, never stored | ✅ Locked |
| Q14 | TypeScript | Discriminated unions vs generic base | Discriminated unions — switch narrowing, registry typing, impossible states | ✅ Locked |
| Q15 | TypeScript | Typing conditions | Discriminated union per target field type, range value as tuple | ✅ Locked |
| Q16 | TypeScript | Registry generic type | Mapped type over Field union, FieldDefinition<F extends Field> | ✅ Locked |
| Q17 | TypeScript | Runtime schema validation (zod) | Trust for now, Zod at localStorage boundary as future To-Do | ✅ Locked |
| Q18 | TypeScript | UUID-based field IDs | crypto.randomUUID() for all entities, no index-based references | ✅ Locked |
| Q19 | PDF Export | Mechanism | Hidden iframe + contentWindow.print(), @media print CSS | ✅ Locked |
| Q20 | PDF Export | Branding and layout | Form title + submission timestamp + fields; no app name or page numbers (To-Do) | ✅ Locked |
| Q21 | PDF Export | File upload fields | Filename + size inline, dash if empty | ✅ Locked |
| Q22 | PDF Export | Calculation fields | Snapshot computed value at export time, not formula | ✅ Locked |
| Q23 | localStorage | Normalized vs denormalized | Denormalized form documents + separate `formbuilder_instances` key; fieldSnapshot on InstanceRecord | ✅ Locked |
| Q24 | localStorage | Template versioning for instances | fieldSnapshot on InstanceRecord — resolved as part of Q23 | ✅ Locked |
| Q25 | localStorage | Schema versioning and migrations | Skipped for now — full versioning + migration runner in To-Do | ✅ Locked |
| Q26 | localStorage | Persistence frequency | Auto-save debounced 500ms for builder, fill memory-only until submit — resolved in Q5 | ✅ Locked |
| Q27 | Templates | Pre-seeded template content | One template (Job Application), others as To-Do | ✅ Locked |
| Q28 | Templates | Seed strategy | formbuilder_seeded key, idempotent on refresh | ✅ Locked |
| Q29 | Templates | isDefault flag | isDefault: true on seeded templates | ✅ Locked |
| Q30 | Drag and Drop | Library | @dnd-kit/core | ✅ Locked |
| Q31 | Drag and Drop | Two DnD contexts | Single unified DndContext, typed droppables | ✅ Locked |
| Q32 | Drag and Drop | Insert at position vs append | Insert at position via position-aware droppable zones | ✅ Locked |
| Q33 | Drag and Drop | Keyboard accessibility fallback | Up/Down arrow buttons on each field card | ✅ Locked |
| Q34 | UX | Unsaved changes warning | No warning needed — auto-save makes it moot | ✅ Locked |
| Q35 | UX | Field duplication | Included — deep clone with new UUID, inserted below original | ✅ Locked |
| Q36 | UX | Template deletion and form model | Full instance history — InstanceRecord per submit with fieldSnapshot; pre-seeded protected | ✅ Locked |
| Q37 | UX | Preview mode | Preview = Fill Mode, same page/component, opens full page from builder | ✅ Locked |
| Q38 | UX | Form title editing | Inline editable h1 at top of builder canvas, blur/Enter to save | ✅ Locked |
| Q39 | UX | Validation error display | Inline under each failing field, scroll to first error, clears on input | ✅ Locked |
| Q40 | UX | Empty form submission | Allowed — no required fields means no validation errors | ✅ Locked |
| Q41 | UX | Field type change handling | Warn + clear all conditions on type change, conditions use invalid operators | ✅ Locked |
| Q42 | Performance | Render boundaries | Handled by Redux + createSelector — field components subscribe to own value only | ✅ Locked |
| Q43 | Performance | Derived state evaluation complexity | O(fields × conditions) acceptable at form scale — resolved in Q6 | ✅ Locked |
| Q44 | Scope | Intentional exclusions | Documented — nested conditions, undo/redo, migrations, multiple instances, animations | ✅ Locked |
