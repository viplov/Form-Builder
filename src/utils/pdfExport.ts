import type { InstanceRecord } from '../types/form'
import { fieldRegistry } from '../fields/fieldRegistry'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildPrintHTML(formTitle: string, instance: InstanceRecord): string {
  const { fieldSnapshot, values, submittedAt } = instance
  let fieldsHtml = ''

  for (const field of fieldSnapshot) {
    if (field.type === 'sectionHeader') {
      const desc = (field.config as { description?: string }).description ?? ''
      fieldsHtml += `<div class="section-heading">${esc(field.label || '')}</div>`
      if (desc) fieldsHtml += `<p class="section-desc">${esc(desc)}</p>`
      continue
    }

    // Fields not in values were hidden at submit time — omit entirely
    if (!(field.id in values)) continue

    const value = values[field.id]
    const definition = fieldRegistry[field.type]
    const serialized = definition
      ? definition.pdfSerializer(field as never, value)
      : value != null ? String(value) : ''

    const displayValue = serialized || '—'

    fieldsHtml += `
      <div class="field">
        <div class="field-label">${esc(field.label || field.type)}</div>
        <div class="field-value">${esc(displayValue)}</div>
      </div>`
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(formTitle)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    max-width: 660px;
    margin: 0 auto;
    padding: 48px 36px;
    color: #111827;
    font-size: 14px;
    line-height: 1.55;
  }
  .title  { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 6px; }
  .meta   { font-size: 12px; color: #6b7280; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; margin-bottom: 28px; }
  .section-heading {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #6b7280;
    padding-bottom: 6px; border-bottom: 1.5px solid #e5e7eb;
    margin: 32px 0 14px;
  }
  .section-desc { font-size: 12px; color: #9ca3af; margin-top: -8px; margin-bottom: 16px; }
  .field        { margin-bottom: 20px; }
  .field-label  { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
  .field-value  { font-size: 14px; color: #111827; }
  @media print  { body { padding: 24px 28px; } }
</style>
</head>
<body>
  <div class="title">${esc(formTitle)}</div>
  <div class="meta">Submitted: ${esc(formatTimestamp(submittedAt))}</div>
  ${fieldsHtml}
</body>
</html>`
}

export function exportPDF(formTitle: string, instance: InstanceRecord): void {
  const html = buildPrintHTML(formTitle, instance)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow!.focus()
  iframe.contentWindow!.print()

  // Remove after a short delay to let the print dialog fully open
  setTimeout(() => document.body.removeChild(iframe), 1000)
}
