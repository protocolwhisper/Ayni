import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SolverDashboardPage from './SolverDashboardPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SolverDashboardPage />
  </StrictMode>,
)
