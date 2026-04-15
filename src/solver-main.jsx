import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import SolverDashboardPage from './SolverDashboardPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SolverDashboardPage />
    <Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />
  </StrictMode>,
)
