import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import DashboardPage from './DashboardPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardPage />
    <Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />
  </StrictMode>,
)
