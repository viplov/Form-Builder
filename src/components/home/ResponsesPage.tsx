import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { exportPDF } from '../../utils/pdfExport'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()

  const form = useSelector((s: RootState) => s.templates.forms.find(f => f.id === formId))
  const instances = useSelector((s: RootState) =>
    [...s.instances.instances]
      .filter(i => i.formId === formId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  )

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Form not found.{' '}
        <button onClick={() => navigate('/')} className="ml-2 text-violet-600 underline">
          Go home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <p className="font-semibold text-gray-900 text-base leading-tight">{form.title}</p>
            <p className="text-xs text-gray-400">
              {instances.length} {instances.length === 1 ? 'response' : 'responses'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium text-base mb-1">No responses yet</p>
            <p className="text-gray-500 text-sm mb-5">Share this form to start collecting responses.</p>
            <button
              onClick={() => navigate(`/fill/${form.id}`)}
              className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-4 py-2.5 transition-colors"
            >
              Fill out form
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {instances.map((instance, i) => (
              <div
                key={instance.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Response {instances.length - i}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTimestamp(instance.submittedAt)}
                  </p>
                </div>
                <button
                  onClick={() => exportPDF(form.title, instance)}
                  className="flex items-center gap-1.5 text-sm font-medium text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg px-3.5 py-2 transition-colors shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
