import { configureStore } from '@reduxjs/toolkit'
import templatesReducer from './templatesSlice'
import instancesReducer from './instancesSlice'
import uiReducer from './uiSlice'
import fillReducer from './fillSlice'
import { seedIfNeeded } from '../utils/seedTemplates'

// Must run before configureStore so that loadFromStorage() in templatesSlice
// picks up the seeded template on first load.
seedIfNeeded()

export const store = configureStore({
  reducer: {
    templates: templatesReducer,
    instances: instancesReducer,
    ui: uiReducer,
    fill: fillReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
