import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { InstanceRecord } from '../types/form'

const STORAGE_KEY = 'formbuilder_instances'

function loadFromStorage(): InstanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as InstanceRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(instances: InstanceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances))
}

interface InstancesState {
  instances: InstanceRecord[]
}

const initialState: InstancesState = {
  instances: loadFromStorage(),
}

const instancesSlice = createSlice({
  name: 'instances',
  initialState,
  reducers: {
    addInstance(state, action: PayloadAction<InstanceRecord>) {
      state.instances.push(action.payload)
      saveToStorage(state.instances)
    },
    deleteInstancesByFormId(state, action: PayloadAction<string>) {
      state.instances = state.instances.filter(i => i.formId !== action.payload)
      saveToStorage(state.instances)
    },
  },
})

export const { addInstance, deleteInstancesByFormId } = instancesSlice.actions
export default instancesSlice.reducer
