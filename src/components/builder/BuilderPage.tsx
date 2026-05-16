import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent, CollisionDetection } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { RootState, AppDispatch } from '../../store'
import { updateForm } from '../../store/templatesSlice'
import { fieldRegistry } from '../../fields/fieldRegistry'
import { duplicateField } from '../../utils/fieldUtils'
import type { Field, FormRecord } from '../../types/form'
import FieldPalette from './FieldPalette'
import BuilderCanvas from './BuilderCanvas'
import ConfigPanel from './ConfigPanel'

// When reordering canvas items, strip canvas-droppable so only field cards compete.
// When dropping palette items, keep all droppables so the paper also catches drops.
const collisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type === 'canvas-item') {
    const hits = pointerWithin(args).filter(c => c.id !== 'canvas-droppable')
    if (hits.length > 0) return hits
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => c.id !== 'canvas-droppable') })
  }
  return closestCenter(args)
}

// Fallback configs for field types not yet in the registry.
// Remove each case once the type is added to fieldRegistry.
function defaultConfig(type: string): Record<string, unknown> {
  if (fieldRegistry[type]) return fieldRegistry[type].defaultConfig as Record<string, unknown>
  switch (type) {
    default: return {}
  }
}

export default function BuilderPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const form = useSelector((s: RootState) => s.templates.forms.find(f => f.id === formId))

  const [fields, setFields] = useState<Field[]>(form?.fields ?? [])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [title, setTitle] = useState(form?.title ?? 'Untitled Form')
  const [editingTitle, setEditingTitle] = useState(false)
  const [activeDragType, setActiveDragType] = useState<string | null>(null)
  const [activeDragFieldId, setActiveDragFieldId] = useState<string | null>(null)
  const [paletteOverId, setPaletteOverId] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // PointerSensor with a small activation distance so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function save(nextFields: Field[], nextTitle: string) {
    if (!form) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const updated: FormRecord = { ...form, title: nextTitle, fields: nextFields, updatedAt: new Date().toISOString() }
      dispatch(updateForm(updated))
    }, 500)
  }

  function updateFields(next: Field[]) {
    setFields(next)
    save(next, title)
  }

  function updateTitle(next: string) {
    setTitle(next)
    save(fields, next)
  }

  function makeField(type: string): Field {
    return {
      id: crypto.randomUUID(),
      type,
      label: '',
      config: defaultConfig(type),
      conditions: [],
      combinator: 'and',
      defaultVisibility: 'visible',
    } as Field
  }

  function handleAddField(type: string, insertAt?: number) {
    const newField = makeField(type)
    const next = [...fields]
    if (insertAt !== undefined) {
      next.splice(insertAt, 0, newField)
    } else {
      next.push(newField)
    }
    updateFields(next)
    setSelectedFieldId(newField.id)
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const next = [...fields]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    updateFields(next)
  }

  function handleMoveDown(index: number) {
    if (index === fields.length - 1) return
    const next = [...fields]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    updateFields(next)
  }

  function handleDuplicateField(fieldId: string) {
    const result = duplicateField(fields, fieldId)
    if (!result) return
    updateFields(result.fields)
    setSelectedFieldId(result.newFieldId)
  }

  function handleDeleteField(fieldId: string) {
    const target = fields.find(f => f.id === fieldId)
    if (!target) return

    const affected = fields.filter(f => f.id !== fieldId && f.conditions.some(c => c.targetFieldId === fieldId))
    if (affected.length > 0) {
      const names = affected.map(f => `"${f.label || '[Untitled]'}"`).join(', ')
      const ok = window.confirm(
        `"${target.label || '[Untitled]'}" is used in conditions on ${names}.\n\nDeleting it will remove those conditions. Continue?`
      )
      if (!ok) return
    }

    const next = fields
      .filter(f => f.id !== fieldId)
      .map(f => ({ ...f, conditions: f.conditions.filter(c => c.targetFieldId !== fieldId) }))
    updateFields(next)
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }

  function handleFieldChange(updated: Field) {
    updateFields(fields.map(f => f.id === updated.id ? updated : f))
  }

  function handleSaveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (!form) return
    dispatch(updateForm({ ...form, title, fields, updatedAt: new Date().toISOString() }))
  }

  // ─── DnD handlers ────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'palette-item') {
      setActiveDragType(data.fieldType as string)
    } else if (data?.type === 'canvas-item') {
      setActiveDragType('canvas-item')
      setActiveDragFieldId(String(event.active.id))
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (event.active.data.current?.type !== 'palette-item') return
    setPaletteOverId(event.over ? String(event.over.id) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragType(null)
    setActiveDragFieldId(null)
    setPaletteOverId(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current

    if (activeData?.type === 'palette-item') {
      // Dropped a palette item onto the canvas
      const fieldType = activeData.fieldType as string
      const overId = over.id

      if (overId === 'canvas-droppable') {
        // Dropped on the empty canvas — append
        handleAddField(fieldType)
      } else {
        // Dropped on an existing card — insert before it
        const overIndex = fields.findIndex(f => f.id === overId)
        handleAddField(fieldType, overIndex >= 0 ? overIndex : fields.length)
      }
      return
    }

    if (activeData?.type === 'canvas-item') {
      // Reordering within the canvas
      if (active.id !== over.id) {
        const oldIndex = fields.findIndex(f => f.id === active.id)
        const newIndex = fields.findIndex(f => f.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          updateFields(arrayMove(fields, oldIndex, newIndex))
        }
      }
    }
  }

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Form not found.{' '}
        <button onClick={() => navigate('/')} className="ml-2 text-violet-600 underline">Go home</button>
      </div>
    )
  }

  const selectedField = fields.find(f => f.id === selectedFieldId) ?? null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 gap-4 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Back to home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => { setEditingTitle(false); updateTitle(title) }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); updateTitle(title) } }}
              className="flex-1 font-semibold text-gray-900 text-base bg-transparent border-b-2 border-violet-500 outline-none py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex-1 text-left font-semibold text-gray-900 text-base hover:text-violet-600 transition-colors truncate"
              title="Click to rename"
            >
              {title}
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleSaveNow}
              className="text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg px-5 py-2.5 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => navigate(`/fill/${form.id}`)}
              className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-5 py-2.5 transition-colors"
            >
              Preview
            </button>
          </div>
        </header>

        {/* Three-panel body */}
        <div className="flex flex-1 overflow-hidden">
          <FieldPalette onAddField={type => handleAddField(type)} />

          <main className="flex-1 overflow-hidden flex flex-col">
            <BuilderCanvas
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              paletteOverId={paletteOverId}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDuplicate={handleDuplicateField}
              onDelete={handleDeleteField}
            />
          </main>

          <ConfigPanel field={selectedField} onChange={handleFieldChange} allFields={fields} />
        </div>
      </div>

      {/* Drag overlay — shown while dragging */}
      <DragOverlay>
        {activeDragType && activeDragType !== 'canvas-item' && (
          <div className="bg-white border-2 border-violet-400 rounded-xl px-4 py-3 shadow-lg text-sm font-medium text-violet-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center text-xs font-bold">+</span>
            {fieldRegistry[activeDragType]?.label ?? activeDragType}
          </div>
        )}
        {activeDragType === 'canvas-item' && (() => {
          const f = fields.find(field => field.id === activeDragFieldId)
          if (!f) return null
          const definition = fieldRegistry[f.type]
          return (
            <div className="bg-white border-2 border-violet-400 rounded-xl px-5 py-4 shadow-lg opacity-90 w-80">
              {definition
                ? <definition.BuilderPreview field={f as never} isSelected={false} />
                : <p className="text-sm font-medium text-gray-700">{f.label || 'Untitled field'}</p>
              }
            </div>
          )
        })()}
      </DragOverlay>
    </DndContext>
  )
}
