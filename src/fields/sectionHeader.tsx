import type { SectionHeaderField, SectionHeaderConfig } from '../types/form'
import type { FieldDefinition } from './fieldRegistry'

// ─── Size selector ────────────────────────────────────────────────────────────

const SIZES: { value: SectionHeaderConfig['size']; label: string }[] = [
  { value: 'xs',     label: 'XS'     },
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
  { value: 'xl',     label: 'XL'     },
]

function SizeSelector({
  value,
  onChange,
}: {
  value: SectionHeaderConfig['size']
  onChange: (v: SectionHeaderConfig['size']) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-gray-700">Size</p>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {SIZES.map(s => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              value === s.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

function ConfigPanel({ field, onChange }: { field: SectionHeaderField; onChange: (f: SectionHeaderField) => void }) {
  function set(partial: Partial<SectionHeaderConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</p>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Heading</label>
          <input
            type="text"
            value={field.label}
            onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="e.g. Personal Information"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={field.config.description}
            onChange={e => set({ description: e.target.value })}
            placeholder="Optional — add a short description"
            rows={2}
            className={inputCls + ' resize-none'}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display</p>
        <SizeSelector value={field.config.size} onChange={size => set({ size })} />
      </div>

    </div>
  )
}

// ─── Heading renderer (shared by BuilderPreview and FillRenderer) ─────────────

const sizeClsMap: Record<SectionHeaderConfig['size'], string> = {
  xs:     'text-xs  font-semibold text-gray-600',
  small:  'text-sm  font-semibold text-gray-700',
  medium: 'text-base font-semibold text-gray-800',
  large:  'text-lg  font-bold     text-gray-900',
  xl:     'text-2xl font-bold     text-gray-900',
}

function SectionHeading({ field }: { field: SectionHeaderField }) {
  const { config } = field
  return (
    <div className="flex flex-col gap-1 pb-3 border-b border-gray-200">
      <p className={sizeClsMap[config.size]}>
        {field.label || <span className="text-gray-400 italic font-normal">Untitled section</span>}
      </p>
      {config.description && (
        <p className="text-sm text-gray-500">{config.description}</p>
      )}
    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: SectionHeaderField }) {
  return <SectionHeading field={field} />
}

// ─── Fill Renderer ────────────────────────────────────────────────────────────

function FillRenderer({ field }: { field: SectionHeaderField; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  return <SectionHeading field={field} />
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(): string | null {
  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(field: SectionHeaderField): string {
  return field.label || ''
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: SectionHeaderConfig = {
  size: 'medium',
  description: '',
}

export const sectionHeaderDefinition: FieldDefinition<SectionHeaderField> = {
  type: 'sectionHeader',
  label: 'Section Header',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
