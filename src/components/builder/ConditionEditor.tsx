import { useState } from 'react'
import type { Field, Condition } from '../../types/form'
import { OPERATORS_BY_TYPE, TARGETABLE_TYPES, getCyclePath } from '../../utils/conditionEvaluator'

// ─── Styles ───────────────────────────────────────────────────────────────────

const selectCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-800',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

const inputCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

// ─── Value input — changes shape based on operator and target field type ──────

function ConditionValueInput({
  condition,
  targetField,
  onChange,
}: {
  condition: Condition
  targetField: Field | undefined
  onChange: (partial: Partial<Condition>) => void
}) {
  const { operator, value, targetFieldType } = condition

  if (operator === 'is within range') {
    const [min, max] = Array.isArray(value) ? (value as [number, number]) : [0, 0]
    return (
      <div className="flex gap-2">
        <input type="number" value={min} placeholder="Min"
          onChange={e => onChange({ value: [Number(e.target.value), max] })}
          className={inputCls} />
        <input type="number" value={max} placeholder="Max"
          onChange={e => onChange({ value: [min, Number(e.target.value)] })}
          className={inputCls} />
      </div>
    )
  }

  if (targetFieldType === 'number') {
    return (
      <input type="number" value={typeof value === 'number' ? value : ''}
        placeholder="Value"
        onChange={e => onChange({ value: e.target.value === '' ? '' : Number(e.target.value) })}
        className={inputCls} />
    )
  }

  if (targetFieldType === 'date') {
    return (
      <input type="date" value={typeof value === 'string' ? value : ''}
        onChange={e => onChange({ value: e.target.value })}
        className={inputCls} />
    )
  }

  if (targetFieldType === 'singleSelect') {
    const options = (targetField?.config as { options?: string[] })?.options ?? []
    return (
      <select value={typeof value === 'string' ? value : ''} onChange={e => onChange({ value: e.target.value })} className={selectCls}>
        <option value="">Select a value…</option>
        {options.filter(o => o.trim()).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (targetFieldType === 'multiSelect') {
    const options = (targetField?.config as { options?: string[] })?.options ?? []
    const selected: string[] = Array.isArray(value) ? (value as string[]) : []

    function toggle(opt: string) {
      if (selected.includes(opt)) onChange({ value: selected.filter(v => v !== opt) })
      else onChange({ value: [...selected, opt] })
    }

    return (
      <div className="flex flex-col gap-1.5">
        {options.filter(o => o.trim()).map(o => (
          <label key={o} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)}
              className="w-3.5 h-3.5 accent-violet-600 rounded" />
            <span className="text-sm text-gray-700">{o}</span>
          </label>
        ))}
        {options.filter(o => o.trim()).length === 0 && (
          <p className="text-xs text-gray-400 italic">No options on the target field yet</p>
        )}
      </div>
    )
  }

  // Default: plain text input (singleText, multiText)
  return (
    <input type="text" value={typeof value === 'string' ? value : ''}
      placeholder="Value"
      onChange={e => onChange({ value: e.target.value })}
      className={inputCls} />
  )
}

// ─── Single condition row ─────────────────────────────────────────────────────

const EFFECT_LABELS: { value: Condition['effect']; label: string }[] = [
  { value: 'show',      label: 'Show this field'       },
  { value: 'hide',      label: 'Hide this field'       },
  { value: 'require',   label: 'Mark as required'      },
  { value: 'unrequire', label: 'Mark as not required'  },
]

function ConditionRow({
  condition,
  targetableFields,
  allFields,
  currentField,
  onChange,
  onRemove,
  onCycleDetected,
}: {
  condition: Condition
  targetableFields: Field[]
  allFields: Field[]
  currentField: Field
  onChange: (partial: Partial<Condition>) => void
  onRemove: () => void
  onCycleDetected: (chain: string, onConfirm: () => void) => void
}) {
  const targetField = allFields.find(f => f.id === condition.targetFieldId)
  const operators = OPERATORS_BY_TYPE[condition.targetFieldType] ?? []

  function handleTargetChange(newTargetId: string) {
    const newTarget = allFields.find(f => f.id === newTargetId)
    if (!newTarget) return

    const newOperators = OPERATORS_BY_TYPE[newTarget.type] ?? []
    const newOperator = newOperators[0] ?? 'equals'
    const applyChange = () => onChange({
      targetFieldId: newTargetId,
      targetFieldType: newTarget.type,
      operator: newOperator,
      value: defaultValueFor(newTarget.type, newOperator),
    })

    if (condition.effect === 'show' || condition.effect === 'hide') {
      const cyclePath = getCyclePath(currentField.id, newTargetId, allFields)
      if (cyclePath) {
        const chain = cyclePath
          .map(id => `"${allFields.find(f => f.id === id)?.label || '[Untitled]'}"`)
          .join(' → ')
        onCycleDetected(chain, applyChange)
        return
      }
    }

    applyChange()
  }

  function handleOperatorChange(op: string) {
    onChange({
      operator: op,
      value: defaultValueFor(condition.targetFieldType, op),
    })
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-white">

      {/* Target field */}
      <select value={condition.targetFieldId} onChange={e => handleTargetChange(e.target.value)} className={selectCls}>
        <option value="" disabled>Select a field…</option>
        {targetableFields.map(f => (
          <option key={f.id} value={f.id}>{f.label || `[${f.type}]`}</option>
        ))}
      </select>

      {/* Operator — only once a target is chosen */}
      {condition.targetFieldId && (
        <select value={condition.operator} onChange={e => handleOperatorChange(e.target.value)} className={selectCls}>
          <option value="" disabled>Select an operator…</option>
          {operators.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      )}

      {/* Value — only once an operator is chosen */}
      {condition.targetFieldId && condition.operator && (
        <ConditionValueInput condition={condition} targetField={targetField} onChange={onChange} />
      )}

      {/* Effect + remove */}
      <div className="flex items-center gap-2">
        <select value={condition.effect} onChange={e => onChange({ effect: e.target.value as Condition['effect'] })} className={selectCls + ' flex-1'}>
          {EFFECT_LABELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={onRemove}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function defaultValueFor(targetType: string, operator: string): unknown {
  if (operator === 'is within range') return [0, 0]
  if (targetType === 'number') return 0
  if (targetType === 'date') return ''
  if (targetType === 'multiSelect') return []
  return ''
}

// ─── Main ConditionEditor ─────────────────────────────────────────────────────

interface Props {
  field: Field
  allFields: Field[]
  onChange: (updated: Field) => void
}

export default function ConditionEditor({ field, allFields, onChange }: Props) {
  const targetableFields = allFields.filter(
    f => f.id !== field.id && TARGETABLE_TYPES.has(f.type)
  )

  const [cycleModal, setCycleModal] = useState<{ chain: string; onConfirm: () => void } | null>(null)

  function handleCycleDetected(chain: string, onConfirm: () => void) {
    setCycleModal({ chain, onConfirm })
  }

  function setDefaultVisibility(v: 'visible' | 'hidden') {
    onChange({ ...field, defaultVisibility: v })
  }

  function addCondition() {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      targetFieldId: '',
      targetFieldType: '',
      operator: '',
      value: '',
      effect: 'show',
    }
    onChange({ ...field, conditions: [...field.conditions, newCondition] })
  }

  function updateCondition(id: string, partial: Partial<Condition>) {
    onChange({
      ...field,
      conditions: field.conditions.map(c => c.id === id ? { ...c, ...partial } : c),
    })
  }

  function removeCondition(id: string) {
    onChange({ ...field, conditions: field.conditions.filter(c => c.id !== id) })
  }

  return (
    <div className="flex flex-col gap-6 pt-6 border-t border-gray-100">

      {/* Default visibility */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conditions</p>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-gray-700">Default visibility</p>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['visible', 'hidden'] as const).map(v => (
              <button key={v} onClick={() => setDefaultVisibility(v)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  (field.defaultVisibility ?? 'visible') === v
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">State when no condition is active</p>
        </div>

        {/* Conditions list */}
        {field.conditions.length > 0 && (
          <div className="flex flex-col gap-2">
            {field.conditions.map(condition => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                targetableFields={targetableFields}
                allFields={allFields}
                currentField={field}
                onChange={partial => updateCondition(condition.id, partial)}
                onRemove={() => removeCondition(condition.id)}
                onCycleDetected={handleCycleDetected}
              />
            ))}
          </div>
        )}

        {targetableFields.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Add other fields to this form to create conditions
          </p>
        ) : (
          <button onClick={addCondition}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium text-left transition-colors">
            + Add condition
          </button>
        )}
      </div>

      {/* Cycle detection modal */}
      {cycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCycleModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Circular condition detected</p>
                <p className="text-xs text-gray-500 mt-0.5">Adding this condition creates a dependency loop.</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-xs font-medium text-amber-800 mb-1">Loop chain</p>
              <p className="text-xs text-amber-700 font-mono leading-relaxed">{cycleModal.chain}</p>
            </div>

            <p className="text-xs text-gray-500">
              Fields involved may end up hidden simultaneously depending on each other's values.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCycleModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { cycleModal.onConfirm(); setCycleModal(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
