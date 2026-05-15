import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { fieldRegistry } from '../../fields/fieldRegistry'

const FIELD_TYPES = [
  { type: 'singleText',    label: 'Single Line Text', icon: 'T'  },
  { type: 'multiText',     label: 'Multi-line Text',  icon: '¶'  },
  { type: 'number',        label: 'Number',           icon: '#'  },
  { type: 'date',          label: 'Date',             icon: '▦'  },
  { type: 'singleSelect',  label: 'Single Select',    icon: '◉'  },
  { type: 'multiSelect',   label: 'Multi Select',     icon: '☑'  },
  { type: 'fileUpload',    label: 'File Upload',      icon: '↑'  },
  { type: 'sectionHeader', label: 'Section Header',   icon: 'H'  },
  { type: 'calculation',   label: 'Calculation',      icon: '∑'  },
]

type Props = { onAddField: (type: string) => void }

function PaletteItem({ type, label, icon, onAddField }: { type: string; label: string; icon: string; onAddField: (t: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette-item', fieldType: type },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAddField(type)}
      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors group cursor-grab active:cursor-grabbing"
    >
      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 group-hover:bg-violet-100 text-gray-500 group-hover:text-violet-600 text-xs font-bold shrink-0 transition-colors select-none">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

export default function FieldPalette({ onAddField }: Props) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Field Types</p>
        <p className="text-xs text-gray-400 mt-0.5">Click or drag onto canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
        {FIELD_TYPES.map(ft => (
          <PaletteItem
            key={ft.type}
            {...ft}
            label={fieldRegistry[ft.type]?.label ?? ft.label}
            onAddField={onAddField}
          />
        ))}
      </div>
    </aside>
  )
}
