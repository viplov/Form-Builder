import { fieldRegistry } from '../../fields/fieldRegistry'
import type { Field } from '../../types/form'
import ConditionEditor from './ConditionEditor'

type Props = {
  field: Field | null
  onChange: (updated: Field) => void
  allFields: Field[]
}

export default function ConfigPanel({ field, onChange, allFields }: Props) {
  if (!field) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full shrink-0">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configure</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Select a field to configure it</p>
          </div>
        </div>
      </aside>
    )
  }

  const definition = fieldRegistry[field.type]

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full shrink-0">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configure</p>
        <p className="text-base font-semibold text-gray-900 mt-0.5">
          {definition?.label ?? field.type}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        {definition ? (
          <definition.ConfigPanel field={field as never} onChange={onChange as never} />
        ) : (
          <p className="text-sm text-gray-400 italic">
            No config panel for "{field.type}" yet.
          </p>
        )}
        <ConditionEditor field={field} allFields={allFields} onChange={onChange} />
      </div>
    </aside>
  )
}
