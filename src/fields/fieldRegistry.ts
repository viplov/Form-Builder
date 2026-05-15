import type { Field, UnknownField } from '../types/form'
import { singleTextDefinition } from './singleText'
import { multiTextDefinition } from './multiText'
import { numberDefinition } from './number'
import { dateDefinition } from './date'
import { singleSelectDefinition } from './singleSelect'
import { multiSelectDefinition } from './multiSelect'
import { sectionHeaderDefinition } from './sectionHeader'
import { fileUploadDefinition } from './fileUpload'
import { calculationDefinition } from './calculation'

// FieldDefinition is generic over the specific Field variant it handles.
// This gives us type-safe ConfigPanel, BuilderPreview, and FillRenderer props.
export type FieldDefinition<F extends Field = Field> = {
  type: string
  label: string
  defaultConfig: F['config']
  ConfigPanel: React.ComponentType<{ field: F; onChange: (updated: F) => void }>
  BuilderPreview: React.ComponentType<{ field: F; isSelected: boolean }>
  FillRenderer: React.ComponentType<{ field: F; value: unknown; onChange: (v: unknown) => void; error?: string }>
  validate: (value: unknown, config: F['config']) => string | null
  pdfSerializer: (field: F, value: unknown) => string
  getInitialValue?: (config: F['config']) => unknown
  computeValue?: (config: F['config'], allValues: Record<string, unknown>) => unknown
}

// Every concrete field type that must have a registry entry.
// Derived from the Field union minus UnknownField — adding a new Field variant
// without registering it here becomes a compile-time error.
type KnownFieldType = Exclude<Field, UnknownField>['type']
type FieldRegistryMap = { [K in KnownFieldType]: FieldDefinition }

// satisfies FieldRegistryMap — compile error if any KnownFieldType key is missing.
// The outer cast adds string-index access (→ FieldDefinition | undefined) for call sites
// that look up by a runtime field.type string.
export const fieldRegistry = ({
  singleText:    singleTextDefinition    as FieldDefinition,
  multiText:     multiTextDefinition     as FieldDefinition,
  number:        numberDefinition        as FieldDefinition,
  date:          dateDefinition          as FieldDefinition,
  singleSelect:  singleSelectDefinition  as FieldDefinition,
  multiSelect:   multiSelectDefinition   as FieldDefinition,
  sectionHeader: sectionHeaderDefinition as FieldDefinition,
  fileUpload:    fileUploadDefinition    as FieldDefinition,
  calculation:   calculationDefinition   as FieldDefinition,
} satisfies FieldRegistryMap) as FieldRegistryMap & Record<string, FieldDefinition | undefined>
