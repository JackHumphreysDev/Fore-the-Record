import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import InstallPrompt from './InstallPrompt.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallPrompt />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const registerOfflinePage = () => {
    void navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }).catch((error: unknown) => {
      console.warn('Offline page registration failed', error)
    })
  }

  if (document.readyState === 'complete') {
    registerOfflinePage()
  } else {
    window.addEventListener('load', registerOfflinePage, { once: true })
  }
}
