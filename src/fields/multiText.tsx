import ConfigRow from '../components/shared/ConfigRow'
import type { MultiLineTextField, MultiLineTextConfig } from '../types/form'
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

function ConfigPanel({ field, onChange }: { field: MultiLineTextField; onChange: (f: MultiLineTextField) => void }) {
  function set(partial: Partial<MultiLineTextConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Cover Letter"
        />
        <ConfigRow
          label="Placeholder"
          hint="shown inside the empty input"
          value={field.config.placeholder}
          onChange={v => set({ placeholder: v })}
          placeholder="e.g. Tell us about yourself"
        />
        <ConfigRow
          label="Rows"
          type="number"
          value={field.config.rows}
          onChange={v => set({ rows: v ?? 4 })}
          min={2}
          max={20}
          placeholder="4"
        />
        <ConfigRow
          label="Required"
          type="toggle"
          value={field.config.required}
          onChange={v => set({ required: v })}
        />
      </Section>

      <Divider />

      <Section title="Validation">
        <div className="grid grid-cols-2 gap-3">
          <ConfigRow
            label="Min length"
            type="number"
            value={field.config.minLength}
            onChange={v => set({ minLength: v })}
            min={0}
            placeholder="None"
          />
          <ConfigRow
            label="Max length"
            type="number"
            value={field.config.maxLength}
            onChange={v => set({ maxLength: v })}
            min={0}
            placeholder="None"
          />
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: MultiLineTextField }) {
  const { config } = field
  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          {field.label || <span className="text-gray-400 italic">Untitled</span>}
        </span>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400"
        style={{ minHeight: `${(config.rows ?? 4) * 1.5}rem` }}
      >
        {config.placeholder || 'Multi-line text'}
      </div>
      {(config.minLength !== undefined || config.maxLength !== undefined) && (
        <p className="text-xs text-gray-400">
          {config.minLength !== undefined && `Min ${config.minLength}`}
          {config.minLength !== undefined && config.maxLength !== undefined && ' · '}
          {config.maxLength !== undefined && `Max ${config.maxLength} chars`}
        </p>
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
  field: MultiLineTextField
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
          {field.label || 'Text'}
        </label>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <textarea
        value={strValue}
        placeholder={config.placeholder}
        rows={config.rows ?? 4}
        minLength={config.minLength}
        maxLength={config.maxLength}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none resize-y bg-white transition-colors ${
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

function validate(value: unknown, config: MultiLineTextConfig): string | null {
  const str = typeof value === 'string' ? value.trim() : ''
  if (config.required && str.length === 0) return 'This field is required'
  if (config.minLength !== undefined && str.length > 0 && str.length < config.minLength)
    return `Minimum ${config.minLength} characters`
  if (config.maxLength !== undefined && str.length > config.maxLength)
    return `Maximum ${config.maxLength} characters`
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(_field: MultiLineTextField, value: unknown): string {
  const str = typeof value === 'string' ? value.trim() : ''
  return str || '—'
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: MultiLineTextConfig = {
  required: false,
  placeholder: '',
  rows: 4,
}

export const multiTextDefinition: FieldDefinition<MultiLineTextField> = {
  type: 'multiText',
  label: 'Multi-line Text',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
