import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./generated.css";  // <-- add this line
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
