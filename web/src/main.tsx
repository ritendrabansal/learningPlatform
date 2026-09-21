import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { Library } from './pages/Library.js'
import { ChapterView } from './pages/ChapterView.js'
import { ReviewQueue } from './pages/ReviewQueue.js'
import { TeachMode } from './pages/TeachMode.js'
import { StudentView } from './pages/StudentView.js'
import { Progress } from './pages/Progress.js'
import { Homework } from './pages/Homework.js'
import { AdminCosts } from './pages/AdminCosts.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Library />} />
          <Route path="chapters/:chapterId" element={<ChapterView />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="teach" element={<TeachMode />} />
          <Route path="teach/:sessionId" element={<TeachMode />} />
          <Route path="join" element={<StudentView />} />
          <Route path="progress" element={<Progress />} />
          <Route path="homework" element={<Homework />} />
          <Route path="admin/costs" element={<AdminCosts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
