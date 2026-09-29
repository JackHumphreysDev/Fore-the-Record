import { useId, useState, type ReactNode } from 'react'

export type DashboardTab = { id: string; label: string }

export function DashboardTabs({ label, tabs, value, onChange }: {
  label: string
  tabs: readonly DashboardTab[]
  value: string
  onChange: (value: string) => void
}) {
  return <nav className="dashboard-tabs" aria-label={label}>
    {tabs.map((tab) => <button key={tab.id} type="button"
      aria-current={value === tab.id ? 'page' : undefined}
      onClick={() => onChange(tab.id)}>{tab.label}</button>)}
  </nav>
}

/** Mount on first visit, then preserve unsaved form state when switching views. */
export function DashboardPanel({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active)
  const id = useId()
  if (active && !visited) setVisited(true)
  return <div id={id} hidden={!active} className="dashboard-panel">{visited || active ? children : null}</div>
}
