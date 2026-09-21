import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { Library } from './pages/Library.js'
import { ChapterView } from './pages/ChapterView.js'
import { ReviewQueue } from './pages/ReviewQueue.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Library />} />
          <Route path="chapters/:chapterId" element={<ChapterView />} />
          <Route path="review" element={<ReviewQueue />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
