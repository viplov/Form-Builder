import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fieldRegistry } from '../../fields/fieldRegistry'
import type { Field } from '../../types/form'

function InsertionLine() {
  return (
    <div className="flex items-center gap-2 -my-1 pointer-events-none">
      <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
      <div className="flex-1 h-0.5 bg-violet-400 rounded-full" />
    </div>
  )
}

// ─── Single sortable field card ───────────────────────────────────────────────

function SortableFieldCard({
  field,
  isSelected,
  index,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onClick,
}: {
  field: Field
  isSelected: boolean
  index: number
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { type: 'canvas-item' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const definition = fieldRegistry[field.type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`bg-white rounded-xl border-2 px-5 py-4 cursor-pointer transition-colors group ${
        isSelected
          ? 'border-violet-500 shadow-sm shadow-violet-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="mt-1 p-1 rounded text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors opacity-0 group-hover:opacity-100"
          title="Drag to reorder"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
            <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
          </svg>
        </button>

        {/* Field preview — fills available width */}
        <div className="flex-1 min-w-0">
          {definition ? (
            <definition.BuilderPreview field={field as never} isSelected={isSelected} />
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{field.type}</p>
              <p className="text-sm text-gray-600">{field.label || 'Untitled field'}</p>
            </div>
          )}
        </div>

        {/* Up / down / delete */}
        <div
          className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 mt-1 rounded-md text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-colors"
            title="Duplicate field"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete field"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

type Props = {
  fields: Field[]
  selectedFieldId: string | null
  onSelectField: (id: string) => void
  paletteOverId: string | null
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDuplicate: (fieldId: string) => void
  onDelete: (fieldId: string) => void
}

export default function BuilderCanvas({ fields, selectedFieldId, onSelectField, paletteOverId, onMoveUp, onMoveDown, onDuplicate, onDelete }: Props) {

  // The "paper" is the droppable — same element as the SortableContext container
  // so palette-drop coordinates match sortable item coordinates exactly.
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' })

  return (
    // Workspace — distinct background, scrollable
    <div className="flex-1 overflow-y-auto bg-slate-100">
      <div className="min-h-full flex flex-col items-center py-6 px-6">

        {/* Paper — fills full available height, scrolls as fields grow */}
        <div
          ref={setNodeRef}
          className={`w-full max-w-2xl flex-1 bg-white rounded-2xl shadow-md border border-slate-200 transition-colors ${
            isOver ? 'border-violet-300 shadow-violet-100' : ''
          }`}
        >
          {fields.length === 0 ? (
            // Empty state lives inside the paper
            <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">Click or drag a field type from the left</p>
            </div>
          ) : (
            // Fields inside the paper
            <div className="p-6 flex flex-col gap-4">
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => (
                  <Fragment key={field.id}>
                    {paletteOverId === field.id && <InsertionLine />}
                    <SortableFieldCard
                      field={field}
                      index={index}
                      isSelected={field.id === selectedFieldId}
                      isLast={index === fields.length - 1}
                      onMoveUp={() => onMoveUp(index)}
                      onMoveDown={() => onMoveDown(index)}
                      onDuplicate={() => onDuplicate(field.id)}
                      onDelete={() => onDelete(field.id)}
                      onClick={() => onSelectField(field.id)}
                    />
                  </Fragment>
                ))}
                {paletteOverId === 'canvas-droppable' && <InsertionLine />}
              </SortableContext>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
