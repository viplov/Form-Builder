import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import ConfigRow from '../components/shared/ConfigRow'
import type { CalculationField, CalculationConfig } from '../types/form'
import type { FieldDefinition } from './fieldRegistry'

// ─── Compute helper ───────────────────────────────────────────────────────────

function computeResult(config: CalculationConfig, allValues: Record<string, unknown>): number | null {
  const nums = config.sourceFieldIds
    .map(id => allValues[id])
    .filter((v): v is number => typeof v === 'number' && isFinite(v))

  if (nums.length === 0) return null

  switch (config.aggregation) {
    case 'sum':     return nums.reduce((a, b) => a + b, 0)
    case 'average': return nums.reduce((a, b) => a + b, 0) / nums.length
    case 'min':     return Math.min(...nums)
    case 'max':     return Math.max(...nums)
  }
}

function formatResult(value: number | null, decimalPlaces: number): string {
  if (value == null) return '—'
  return value.toFixed(decimalPlaces)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-100" />
}

// ─── Aggregation selector ─────────────────────────────────────────────────────

const AGGREGATIONS: { value: CalculationConfig['aggregation']; label: string }[] = [
  { value: 'sum',     label: 'Sum'     },
  { value: 'average', label: 'Avg'     },
  { value: 'min',     label: 'Min'     },
  { value: 'max',     label: 'Max'     },
]

function AggregationSelector({
  value,
  onChange,
}: {
  value: CalculationConfig['aggregation']
  onChange: (v: CalculationConfig['aggregation']) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-gray-700">Aggregation</p>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {AGGREGATIONS.map(a => (
          <button
            key={a.value}
            onClick={() => onChange(a.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              value === a.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

const numberInputCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

function ConfigPanel({ field, onChange }: { field: CalculationField; onChange: (f: CalculationField) => void }) {
  const { formId } = useParams<{ formId: string }>()
  const numberFields = useSelector((s: RootState) =>
    s.templates.forms.find(f => f.id === formId)?.fields.filter(f => f.type === 'number') ?? []
  )

  function set(partial: Partial<CalculationConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  function toggleSource(id: string) {
    const ids = field.config.sourceFieldIds
    set({ sourceFieldIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Total Cost"
        />
      </Section>

      <Divider />

      <Section title="Source Fields">
        {numberFields.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Add number fields to this form first</p>
        ) : (
          <div className="flex flex-col gap-2">
            {numberFields.map(nf => (
              <label key={nf.id} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.config.sourceFieldIds.includes(nf.id)}
                  onChange={() => toggleSource(nf.id)}
                  className="w-4 h-4 accent-violet-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {nf.label || <span className="text-gray-400 italic">Untitled number</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Calculation">
        <AggregationSelector
          value={field.config.aggregation}
          onChange={aggregation => set({ aggregation })}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Decimal places</label>
          <input
            type="number"
            min={0}
            max={4}
            value={field.config.decimalPlaces}
            onChange={e => set({ decimalPlaces: Math.min(4, Math.max(0, Number(e.target.value))) })}
            className={numberInputCls}
          />
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

const aggLabel: Record<CalculationConfig['aggregation'], string> = {
  sum: 'Sum', average: 'Average', min: 'Minimum', max: 'Maximum',
}

function BuilderPreview({ field }: { field: CalculationField }) {
  const { config } = field
  const count = config.sourceFieldIds.length

  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <span className="text-sm font-medium text-gray-700">
        {field.label || <span className="text-gray-400 italic">Untitled</span>}
      </span>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-xs text-gray-400">
          {aggLabel[config.aggregation]} · {count === 0 ? 'no source fields' : `${count} field${count === 1 ? '' : 's'}`}
        </span>
        <span className="text-sm font-medium text-gray-400">—</span>
      </div>
    </div>
  )
}

// ─── Fill Renderer ────────────────────────────────────────────────────────────

function FillRenderer({ field }: {
  field: CalculationField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const allValues = useSelector((s: RootState) => s.fill.values)

  if (field.config.sourceFieldIds.length === 0) return null
  const result = computeResult(field.config, allValues)
  const display = formatResult(result, field.config.decimalPlaces)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">
        {field.label || 'Calculated Value'}
      </span>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <span className={`text-sm font-medium ${result == null ? 'text-gray-400' : 'text-gray-800'}`}>
          {display}
        </span>
      </div>
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(): string | null {
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(field: CalculationField, value: unknown): string {
  if (typeof value === 'number') return formatResult(value, field.config.decimalPlaces)
  return '—'
}

// ─── computeValue (called at submit to snapshot the result) ───────────────────

function computeValue(config: CalculationConfig, allValues: Record<string, unknown>): unknown {
  return computeResult(config, allValues)
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: CalculationConfig = {
  sourceFieldIds: [],
  aggregation: 'sum',
  decimalPlaces: 0,
}

export const calculationDefinition: FieldDefinition<CalculationField> = {
  type: 'calculation',
  label: 'Calculation',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
  computeValue,
}
