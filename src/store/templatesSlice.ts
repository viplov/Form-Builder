import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { FormRecord } from '../types/form'

const STORAGE_KEY = 'formbuilder_templates'

function loadFromStorage(): FormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FormRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(forms: FormRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms))
}

interface TemplatesState {
  forms: FormRecord[]
}

const initialState: TemplatesState = {
  forms: loadFromStorage(),
}

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    addForm(state, action: PayloadAction<FormRecord>) {
      state.forms.push(action.payload)
      saveToStorage(state.forms)
    },
    updateForm(state, action: PayloadAction<FormRecord>) {
      const idx = state.forms.findIndex(f => f.id === action.payload.id)
      if (idx !== -1) {
        state.forms[idx] = action.payload
        saveToStorage(state.forms)
      }
    },
    deleteForm(state, action: PayloadAction<string>) {
      state.forms = state.forms.filter(f => f.id !== action.payload)
      saveToStorage(state.forms)
    },
  },
})

export const { addForm, updateForm, deleteForm } = templatesSlice.actions
export default templatesSlice.reducer
