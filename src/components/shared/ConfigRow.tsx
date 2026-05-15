type TextProps = {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text'
}

type NumberProps = {
  label: string
  hint?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  type: 'number'
  min?: number
  max?: number
}

type ToggleProps = {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
  type: 'toggle'
}

type Props = TextProps | NumberProps | ToggleProps

const inputCls = [
  'w-full rounded-lg border border-gray-300 bg-white',
  'px-3 py-2.5 text-sm text-gray-900',
  'placeholder:text-gray-400',
  'outline-none',
  'focus:border-violet-500 focus:ring-2 focus:ring-violet-100',
  'transition-all',
].join(' ')

export default function ConfigRow(props: Props) {
  if (props.type === 'toggle') {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">{props.label}</p>
          {props.hint && <p className="text-xs text-gray-400 mt-0.5">{props.hint}</p>}
        </div>
        <button
          onClick={() => props.onChange(!props.value)}
          role="switch"
          aria-checked={props.value}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-300 ${
            props.value ? 'bg-violet-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              props.value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    )
  }

  if (props.type === 'number') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {props.label}
          {props.hint && <span className="text-xs text-gray-400 font-normal ml-1.5">{props.hint}</span>}
        </label>
        <input
          type="number"
          value={props.value ?? ''}
          min={props.min}
          max={props.max}
          placeholder={props.placeholder ?? 'None'}
          onChange={e => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className={inputCls}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {props.label}
        {props.hint && <span className="text-xs text-gray-400 font-normal ml-1.5">{props.hint}</span>}
      </label>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder ?? ''}
        onChange={e => props.onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  )
}
