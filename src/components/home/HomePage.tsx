import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../store'
import { addForm, deleteForm } from '../../store/templatesSlice'
import { deleteInstancesByFormId } from '../../store/instancesSlice'
import FormCard from './FormCard'
import type { FormRecord } from '../../types/form'

export default function HomePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const forms = useSelector((state: RootState) => state.templates.forms)
  const [deleteTarget, setDeleteTarget] = useState<FormRecord | null>(null)

  function handleNewForm() {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const form: FormRecord = {
      id,
      title: 'Untitled Form',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      fields: [],
    }
    dispatch(addForm(form))
    navigate(`/builder/${id}`)
  }

  function handleEdit(formId: string) {
    navigate(`/builder/${formId}`)
  }

  function handleNewResponse(form: FormRecord) {
    if (form.isDefault) {
      // "Use Template" — deep-copy with a new id
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const copy: FormRecord = {
        ...form,
        id,
        title: `${form.title} (Copy)`,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      }
      dispatch(addForm(copy))
      navigate(`/builder/${id}`)
    } else {
      navigate(`/fill/${form.id}`)
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    dispatch(deleteInstancesByFormId(deleteTarget.id))
    dispatch(deleteForm(deleteTarget.id))
    setDeleteTarget(null)
  }

  const templates = forms.filter(f => f.isDefault)
  const userForms = forms.filter(f => !f.isDefault)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="15" x2="12" y2="15" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-base">Form Builder</span>
          </div>
          <button
            onClick={handleNewForm}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Form
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* Templates section */}
        {templates.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  onEdit={() => handleEdit(form.id)}
                  onNewResponse={() => handleNewResponse(form)}
                  onDelete={() => setDeleteTarget(form)}
                  onViewResponses={() => navigate(`/forms/${form.id}/responses`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* User forms section */}
        <section>
          {userForms.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">My Forms</h2>
          )}
          {userForms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userForms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  onEdit={() => handleEdit(form.id)}
                  onNewResponse={() => handleNewResponse(form)}
                  onDelete={() => setDeleteTarget(form)}
                  onViewResponses={() => navigate(`/forms/${form.id}/responses`)}
                />
              ))}
            </div>
          ) : (
            templates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="text-gray-900 font-semibold text-lg mb-1">No forms yet</h3>
                <p className="text-gray-500 text-sm mb-6">Create your first form to get started.</p>
                <button
                  onClick={handleNewForm}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Create a form
                </button>
              </div>
            )
          )}
        </section>
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-gray-900 text-base mb-2">Delete "{deleteTarget.title}"?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete the form and all its submitted responses. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg py-2.5 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
