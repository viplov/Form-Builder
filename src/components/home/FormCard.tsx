import { useSelector } from 'react-redux'
import type { FormRecord } from '../../types/form'
import type { RootState } from '../../store'

type Props = {
  form: FormRecord
  onEdit: () => void
  onNewResponse: () => void
  onDelete: () => void
  onViewResponses: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FormCard({ form, onEdit, onNewResponse, onDelete, onViewResponses }: Props) {
  const instanceCount = useSelector((state: RootState) =>
    state.instances.instances.filter(i => i.formId === form.id).length
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{form.title}</h3>
          <p className="text-sm text-gray-500 mt-1">Updated {formatDate(form.updatedAt)}</p>
        </div>
        {form.isDefault && (
          <span className="text-xs bg-violet-50 text-violet-600 border border-violet-200 rounded-full px-2 py-0.5 whitespace-nowrap">
            Template
          </span>
        )}
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span>{form.fields.length} {form.fields.length === 1 ? 'field' : 'fields'}</span>
        <span>·</span>
        {instanceCount > 0 ? (
          <button
            onClick={onViewResponses}
            className="text-violet-600 hover:text-violet-700 hover:underline transition-colors"
          >
            {instanceCount} {instanceCount === 1 ? 'response' : 'responses'}
          </button>
        ) : (
          <span>0 responses</span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {!form.isDefault && (
          <button
            onClick={onEdit}
            className="flex-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg py-2.5 transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={onNewResponse}
          className="flex-1 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg py-2.5 transition-colors"
        >
          {form.isDefault ? 'Use Template' : 'New Response'}
        </button>
        {!form.isDefault && (
          <button
            onClick={onDelete}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete form"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
