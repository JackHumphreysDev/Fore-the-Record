import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import { readScorecardPhotoUrl } from './scorecardPhotoApi.ts'

export default function ProfileAvatar({ userId, name, hasImage, imageVersion = '', className = '' }: { userId: string; name: string; hasImage: boolean; imageVersion?: string; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!hasImage) return
    const controller = new AbortController()
    void authenticatedFetch(`/api/users/${encodeURIComponent(userId)}/profile-image`, { signal: controller.signal })
      .then(async (response) => response.ok ? readScorecardPhotoUrl(await response.json()) : null)
      .then((nextUrl) => { if (!controller.signal.aborted) setUrl(nextUrl ?? '') })
      .catch(() => undefined)
    return () => controller.abort()
  }, [hasImage, imageVersion, userId])
  const visibleUrl = hasImage ? url : ''
  return <span className={`profile-avatar ${className}`.trim()} aria-hidden="true">{visibleUrl ? <img src={visibleUrl} alt="" /> : name.trim()[0]?.toUpperCase() ?? '•'}</span>
}
