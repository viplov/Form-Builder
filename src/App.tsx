import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import HomePage from './components/home/HomePage'
import BuilderPage from './components/builder/BuilderPage'
import FillPage from './components/fill/FillPage'
import ResponsesPage from './components/home/ResponsesPage'

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/builder/:formId" element={<BuilderPage />} />
          <Route path="/fill/:formId" element={<FillPage />} />
          <Route path="/forms/:formId/responses" element={<ResponsesPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
