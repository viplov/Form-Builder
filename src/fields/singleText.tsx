import ConfigRow from '../components/shared/ConfigRow'
import type { SingleLineTextField, SingleLineTextConfig } from '../types/form'
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

function ConfigPanel({ field, onChange }: { field: SingleLineTextField; onChange: (f: SingleLineTextField) => void }) {
  function set(partial: Partial<SingleLineTextConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Full Name"
        />
        <ConfigRow
          label="Placeholder"
          hint="shown inside the empty input"
          value={field.config.placeholder}
          onChange={v => set({ placeholder: v })}
          placeholder="e.g. Enter your name"
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

      <Divider />

      <Section title="Decoration">
        <div className="grid grid-cols-2 gap-3">
          <ConfigRow
            label="Prefix"
            value={field.config.prefix}
            onChange={v => set({ prefix: v })}
            placeholder="e.g. https://"
          />
          <ConfigRow
            label="Suffix"
            value={field.config.suffix}
            onChange={v => set({ suffix: v })}
            placeholder="e.g. .com"
          />
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: SingleLineTextField }) {
  const { config } = field
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
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
            {config.prefix}
          </span>
        )}
        <span className="flex-1 px-3 py-2 text-sm text-gray-400">
          {config.placeholder || 'Text input'}
        </span>
        {config.suffix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-l border-gray-200 whitespace-nowrap">
            {config.suffix}
          </span>
        )}
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
  field: SingleLineTextField
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
      <div className={`flex items-center rounded-lg border overflow-hidden transition-colors ${error ? 'border-red-400' : 'border-gray-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100'}`}>
        {config.prefix && (
          <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
            {config.prefix}
          </span>
        )}
        <input
          type="text"
          value={strValue}
          placeholder={config.placeholder}
          minLength={config.minLength}
          maxLength={config.maxLength}
          onChange={e => onChange(e.target.value)}
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

function validate(value: unknown, config: SingleLineTextConfig): string | null {
  const str = typeof value === 'string' ? value.trim() : ''
  if (config.required && str.length === 0) return 'This field is required'
  if (config.minLength !== undefined && str.length > 0 && str.length < config.minLength)
    return `Minimum ${config.minLength} characters`
  if (config.maxLength !== undefined && str.length > config.maxLength)
    return `Maximum ${config.maxLength} characters`
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(field: SingleLineTextField, value: unknown): string {
  const str = typeof value === 'string' ? value : '—'
  const prefix = field.config.prefix ? `${field.config.prefix} ` : ''
  const suffix = field.config.suffix ? ` ${field.config.suffix}` : ''
  return str ? `${prefix}${str}${suffix}` : '—'
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: SingleLineTextConfig = {
  required: false,
  placeholder: '',
  prefix: '',
  suffix: '',
}

export const singleTextDefinition: FieldDefinition<SingleLineTextField> = {
  type: 'singleText',
  label: 'Single Line Text',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
