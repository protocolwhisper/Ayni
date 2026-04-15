import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import DashboardLoginPage from './DashboardLoginPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardLoginPage />
    <Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />
  </StrictMode>,
)
