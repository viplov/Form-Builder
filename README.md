# Form Builder

A browser-based form builder built with React, TypeScript, and Vite. Create forms with a drag-and-drop editor, collect responses, and export submissions as PDFs — all stored locally in the browser.

## Features

- **Drag-and-drop canvas** — drag fields from the palette onto the canvas and reorder them freely
- **9 field types** — Single Line Text, Multi-line Text, Number, Date, Single Select, Multi Select, Section Header, File Upload, Calculation
- **Conditional logic** — show/hide or require/unrequire fields based on other field values; cycle detection prevents circular dependencies
- **PDF export** — download any submitted response as a formatted PDF via the browser's print dialog
- **Pre-seeded template** — a Job Application template is loaded on first run, covering all field types and a conditional "Daily Rate" field
- **Responses view** — see all submissions for a form, newest first, with per-response PDF download
- **Auto-save** — form changes are debounced and persisted to `localStorage` automatically
- **No backend** — everything runs in the browser; data lives in `localStorage`

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, Tailwind CSS v4 |
| State | Redux Toolkit + React Redux |
| Routing | React Router v7 |
| Drag and drop | dnd-kit |
| Build | Vite, TypeScript 6 |

## Getting Started

**Prerequisites:** Node.js 18+ and npm

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with hot reload |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── builder/        # BuilderPage, canvas, config panel, condition editor
│   ├── fill/           # FillPage — form fill and submission
│   ├── home/           # HomePage, FormCard, ResponsesPage
│   └── shared/         # Reusable UI components (ConfigRow, etc.)
├── fields/             # One file per field type; each exports a FieldDefinition
│   └── fieldRegistry.ts
├── store/              # Redux slices: templates, instances, fill, ui
├── types/
│   └── form.ts         # All shared TypeScript types (Field, Condition, FormRecord…)
└── utils/
    ├── conditionEvaluator.ts  # Pure evaluateForm() + cycle detection
    ├── fieldUtils.ts          # Field duplication helpers
    ├── pdfExport.ts           # iframe-based PDF generation
    └── seedTemplates.ts       # First-run template seeding
```

## Data Storage

All data is stored in `localStorage` under three keys:

| Key | Contents |
|---|---|
| `formbuilder_templates` | All form definitions (fields, config, conditions) |
| `formbuilder_instances` | All submitted responses with a field snapshot |
| `formbuilder_seeded` | Flag to prevent re-seeding the default template |
