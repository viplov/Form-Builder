import ConfigRow from '../components/shared/ConfigRow'
import type { SingleSelectField, SingleSelectConfig } from '../types/form'
import type { FieldDefinition } from './fieldRegistry'

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

// ─── Options editor ───────────────────────────────────────────────────────────

const inputCls = [
  'flex-1 rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  function updateAt(i: number, val: string) {
    const next = [...options]
    next[i] = val
    onChange(next)
  }

  function removeAt(i: number) {
    onChange(options.filter((_, j) => j !== i))
  }

  function moveUp(i: number) {
    const next = [...options]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  function moveDown(i: number) {
    const next = [...options]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={opt}
            onChange={e => updateAt(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className={inputCls}
          />
          <div className="flex flex-col shrink-0">
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === options.length - 1}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => removeAt(i)}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, ''])}
        className="text-sm text-violet-600 hover:text-violet-700 font-medium text-left transition-colors"
      >
        + Add option
      </button>
    </div>
  )
}

// ─── Display type selector ────────────────────────────────────────────────────

const DISPLAY_TYPES: { value: SingleSelectConfig['displayType']; label: string }[] = [
  { value: 'radio',    label: 'Radio'    },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'tiles',    label: 'Tiles'    },
]

function DisplayTypeSelector({
  value,
  onChange,
}: {
  value: SingleSelectConfig['displayType']
  onChange: (v: SingleSelectConfig['displayType']) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-gray-700">Display as</p>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {DISPLAY_TYPES.map(dt => (
          <button
            key={dt.value}
            onClick={() => onChange(dt.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              value === dt.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ field, onChange }: { field: SingleSelectField; onChange: (f: SingleSelectField) => void }) {
  function set(partial: Partial<SingleSelectConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Employment Type"
        />
        <ConfigRow
          label="Required"
          type="toggle"
          value={field.config.required}
          onChange={v => set({ required: v })}
        />
      </Section>

      <Divider />

      <Section title="Options">
        <OptionsEditor
          options={field.config.options}
          onChange={options => set({ options })}
        />
      </Section>

      <Divider />

      <Section title="Display">
        <DisplayTypeSelector
          value={field.config.displayType}
          onChange={displayType => set({ displayType })}
        />
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: SingleSelectField }) {
  const { config } = field
  const options = config.options.filter(o => o.trim())

  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          {field.label || <span className="text-gray-400 italic">Untitled</span>}
        </span>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {options.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No options added yet</p>
      ) : config.displayType === 'dropdown' ? (
        <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
          <span className="flex-1">Select…</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      ) : config.displayType === 'tiles' ? (
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <span key={opt} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-500">
              {opt}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {options.map(opt => (
            <div key={opt} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              <span className="text-sm text-gray-600">{opt}</span>
            </div>
          ))}
        </div>
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
  field: SingleSelectField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const { config } = field
  const selected = typeof value === 'string' ? value : ''
  const options = config.options.filter(o => o.trim())

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {field.label || 'Select'}
        </label>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {config.displayType === 'dropdown' ? (
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
          }`}
        >
          <option value="">Select…</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : config.displayType === 'tiles' ? (
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected === opt ? '' : opt)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selected === opt
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-violet-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={selected === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(value: unknown, config: SingleSelectConfig): string | null {
  if (config.required && !value) return 'Please select an option'
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(_field: SingleSelectField, value: unknown): string {
  return typeof value === 'string' && value ? value : '—'
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: SingleSelectConfig = {
  required: false,
  options: [],
  displayType: 'radio',
}

export const singleSelectDefinition: FieldDefinition<SingleSelectField> = {
  type: 'singleSelect',
  label: 'Single Select',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
