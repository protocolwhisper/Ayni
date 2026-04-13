import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DashboardLoginPage from './DashboardLoginPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardLoginPage />
  </StrictMode>,
)
