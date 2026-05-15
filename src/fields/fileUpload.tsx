import ConfigRow from '../components/shared/ConfigRow'
import type { FileUploadField, FileUploadConfig } from '../types/form'
import type { FieldDefinition } from './fieldRegistry'

// ─── Types ────────────────────────────────────────────────────────────────────

type FileEntry = { name: string; size: number; type: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toEntries(fileList: FileList): FileEntry[] {
  return Array.from(fileList).map(f => ({ name: f.name, size: f.size, type: f.type }))
}

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

const inputCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
  'outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all',
].join(' ')

function ConfigPanel({ field, onChange }: { field: FileUploadField; onChange: (f: FileUploadField) => void }) {
  function set(partial: Partial<FileUploadConfig>) {
    onChange({ ...field, config: { ...field.config, ...partial } })
  }

  return (
    <div className="flex flex-col gap-6">

      <Section title="General">
        <ConfigRow
          label="Label"
          value={field.label}
          onChange={v => onChange({ ...field, label: v })}
          placeholder="e.g. Resume"
        />
        <ConfigRow
          label="Required"
          type="toggle"
          value={field.config.required}
          onChange={v => set({ required: v })}
        />
      </Section>

      <Divider />

      <Section title="Files">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Max files</label>
          <input
            type="number"
            min={1}
            value={field.config.maxFiles}
            onChange={e => set({ maxFiles: Math.max(1, Number(e.target.value)) })}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Max size (MB)</label>
          <input
            type="number"
            min={1}
            value={field.config.maxSizeMb ?? ''}
            onChange={e => set({ maxSizeMb: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="No limit"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Allowed types</label>
          <input
            type="text"
            value={field.config.allowedTypes}
            onChange={e => set({ allowedTypes: e.target.value })}
            placeholder=".pdf, .jpg, image/*"
            className={inputCls}
          />
          <p className="text-xs text-gray-400">Comma-separated extensions or MIME types</p>
        </div>
      </Section>

    </div>
  )
}

// ─── Builder Preview ──────────────────────────────────────────────────────────

function BuilderPreview({ field }: { field: FileUploadField }) {
  const { config } = field
  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          {field.label || <span className="text-gray-400 italic">Untitled</span>}
        </span>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm text-gray-400">
          {config.maxFiles > 1 ? `Upload up to ${config.maxFiles} files` : 'Upload a file'}
        </p>
        {(config.allowedTypes || config.maxSizeMb) && (
          <p className="text-xs text-gray-400">
            {[config.allowedTypes, config.maxSizeMb && `max ${config.maxSizeMb} MB`].filter(Boolean).join(' · ')}
          </p>
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
  field: FileUploadField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const { config } = field
  const files: FileEntry[] = Array.isArray(value) ? value as FileEntry[] : []
  const canAddMore = files.length < config.maxFiles

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = toEntries(e.target.files ?? new FileList() as FileList)
    const merged = config.maxFiles === 1
      ? incoming.slice(0, 1)
      : [...files, ...incoming].slice(0, config.maxFiles)
    onChange(merged)
    e.target.value = ''
  }

  function removeAt(i: number) {
    onChange(files.filter((_, j) => j !== i))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {field.label || 'Upload'}
        </label>
        {config.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {canAddMore && (
        <label className={`inline-flex items-center gap-2 self-start cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          error ? 'border-red-400 text-red-500' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}>
          <input
            type="file"
            className="sr-only"
            accept={config.allowedTypes || undefined}
            multiple={config.maxFiles > 1}
            onChange={handleChange}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {config.maxFiles > 1 ? 'Add files' : 'Choose file'}
        </label>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(f.size)}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(value: unknown, config: FileUploadConfig): string | null {
  const files: FileEntry[] = Array.isArray(value) ? value as FileEntry[] : []

  if (config.required && files.length === 0) return 'Please upload a file'

  if (files.length > config.maxFiles)
    return `You can upload at most ${config.maxFiles} file${config.maxFiles === 1 ? '' : 's'}`

  if (config.maxSizeMb != null) {
    const limitBytes = config.maxSizeMb * 1024 * 1024
    const oversized = files.find(f => f.size > limitBytes)
    if (oversized) return `"${oversized.name}" exceeds the ${config.maxSizeMb} MB limit`
  }

  return null
}

// ─── PDF Serializer ───────────────────────────────────────────────────────────

function pdfSerializer(_field: FileUploadField, value: unknown): string {
  const files: FileEntry[] = Array.isArray(value) ? value as FileEntry[] : []
  if (files.length === 0) return '—'
  return files.map(f => `${f.name} (${formatSize(f.size)})`).join(', ')
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const defaultConfig: FileUploadConfig = {
  required: false,
  allowedTypes: '',
  maxFiles: 1,
}

export const fileUploadDefinition: FieldDefinition<FileUploadField> = {
  type: 'fileUpload',
  label: 'File Upload',
  defaultConfig,
  ConfigPanel,
  BuilderPreview,
  FillRenderer,
  validate,
  pdfSerializer,
}
