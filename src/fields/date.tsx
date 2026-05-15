import ConfigRow from '../components/shared/ConfigRow'
import type { DateField, DateFieldConfig } from '../types/form'
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

// ConfigRow doesn't have a date variant — inline helper styled consistently
function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
      />
    </div>
  )
}

function ConfigPanel({ field, onChange }: { field: DateField; onChange: (f: DateField) => void }) {
  function set(partial: Partial<DateFieldConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Start Date"
        />
        <ConfigRow
          label="Required"
          type="toggle"
          value={field.config.required}
          onChange={v => set({ required: v })}
        />
        <ConfigRow
          label="Pre-fill today"
          hint="auto-fills with today's date"
          type="toggle"
          value={field.config.prefillToday}
          onChange={v => set({ prefillToday: v })}
        />
      </Section>

      <Divider />

      <Section title="Validation">
        <div className="grid grid-cols-2 gap-3">
          <DateInput
            label="Min date"
            value={field.config.minDate}
            onChange={v => set({ minDate: v })}
          />
          <DateInput
            label="Max date"
            value={field.config.maxDate}
            onChange={v => set({ maxDate: v })}
          />
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: DateField }) {
  const { config } = field
  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          {field.label || <span className="text-gray-400 italic">Untitled</span>}
        </span>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
        MM / DD / YYYY
      </div>
      {config.prefillToday && (
        <p className="text-xs text-violet-500">Pre-filled with today's date in fill mode</p>
      )}
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
  field: DateField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const { config } = field
  const strValue = typeof value === 'string' ? value : ''

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {field.label || 'Date'}
        </label>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <input
        type="date"
        value={strValue}
        min={config.minDate || undefined}
        max={config.maxDate || undefined}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors ${
          error
            ? 'border-red-400'
            : 'border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(value: unknown, config: DateFieldConfig): string | null {
  const str = typeof value === 'string' ? value : ''
  if (config.required && !str) return 'This field is required'
  if (!str) return null
  if (config.minDate && str < config.minDate)
    return `Date must be on or after ${formatDate(config.minDate)}`
  if (config.maxDate && str > config.maxDate)
    return `Date must be on or before ${formatDate(config.maxDate)}`
  return null
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(_field: DateField, value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return formatDate(value)
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: DateFieldConfig = {
  required: false,
  prefillToday: false,
  minDate: '',
  maxDate: '',
}

export const dateDefinition: FieldDefinition<DateField> = {
  type: 'date',
  label: 'Date',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
  getInitialValue: (config) =>
    config.prefillToday ? new Date().toISOString().split('T')[0] : undefined,
}
