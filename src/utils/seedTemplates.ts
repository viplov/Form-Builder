import type {
  FormRecord,
  SingleLineTextField,
  MultiLineTextField,
  NumberField,
  DateField,
  SingleSelectField,
  FileUploadField,
  SectionHeaderField,
  SingleSelectCondition,
} from '../types/form'

const SEEDED_KEY = 'formbuilder_seeded'
const STORAGE_KEY = 'formbuilder_templates'

// ─── Fixed IDs (deterministic so re-seeding is idempotent) ───────────────────

const ID = {
  form:             'seed-job-app',
  personalHeader:   'seed-jaf-personal-header',
  fullName:         'seed-jaf-full-name',
  email:            'seed-jaf-email',
  employmentType:   'seed-jaf-employment-type',
  yearsExp:         'seed-jaf-years-exp',
  dailyRate:        'seed-jaf-daily-rate',
  workHeader:       'seed-jaf-work-header',
  department:       'seed-jaf-department',
  workLocation:     'seed-jaf-work-location',
  coverLetter:      'seed-jaf-cover-letter',
  startDate:        'seed-jaf-start-date',
  cv:               'seed-jaf-cv',
  condDailyRate:    'seed-cond-daily-rate',
}

// ─── Condition: show Daily Rate when Employment Type = "Contract" ─────────────

const dailyRateCondition: SingleSelectCondition = {
  id:              ID.condDailyRate,
  targetFieldId:   ID.employmentType,
  targetFieldType: 'singleSelect',
  operator:        'equals',
  value:           'Contract',
  effect:          'show',
}

// ─── Fields ───────────────────────────────────────────────────────────────────

const personalHeader: SectionHeaderField = {
  id: ID.personalHeader, type: 'sectionHeader', label: 'Personal Information',
  config: { size: 'medium', description: '' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const fullName: SingleLineTextField = {
  id: ID.fullName, type: 'singleText', label: 'Full Name',
  config: { required: true, placeholder: 'Jane Smith', prefix: '', suffix: '' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const email: SingleLineTextField = {
  id: ID.email, type: 'singleText', label: 'Email',
  config: { required: true, placeholder: 'jane@example.com', prefix: '', suffix: '' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const employmentType: SingleSelectField = {
  id: ID.employmentType, type: 'singleSelect', label: 'Employment Type',
  config: { required: true, options: ['Full-time', 'Part-time', 'Contract'], displayType: 'radio' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const yearsExp: NumberField = {
  id: ID.yearsExp, type: 'number', label: 'Years of Experience',
  config: { required: false, decimalPlaces: 0, prefix: '', suffix: ' years', min: 0 },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

// Hidden by default — shown only when Employment Type = "Contract"
const dailyRate: NumberField = {
  id: ID.dailyRate, type: 'number', label: 'Daily Rate',
  config: { required: false, decimalPlaces: 0, prefix: '£', suffix: '' },
  conditions: [dailyRateCondition], combinator: 'and', defaultVisibility: 'hidden',
}

const workHeader: SectionHeaderField = {
  id: ID.workHeader, type: 'sectionHeader', label: 'Work Details',
  config: { size: 'medium', description: '' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const department: SingleSelectField = {
  id: ID.department, type: 'singleSelect', label: 'Department',
  config: {
    required: false,
    options: ['Engineering', 'Design', 'Product', 'Marketing', 'Operations'],
    displayType: 'dropdown',
  },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const workLocation: SingleSelectField = {
  id: ID.workLocation, type: 'singleSelect', label: 'Work Location',
  config: { required: false, options: ['Remote', 'On-site', 'Hybrid'], displayType: 'tiles' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const coverLetter: MultiLineTextField = {
  id: ID.coverLetter, type: 'multiText', label: 'Cover Letter',
  config: { required: false, placeholder: 'Tell us about yourself and why you\'re a great fit…', rows: 6 },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const startDate: DateField = {
  id: ID.startDate, type: 'date', label: 'Available Start Date',
  config: { required: false, prefillToday: false, minDate: '', maxDate: '' },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

const cv: FileUploadField = {
  id: ID.cv, type: 'fileUpload', label: 'CV / Resume',
  config: { required: true, allowedTypes: '.pdf,.doc,.docx', maxFiles: 1, maxSizeMb: 5 },
  conditions: [], combinator: 'and', defaultVisibility: 'visible',
}

// ─── Template record ──────────────────────────────────────────────────────────

const JOB_APPLICATION: FormRecord = {
  id:        ID.form,
  title:     'Job Application',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fields: [
    personalHeader,
    fullName,
    email,
    employmentType,
    yearsExp,
    dailyRate,
    workHeader,
    department,
    workLocation,
    coverLetter,
    startDate,
    cv,
  ],
}

// ─── Seed function — writes directly to localStorage before store init ────────

export function seedIfNeeded(): void {
  if (localStorage.getItem(SEEDED_KEY)) return

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const forms: FormRecord[] = raw ? (JSON.parse(raw) as FormRecord[]) : []
    // Prepend so it appears first
    forms.unshift(JOB_APPLICATION)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forms))
  } catch {
    // If storage fails, skip silently — not worth crashing the app
  }

  localStorage.setItem(SEEDED_KEY, 'true')
}
