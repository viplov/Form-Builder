import ConfigRow from '../components/shared/ConfigRow'
import type { NumberField, NumberFieldConfig } from '../types/form'
import type { FieldDefinition } from './fieldRegistry'

// ─── Config Panel ─────────────────────────────────────────────────────────────

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

function ConfigPanel({ field, onChange }: { field: NumberField; onChange: (f: NumberField) => void }) {
  function set(partial: Partial<NumberFieldConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Years of Experience"
        />
        <ConfigRow
          label="Required"
          type="toggle"
          value={field.config.required}
          onChange={v => set({ required: v })}
        />
      </Section>

      <Divider />

      <Section title="Format">
        <ConfigRow
          label="Decimal places"
          type="number"
          value={field.config.decimalPlaces}
          onChange={v => set({ decimalPlaces: v ?? 0 })}
          min={0}
          max={4}
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-3">
          <ConfigRow
            label="Prefix"
            value={field.config.prefix}
            onChange={v => set({ prefix: v })}
            placeholder="e.g. $"
          />
          <ConfigRow
            label="Suffix"
            value={field.config.suffix}
            onChange={v => set({ suffix: v })}
            placeholder="e.g. kg"
          />
        </div>
      </Section>

      <Divider />

      <Section title="Validation">
        <div className="grid grid-cols-2 gap-3">
          <ConfigRow
            label="Min value"
            type="number"
            value={field.config.min}
            onChange={v => set({ min: v })}
            placeholder="None"
          />
          <ConfigRow
            label="Max value"
            type="number"
            value={field.config.max}
            onChange={v => set({ max: v })}
            placeholder="None"
          />
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: NumberField }) {
  const { config } = field
  const sample = (0).toFixed(config.decimalPlaces)
  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          {field.label || <span className="text-gray-400 italic">Untitled</span>}
        </span>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 overflow-hidden">
        {config.prefix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-100 border-r border-gray-200 whitespace-nowrap">
            {config.prefix}
          </span>
        )}
        <span className="flex-1 px-3 py-2 text-sm text-gray-400">{sample}</span>
        {config.suffix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-100 border-l border-gray-200 whitespace-nowrap">
            {config.suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Fill Renderer ────────────────────────────────────────────────────────────

function FillRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: NumberField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const { config } = field
  const numValue = typeof value === 'number' ? value : ''

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {field.label || 'Number'}
        </label>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className={`flex items-center rounded-lg border overflow-hidden transition-colors ${
        error ? 'border-red-400' : 'border-gray-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100'
      }`}>
        {config.prefix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
            {config.prefix}
          </span>
        )}
        <input
          type="number"
          value={numValue}
          min={config.min}
          max={config.max}
          step={config.decimalPlaces === 0 ? 1 : Math.pow(10, -config.decimalPlaces)}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none bg-white"
        />
        {config.suffix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-l border-gray-200 whitespace-nowrap">
            {config.suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(value: unknown, config: NumberFieldConfig): string | null {
  if (config.required && (value === undefined || value === null || value === ''))
    return 'This field is required'
  if (typeof value !== 'number') return null
  if (config.min !== undefined && value < config.min) return `Minimum value is ${config.min}`
  if (config.max !== undefined && value > config.max) return `Maximum value is ${config.max}`
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(field: NumberField, value: unknown): string {
  if (typeof value !== 'number') return '—'
  const formatted = value.toFixed(field.config.decimalPlaces)
  const prefix = field.config.prefix ? `${field.config.prefix} ` : ''
  const suffix = field.config.suffix ? ` ${field.config.suffix}` : ''
  return `${prefix}${formatted}${suffix}`
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: NumberFieldConfig = {
  required: false,
  decimalPlaces: 0,
  prefix: '',
  suffix: '',
}

export const numberDefinition: FieldDefinition<NumberField> = {
  type: 'number',
  label: 'Number',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
