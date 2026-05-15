import { createSlice } from '@reduxjs/toolkit'

// UI state is ephemeral — never persisted to localStorage (Q4).
// selectedFieldId lives in BuilderPage local state (moved from here to fix useSyncExternalStore race).
// Add drag state, modal open flags, etc. here as needed.
interface UIState {
  _placeholder: null
}

const initialState: UIState = { _placeholder: null }

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {},
})

export default uiSlice.reducer
