import { useEffect, useRef, useState } from 'react'
import { isIosDevice, isStandaloneDisplay } from './installApp.ts'
import './InstallPrompt.css'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInstalled() {
  return isStandaloneDisplay(
    window.matchMedia('(display-mode: standalone)').matches,
    (navigator as Navigator & { standalone?: boolean }).standalone,
  )
}

function InstallPrompt() {
  const promptRef = useRef<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(isInstalled)
  const [canPrompt, setCanPrompt] = useState(false)
  const [manualGuide, setManualGuide] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ios] = useState(() => isIosDevice(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  ))

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      if (!('prompt' in event) || typeof event.prompt !== 'function') return
      event.preventDefault()
      promptRef.current = event as InstallEvent
      setCanPrompt(true)
    }
    const onInstalled = () => {
      promptRef.current = null
      setCanPrompt(false)
      setInstalled(true)
    }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => setInstalled(isInstalled())

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    displayMode.addEventListener('change', onDisplayModeChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      displayMode.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  if (installed || (!ios && !canPrompt && !manualGuide)) return null

  async function onInstall() {
    if (!promptRef.current) {
      setGuideOpen((open) => !open)
      return
    }

    const event = promptRef.current
    promptRef.current = null
    setCanPrompt(false)
    setBusy(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
      } else {
        setManualGuide(true)
        setGuideOpen(true)
      }
    } catch {
      setManualGuide(true)
      setGuideOpen(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="install-app" aria-label="Install Fore the Record">
      {guideOpen ? (
        <div className="install-guide">
          <button
            className="install-guide-close"
            type="button"
            aria-label="Close installation instructions"
            onClick={() => setGuideOpen(false)}
          >
            ×
          </button>
          <strong>Add Fore the Record to your Home Screen</strong>
          <p>
            {ios
              ? 'Open this site in Safari, tap Share, then choose Add to Home Screen.'
              : 'Open your browser menu and choose Install Fore the Record.'}
          </p>
          <small>Your rounds still need an internet connection.</small>
        </div>
      ) : null}
      <button
        className="install-launcher"
        type="button"
        aria-expanded={guideOpen}
        disabled={busy}
        onClick={() => void onInstall()}
      >
        {busy ? 'Opening install…' : 'Install app'}
      </button>
    </aside>
  )
}

export default InstallPrompt
