import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface FillState {
  values: Record<string, unknown>
}

const initialState: FillState = { values: {} }

const fillSlice = createSlice({
  name: 'fill',
  initialState,
  reducers: {
    setFieldValue(state, action: PayloadAction<{ fieldId: string; value: unknown }>) {
      state.values[action.payload.fieldId] = action.payload.value
    },
    resetFill(state) {
      state.values = {}
    },
  },
})

export const { setFieldValue, resetFill } = fillSlice.actions
export default fillSlice.reducer
