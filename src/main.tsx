import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WerwolfApp from './werwolf-app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WerwolfApp />
  </StrictMode>,
)