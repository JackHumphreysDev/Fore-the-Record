import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DashboardPanel, DashboardTabs } from './DashboardTabs.tsx'

describe('dashboard navigation', () => {
  it('identifies the selected view and gives every control a non-submit type', () => {
    const html = renderToStaticMarkup(<DashboardTabs label="Profile views" value="overview" onChange={() => {}} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'goals', label: 'Goals & achievements' }]} />)
    expect(html).toContain('aria-label="Profile views"')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html.match(/type="button"/g)).toHaveLength(2)
  })
  it('does not mount unseen panels or their data-fetching children', () => {
    function Unseen(): never { throw new Error('Inactive panel mounted unexpectedly') }
    const html = renderToStaticMarkup(<DashboardPanel active={false}><Unseen /></DashboardPanel>)
    expect(html).toContain('hidden=""')
    expect(html).not.toContain('Private detail')
  })
  it('renders the active panel content', () => {
    const html = renderToStaticMarkup(<DashboardPanel active><p>Overview</p></DashboardPanel>)
    expect(html).toContain('Overview')
    expect(html).not.toContain('hidden=')
  })
})
