import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../store'
import { setFieldValue, resetFill } from '../../store/fillSlice'
import { addInstance } from '../../store/instancesSlice'
import { fieldRegistry } from '../../fields/fieldRegistry'
import { evaluateForm } from '../../utils/conditionEvaluator'
import { exportPDF } from '../../utils/pdfExport'

export default function FillPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const form = useSelector((s: RootState) => s.templates.forms.find(f => f.id === formId))
  const values = useSelector((s: RootState) => s.fill.values)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [instanceId, setInstanceId] = useState<string | null>(null)

  // Reset fill state when entering a new fill session, then apply any field-level initial values
  useEffect(() => {
    dispatch(resetFill())
    setErrors({})
    setSubmitted(false)
    if (!form) return
    for (const field of form.fields) {
      const definition = fieldRegistry[field.type]
      if (!definition?.getInitialValue) continue
      const initial = definition.getInitialValue(field.config as never)
      if (initial !== undefined) dispatch(setFieldValue({ fieldId: field.id, value: initial }))
    }
  }, [formId, dispatch])

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Form not found.{' '}
        <button onClick={() => navigate('/')} className="ml-2 text-violet-600 underline">Go home</button>
      </div>
    )
  }

  const { visibilityMap, requiredMap } = evaluateForm(form?.fields ?? [], values)

  function handleSubmit() {
    const newErrors: Record<string, string> = {}

    for (const field of form!.fields) {
      if (!visibilityMap[field.id]) continue  // hidden fields skip validation
      const definition = fieldRegistry[field.type]
      if (!definition) continue
      // Use effective required from conditions, not base config
      const effectiveConfig = { ...field.config, required: requiredMap[field.id] }
      const error = definition.validate(values[field.id], effectiveConfig as never)
      if (error) newErrors[field.id] = error
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstId = Object.keys(newErrors)[0]
      document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Strip hidden fields, snapshot calculation values
    const submittedValues: Record<string, unknown> = {}
    for (const field of form!.fields) {
      if (!visibilityMap[field.id]) continue  // Q8: hidden fields not in submitted data
      const definition = fieldRegistry[field.type]
      if (definition?.computeValue) {
        submittedValues[field.id] = definition.computeValue(field.config as never, values)
      } else {
        submittedValues[field.id] = values[field.id]
      }
    }

    const id = crypto.randomUUID()
    dispatch(addInstance({
      id,
      formId: form!.id,
      submittedAt: new Date().toISOString(),
      values: submittedValues,
      fieldSnapshot: form!.fields,
    }))

    setInstanceId(id)
    setSubmitted(true)
  }

  const submittedInstance = useSelector((s: RootState) =>
    instanceId ? s.instances.instances.find(i => i.id === instanceId) : undefined
  )

  if (submitted && instanceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="font-semibold text-gray-900 text-base">{form.title}</span>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Response submitted</h2>
          <p className="text-gray-500 text-sm mb-6">Your response has been saved.</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              Back to home
            </button>
            {submittedInstance && (
              <button
                onClick={() => exportPDF(form.title, submittedInstance)}
                className="flex items-center gap-1.5 text-sm font-medium text-violet-700 border border-violet-300 bg-violet-50 hover:bg-violet-100 rounded-lg px-4 py-2 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <span className="font-semibold text-gray-900 text-base">{form.title}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-7">
        {form.fields.map(field => {
          if (!visibilityMap[field.id]) return null  // Q8: retain value, just don't render
          const definition = fieldRegistry[field.type]
          if (!definition) return null

          return (
            <div key={field.id} id={`field-${field.id}`}>
              <definition.FillRenderer
                field={field as never}
                value={values[field.id]}
                onChange={v => {
                  dispatch(setFieldValue({ fieldId: field.id, value: v }))
                  if (errors[field.id]) setErrors(prev => { const n = { ...prev }; delete n[field.id]; return n })
                }}
                error={errors[field.id]}
              />
            </div>
          )
        })}

        {form.fields.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-16">This form has no fields yet.</p>
        )}

        {form.fields.length > 0 && (
          <div className="pt-4 pb-10">
            <button
              onClick={handleSubmit}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors shadow-sm"
            >
              Submit
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
