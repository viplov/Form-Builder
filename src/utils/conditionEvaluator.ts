import type { Field, Condition } from '../types/form'

// ─── Operators available per target field type ────────────────────────────────
// Used by ConditionEditor to build the operator dropdown.

export const OPERATORS_BY_TYPE: Record<string, string[]> = {
  singleText:   ['equals', 'does not equal', 'contains'],
  multiText:    ['equals', 'does not equal', 'contains'],
  number:       ['equals', 'is greater than', 'is less than', 'is within range'],
  date:         ['equals', 'is before', 'is after'],
  singleSelect: ['equals', 'does not equal'],
  multiSelect:  ['contains any of', 'contains all of', 'contains none of'],
}

// Field types that can be targeted by a condition (excludes display-only types)
export const TARGETABLE_TYPES = new Set(Object.keys(OPERATORS_BY_TYPE))

// ─── Single condition evaluation ─────────────────────────────────────────────

export function evaluateCondition(
  condition: Condition,
  fillValues: Record<string, unknown>,
): boolean {
  if (condition.targetFieldType === '') return false  // PendingCondition — not yet configured

  const target = fillValues[condition.targetFieldId]

  switch (condition.targetFieldType) {
    case 'singleText':
    case 'multiText': {
      if (typeof target !== 'string') return false
      switch (condition.operator) {
        case 'equals':         return target === condition.value
        case 'does not equal': return target !== condition.value
        case 'contains':       return target.toLowerCase().includes(condition.value.toLowerCase())
      }
    }
    case 'number': {
      if (typeof target !== 'number') return false
      switch (condition.operator) {
        case 'equals':          return target === condition.value
        case 'is greater than': return typeof condition.value === 'number' && target > condition.value
        case 'is less than':    return typeof condition.value === 'number' && target < condition.value
        case 'is within range': {
          if (!Array.isArray(condition.value)) return false
          const [min, max] = condition.value as [number, number]
          return target >= min && target <= max
        }
      }
    }
    case 'date': {
      if (typeof target !== 'string') return false
      switch (condition.operator) {
        case 'equals':    return target === condition.value
        case 'is before': return target < condition.value
        case 'is after':  return target > condition.value
      }
    }
    case 'singleSelect': {
      switch (condition.operator) {
        case 'equals':         return target === condition.value
        case 'does not equal': return target !== condition.value
      }
    }
    case 'multiSelect': {
      if (!Array.isArray(target)) return false
      const t = target as string[]
      switch (condition.operator) {
        case 'contains any of':  return condition.value.some(v => t.includes(v))
        case 'contains all of':  return condition.value.every(v => t.includes(v))
        case 'contains none of': return !condition.value.some(v => t.includes(v))
      }
    }
  }
  return false
}

// ─── Derived form state ───────────────────────────────────────────────────────

export type DerivedFormState = {
  visibilityMap: Record<string, boolean>
  requiredMap: Record<string, boolean>
}

// Step 1 — visibility
function computeVisibility(
  fields: Field[],
  fillValues: Record<string, unknown>,
): Record<string, boolean> {
  const map: Record<string, boolean> = {}

  for (const field of fields) {
    const defaultVisible = (field.defaultVisibility ?? 'visible') === 'visible'

    if (field.conditions.length === 0) {
      map[field.id] = defaultVisible
      continue
    }

    // AND combinator: all conditions must be true for effects to fire
    const conditionsMet = field.conditions.every(c => evaluateCondition(c, fillValues))

    if (!conditionsMet) {
      map[field.id] = defaultVisible
      continue
    }

    // Conditions are met — apply any show/hide effects (first wins)
    let visible = defaultVisible
    for (const cond of field.conditions) {
      if (cond.effect === 'show') { visible = true; break }
      if (cond.effect === 'hide') { visible = false; break }
    }
    map[field.id] = visible
  }

  return map
}

// Step 2 — effective required (gates on visibility)
function computeRequired(
  fields: Field[],
  fillValues: Record<string, unknown>,
  visibilityMap: Record<string, boolean>,
): Record<string, boolean> {
  const map: Record<string, boolean> = {}

  for (const field of fields) {
    if (!visibilityMap[field.id]) {
      map[field.id] = false  // hidden fields are never required
      continue
    }

    const baseRequired = Boolean((field.config as Record<string, unknown>).required)

    if (field.conditions.length === 0) {
      map[field.id] = baseRequired
      continue
    }

    const conditionsMet = field.conditions.every(c => evaluateCondition(c, fillValues))

    if (!conditionsMet) {
      map[field.id] = baseRequired
      continue
    }

    // Conditions met — apply any require/unrequire effects (first wins)
    let required = baseRequired
    for (const cond of field.conditions) {
      if (cond.effect === 'require')   { required = true;  break }
      if (cond.effect === 'unrequire') { required = false; break }
    }
    map[field.id] = required
  }

  return map
}

// ─── Main entry point — pure function, safe to call on every render ───────────
// Order: visibility first, required second (Q10).

export function evaluateForm(
  fields: Field[],
  fillValues: Record<string, unknown>,
): DerivedFormState {
  const visibilityMap = computeVisibility(fields, fillValues)
  const requiredMap   = computeRequired(fields, fillValues, visibilityMap)
  return { visibilityMap, requiredMap }
}

// ─── Cycle detection (Q11) ────────────────────────────────────────────────────
// DFS from toFieldId — returns the full ID path if a cycle would be created,
// null otherwise. Path format: [fromFieldId, ..intermediate.., fromFieldId].

export function getCyclePath(
  fromFieldId: string,
  toFieldId: string,
  fields: Field[],
): string[] | null {
  const visited = new Set<string>()

  function dfs(currentId: string, path: string[]): string[] | null {
    if (currentId === fromFieldId) return [...path, currentId]
    if (visited.has(currentId)) return null
    visited.add(currentId)
    const field = fields.find(f => f.id === currentId)
    if (!field) return null
    for (const c of field.conditions) {
      if (c.effect !== 'show' && c.effect !== 'hide') continue  // require/unrequire don't create feedback loops
      const result = dfs(c.targetFieldId, [...path, currentId])
      if (result) return result
    }
    return null
  }

  return dfs(toFieldId, [fromFieldId])
}
