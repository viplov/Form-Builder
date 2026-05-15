import type { Field } from '../types/form'

export function duplicateField(
  fields: Field[],
  fieldId: string
): { fields: Field[]; newFieldId: string } | null {
  const index = fields.findIndex(f => f.id === fieldId)
  if (index === -1) return null

  const original = fields[index]
  const duplicate: Field = {
    ...original,
    id: crypto.randomUUID(),
    config: { ...original.config },
    conditions: original.conditions.map(c => ({ ...c })),
  }

  const next = [...fields]
  next.splice(index + 1, 0, duplicate)
  return { fields: next, newFieldId: duplicate.id }
}
