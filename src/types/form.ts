// ─── Field configs ────────────────────────────────────────────────────────────

export type SingleLineTextConfig = {
  required: boolean
  placeholder: string
  minLength?: number
  maxLength?: number
  prefix: string
  suffix: string
}

export type SingleSelectConfig = {
  required: boolean
  options: string[]
  displayType: 'radio' | 'dropdown' | 'tiles'
}

export type MultiSelectConfig = {
  required: boolean
  options: string[]
  displayType: 'checkboxes' | 'tiles'
  minSelections?: number
  maxSelections?: number
}

export type DateFieldConfig = {
  required: boolean
  prefillToday: boolean
  minDate: string
  maxDate: string
}

export type NumberFieldConfig = {
  required: boolean
  decimalPlaces: number
  prefix: string
  suffix: string
  min?: number
  max?: number
}

export type MultiLineTextConfig = {
  required: boolean
  placeholder: string
  rows: number
  minLength?: number
  maxLength?: number
}

export type SectionHeaderConfig = {
  size: 'xs' | 'small' | 'medium' | 'large' | 'xl'
  description: string
}

export type FileUploadConfig = {
  required: boolean
  allowedTypes: string
  maxFiles: number
  maxSizeMb?: number
}

export type CalculationConfig = {
  sourceFieldIds: string[]
  aggregation: 'sum' | 'average' | 'min' | 'max'
  decimalPlaces: number
}

// Placeholder configs — will be expanded as each field type is implemented
export type GenericConfig = Record<string, unknown>

// ─── Shared condition-related fields ─────────────────────────────────────────
// Every field carries these alongside its type-specific config.

type ConditionBase = {
  conditions: Condition[]
  combinator: 'and'                        // 'or' unlocked later (Q7)
  defaultVisibility: 'visible' | 'hidden'  // state when no condition is active
}

// ─── Fields (discriminated union) ─────────────────────────────────────────────

export type SingleLineTextField = ConditionBase & {
  type: 'singleText'
  id: string
  label: string
  config: SingleLineTextConfig
}

export type MultiLineTextField = ConditionBase & {
  type: 'multiText'
  id: string
  label: string
  config: MultiLineTextConfig
}

export type NumberField = ConditionBase & {
  type: 'number'
  id: string
  label: string
  config: NumberFieldConfig
}

export type SingleSelectField = ConditionBase & {
  type: 'singleSelect'
  id: string
  label: string
  config: SingleSelectConfig
}

export type MultiSelectField = ConditionBase & {
  type: 'multiSelect'
  id: string
  label: string
  config: MultiSelectConfig
}

export type DateField = ConditionBase & {
  type: 'date'
  id: string
  label: string
  config: DateFieldConfig
}

export type CalculationField = ConditionBase & {
  type: 'calculation'
  id: string
  label: string
  config: CalculationConfig
}

export type FileUploadField = ConditionBase & {
  type: 'fileUpload'
  id: string
  label: string
  config: FileUploadConfig
}

export type SectionHeaderField = ConditionBase & {
  type: 'sectionHeader'
  id: string
  label: string
  config: SectionHeaderConfig
}

// Catch-all for field types not yet implemented
export type UnknownField = ConditionBase & {
  type: string
  id: string
  label: string
  config: GenericConfig
}

export type Field =
  | SingleLineTextField
  | MultiLineTextField
  | NumberField
  | SingleSelectField
  | MultiSelectField
  | DateField
  | CalculationField
  | FileUploadField
  | SectionHeaderField
  | UnknownField

// ─── Conditions (discriminated on targetFieldType) ────────────────────────────

type ConditionCommon = {
  id: string
  targetFieldId: string
  effect: 'show' | 'hide' | 'require' | 'unrequire'
}

export type TextCondition = ConditionCommon & {
  targetFieldType: 'singleText' | 'multiText'
  operator: 'equals' | 'does not equal' | 'contains'
  value: string
}

export type NumberCondition = ConditionCommon & {
  targetFieldType: 'number'
  operator: 'equals' | 'is greater than' | 'is less than' | 'is within range'
  value: number | [number, number]
}

export type DateCondition = ConditionCommon & {
  targetFieldType: 'date'
  operator: 'equals' | 'is before' | 'is after'
  value: string
}

export type SingleSelectCondition = ConditionCommon & {
  targetFieldType: 'singleSelect'
  operator: 'equals' | 'does not equal'
  value: string
}

export type MultiSelectCondition = ConditionCommon & {
  targetFieldType: 'multiSelect'
  operator: 'contains any of' | 'contains all of' | 'contains none of'
  value: string[]
}

// Represents a condition that has been added but not yet fully configured
export type PendingCondition = ConditionCommon & {
  targetFieldType: ''
  operator: ''
  value: ''
}

export type Condition =
  | TextCondition
  | NumberCondition
  | DateCondition
  | SingleSelectCondition
  | MultiSelectCondition
  | PendingCondition

// ─── Form & Instance ──────────────────────────────────────────────────────────

export type FormRecord = {
  id: string
  title: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  fields: Field[]
}

export type InstanceRecord = {
  id: string
  formId: string
  submittedAt: string
  values: Record<string, unknown>
  fieldSnapshot: Field[]
}
